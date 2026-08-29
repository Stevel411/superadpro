"""Server-side backtest engine for the TradeTracker Strategy Backtester.

Reads OHLC bars from the price_bars table (seeded via /admin/load-price-bars),
caches them in-process, and runs the SAME rigorous, honest backtest we validated
offline: out-of-sample split, realistic breakout fills (+slippage), real spread,
random-entry benchmark, plus the coach layer (why it failed + a tested variation).

numpy-only (numpy is in requirements; pandas is NOT, so we avoid it).
"""
import numpy as np
from sqlalchemy import text

# in-process caches (persist for the life of the worker process)
_BARS = {}    # (market, tf) -> list[(date, hm[int32], O, H, L, C)]  numpy per day
_TREND = {}   # market -> {date: +1/-1/0}   (daily MA50 trend, no look-ahead)
_GRID = {}    # market -> cached grid result dict

SESSIONS = {"London": (600, 1080), "New York": (990, 1320), "Asia": (120, 600)}  # XAUUSD broker time (EET/EEST)
SESSIONS_FX = {"London": (480, 960), "New York": (780, 1260), "Asia": (0, 480)}  # forex majors, UTC
OOS_CUTOFF = "2019-01-01"           # everything from here is out-of-sample


def _sessions(market):
    """Session windows depend on the market's timezone: gold is stored in broker
    time (EET/EEST), the forex majors in UTC."""
    return SESSIONS if market == "XAUUSD" else SESSIONS_FX
GRID = [("London", 2, None), ("London", 4, None), ("New York", 2, None),
        ("New York", 4, None), ("New York", 2, 2.0), ("Asia", 2, None)]


def _load(db, market, tf):
    """Load bars for (market, tf) grouped into per-day numpy arrays; cache it."""
    k = (market, tf)
    if k in _BARS:
        return _BARS[k]
    rows = db.execute(
        text("SELECT ts, o, h, l, c FROM price_bars WHERE market=:m AND tf=:tf ORDER BY ts"),
        {"m": market, "tf": tf}).fetchall()
    days = []
    cd = None
    hm = []; O = []; H = []; L = []; C = []
    for ts, o, h, l, c in rows:
        d = ts.date()
        if d != cd:
            if cd is not None:
                days.append((cd, np.asarray(hm, dtype=np.int32),
                             np.asarray(O, dtype=float), np.asarray(H, dtype=float),
                             np.asarray(L, dtype=float), np.asarray(C, dtype=float)))
            cd = d; hm = []; O = []; H = []; L = []; C = []
        hm.append(ts.hour * 60 + ts.minute); O.append(o); H.append(h); L.append(l); C.append(c)
    if cd is not None:
        days.append((cd, np.asarray(hm, dtype=np.int32),
                     np.asarray(O, dtype=float), np.asarray(H, dtype=float),
                     np.asarray(L, dtype=float), np.asarray(C, dtype=float)))
    _BARS[k] = days
    return days


def _trend(db, market):
    """Daily MA50 trend as of the PRIOR close (no look-ahead): {date: +1/-1/0}."""
    if market in _TREND:
        return _TREND[market]
    rows = db.execute(
        text("SELECT ts, c FROM price_bars WHERE market=:m AND tf='1d' ORDER BY ts"),
        {"m": market}).fetchall()
    closes = [float(c) for _, c in rows]
    dates = [ts.date() for ts, _ in rows]
    tm = {}
    for i in range(len(closes)):
        if i >= 50:
            ma = sum(closes[i - 50:i]) / 50.0     # 50 closes ending at i-1
            tm[dates[i]] = 1 if closes[i - 1] > ma else -1
        else:
            tm[dates[i]] = 0
    _TREND[market] = tm
    return tm


def _orb(days, or_start, or_bars, sess_end, target_R=None, trend_map=None,
         min_or=None, spread=3.0, slip=1.5, seed=None):
    """One opening-range-breakout backtest. Returns [(date_iso, R), ...].
    Hardened fills: enter at the breakout bar's CLOSE (+slip), stop/target slipped."""
    s = slip / 1e4
    sp = spread / 1e4
    or_end = or_start + or_bars * 15
    rng = np.random.default_rng(seed) if seed is not None else None
    out = []
    for date, hm, O, H, L, C in days:
        m = (hm >= or_start) & (hm < sess_end)
        if m.sum() < or_bars + 2:
            continue
        hmm = hm[m]; Om = O[m]; Hm = H[m]; Lm = L[m]; Cm = C[m]
        om = hmm < or_end
        if om.sum() < or_bars:
            continue
        orh = float(Hm[om].max()); orl = float(Lm[om].min())
        if orh - orl <= 0:
            continue
        if min_or is not None and orl > 0 and (orh - orl) / orl < min_or:
            continue
        ai = np.where(hmm >= or_end)[0]
        if len(ai) < 2:
            continue
        a0 = int(ai[0]); n = len(hmm)
        side = 0; ep = None; k = None
        if rng is not None:
            side = 1 if rng.random() < 0.5 else -1
            ep = float(Om[a0]) * (1 + s * side); k = a0
        else:
            for i in range(a0, n):
                ci = float(Cm[i])
                if ci > orh:
                    side = 1; ep = ci * (1 + s); k = i; break
                if ci < orl:
                    side = -1; ep = ci * (1 - s); k = i; break
            if side == 0:
                continue
        if trend_map is not None and rng is None:
            td = trend_map.get(date, 0)
            if td == 0 or side != td:
                continue
        stop = orl if side == 1 else orh
        risk = abs(ep - stop)
        if risk <= 0:
            continue
        tgt = ep + side * target_R * risk if target_R else None
        xp = None
        for i in range(k, n):
            lo = float(Lm[i]); hi = float(Hm[i])
            if side == 1 and lo <= stop:
                xp = stop * (1 - s); break
            if side == -1 and hi >= stop:
                xp = stop * (1 + s); break
            if tgt is not None:
                if side == 1 and hi >= tgt:
                    xp = tgt * (1 - s); break
                if side == -1 and lo <= tgt:
                    xp = tgt * (1 + s); break
        if xp is None:
            xp = float(Cm[-1])
        out.append((date.isoformat(), ((xp - ep) * side - ep * sp) / risk))
    return out


def _oos(results):
    """Out-of-sample summary of [(date_iso, R)] trades."""
    R = [r for (d, r) in results if d >= OOS_CUTOFF]
    if not R:
        return {"n": 0, "exp": 0}
    n = len(R)
    wins = sum(1 for x in R if x > 0)
    exp = sum(R) / n
    pos = sum(x for x in R if x > 0)
    neg = sum(x for x in R if x < 0)
    pf = pos / abs(neg) if neg < 0 else 9.99
    eq = []; run = 0.0
    for x in R:
        run += x; eq.append(run)
    peak = eq[0]; dd = 0.0
    for v in eq:
        if v > peak:
            peak = v
        if v - peak < dd:
            dd = v - peak
    step = max(1, len(eq) // 60)
    return {"n": n, "win": round(wins / n * 100, 1), "exp": round(exp, 4),
            "pf": round(pf, 2), "maxdd": round(dd, 1),
            "equity": [round(eq[i], 2) for i in range(0, len(eq), step)]}


def _is_median_or(days, or_start, or_bars):
    """In-sample median opening-range size (as fraction of price) for the
    'trade fewer, bigger days' filter threshold."""
    or_end = or_start + or_bars * 15
    vals = []
    for date, hm, O, H, L, C in days:
        if date.isoformat() >= OOS_CUTOFF:
            continue
        m = (hm >= or_start) & (hm < or_end)
        if m.sum() < or_bars:
            continue
        h = float(H[m].max()); l = float(L[m].min())
        if l > 0 and h > l:
            vals.append((h - l) / l)
    if not vals:
        return 0.0
    vals.sort()
    return vals[len(vals) // 2]


def run_grid(db, market="XAUUSD"):
    """Compute the honest coached preset grid, live from the database. Cached."""
    if market in _GRID:
        return _GRID[market]
    days = _load(db, market, "15m")
    tmap = _trend(db, market)
    presets = []
    for sess, ob, tR in GRID:
        os_, se = _sessions(market)[sess]
        base = _oos(_orb(days, os_, ob, se, target_R=tR))
        rexp = _oos(_orb(days, os_, ob, se, target_R=tR, seed=1)).get("exp", 0)
        vt = _oos(_orb(days, os_, ob, se, target_R=tR, trend_map=tmap))
        med = _is_median_or(days, os_, ob)
        vf = _oos(_orb(days, os_, ob, se, target_R=tR, min_or=med))
        be = base.get("exp", -9)
        cands = [("Add a trend filter",
                  "only take the breakout in the direction of the daily trend", vt),
                 ("Trade fewer, bigger days",
                  "only trade when the opening range is wider than usual (skips quiet days)", vf)]
        cands = [c for c in cands if c[2].get("n", 0) > 30]
        best = max(cands, key=lambda c: c[2].get("exp", -9)) if cands else None
        if be > 0:
            diagnosis = ("This one actually holds up after costs \u2014 rare. Forward-test it on "
                         "a demo before trusting real money.")
        elif be > rexp:
            diagnosis = ("Your entry timing isn't random \u2014 this setup beats coin-flip entries. "
                         "What kills it is <b>cost</b>: " + str(base.get("n", 0)) + " trades over the "
                         "test, each risking a small opening-range stop, so the spread eats the edge. "
                         "The lever is to <b>trade less but bigger</b> \u2014 fewer, higher-quality "
                         "trades where each move outweighs the cost.")
        else:
            diagnosis = ("This setup is no better than random entries \u2014 the breakout alone carries "
                         "no directional signal here. It needs a <b>reason to lean one way</b> "
                         "(a trend, session, or volatility filter) before it's worth anything.")
        sug = None
        if best:
            be_exp = best[2]["exp"]
            delta = round(be_exp - be, 4)
            crossed = be_exp > 0
            if crossed:
                note = "and it crosses into profit \u2014 worth a proper forward-test."
            elif delta > 0:
                note = ("it improves things (from %+.3fR to %+.3fR) but still doesn't beat costs "
                        "\u2014 closer, not there." % (be, be_exp))
            else:
                note = "but it doesn't help here \u2014 honest dead end for this idea."
            sug = {"title": best[0], "how": best[1], "exp": be_exp, "delta": delta,
                   "n": best[2]["n"], "win": best[2]["win"],
                   "equity": best[2].get("equity", []), "note": note}
        presets.append({
            "name": sess + " Opening-Range Breakout",
            "detail": str(ob * 15) + "-min range, " + ("exit at " + str(tR) + "R target" if tR else "hold to session close"),
            "oos": base, "rand_exp": round(rexp, 4),
            "beats_random": bool(be > rexp), "profitable": bool(be > 0),
            "verdict": ("EDGE \u2014 profitable after costs" if be > 0 else
                        ("No tradeable edge \u2014 beats random, loses to costs" if be > rexp else
                         "No edge \u2014 no better than random")),
            "diagnosis": diagnosis, "suggestion": sug})
    result = {"presets": presets,
              "meta": {"source": "XAU/USD 15m, live from database (2004-2026)",
                       "oos": "2019-2026 (out-of-sample)",
                       "cost": "3bps spread + 1.5bps slippage per fill"}}
    _GRID[market] = result
    return result


def run_custom(db, market="XAUUSD", session="New York", or_minutes=30,
               target_R=None, trend=False, fewer=False):
    """Run ONE backtest for a trader-chosen configuration, on demand, live from
    the DB. Returns the same honest, coached shape as a grid preset."""
    days = _load(db, market, "15m")
    if session not in _sessions(market):
        session = "New York"
    os_, se = _sessions(market)[session]
    ob = max(1, int(round(or_minutes / 15.0)))
    tmap = _trend(db, market) if trend else None
    med = _is_median_or(days, os_, ob) if fewer else None
    base = _oos(_orb(days, os_, ob, se, target_R=target_R, trend_map=tmap, min_or=med))
    rexp = _oos(_orb(days, os_, ob, se, target_R=target_R, seed=1)).get("exp", 0)
    be = base.get("exp", -9)

    # suggestion: the best not-yet-applied lever
    cands = []
    if not trend:
        vt = _oos(_orb(days, os_, ob, se, target_R=target_R, trend_map=_trend(db, market), min_or=med))
        cands.append(("Add a trend filter",
                      "only take the breakout in the direction of the daily trend", vt))
    if not fewer:
        m2 = _is_median_or(days, os_, ob)
        vf = _oos(_orb(days, os_, ob, se, target_R=target_R,
                       trend_map=tmap, min_or=m2))
        cands.append(("Trade fewer, bigger days",
                      "only trade when the opening range is wider than usual (skips quiet days)", vf))
    if target_R is None:
        v2 = _oos(_orb(days, os_, ob, se, target_R=2.0, trend_map=tmap, min_or=med))
        cands.append(("Exit at a 2R target",
                      "take profit at twice your risk instead of holding to the close", v2))
    cands = [c for c in cands if c[2].get("n", 0) > 30]
    best = max(cands, key=lambda c: c[2].get("exp", -9)) if cands else None

    if be > 0:
        diagnosis = ("This configuration actually holds up after costs \u2014 rare. Forward-test it "
                     "on a demo before trusting real money.")
    elif be > rexp:
        diagnosis = ("Your entry timing isn't random \u2014 it beats coin-flip entries. What kills it "
                     "is <b>cost</b>: " + str(base.get("n", 0)) + " trades, each risking a small "
                     "opening-range stop, so the spread eats the edge. The lever is to <b>trade less "
                     "but bigger</b>.")
    else:
        diagnosis = ("No better than random entries \u2014 the breakout alone carries no directional "
                     "signal in this configuration. It needs a <b>reason to lean one way</b>.")
    sug = None
    if best:
        be_exp = best[2]["exp"]
        delta = round(be_exp - be, 4)
        crossed = be_exp > 0
        if crossed:
            note = "and it crosses into profit \u2014 worth a proper forward-test."
        elif delta > 0:
            note = ("it improves things (from %+.3fR to %+.3fR) but still doesn't beat costs "
                    "\u2014 closer, not there." % (be, be_exp))
        else:
            note = "but it doesn't help here \u2014 honest dead end for this idea."
        sug = {"title": best[0], "how": best[1], "exp": be_exp, "delta": delta,
               "n": best[2]["n"], "win": best[2]["win"],
               "equity": best[2].get("equity", []), "note": note}

    flags = []
    if trend:
        flags.append("trend-filtered")
    if fewer:
        flags.append("bigger-range days only")
    detail = str(ob * 15) + "-min range, " + ("exit at " + str(target_R) + "R target" if target_R else "hold to session close")
    if flags:
        detail += " \u2014 " + ", ".join(flags)
    return {"name": session + " Opening-Range Breakout",
            "detail": detail, "oos": base, "rand_exp": round(rexp, 4),
            "beats_random": bool(be > rexp), "profitable": bool(be > 0),
            "verdict": ("EDGE \u2014 profitable after costs" if be > 0 else
                        ("No tradeable edge \u2014 beats random, loses to costs" if be > rexp else
                         "No edge \u2014 no better than random")),
            "diagnosis": diagnosis, "suggestion": sug}

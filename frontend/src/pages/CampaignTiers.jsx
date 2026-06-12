import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Campaign Tiers — Configurator (16-seat model, 12 Jun 2026)

   Tap a tier → see the views you're buying (hero), the price,
   the 16-seat Profit Grid (cyan = direct referral / amber =
   indirect referral — the Grid's own identity colours), and the
   commission breakdown. Tools-first: views are the headline, the
   comp plan is secondary.

   Data binds straight to /api/campaign-tiers (authoritative —
   price, views_target, direct_commission, uni_level_per_member,
   completion_bonus, is_active, grid, campaign_progress). No
   hardcoded tier economics here (the old page hardcoded stale
   6×6/36-seat/40% values).

   Buying hands off to /activate/{tier} — the existing activation
   screen that already carries every live gateway (Stripe card,
   crypto/WalletConnect, NOWPayments). This page does NOT
   re-implement payment; it routes into the proven flow.
   ───────────────────────────────────────────────────────────── */

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: (Number(n) % 1 ? 2 : 0), maximumFractionDigits: 2 });
const num = (n) => Number(n || 0).toLocaleString('en-US');

// Illustrative split of the 16 seats into direct vs indirect. The real
// mix per grid depends on who the member personally refers vs who arrives
// via team spillover, so this is labelled "example fill" in the UI.
const DIRECT_SEATS = new Set([0, 2, 7, 9, 12]);

const CONFIG_CSS = `
.ctcfg{max-width:1000px;margin:0 auto;font-family:'DM Sans',sans-serif}
.ct-toast{display:flex;align-items:center;gap:8px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-weight:600;font-size:14px;padding:12px 16px;border-radius:12px;margin-bottom:18px}
.ct-head{margin-bottom:20px}
.ct-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#0ea5e9;font-weight:600}
.ct-head h1{font-family:'Sora',sans-serif;font-size:clamp(26px,4.5vw,34px);font-weight:800;color:var(--sap-text-primary);margin:8px 0;letter-spacing:-.02em}
.ct-head p{font-size:15px;color:var(--sap-text-secondary);max-width:560px;line-height:1.55}
.ct-pills{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 12px}
.ct-pill{font-family:'Sora',sans-serif;font-weight:600;font-size:13px;color:#1e3a8a;padding:9px 15px;border-radius:999px;border:1px solid rgba(12,26,56,.1);background:#fff;cursor:pointer;transition:.18s;box-shadow:0 2px 10px -4px rgba(12,26,56,.14);display:inline-flex;align-items:center;gap:6px}
.ct-pill:hover{border-color:rgba(14,165,233,.5);transform:translateY(-1px)}
.ct-pill.on{color:#fff;background:linear-gradient(90deg,#1e3a8a,#0ea5e9);border-color:transparent;box-shadow:0 10px 22px -10px rgba(14,165,233,.7)}
.ct-owned{font-size:11px;opacity:.9}
.ct-ladder{display:flex;gap:5px;margin:6px 0 24px}
.ct-ladder i{height:5px;flex:1;border-radius:3px;background:rgba(12,26,56,.1);transition:.25s}
.ct-ladder i.fill{background:linear-gradient(90deg,#1e3a8a,#22d3ee)}
.ct-card{background:#fff;border:1px solid rgba(12,26,56,.09);border-radius:24px;box-shadow:0 18px 44px -22px rgba(12,26,56,.3);padding:32px;position:relative;overflow:hidden}
.ct-card::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,#1e3a8a,#0ea5e9,#22d3ee)}
.ct-top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;flex-wrap:wrap}
.ct-name{font-family:'Sora',sans-serif;font-weight:700;font-size:22px;color:var(--sap-text-primary)}
.ct-price{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(38px,6.5vw,50px);color:var(--sap-text-primary);line-height:1;margin-top:8px}
.ct-priceunit{font-size:12.5px;color:var(--sap-text-muted);font-weight:600;margin-top:6px}
.ct-viewbox{text-align:right;min-width:180px}
.ct-views{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(40px,8vw,60px);line-height:1;background:linear-gradient(92deg,#0ea5e9,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.ct-viewlbl{font-size:13px;color:var(--sap-text-muted);margin-top:4px;font-weight:600}
.ct-body{display:grid;grid-template-columns:auto 1fr;gap:36px;margin-top:30px;align-items:center}
.ct-gridwrap{text-align:center}
.ct-seats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:184px}
.ct-seat{aspect-ratio:1;border-radius:8px;animation:ctpop .4s backwards}
.ct-seat.direct{background:linear-gradient(135deg,#0ea5e9,#22d3ee);box-shadow:0 6px 16px -6px rgba(34,211,238,.85)}
.ct-seat.indirect{background:linear-gradient(135deg,#f59e0b,#fbbf24);box-shadow:0 6px 16px -6px rgba(245,158,11,.55)}
@keyframes ctpop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.ct-gridlbl{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sap-text-muted);margin-top:12px;letter-spacing:.05em}
.ct-legend{display:flex;gap:8px 18px;justify-content:center;flex-wrap:wrap;margin-top:13px}
.ct-leg{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--sap-text-secondary)}
.ct-leg .sw{width:13px;height:13px;border-radius:4px;flex:none}
.ct-leg .sw.d{background:linear-gradient(135deg,#0ea5e9,#22d3ee)}
.ct-leg .sw.i{background:linear-gradient(135deg,#f59e0b,#fbbf24)}
.ct-comp{display:flex;flex-direction:column}
.ct-crow{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid rgba(12,26,56,.06)}
.ct-crow:last-child{border-bottom:none}
.ct-clbl{font-size:14px;color:var(--sap-text-primary);font-weight:600}
.ct-clbl small{display:block;color:var(--sap-text-muted);font-size:11.5px;font-weight:500;margin-top:3px}
.ct-camt{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:20px;color:var(--sap-text-primary);white-space:nowrap}
.ct-camt.cyan{color:#0ea5e9}
.ct-camt.amber{color:#d97706}
.ct-prog{margin-top:24px;padding-top:20px;border-top:1px solid rgba(12,26,56,.08)}
.ct-prog-top{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--sap-text-secondary);margin-bottom:7px}
.ct-prog-bar{height:8px;background:rgba(12,26,56,.07);border-radius:5px;overflow:hidden}
.ct-prog-bar>div{height:100%;background:linear-gradient(90deg,#0ea5e9,#22d3ee);border-radius:5px;transition:width .5s}
.ct-actions{display:flex;align-items:center;gap:16px;margin-top:28px;flex-wrap:wrap}
.ct-btn{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#fff;text-decoration:none;background:linear-gradient(92deg,#1e3a8a,#0ea5e9);padding:14px 26px;border-radius:12px;box-shadow:0 22px 50px -26px rgba(14,165,233,.55);transition:.18s;display:inline-block}
.ct-btn:hover{transform:translateY(-2px)}
.ct-active{display:inline-flex;align-items:center;gap:7px;font-family:'Sora',sans-serif;font-weight:700;font-size:14px;color:#0d9488;background:#ccfbf1;border:1px solid #99f6e4;padding:13px 22px;border-radius:12px}
.ct-share{font-family:'JetBrains Mono',monospace;font-size:12px;color:#1e3a8a}
.ct-share b{color:var(--sap-text-primary)}
.ct-disc{font-size:12px;color:var(--sap-text-muted);line-height:1.55;margin-top:22px;max-width:780px}
@media(max-width:620px){
  .ct-body{grid-template-columns:1fr;gap:26px}
  .ct-gridwrap{order:2}
  .ct-seats{margin:0 auto}
  .ct-viewbox{text-align:left;min-width:0}
  .ct-top{flex-direction:column;gap:14px}
}
`;

export default function CampaignTiers() {
  const { t } = useTranslation();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(3);
  const [activatedTier, setActivatedTier] = useState(null);

  // Success banner after a Stripe/crypto redirect: /campaign-tiers?activated=tier_N
  useEffect(function () {
    const m = (new URLSearchParams(window.location.search).get('activated') || '').match(/^tier_(\d+)$/);
    if (m) {
      setActivatedTier(parseInt(m[1]));
      try { window.history.replaceState({}, '', window.location.pathname); } catch (e) { /* ignore */ }
      setTimeout(function () { setActivatedTier(null); }, 8000);
    }
  }, []);

  useEffect(function () {
    apiGet('/api/campaign-tiers').then(function (d) {
      const list = d.tiers || [];
      setTiers(list);
      const firstUnowned = list.find(function (x) { return !x.is_active; });
      if (firstUnowned) setSel(firstUnowned.tier);
      else if (list.length) setSel(list[0].tier);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  if (loading) return (
    <AppLayout title={t('campaignTiers.title')}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--sap-accent)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  const tier = tiers.find(function (x) { return x.tier === sel; }) || tiers[0];
  if (!tier) return (
    <AppLayout title={t('campaignTiers.title')}>
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-text-muted)' }}>No campaign tiers available right now.</div>
    </AppLayout>
  );

  const grid = tier.grid;

  return (
    <AppLayout title={t('campaignTiers.title')}>
      <style>{CONFIG_CSS}</style>
      <div className="ctcfg">

        {activatedTier !== null && (
          <div className="ct-toast">
            <Check size={16} /> Tier {activatedTier} activated — your campaign is live.
          </div>
        )}

        <div className="ct-head">
          <span className="ct-eyebrow">My Business · Campaign Tiers</span>
          <h1>Choose your campaign.</h1>
          <p>Each tier runs an AI advertising campaign that delivers guaranteed views to your offer. The Profit Grid is built in if you want to earn — but the views are yours either way.</p>
        </div>

        <div className="ct-pills">
          {tiers.map(function (x) {
            return (
              <button key={x.tier} className={'ct-pill' + (x.tier === sel ? ' on' : '')} onClick={function () { setSel(x.tier); }}>
                {x.name}{x.is_active && <span className="ct-owned">✓</span>}
              </button>
            );
          })}
        </div>
        <div className="ct-ladder">
          {tiers.map(function (x) { return <i key={x.tier} className={x.tier <= sel ? 'fill' : ''} />; })}
        </div>

        <div className="ct-card">
          <div className="ct-top">
            <div>
              <div className="ct-name">{tier.name}</div>
              <div className="ct-price">{money(tier.price)}</div>
              <div className="ct-priceunit">one-time · what you pay</div>
            </div>
            <div className="ct-viewbox">
              <div className="ct-views">{num(tier.views_target)}</div>
              <div className="ct-viewlbl">ad views · what you get</div>
            </div>
          </div>

          <div className="ct-body">
            <div className="ct-gridwrap">
              <div className="ct-seats">
                {Array.from({ length: 16 }).map(function (_, i) {
                  return <div key={i} className={'ct-seat ' + (DIRECT_SEATS.has(i) ? 'direct' : 'indirect')} style={{ animationDelay: (i * 18) + 'ms' }} />;
                })}
              </div>
              <div className="ct-gridlbl">16-seat Profit Grid · example fill</div>
              <div className="ct-legend">
                <div className="ct-leg"><span className="sw d" /> Direct referral — you earn 30%</div>
                <div className="ct-leg"><span className="sw i" /> Indirect referral — 6.25% / level</div>
              </div>
            </div>

            <div className="ct-comp">
              <div className="ct-crow">
                <div className="ct-clbl">Direct commission<small>per member you personally refer</small></div>
                <div className="ct-camt cyan">{money(tier.direct_commission)}</div>
              </div>
              <div className="ct-crow">
                <div className="ct-clbl">Indirect commission<small>per fill, 8 levels deep · 6.25% each</small></div>
                <div className="ct-camt amber">{money(tier.uni_level_per_member)}</div>
              </div>
              <div className="ct-crow">
                <div className="ct-clbl">Grid completion bonus<small>paid when your 16 seats fill</small></div>
                <div className="ct-camt cyan">{money(tier.completion_bonus)}</div>
              </div>
            </div>
          </div>

          {tier.is_active && grid && (
            <div className="ct-prog">
              <div className="ct-prog-top">
                <span>Your grid</span>
                <span>{grid.filled} filled · Grid #{grid.advance}</span>
              </div>
              <div className="ct-prog-bar"><div style={{ width: (grid.pct || 0) + '%' }} /></div>
            </div>
          )}

          <div className="ct-actions">
            {tier.is_active ? (
              <div className="ct-active"><Check size={15} /> {tier.name} is active</div>
            ) : (
              <Link to={'/activate/' + tier.tier} className="ct-btn">
                Run this campaign — {money(tier.price)} →
              </Link>
            )}
            <span className="ct-share">⚡ <b>100%</b> of campaign revenue shared across the grid</span>
          </div>
        </div>

        <p className="ct-disc">
          Commission figures are the maximums defined by the Profit Grid and depend entirely on your own referral activity — they are not income guarantees, and many members simply use the advertising without referring anyone. Direct = 30% of tier price · indirect = 6.25% per level across 8 levels · completion bonus = the 20% grid pool. Company retains 0% of campaign revenue. All tiers are one-time payments — no subscriptions.
        </p>

      </div>
    </AppLayout>
  );
}

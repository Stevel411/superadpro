# SuperAdPro — TRC-20 USDT Network Scoping Document

**Version:** 1.0
**Date:** 5 May 2026
**Author:** Engineering (Claude) for Steve Lawson
**Status:** Decision pending — awaiting Facebook poll results
**Decision needed by:** Within 24-48 hours to preserve a feasible launch window

---

## TL;DR

The platform currently supports USDT on Polygon only. Steve's audience
(network marketers) is heavily TRC-20-native. This doc compares two
options for adding TRC-20 support and lays out exactly what Steve
needs to do versus what engineering will do.

**Two options:**

  A. **TRC-20 only** (replace Polygon). 3-4 working days of
     engineering. Cleanest possible build. Recommended unless the
     Facebook poll shows a meaningful Polygon-preference contingent.

  B. **Both networks** (TRC-20 + Polygon). 5-6 working days of
     engineering, plus permanent operational overhead (dual treasuries,
     dual liquidity management, dual monitoring).

Either option pushes soft launch from 6-7 May to roughly 11-13 May.
The original full-launch date of 10 May is the natural new soft-launch
date.

---

## Why TRC-20 matters

Steve's gut read (high confidence): "Almost every platform I've been
part of has used TRC-20, not Polygon. Most network marketers send from
Trust Wallet, Binance, and similar — and TRC-20 is what those apps
default to. Polygon is relatively unknown in the network marketing
space."

This is consistent with broader market data. TRC-20 dominates network-
marketing/affiliate platforms because:

  - Sub-cent transaction fees (~$1 typical for TRC-20 vs ~$0.01-0.20 for Polygon)
  - Universal support in the wallets network marketers already use
  - High name recognition — "Tron USDT" is a known phrase, Polygon less so
  - Major Asian markets (where MLM has high penetration) are very Tron-heavy

**However**, TRC-20 has its own quirks engineering has to handle:

  - Tron's "energy" and "bandwidth" model — transactions consume
    network resources that the sender either pays for or stakes TRX
    to reduce. Failed TRX activation is a class of withdrawal failure
    that doesn't exist on Polygon.
  - Tron addresses are base58-encoded starting with `T` (34 chars),
    completely different format from Ethereum-style 0x... (42 chars).
    Sending TRC-20 to a 0x... address loses the funds permanently.
  - Different SDK (`tronpy` instead of `web3.py`)
  - Different RPC provider (TronGrid or QuickNode-Tron, instead of
    Alchemy)
  - Different smart-contract call shape — TRC-20 USDT transfer is a
    `triggerSmartContract` call against the USDT contract on Tron,
    not the same code path as the existing ERC-20 transfer.

None of this is hard. It's just *different*, and the bugs are
different. Production-grade TRC-20 takes real engineering time, not
a quick add.

---

## Current state — what exists today

For context, the platform's withdrawal flow today:

  - **Treasury**: One wallet on Polygon at `0x71746f1634B0FBB3981B9B84EbE1A1a6f2430467`, holding USDT-Polygon.
  - **Smart contract**: USDT-Polygon at `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (the standard Polygon USDT).
  - **RPC provider**: Alchemy, configured for Polygon mainnet.
  - **Signing key**: `TREASURY_PRIVATE_KEY` env var on Railway.
  - **Wallet address validation**: Single regex `^0x[a-fA-F0-9]{40}$` in `app/main.py:589` — Ethereum-format only.
  - **`User.wallet_address` column**: Single string field, stores the user's Polygon address.
  - **`Withdrawal.wallet_address` column**: Same — the Polygon address at the time of the request.
  - **Send function**: `app/withdrawals.py:send_usdt()` uses `web3.py` to construct + sign + broadcast a Polygon transaction.
  - **NOWPayments**: Configured on the NOWPayments dashboard for Polygon settlement of incoming payments. Code in `app/nowpayments_service.py` doesn't hardcode the network — it's a dashboard setting.

  **Member impact today:** All 13 existing users have either no wallet
  address set, or a Polygon address. No real customer commissions have
  been paid out yet (the audit confirmed financial_sanity is healthy
  with zero traffic).

---

## OPTION A — TRC-20 only (replace Polygon)

### What this means

Polygon code paths are kept in the repo for future re-enablement but
disabled. Treasury rebuilt on Tron. All withdrawals go through TRC-20.
NOWPayments dashboard reconfigured for TRC-20 settlement of incoming
payments. Existing users (mainly Steve and test accounts) update their
wallet address from a 0x... to a T... format.

This is the cleanest possible build. Single network, single treasury,
single SDK, single test path, single ongoing operational load.

### Engineering work (3-4 working days)

#### Phase 1 — Foundations (Day 1)

- **Database schema changes.**
  - Add `network` column to `Withdrawal` (default `tron`).
  - Add `wallet_network` column to `User` (default `tron`) — even
    though only one network is supported initially, this future-proofs
    against re-enabling Polygon later. The column is for clarity, not
    functionality.
  - Idempotent ALTER TABLE migrations.

- **`app/withdrawals.py` — Tron treasury config.**
  - Replace constants:
    - `TREASURY_ADDRESS` → Tron T... format
    - `USDT_CONTRACT` → Tron USDT contract `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
  - Replace `_get_web3()` with `_get_tron_client()` using `tronpy`.
  - Replace `_get_private_key()` env reads — switch to `TREASURY_PRIVATE_KEY_TRON` (separate key from Polygon's, kept in Railway).

- **`send_usdt()` rewrite.**
  - New implementation using `tronpy`. TRC-20 transfer is a smart-
    contract call on the USDT contract:
    ```
    contract.functions.transfer(to_address, amount * 10**6).build()
    ```
    (TRC-20 USDT uses 6 decimals, same as Polygon USDT.)
  - Energy/bandwidth handling — sender pays TRX to fuel the
    transaction. Treasury needs a small TRX balance (~50-100 TRX,
    roughly $5-15) for fees, in addition to the USDT.
  - Returns same `{success, tx_hash, error}` shape as before so the
    rest of the codebase doesn't need to know the network changed.

- **Wallet address validation.**
  - `validate_wallet()` in `app/main.py:589` becomes Tron-format:
    `^T[1-9A-HJ-NP-Za-km-z]{33}$` (base58check, 34 chars total).
  - Existing Polygon validation regex kept in code under a different
    function name in case Polygon is re-enabled later.

#### Phase 2 — Existing user data (Half day)

- **Reset existing wallet addresses.** Steve and the few test users
  have 0x... addresses stored. These are now invalid. Two approaches:
  - **Recommended**: Clear all `wallet_address` fields (set to NULL).
    Add a banner / required field on first login: "We've moved to
    TRC-20 — please update your wallet address before your next
    withdrawal." Members re-enter their TRC-20 addresses on next
    visit to Account settings.
  - Alternative: leave existing addresses, fail validation on next
    withdrawal. Higher friction, more confusion. Not recommended.

- **Migration script** (one-off, runs once on deploy) to clear the
  `wallet_address` column for all users.

#### Phase 3 — Frontend (Day 1)

- Account settings page: wallet address input shows "USDT TRC-20
  address" label, validation matches Tron format, helpful copy on
  what a TRC-20 address looks like ("starts with T, 34 characters,
  the address you see in Trust Wallet for USDT-Tron").

- Withdrawal pages: any reference to "Polygon" replaced with
  "TRC-20".

- Crypto Guide page: rewritten for TRC-20. Where to get a TRC-20
  wallet, how to verify the address is TRC-20 (not ERC-20 or
  Polygon — same wallet apps support multiple networks), how the
  fees work, how withdrawal arrives.

- Any marketing copy referencing Polygon updated.

#### Phase 4 — NOWPayments + monitoring (Half day)

- **NOWPayments dashboard reconfiguration** — Steve task, see below.
- **`mcp/tools/financial_sanity` and `payment_integrity`** updated to
  query the new Tron treasury. Tron block explorers (TronScan) for
  manual verification links instead of Polygonscan.
- **Logs and notifications** — replace "Polygon" with "TRC-20" in
  user-facing notification text.

#### Phase 5 — Testing (1 day, deliberately overprovisioned)

End-to-end testing with real funds. The goal is to find bugs before
real members do.

- **Test 1**: Funded Tron treasury with $20 USDT-TRC-20. Test withdrawal of $10 to a known T... address. Verify on TronScan.
- **Test 2**: Edge case — user enters a 0x... address by mistake. Verify rejection at validation, not lost funds.
- **Test 3**: Edge case — user enters a TRC-20 address that's never been used (no TRX, no activation). Verify TRC-20 USDT arrives anyway (Tron network handles cold-address deposits).
- **Test 4**: Idempotency — same withdrawal request fired twice with same UUID. Verify no double-spend.
- **Test 5**: Retry path — simulate inline send failure. Verify cron retries cleanly without false-refund (the bug we just fixed).
- **Test 6**: Refund path — simulate a structurally-blocked retry (user lost active tier). Verify campaign_balance gets credited back atomically.
- **Test 7**: Daily cap. Verify the cap still works on TRC-20 withdrawals.
- **Test 8**: Member balance display + transaction history. Verify TronScan links.
- **Test 9**: Address re-entry flow for existing users. Verify the "please update your address" banner triggers and accepts a valid T... address.

Each test gets logged with the actual on-chain tx hash for the audit
trail.

### Steve's operational checklist (Option A)

These are tasks only Steve can do — engineering can't touch your
wallet provider accounts or buy crypto with your money.

#### Before engineering starts

- [ ] **Create a Tron wallet for the treasury.**
      Recommended: hardware wallet (Ledger or similar) for cold storage
      of the seed phrase, paired with a "hot" key kept in Railway env
      vars for actual signing. Even better — multisig via TronLink, but
      that's more complex setup. For launch, a single hot wallet is
      acceptable as long as the seed phrase is offline-stored.

- [ ] **Acquire USDT-TRC-20 to fund the treasury.**
      Suggested initial amount: $200-500 to start, then more once live.
      Cheapest source: buy on Binance, withdraw via TRC-20.

- [ ] **Acquire ~$10-15 of TRX** (Tron's native gas token) to fund
      transaction fees. Sent to the same treasury address.

- [ ] **Sign up for a Tron RPC provider.** Options:
      - **TronGrid (free tier)** — official Tron Foundation provider, sufficient for low volume.
      - **QuickNode** (paid, ~$10-50/mo) — better reliability, recommended once volume picks up.
      Get the RPC URL.

- [ ] **NOWPayments dashboard reconfiguration.**
      In the NOWPayments dashboard, Settings → Payment options:
      - Enable USDT TRC-20 as a settlement currency.
      - Set TRC-20 as the default settlement.
      - Disable USDT-Polygon (or leave as a fallback).
      - Update the settlement address to your new Tron treasury T... address.
      Test by creating a small invoice and confirming it settles to the Tron treasury.

#### When engineering starts

- [ ] **Provide engineering with:**
      - The Tron treasury T... address (public, fine to share)
      - The TronGrid/QuickNode RPC URL
      - The Tron treasury private key — uploaded to Railway env vars
        (see below)

- [ ] **Set Railway environment variables:**
      ```
      TREASURY_PRIVATE_KEY_TRON  = (the new key, NOT the Polygon key)
      TRON_RPC_URL               = https://api.trongrid.io  (or QuickNode URL)
      TREASURY_ADDRESS_TRON      = T... (the new public address)
      ```
      Existing `TREASURY_PRIVATE_KEY` and `ALCHEMY_API_KEY` can stay
      for now — they're dormant until Polygon is re-enabled.

- [ ] **Communicate the change to existing users.**
      The 13 existing users (mostly you and test accounts) need to
      update their wallet address. Engineering will build a banner;
      you confirm the wording.

#### After engineering finishes, before launch

- [ ] **Test transaction yourself.** Withdraw a small amount ($10
      minimum due to MIN_WITHDRAWAL) from your own admin account to
      a wallet you control. Verify on TronScan. Verify funds arrive
      in <2 minutes.

- [ ] **Set up TronScan watch alerts** on your treasury address (free
      via TronScan dashboard) so you get notified of every outgoing
      transaction. Useful for spotting unauthorised withdrawals.

- [ ] **Update marketing copy.** Any reference to "Polygon" or "USDT
      on Polygon" or "0x address" in your funnel needs to change to
      "TRC-20" / "USDT TRC-20" / "T address".

- [ ] **Update Crypto Guide** content. Engineering will draft, you
      review for tone and approve.

### Permanent operational reality (Option A)

  - **One treasury to monitor, fund, audit.**
  - **Tron-only liquidity.** When members withdraw, you spend from
    Tron treasury. When members buy via NOWPayments, settlements
    arrive at Tron treasury. Self-balancing in normal operation.
  - **Single source of truth on chain.** TronScan is your audit
    trail.
  - **Engineering surface area for withdrawals: same as today.** One
    network, one path, one set of bugs.

---

## OPTION B — Both networks (TRC-20 + Polygon)

### What this means

Members get to choose: TRC-20 or Polygon. The system maintains two
treasuries, two SDKs, two test paths, two on-chain audit trails.
Liquidity has to be managed across both.

### Engineering work (5-6 working days)

Everything in Option A's Phase 1-5, **plus**:

- **Polygon path retained.** Don't disable, don't refactor — just
  keep working alongside TRC-20.

- **Network selection logic.** When a member adds a wallet address,
  they pick the network. Validation is network-aware: TRC-20 expects
  T..., Polygon expects 0x.... The system stores both `wallet_address`
  and `wallet_network`.

- **`User.wallet_address` design decision.** Two approaches:
  - **Single field per network**: One `wallet_address` field per user,
    plus a `wallet_network` field saying which network it's for. Member
    can have one address. Withdrawals use whichever network is set.
    Simpler.
  - **Two fields**: `wallet_address_polygon` and `wallet_address_tron`.
    Member can have addresses on both, system picks at withdrawal time.
    More flexible, more UI to build.
  - **Recommended for Option B**: single field with network selector.
    Members rarely have a real reason to maintain wallets on multiple
    networks just for SuperAdPro.

- **Network selector at withdrawal time.** When member clicks Withdraw,
  the system uses their stored network preference. UI shows which
  network they'll receive on. If they want to switch, they update their
  Account settings first.

- **Dual treasury monitoring.** `financial_sanity` and
  `payment_integrity` MCP tools updated to track both treasuries.

- **Liquidity management.** Manual or automated process to rebalance
  USDT between Polygon and Tron treasuries when one runs low. With
  Steve's audience demographics, the Tron treasury will drain while
  the Polygon treasury sits idle. **Realistic frequency: weekly to
  monthly rebalancing.** Each rebalance is either a manual buy/swap
  (you on Binance, ~$5-20 in fees per move) or an automated bridge
  (engineering work to integrate, ~1-2 extra days).

- **NOWPayments dual-network settlement.** NOWPayments dashboard needs
  both TRC-20 and Polygon enabled, with logic for which one each
  buyer uses. Likely Polygon as default for backward compatibility,
  TRC-20 as secondary. **This requires NOWPayments support engagement;
  unknown lead time.** May add 1-3 days of waiting.

- **Testing matrix doubles.** Each Phase 5 test gets done twice — once
  per network — to verify both paths work. ~1.5 extra days of test
  time.

### Steve's operational checklist (Option B)

Everything in Option A's checklist, **plus**:

#### Before engineering starts

- [ ] **Decide on liquidity management strategy.**
      - Manual: you rebalance via Binance whenever a treasury looks low.
      - Automated: engineering builds an internal "rebalance" admin
        endpoint that can swap USDT between networks via a bridge
        (e.g. cBridge, Allbridge, Stargate). Adds ~1-2 days to the
        engineering estimate.

- [ ] **Confirm NOWPayments will support dual-network settlement
      on your account.** Email NOWPayments support to ask. They
      generally do, but lead times can be 1-3 business days.

- [ ] **Plan dual treasury operational rituals.** You'll be checking
      two wallets, monitoring two on-chain explorers, doing two sets
      of audits. Set up alerts on both.

### Permanent operational reality (Option B)

  - **Two treasuries to fund, monitor, audit.**
  - **Recurring liquidity-balancing work.** Even with automation, you'll
    be doing this manually some of the time.
  - **Two engineering surface areas for withdrawals.** Bugs that hit
    one path won't hit the other; debugging is more nuanced. The
    withdrawal-flow bugs we hit this week (idempotency, validator-
    misrouted-balance, retry-revalidator) all needed to be fixed in
    the Polygon path; equivalents may exist in the Tron path.
  - **More logs, more monitoring, more support questions.** Members
    asking "which network should I use?" is a forever-question.

---

## Honest recommendation

Without seeing the Facebook poll results, my **prior** based on Steve's
audience read is:

  **Option A (TRC-20 only) is the right call.**

Reasons:

  1. Steve's audience strongly prefers TRC-20.
  2. Engineering build is meaningfully shorter and cleaner.
  3. Permanent operational cost is half.
  4. Members who specifically want Polygon are a small minority — they
     can be told "we'll add it as an option later if there's demand."
     The 13 existing users on Polygon today have trivial migration
     costs (update their stored wallet address).
  5. The withdrawal-flow bugs we've been finding this week prove the
     point: dual-network code is double the bug surface, and bugs
     in the money-flow path cost real money to recover from.

The case to switch to Option B is if the Facebook poll comes back
with, say, 30%+ of respondents saying they prefer Polygon or have a
strong reason to want it. That would justify the doubled engineering
load.

If the poll comes back 90%+ TRC-20, ship Option A.

If the poll splits 60/40, ship Option A and add Polygon in v2 later
if demand sustains.

If the poll is 50/50 or the platform's geographic concentration is
specifically EVM-heavy markets, consider Option B more seriously.

---

## Decision criteria for Steve

Based on poll results:

| Poll outcome                          | Recommended option |
|---------------------------------------|--------------------|
| 80%+ TRC-20                           | A                  |
| 60-80% TRC-20                         | A (Polygon as v2)  |
| 50/50                                 | A (Polygon as v2)  |
| 60%+ Polygon (unlikely)               | Discuss            |

The default if results are inconclusive: **Option A**. It's reversible
(turning Polygon back on later is a few days of work, not a rewrite).
Option B is harder to reverse — once members are on Polygon, taking
it away is a worse experience than never offering it.

---

## Timeline

Both options push soft launch. Here's roughly how it lands:

  - **Decision made**: 5-6 May
  - **Steve operational tasks done**: 6-7 May (acquire USDT/TRX, set up
    NOWPayments, provide RPC URL + treasury keys)
  - **Engineering Phase 1-3**: 7-9 May (Option A) or 7-11 May (Option B)
  - **Engineering Phase 4 (NOWPayments)**: 9-10 May (Option A) or
    9-12 May (Option B, with NOWPayments support lead time)
  - **Phase 5 Testing**: 10-11 May (Option A) or 12-13 May (Option B)
  - **Soft launch**: 11-12 May (Option A) or 13-15 May (Option B)
  - **Full launch**: ~7-10 days after successful soft launch, depending
    on what surfaces in soft launch

Note: this assumes engineering can work full-throated on this. If
parallel pre-launch fires keep eating time (more leaderboard bugs,
more withdrawal edge cases, etc.), add buffer.

---

## Open questions for Steve

Before engineering starts, please confirm:

  1. **Which option** — A or B?
  2. **Liquidity strategy if Option B** — manual rebalancing OK at
     launch, or do you want automated bridging from day one?
  3. **Communication to existing users (mainly you + test accounts)**
     — comfortable with a "wallet address reset, please re-enter"
     banner, or want a different approach?
  4. **Crypto Guide tone** — current page is friendly/non-technical.
     Same tone for the rewrite, or take this as a chance to make it
     more comprehensive?
  5. **Marketing copy review** — any places I should look that mention
     "Polygon" specifically, beyond what's in the codebase?

---

*End of scoping document.*

---
name: stuck-payment-recovery
description: "Customer-support runbook for stuck membership payments. Use when a member contacts support saying 'I paid but my account isn't activated', when a NOWPayments order shows wrong_asset/cancelled/abandoned status, when a WalletConnect order has expired without matching a transaction, or when a member's account is in a half-active state (is_active=true with NULL activated_at and tier='free'). Covers diagnosis (six failure patterns A-F), resolution paths (convert / refund / goodwill activate), customer communication templates, admin-panel recovery steps, and post-resolution verification. Tools: SuperAdPro Monitoring lookup_user, lookup_payment_by_txid, list_orphan_transfers, platform_pulse."
---

# Stuck Payment Recovery

A customer contacts support saying they paid but their account isn't active. This runbook takes you from "what happened?" to "they're activated and confirmed" in a clean sequence. It's been validated against real incidents (Janet user 323, momentumhub user 225, and an eleven-orphan poisoned-wallet case).

## When this protocol applies

Signs the protocol fits:

- Member's `is_active=false` despite claiming they paid
- Member sends you a transaction hash or screenshot
- NOWPayments order shows `wrong_asset`, `cancelled`, or `abandoned` status
- Pending WalletConnect order has expired without a matching `tx_hash`
- Member has $0 balance + no `activated_at` timestamp + recent payment attempts on file
- Member is in the **half-active state** (`is_active=true` but `membership_tier='free'`, `activated_at=null`)

If none of these match, investigate more — this is probably something else.

---

## Step 1 — Identify the customer and their state

Run `SuperAdPro Monitoring:lookup_user` with their username, email, or user ID. Read four fields specifically:

| Field | What you're looking for |
|---|---|
| `is_active` | `false` is the classic stuck-payment case. `true` + other fields wrong = half-state (see Step 7). |
| `membership_tier` | `free` confirms they haven't been activated |
| `activated_at` | `null` confirms no successful activation ever happened |
| `recent_nowpayments_orders` and `recent_walletconnect_orders` | History of what they've tried |

**Pay attention to the order count.** 5+ attempts (like momentumhub) = high-frustration customer; the resolution needs to be especially clean.

**Note their sponsor.** If sponsor is the house account (`SuperAdPro`, ID 1), there's no sponsor commission to credit on activation. If sponsor is a real Founder, activation triggers a $10 sponsor commission — factor this into the manual-activation vs full-flow choice.

---

## Step 2 — Identify the failed transaction

Customers typically send one of:

- **A 66-character `0x` string** — could be a tx hash OR a block hash. Verify on the chain explorer (BscScan, Etherscan, Polygonscan).
- **A wallet address (42-character `0x...`)** — could be theirs (the sender) or a destination address.
- **A screenshot** — useful for chain, amount, asset.
- **Vague description** — "I paid yesterday" with no proof. Investigate from the order side.

**If they send a tx hash, run `SuperAdPro Monitoring:lookup_payment_by_txid` immediately.** Three outcomes:

1. **`found_in: [...]` with order data** — platform saw the transaction; something went wrong downstream. Investigate the order state.
2. **`found_in: []`** — platform never saw it. Could mean: wrong chain, wrong asset, the hash is actually a block hash, funds went to the wrong wallet, or the scanner hasn't caught up (wait 2 min and retry once).
3. **Tool returns error** — invalid format string. Verify the hash with the member.

---

## Step 3 — Diagnose the failure pattern

Ranked by frequency in practice:

### Pattern A — NOWPayments wrong-asset (most common)

**Signs:** Order status `wrong_asset`. Member sent a different asset than expected (BNB instead of USDT, ETH instead of USDT BSC).

**Where the money is:** Sitting in NOWPayments' custody at the unique deposit address they generated. Recoverable.

**Resolution:** NOWPayments console → find payment ID (`np_payment_id` on the order) → process wrong-asset conversion. Settles to BSC treasury at current rates (minus NOWPayments fees, ~80-90% of original). Then activate the member manually.

**Confirmed working:** Janet (323), momentumhub (225).

### Pattern B — NOWPayments abandoned / cancelled / waiting

**Signs:** Order status `abandoned`, `cancelled`, or `waiting` with "Actually paid: 0 USDT" in NOWPayments console.

**Where the money is:** Nowhere. The order was created but the member never sent funds. Nothing to recover.

**Resolution:** Tell them their attempt didn't go through. They can retry — ideally on WalletConnect/BSC, not NOWPayments. If they're frustrated from multiple attempts, consider a goodwill manual activation.

### Pattern C — WalletConnect expired without payment

**Signs:** Order in `recent_walletconnect_orders` has expired (15-min window passed) with no `tx_hash` recorded.

**Where the money is:** Probably nowhere — the order expired before the on-chain transaction confirmed. If they sent after expiry, the funds landed at the treasury as an orphan (see Pattern D).

**Resolution:** Check orphan transfers for matching amount and timeframe. If matched, reconcile manually. If not matched, ask the member when they sent — they may have never confirmed.

### Pattern D — Funds at treasury but unmatched (orphan)

**Signs:** `lookup_payment_by_txid` returns an orphan_transfer record. Funds reached your treasury but couldn't be matched to a specific order.

**Where the money is:** In your treasury, just unattributed.

**Resolution:** Identify the sender (their `from_address` should match a user's wallet). Manually activate them. Mark the orphan resolved.

### Pattern E — Wrong chain entirely

**Signs:** Member sends a tx hash on Ethereum mainnet, Polygon, or another chain you don't accept. BSC scanner can't see it.

**Where the money is:** Either at NOWPayments (if cross-chain routed — treat as Pattern A) or sent to a wallet on the wrong chain that you don't control.

**Resolution:** If NOWPayments-routed, Pattern A. If they sent directly to a wallet you don't control, funds may be unrecoverable.

### Pattern F — The "hash" is actually a block hash

**Signs:** Their 66-character string returns nothing in BscScan/Etherscan transaction search but matches a block.

**Where the money is:** Unknown. The block hash tells you nothing useful.

**Resolution:** Stop asking for hashes. Ask for their **wallet address** (the 42-character `0x...` they paid FROM). Run `lookup_user` with that wallet address — it matches against any order they've created.

---

## Step 4 — Decide: convert, refund, or activate-without-recovery

Once you know the failure pattern, pick the resolution path:

### Convert through NOWPayments (default for wrong-asset)

- You receive USDT at your treasury (80-90% of original value)
- Customer never sees the original funds again
- Cleanest accounting both sides
- Activate manually after conversion confirms

### Refund through NOWPayments (for bad conversion rates or large amounts)

- Customer gets funds back (minus fees) to their original wallet
- They have to pay again from scratch
- More friction for customer, but cleaner for large amounts where conversion fees would sting
- Don't activate until they successfully pay again

### Manual activation without recovery (goodwill cases)

- Skip recovery entirely — give them their membership
- You eat the loss (or, if Pattern B, no loss because nothing was sent)
- Best when: customer has tried 3+ times, is high-value, talking to you directly
- Document in audit trail so it doesn't look like fraud later

**Default heuristic:** If they've tried ≥3 times, lean toward goodwill manual activation. If they've tried once and it's wrong-asset, convert and activate.

---

## Step 5 — Communicate with the customer FIRST

Before any technical resolution, message the customer. Two purposes: stops them from retrying and making things worse, and frames you as taking ownership before they doubt you.

**Messenger / DM template:**

> Hey [name] — I can see what happened. You sent [BNB / wrong asset] instead of [USDT on BSC], which is why NOWPayments flagged the payment. I'm going to process the conversion on my end and activate your account manually. Give me 5-10 minutes — you don't need to do anything else.

**Email template:**

> Hi [name],
>
> Steve from SuperAdPro. I noticed your payment attempt didn't activate your account properly. The issue is on our end with the payment processor — not anything you did.
>
> Please don't try to pay again. I'm going to resolve this manually from my side:
> 1. Recover the funds you sent through the payment processor
> 2. Activate your membership directly
> 3. Send you a confirmation once done
>
> Most cases I can resolve same-day. Reply if you have any questions.
>
> Steve

---

## Step 6 — Execute the resolution

### If converting through NOWPayments:

1. Log into NOWPayments console (https://account.nowpayments.io/)
2. Find the payment ID from the order's `np_payment_id` field
3. Open the order detail page
4. Select "Process" or "Convert" (UI varies — look for action buttons)
5. Confirm conversion will settle to BSC treasury `0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D`
6. Wait for confirmation (usually <10 min)
7. Verify funds arrived using `SuperAdPro Monitoring:platform_pulse` or BscScan directly

### If refunding through NOWPayments:

1. Same console, same order
2. Select "Refund to sender"
3. Confirm refund destination (customer's original wallet)
4. Wait for refund to confirm
5. Tell the customer funds are back

### Then activate the member manually:

1. Admin Dashboard → search for their username
2. Open their detail panel
3. Click **Activate Paid Membership**
4. Select correct tier (Founder if spots remain, Partner otherwise)
5. Add bank reference note: `Manual recovery — NOWPayments order [ID] — wrong-asset converted`
6. Confirm activation

### Verify the activation worked:

Run `SuperAdPro Monitoring:lookup_user` immediately after. Confirm:

- `is_active: true`
- `membership_tier: founding` or `partner` (matches what you selected)
- `activated_at` is set (may be the user's signup date if a backfill migration ran — that's fine, it's not null)
- `membership_expires_at` is roughly +30 days
- `membership_price_locked` is `15.00` (Founder) or null (Partner — no lock for standard pricing)
- Founder only: `is_founding_member: true` and `founding_spot_number` is populated

**If any of these are wrong, you've hit a half-state activation issue.** See Step 7.

---

## Step 7 — Half-state activation recovery

The "half-state" bug used to be: admin clicks Activate Paid Membership, the handler writes `is_active=true` but doesn't populate the tier fields, and the next click is rejected with "already active". User trapped.

**The bug is closed as of commit `b343100` (20 May 2026).** The patched handler now:

- Detects the half-state (`is_active=true` + `activated_at IS NULL` OR `tier IN (NULL, 'free')`)
- Treats it as a recovery case and completes the activation
- Atomically claims the spot, locks the price, sets the timestamps, writes the Payment row, enrols in rotator

**How to recognise the residue:**

- `is_active: true` but `membership_tier: 'free'` or null
- `activated_at: null` or `membership_price_locked: null`
- Any of the Founder-specific fields missing on a user who should be Founder

**Resolution as of May 2026:**

1. Identify the user via `lookup_user`
2. Click **Activate Paid Membership** in the admin panel
3. Select the correct tier
4. Submit
5. Verify via `lookup_user` that all six fields are now correct

The patched handler will complete the activation cleanly. No need to hand off to an engineering session unless the verification fails.

**If verification fails (handler ran but state still wrong):** that's a regression. Hand to engineering with the user ID and the pre/post state:

> User [username] (ID [N]) is stuck in a half-activated state despite the activate-paid-membership patch from commit b343100. Current state: [paste lookup_user output]. Expected state after activation: [tier], all fields populated. The patched handler is supposed to recover this case — investigate why it isn't.

---

## Step 8 — Close the loop

After activation confirms:

### Customer-facing:

> [name] — sorted. Your account is now active as a [Founder / Partner]. Welcome in. Let me know if you have any questions.

### Internal audit trail:

Log it. Columns worth keeping:

- Date / time of resolution
- Customer username / ID
- Failure pattern (A-F from Step 3)
- Amount recovered (if conversion happened)
- Amount lost as goodwill (if applicable)
- NOWPayments payment ID(s) involved
- Notes for future reference

A simple Google Doc or `refunds.md` in the repo works. The point is that six months from now you can answer "how often is this happening?" with data.

### Engineering follow-ups:

Each incident should generate questions for the engineering project:

- Did the NOWPayments webhook fire for this transaction? If not, why?
- Is there a way to prevent this failure pattern from recurring?
- Are there other affected customers we haven't heard from?

---

## Anti-patterns to avoid

- **Don't deactivate then reactivate.** Heavy hammer for what's usually a targeted-fix situation. Side effects on balance, referrals, rotator state are not fully understood.
- **Don't blame the customer.** It almost never is their fault. The processor is broken or the UX failed.
- **Don't keep asking for hashes.** If they sent a block hash by mistake, asking for "another hash" yields the same block hash. Switch to wallet address.
- **Don't refund first then ask them to pay again without considering alternatives.** Most customers don't successfully repay after a failed attempt — they abandon. Manual activation + recovery is usually friendlier.
- **Don't activate before recovering when the amount is large.** For $15-50 the goodwill activation is fine. For $200+, recover first, then activate.
- **Don't forget to mark the NOWPayments order resolved.** Otherwise it sits in `wrong_asset` state forever and clutters the dashboard.

---

## Edge cases worth knowing

### Customer sends MULTIPLE wrong-asset transactions

(Happened with `0xa96be652...becd09` — eleven separate transfers totalling ~$190 in the orphan list.) Each one is its own NOWPayments order. Process them individually. Don't try to batch — accounting gets messy.

### Customer paid the RIGHT asset on the WRONG chain

E.g. USDT on Polygon when expected USDT on BSC. NOWPayments may or may not catch this depending on whether the order specified the chain strictly. Check `pay_currency`: `USDTBSC` rejects anything else; bare `USDT` may accept multiple chains.

### Customer's wallet address is poisoned (lookalike scam)

If their wallet history shows an address that looks similar to your treasury but isn't (matching first/last 4 chars, different middle), they may have been hit by address-poisoning. The funds are gone — sent to a scammer's wallet. The honest conversation: "your funds are gone, and here's how to protect yourself going forward."

### Customer is high-value or on a personal channel

Adjust resolution speed accordingly. A Messenger conversation with someone you know personally gets a 5-minute resolution. An anonymous email gets a "I'll resolve this within 24 hours" promise.

---

## Reference data

**Live BSC treasury:** `0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D`

**Retired wallets (do not use):**
- Polygon treasury (old): `0x7174...` (DORMANT)

**Membership tiers (locked May 2026):**
- **Free** — signups, no membership
- **Partner** — $20/mo standard, 50/50 sponsor/company split
- **Founding** — $15/mo locked for life, first 100 active members only, flat $10 to sponsor, $5 to company

(Basic and Pro tiers no longer exist. Anyone you see with `membership_tier='basic'` or `'pro'` should be flagged to engineering — see the Pro/Basic purge commits.)

**Accepted payment methods:**
- WalletConnect / BSC self-custody (PRIMARY — preferred for all new members)
- NOWPayments (RETIRING — most stuck-payment cases come from here)
- Wallet balance auto-renewal (for existing members on renewal)
- Manual admin activation (for goodwill / recovery)

**Tools for this protocol:**
- `SuperAdPro Monitoring:lookup_user` — customer state
- `SuperAdPro Monitoring:lookup_payment_by_txid` — trace a specific tx
- `SuperAdPro Monitoring:list_orphan_transfers` — find unattributed funds
- `SuperAdPro Monitoring:platform_pulse` — confirm treasury received funds

**NOWPayments admin:** https://account.nowpayments.io/
**BscScan tx lookup:** https://bscscan.com/tx/[hash]
**Etherscan tx lookup:** https://etherscan.io/tx/[hash]

---

## Quick reference card

When a stuck-payment ticket lands:

1. `lookup_user` → confirm half-active or fully inactive
2. Get tx hash OR wallet address from customer
3. `lookup_payment_by_txid` → identify failure pattern (A-F)
4. Message the customer ("don't try again, I'm handling it")
5. Resolve through NOWPayments console (convert or refund)
6. Manually activate through admin panel (the patched handler completes half-state recovery cleanly)
7. Verify with `lookup_user`
8. Confirm with customer
9. Log in audit trail

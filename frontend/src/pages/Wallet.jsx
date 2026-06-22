import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import { formatMoney } from '../utils/money';
import WalletHelp from './WalletHelp';
import VoiceGuide from '../components/VoiceGuide';

export default function Wallet() {
  var { t } = useTranslation();
  // Pull refreshUser so we can sync the topbar's balance pill after any
  // action that mutates balance (withdrawal, P2P send). Without this the
  // pill in the topbar shows a stale value until the next full nav,
  // which becomes confusing now that the pill sums affiliate + campaign.
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberIdCopied, setMemberIdCopied] = useState(false);
  const [p2pResult, setP2pResult] = useState(null);
  const [p2pSending, setP2pSending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState(null);
  // ── First-withdrawal confirmation gate ──
  // Members withdrawing for the first time see a one-time confirmation
  // modal showing destination network + full address + amount before the
  // request actually fires. After their first successful withdrawal the
  // gate disappears (total_withdrawn > 0) so experienced members aren't
  // re-prompted on every withdrawal. Belt-and-braces against the most
  // common crypto mistake: sending to a wrong-network address.
  // pendingWithdrawal holds the validated request payload until the
  // member clicks "Confirm Withdrawal" or "Cancel".
  const [pendingWithdrawal, setPendingWithdrawal] = useState(null);

  // Build the right block-explorer URL for a withdrawal's tx hash. The
  // network field comes back from the API when the withdrawal was sent
  // on TRC-20 or BEP-20. Legacy Polygon-era rows have no network and
  // fall through to no link (we hide the link rather than guess wrong).
  function txExplorerUrl(network, txHash) {
    if (!txHash) return '';
    const net = (network || '').toLowerCase();
    if (net === 'tron') return `https://tronscan.org/#/transaction/${txHash}`;
    if (net === 'bsc')  return `https://bscscan.com/tx/${txHash}`;
    return ''; // unknown network — frontend will not render a link
  }

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    apiGet('/api/wallet').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const copyMemberId = () => {
    const id = user?.is_admin ? 'SAP-00001' : `SAP-${String(user?.id || 0).padStart(5, '0')}`;
    navigator.clipboard.writeText(id);
    setMemberIdCopied(true);
    setTimeout(() => setMemberIdCopied(false), 2000);
  };

  const sendP2P = async () => {
    const recipient = document.getElementById('p2pRecipient')?.value?.trim();
    const amount = parseFloat(document.getElementById('p2pAmount')?.value);
    const note = document.getElementById('p2pNote')?.value?.trim() || '';
    if (!recipient) { setP2pResult({ type: 'error', msg: t('wallet.enterMemberId') }); return; }
    if (!amount || amount < 1) { setP2pResult({ type: 'error', msg: t('wallet.enterValidAmount') }); return; }
    setP2pSending(true);
    try {
      const res = await apiPost('/api/p2p-transfer', { to_member_id: recipient, amount, note });
      if (res.success) {
        setP2pResult({ type: 'success', msg: `✓ $${formatMoney(amount)} sent to ${res.recipient_name} (${res.recipient_id}). New balance: $${formatMoney(res.new_balance)}` });
        document.getElementById('p2pRecipient').value = '';
        document.getElementById('p2pAmount').value = '';
        document.getElementById('p2pNote').value = '';
        setTimeout(() => { apiGet('/api/wallet').then(d => setData(d)); }, 2000);
        // Also refresh the AuthContext so the topbar's Balance pill
        // reflects the deduction immediately rather than holding the
        // pre-send total until next nav.
        refreshUser();
      } else {
        setP2pResult({ type: 'error', msg: res.error || t('wallet.transferFailed') });
      }
    } catch (e) { setP2pResult({ type: 'error', msg: e.message || t('wallet.networkError') }); }
    setP2pSending(false);
  };

  // Validate inputs and decide whether to dispatch immediately or open
  // the first-withdrawal confirmation gate. For first-time withdrawers
  // we collect the validated parameters into pendingWithdrawal and let
  // the modal call dispatchWithdrawal() once the member clicks Confirm.
  const handleWithdraw = (walletType) => {
    const amountEl = document.getElementById('withdraw_amount_' + walletType);
    const totpEl = document.getElementById('withdraw_totp_' + walletType);
    const amount = parseFloat(amountEl?.value);
    const totp_code = totpEl?.value?.trim() || '';

    if (!amount || amount < 10) { setWithdrawResult({ type: 'error', msg: 'Minimum withdrawal is $10', wallet: walletType }); return; }

    // ── Generate a fresh idempotency key for THIS click ──
    // The server stores it in withdrawals.idempotency_key (unique index).
    // If the request is silently retried — by a flaky 4G connection, a
    // proxy, or the user double-tapping — every retry carries the same
    // UUID and the server returns the original attempt's result instead
    // of firing a second on-chain transfer. A NEW click generates a NEW
    // UUID and is correctly treated as a new withdrawal attempt.
    //
    // crypto.randomUUID() needs a secure context (HTTPS), which we have
    // on superadpro.com. The fallback is here purely as belt-and-braces
    // for any future embedded webview that might surface insecurely; the
    // server will still accept it as long as the value is unique enough.
    let idempotencyKey;
    try {
      idempotencyKey = crypto.randomUUID();
    } catch {
      idempotencyKey = 'fb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    }

    const payload = { walletType, amount, totp_code, idempotencyKey };

    // First-withdrawal gate: if this member has never withdrawn before,
    // pause and show the confirmation modal. Returning members skip
    // straight to dispatch.
    const isFirstWithdrawal = !data?.total_withdrawn || Number(data.total_withdrawn) === 0;
    if (isFirstWithdrawal) {
      setWithdrawResult(null);
      setPendingWithdrawal(payload);
      return;
    }
    dispatchWithdrawal(payload);
  };

  // Actual on-the-wire dispatch — called either directly (returning
  // members) or from the confirmation modal (first-timers).
  const dispatchWithdrawal = async (payload) => {
    const { walletType, amount, totp_code, idempotencyKey } = payload;
    const amountEl = document.getElementById('withdraw_amount_' + walletType);
    const totpEl = document.getElementById('withdraw_totp_' + walletType);

    setWithdrawing(true);
    setWithdrawResult(null);
    setPendingWithdrawal(null);
    try {
      const formData = new URLSearchParams();
      formData.append('amount', amount);
      formData.append('totp_code', totp_code);
      formData.append('wallet_type', walletType);
      formData.append('idempotency_key', idempotencyKey);

      const res = await fetch('/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        credentials: 'include',
      });

      let json;
      try { json = await res.json(); }
      catch (parseErr) { json = { success: false, error: 'Server returned an unexpected response. If your wallet balance dropped, the withdrawal likely succeeded — refresh to verify.' }; }

      if (json.success) {
        setWithdrawResult({
          type: 'success',
          msg: json.message || 'Withdrawal sent successfully',
          tx_hash: json.tx_hash || '',
          network: json.network || '',
          wallet: walletType,
        });
        if (amountEl) amountEl.value = '';
        if (totpEl) totpEl.value = '';
        // Refresh wallet data after 2 seconds so balance updates
        setTimeout(() => { apiGet('/api/wallet').then(d => setData(d)); }, 2000);
        // Also refresh AuthContext so the topbar Balance pill reflects
        // the deduction. This applies to BOTH the inline-paid path and
        // the queued-for-retry path — in both cases the server has
        // already atomically deducted the balance. The pill must
        // update; otherwise it shows the pre-withdrawal total until
        // next nav, which is confusing now that the pill sums both
        // wallets.
        refreshUser();
      } else {
        setWithdrawResult({ type: 'error', msg: json.error || 'Withdrawal failed. Please try again.', wallet: walletType });
        // If the server auto-refunded (failed_permanent path from the
        // withdrawal hardening — see app/withdrawals.py _refund_withdrawal),
        // the balance was perturbed: deducted then credited back. The
        // topbar pill needs to refresh to show the post-refund state.
        // refreshUser is also harmless when the failure was pre-deduction
        // (validation error etc.) since balance is unchanged.
        if (json.refunded) refreshUser();
      }
    } catch (e) {
      setWithdrawResult({ type: 'error', msg: e.message || 'Network error. Please try again.', wallet: walletType });
    }
    setWithdrawing(false);
  };

  if (loading) return <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} title={t('wallet.title')}><LoadingSpinner /></AppLayout>;
  if (!data) return <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} title={t('wallet.title')}><div style={{ textAlign: 'center', padding: 80, color: 'var(--sap-text-faint)' }}>{t('wallet.unableToLoad')}</div></AppLayout>;
  if (showHelp) return <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} title={t('wallet.title')}><WalletHelp onBack={function() { setShowHelp(false); }}/></AppLayout>;

  const d = data;
  const memberId = user?.is_admin ? 'SAP-00001' : `SAP-${String(user?.id || 0).padStart(5, '0')}`;
  const renewal = d.renewal || {};

  return (
    <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} title={t('wallet.title')} subtitle={t('wallet.subtitle')}
    >
      {/* 4 Stat Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        <StatPill value={`$${formatMoney(d.balance)}`} label={t("wallet.affiliateWallet")} gradient="linear-gradient(90deg,#16a34a,#22c55e)" />
        <StatPill value={`$${formatMoney(d.campaign_balance || 0)}`} label={t("wallet.campaignWallet")} gradient="linear-gradient(90deg,#16a34a,#22c55e)" />
        <StatPill value={`$${formatMoney(d.total_earned)}`} label={t("wallet.totalEarned")} gradient="linear-gradient(90deg,#0ea5e9,#38bdf8)" />
        <StatPill value={`$${formatMoney(d.total_withdrawn)}`} label={t("wallet.totalWithdrawn")} gradient="linear-gradient(90deg,#f59e0b,#fbbf24)" />
      </div>

      {/* Earnings Breakdown — each card reads a clean field directly from
          /api/wallet, which derives every figure from the live commission
          ledger via compute_user_earnings(). The four cards always sum to
          total_earned with no double-counting and no leftover-bucket
          arithmetic.

          History: this used to compute Membership = total - everything-else
          AND Income Grid = grid_earnings + level_earnings. That double-
          counted uni-level commissions (already inside grid_earnings) and
          made Membership a phantom remainder. Found 2 May 2026 when Steve
          spotted a $5 "Membership" figure that was actually his real
          uni-level earnings showing up twice. Fixed by exposing
          membership_earnings + nexus_earnings directly from the backend
          and dropping the level_earnings stale-counter read entirely. */}
      {((d.grid_earnings || 0) > 0 || (d.membership_earnings || 0) > 0 || (d.nexus_earnings || 0) > 0 || (d.course_earnings || 0) > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
          <EarningsCard icon="👥" label={t("wallet.membership")} value={d.membership_earnings || 0} color="var(--sap-green-bright)" />
          <EarningsCard icon="⚡" label={t("wallet.incomeGrid")} value={d.grid_earnings || 0} color="var(--sap-accent)" />
          <EarningsCard icon="🎬" label={t("wallet.creditNexus", { defaultValue: 'Creator Credits' })} value={d.nexus_earnings || 0} color="var(--sap-pink)" desc={t("wallet.earnedFromReferralCredits")} />
          <EarningsCard icon="📚" label={t("wallet.coursesMarket")} value={d.course_earnings || 0} color="var(--sap-amber)" />
        </div>
      )}

      {/* Row 1: Two wallet cards side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
          {/* Affiliate Wallet Withdraw */}
          <Card title={t("wallet.affiliateWallet")} dotColor="var(--sap-green)">
            {d.watched_today === false ? (
              <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, marginBottom:14 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#92400e', marginBottom:2 }}>🔒 Watch today's video to unlock</div>
                <div style={{ fontSize:15, color:'var(--sap-text-secondary)', lineHeight:1.6, marginBottom:8 }}>One short video keeps your wallet active for the day — withdrawals unlock the moment you've watched.</div>
                <Link to="/watch" style={{ display:'inline-block', background:'var(--sap-accent)', color:'#fff', fontWeight:700, fontSize:14, padding:'8px 16px', borderRadius:8, textDecoration:'none' }}>Watch now →</Link>
              </div>
            ) : (
              <div style={{ padding:'10px 14px', background:'var(--sap-green-bg)', border:'1px solid #bbf7d0', borderRadius:10, marginBottom:14 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--sap-green-dark)', marginBottom:2 }}>{d.watched_today ? "✓ Unlocked for today" : t('wallet.alwaysWithdrawable')}</div>
                <div style={{ fontSize:16, color:'var(--sap-text-secondary)', lineHeight:1.6 }}>{t('wallet.affiliateWalletDesc')}</div>
              </div>
            )}
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'var(--sap-green)', textAlign:'center', marginBottom:14 }}>${formatMoney(d.balance)}</div>
            {d.wallet_address ? (
              d.balance >= 10 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Destination panel — shows where the USDT will land
                      so the member can verify before clicking Withdraw.
                      Shared by both Affiliate and Campaign cards. */}
                  <div style={{ padding:'10px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:0.5 }}>
                        {t('wallet.sendingTo') || 'Sending to'}
                      </div>
                      <Link to="/account" style={{ fontSize:12, fontWeight:600, color:'var(--sap-accent)', textDecoration:'none' }}>
                        {t('wallet.change') || 'Change'}
                      </Link>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#15803d', marginBottom:2 }}>
                      {d.wallet_network === 'bsc' ? 'USDT · BEP-20 (BNB Chain)' : d.wallet_network === 'tron' ? 'USDT · TRC-20 (Tron)' : 'USDT'}
                    </div>
                    <div style={{ fontSize:13, fontFamily:'monospace', color:'var(--sap-text-secondary)', wordBreak:'break-all', lineHeight:1.4 }}>
                      {d.wallet_address.length > 16
                        ? `${d.wallet_address.substring(0, 8)}…${d.wallet_address.substring(d.wallet_address.length - 6)}`
                        : d.wallet_address}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('wallet.amountUSDT')}</label>
                    <input id="withdraw_amount_affiliate" style={inputStyle} type="number" min="10" max={d.balance} step="0.01" placeholder="0.00"/>
                  </div>
                  {user?.totp_enabled && (
                    <div>
                      <label style={labelStyle}>{t('wallet.twoFACode')}</label>
                      <input id="withdraw_totp_affiliate" style={{ ...inputStyle, textAlign:'center', letterSpacing:6, fontWeight:700, fontSize:18 }} type="text" maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric"/>
                    </div>
                  )}
                  <div style={payoutNoteStyle}>⏱ Payouts are reviewed and processed within 5 days of request, for your account's security.</div>
                  <button onClick={() => handleWithdraw('affiliate')} disabled={withdrawing || d.watched_today === false} style={{...btnPrimary, opacity: (withdrawing || d.watched_today === false) ? 0.6 : 1}}>{withdrawing ? 'Processing...' : (d.watched_today === false ? 'Watch today to unlock' : t('wallet.withdrawAffiliate'))}</button>
                  <div style={{ fontSize:15, color:'var(--sap-text-muted)', textAlign:'center' }}>{t('wallet.affiliateFeeNote')}</div>
                  {withdrawResult && withdrawResult.wallet === 'affiliate' && (
                    <div style={{ padding:'11px 14px', borderRadius:8, fontSize:16, fontWeight:600, ...(withdrawResult.type==='success'?{background:'var(--sap-green-bg)',border:'1px solid #86efac',color:'#15803d'}:{background:'var(--sap-red-bg)',border:'1px solid #fecaca',color:'var(--sap-red)'}) }}>
                      <div>{withdrawResult.type==='success' ? '✅ ' : '❌ '}{withdrawResult.msg}</div>
                      {withdrawResult.tx_hash && txExplorerUrl(withdrawResult.network, withdrawResult.tx_hash) && (
                        <div style={{ marginTop:8, fontSize:14, fontWeight:500 }}>
                          Transaction: <a href={txExplorerUrl(withdrawResult.network, withdrawResult.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ color:'#15803d', textDecoration:'underline', fontFamily:'monospace' }}>{withdrawResult.tx_hash.substring(0, 10)}…{withdrawResult.tx_hash.substring(withdrawResult.tx_hash.length - 8)}</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign:'center', fontSize:15, color:'var(--sap-text-muted)' }}>{t('wallet.minToWithdraw')} ${formatMoney(d.balance)}</div>
              )
            ) : (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, color:'var(--sap-text-muted)', marginBottom:10 }}>{t('wallet.noWalletAddress')}</div>
                <Link to="/account" style={{ fontSize:14, fontWeight:700, color:'var(--sap-accent)', textDecoration:'none' }}>{t('wallet.addWalletSettings')}</Link>
              </div>
            )}
          </Card>

          {/* Campaign Wallet Withdraw */}
          <Card title={t("wallet.campaignWallet")} dotColor="var(--sap-indigo)">
            <div style={{ padding:'10px 14px', background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:10, marginBottom:14 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#4338ca', marginBottom:2 }}>{t('wallet.requiresActiveTier')}</div>
              <div style={{ fontSize:16, color:'var(--sap-text-secondary)', lineHeight:1.6 }}>{t('wallet.campaignWalletDesc')}</div>
            </div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'var(--sap-indigo)', textAlign:'center', marginBottom:14 }}>${formatMoney(d.campaign_balance || 0)}</div>
            {d.wallet_address ? (
              (d.campaign_balance || 0) >= 10 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Destination panel — see comment on affiliate card.
                      Indigo theming to match the campaign card. */}
                  <div style={{ padding:'10px 12px', background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#4338ca', textTransform:'uppercase', letterSpacing:0.5 }}>
                        {t('wallet.sendingTo') || 'Sending to'}
                      </div>
                      <Link to="/account" style={{ fontSize:12, fontWeight:600, color:'var(--sap-accent)', textDecoration:'none' }}>
                        {t('wallet.change') || 'Change'}
                      </Link>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#4338ca', marginBottom:2 }}>
                      {d.wallet_network === 'bsc' ? 'USDT · BEP-20 (BNB Chain)' : d.wallet_network === 'tron' ? 'USDT · TRC-20 (Tron)' : 'USDT'}
                    </div>
                    <div style={{ fontSize:13, fontFamily:'monospace', color:'var(--sap-text-secondary)', wordBreak:'break-all', lineHeight:1.4 }}>
                      {d.wallet_address.length > 16
                        ? `${d.wallet_address.substring(0, 8)}…${d.wallet_address.substring(d.wallet_address.length - 6)}`
                        : d.wallet_address}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('wallet.amountUSDT')}</label>
                    <input id="withdraw_amount_campaign" style={inputStyle} type="number" min="10" max={d.campaign_balance || 0} step="0.01" placeholder="0.00"/>
                  </div>
                  {user?.totp_enabled && (
                    <div>
                      <label style={labelStyle}>{t('wallet.twoFACode')}</label>
                      <input id="withdraw_totp_campaign" style={{ ...inputStyle, textAlign:'center', letterSpacing:6, fontWeight:700, fontSize:18 }} type="text" maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric"/>
                    </div>
                  )}
                  <div style={payoutNoteStyle}>⏱ Payouts are reviewed and processed within 5 days of request, for your account's security.</div>
                  <button onClick={() => handleWithdraw('campaign')} disabled={withdrawing} style={{...btnPrimary, background:'linear-gradient(135deg,#6366f1,#818cf8)', opacity: withdrawing ? 0.6 : 1}}>{withdrawing ? 'Processing...' : t('wallet.withdrawCampaign')}</button>
                  <div style={{ fontSize:15, color:'var(--sap-text-muted)', textAlign:'center' }}>{t('wallet.campaignFeeNote')}</div>
                  {withdrawResult && withdrawResult.wallet === 'campaign' && (
                    <div style={{ padding:'11px 14px', borderRadius:8, fontSize:16, fontWeight:600, ...(withdrawResult.type==='success'?{background:'var(--sap-green-bg)',border:'1px solid #86efac',color:'#15803d'}:{background:'var(--sap-red-bg)',border:'1px solid #fecaca',color:'var(--sap-red)'}) }}>
                      <div>{withdrawResult.type==='success' ? '✅ ' : '❌ '}{withdrawResult.msg}</div>
                      {withdrawResult.tx_hash && txExplorerUrl(withdrawResult.network, withdrawResult.tx_hash) && (
                        <div style={{ marginTop:8, fontSize:14, fontWeight:500 }}>
                          Transaction: <a href={txExplorerUrl(withdrawResult.network, withdrawResult.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ color:'#15803d', textDecoration:'underline', fontFamily:'monospace' }}>{withdrawResult.tx_hash.substring(0, 10)}…{withdrawResult.tx_hash.substring(withdrawResult.tx_hash.length - 8)}</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign:'center', fontSize:15, color:'var(--sap-text-muted)' }}>
                  {(d.campaign_balance || 0) > 0
                    ? `${t('wallet.minToWithdraw')} $${formatMoney(d.campaign_balance || 0)}`
                    : t('wallet.noCampaignEarnings')
                  }
                </div>
              )
            ) : (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, color:'var(--sap-text-muted)', marginBottom:10 }}>{t('wallet.noWalletAddress')}</div>
                <Link to="/account" style={{ fontSize:14, fontWeight:700, color:'var(--sap-accent)', textDecoration:'none' }}>{t('wallet.addWalletSettings')}</Link>
              </div>
            )}
          </Card>
      </div>

      {/* Row 2: Transaction History full-width */}
      <div style={{ marginBottom: 18 }}>
        <Card title={t("wallet.transactionHistory")} dotColor="#0284c7">
          {((d.commissions || []).length > 0 || (d.withdrawals || []).length > 0) ? (
            <div style={{ margin: '-18px -20px', overflow: 'auto', maxHeight:400 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{position:'sticky',top:0,background:'#fff',zIndex:1,boxShadow:'0 1px 0 #e2e8f0'}}><tr>
                  {[t('wallet.type'), t('wallet.details'), t('wallet.amount'), t('wallet.status'), t('wallet.date')].map(h => (
                    <th key={h} style={{...thStyle,background:'#fff'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[].concat(
                    (d.commissions || []).map(function(c) { return {
                      sort: c.created_at || '', kind: 'commission',
                      type: c.commission_type === 'direct_sponsor' ? '💚 ' + t('wallet.directSponsor') :
                            c.commission_type === 'uni_level' ? '⚡ ' + t('wallet.uniLevel') :
                            c.commission_type === 'grid_completion_bonus' ? '🏆 ' + t('wallet.gridBonus') :
                            c.commission_type === 'membership_sponsor' ? '👥 ' + t('wallet.membershipComm') :
                            c.commission_type === 'membership_renewal' ? '🔄 ' + t('wallet.renewal') :
                            c.commission_type === 'superscene_usage' ? '🎬 ' + t('wallet.creativeStudioComm') :
                            '💰 ' + (c.commission_type || '').replace(/_/g, ' '),
                      detail: c.package_tier ? 'Tier ' + c.package_tier : '',
                      amount: '+$' + formatMoney(c.amount_usdt),
                      amountColor: 'var(--sap-green)',
                      status: c.status || 'paid',
                      date: c.created_at,
                      wallet: ['direct_sponsor','uni_level','grid_completion_bonus'].indexOf(c.commission_type) >= 0 ? 'campaign' : 'affiliate',
                    };}),
                    (d.withdrawals || []).map(function(w) { return {
                      sort: w.requested_at || '', kind: 'withdrawal',
                      type: '🏧 ' + t('wallet.withdrawal'),
                      detail: w.tx_hash ? t('wallet.polygonTX') : '',
                      amount: '-$' + formatMoney(w.amount),
                      amountColor: 'var(--sap-red)',
                      status: w.status || 'pending',
                      date: w.requested_at,
                      wallet: '',
                    };})
                  ).sort(function(a,b) { return (b.sort || '').localeCompare(a.sort || ''); }).slice(0,15).map(function(tx, i) {
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontSize: 15 }}>
                          {tx.type}
                          {tx.wallet && <span style={{ marginLeft:6, padding:'2px 6px', borderRadius:4, fontSize:14, fontWeight:700, background: tx.wallet === 'campaign' ? '#eef2ff' : 'var(--sap-green-bg)', color: tx.wallet === 'campaign' ? 'var(--sap-indigo)' : 'var(--sap-green)' }}>{tx.wallet === 'campaign' ? t('wallet.campaign') : t('wallet.affiliate')}</span>}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 14, color: 'var(--sap-text-muted)' }}>{tx.detail}</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: tx.amountColor }}>{tx.amount}</td>
                        <td style={tdStyle}>
                          <span style={tx.status === 'paid' ? badgeGreen : tx.status === 'processing' ? badgeCyan : badgeAmber}>{(tx.status || '').charAt(0).toUpperCase() + (tx.status || '').slice(1)}</span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 14, color: '#6b7d94' }}>{tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3d5068', marginBottom: 6 }}>{t('wallet.noTransactions')}</div>
              <div style={{ fontSize: 15, color: '#7b91a8', marginBottom: 16 }}>{t('wallet.referAndActivate')}</div>
              <Link to="/campaign-tiers" style={{ ...btnPrimary, fontSize: 14, padding: '8px 18px' }}>{t('wallet.activateGrid')}</Link>
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Membership Renewal | Send Funds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
        {/* Membership Renewal */}
        <Card title={t("wallet.membershipRenewal")}
          dotColor={renewal.in_grace_period ? 'var(--sap-red)' : renewal.status === 'warning' ? 'var(--sap-amber)' : 'var(--sap-green-mid)'}
          badge={renewal.has_renewal ? (
            renewal.in_grace_period ? { text: '⚠ Grace Period', bg: 'var(--sap-red-bg)', color: 'var(--sap-red)', border: 'var(--sap-red-bg-mid)' } :
            renewal.status === 'warning' ? { text: '⏱ Renews Soon', bg: '#fefce8', color: '#b45309', border: '#fde68a' } :
            { text: '✓ Active', bg: 'var(--sap-green-bg)', color: 'var(--sap-green)', border: '#86efac' }
          ) : null}>
          {renewal.has_renewal ? (<>
            {renewal.in_grace_period && (
              <div style={{ background: 'var(--sap-red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15, color: 'var(--sap-red)', fontWeight: 600 }}>⚠ {t('wallet.graceWarning')}</div>
            )}
            {renewal.status === 'warning' && !renewal.in_grace_period && (
              <div style={{ background: '#fefce8', border: '1px solid rgba(234,179,8,.25)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15, color: '#b45309', fontWeight: 600 }}>⏱ {t('wallet.renewalIn', { days: renewal.days_remaining })} {renewal.can_afford ? t('wallet.youreCovered') : t('wallet.topUpNeeded')}</div>
            )}
            <div className="grid-3-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <MiniStat val={`${renewal.days_remaining || 0}d`} lbl={t('wallet.untilRenewal')} />
              <MiniStat val={`$${renewal.balance || 0}`} lbl={t('wallet.walletBalance')} />
              <MiniStat val={renewal.total_renewals || 0} lbl={t('wallet.totalRenewals')} />
            </div>
            <div style={{ height: 5, borderRadius: 999, background: '#eef1f8', overflow: 'hidden', margin: '10px 0' }}>
              <div style={{ height: '100%', borderRadius: 999, width: `${Math.max(5, 100 - ((renewal.days_remaining || 30) / 30 * 100))}%`, background: renewal.in_grace_period ? 'var(--sap-red)' : renewal.status === 'warning' ? 'var(--sap-amber)' : 'var(--sap-green-mid)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 14, color: '#7b91a8', textAlign: 'right', marginTop: 6 }}>{t('wallet.nextRenewal')} {renewal.next_renewal_date || 'N/A'}</div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(15,25,60,.07)', fontSize: 15, color: '#7b91a8', lineHeight: 1.6 }}>
              💡 {t('wallet.renewalAutoDeducted')}
            </div>
          </>) : (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 16, color: '#7b91a8' }}>{t('wallet.noRenewalData')}</div>
          )}
        </Card>

        {/* Send Funds */}
        <Card title={t("wallet.sendFunds")} dotColor="var(--sap-accent)">
          <p style={{ fontSize: 16, color: '#3d5068', marginBottom: 16 }}>{t('wallet.sendFundsDesc')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 14 }}>{t('wallet.recipientMemberId')}</label>
              <input id="p2pRecipient" type="text" placeholder={t('wallet.userIdPlaceholder')} autoComplete="off" style={p2pInputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 14 }}>{t('wallet.amountUSDT')}</label>
              <input id="p2pAmount" type="number" placeholder="e.g. 20.00" min="1" max="500" step="0.01" style={p2pInputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, fontSize: 14 }}>{t('wallet.noteOptional')}</label>
            <input id="p2pNote" type="text" placeholder={t('wallet.notePlaceholder')} maxLength="200" style={p2pInputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={sendP2P} disabled={p2pSending} style={{
              padding: '12px 26px', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', border: 'none', borderRadius: 9,
              fontSize: 16, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              opacity: p2pSending ? 0.6 : 1,
            }}>{p2pSending ? t('wallet.sending') : t('wallet.sendFundsBtn')}</button>
            <span style={{ fontSize: 14, color: '#7b91a8' }}>{t('wallet.sendLimits')}</span>
          </div>
          {p2pResult && (
            <div style={{ marginTop: 12, padding: '11px 14px', borderRadius: 8, fontSize: 16, fontWeight: 600,
              ...(p2pResult.type === 'success' ? { background: 'var(--sap-green-bg)', border: '1px solid #86efac', color: '#15803d' } : { background: 'var(--sap-red-bg)', border: '1px solid #fecaca', color: 'var(--sap-red)' })
            }}>{p2pResult.msg}</div>
          )}
        </Card>
      </div>

      {/* P2P Transfer History */}
      {(d.p2p_history || []).length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Card title={t("wallet.transferHistory")} dotColor="var(--sap-accent)">
            <div style={{ margin: '-18px -20px', overflow: 'auto', maxHeight:400 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{position:'sticky',top:0,background:'#fff',zIndex:1,boxShadow:'0 1px 0 #e2e8f0'}}><tr>
                  {[t('wallet.date'), t('wallet.direction'), t('wallet.member'), t('wallet.note'), t('wallet.amount')].map(h => <th key={h} style={{ ...thStyle,background:'#fff', ...(h === t('wallet.amount') ? { textAlign: 'right' } : {}) }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {d.p2p_history.map((tx, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontSize: 14, color: '#7b91a8' }}>{tx.created_at}</td>
                      <td style={tdStyle}>{tx.direction === 'sent' ? <span style={{ color: 'var(--sap-red)', fontWeight: 700 }}>↑ {t('wallet.sent')}</span> : <span style={{ color: 'var(--sap-green)', fontWeight: 700 }}>↓ {t('wallet.received')}</span>}</td>
                      <td style={{ ...tdStyle, fontSize: 16, fontWeight: 600 }}>{tx.other_party || tx.other_user}<br /><span style={{ fontSize: 14, color: '#7b91a8' }}>{tx.other_id || ''}</span></td>
                      <td style={{ ...tdStyle, fontSize: 15, color: '#3d5068' }}>{tx.note || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: tx.direction === 'sent' ? 'var(--sap-red)' : 'var(--sap-green)' }}>
                        {tx.direction === 'sent' ? '-' : '+'}${formatMoney(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      {/* First-withdrawal confirmation modal — only ever shown to a member
          on their first-ever withdrawal (total_withdrawn === 0). After a
          successful first withdrawal the gate is permanently passed.
          Belt-and-braces protection against the most common crypto mistake:
          sending to an address on the wrong network. */}
      {pendingWithdrawal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        }}
        onClick={() => setPendingWithdrawal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background:'#fff', borderRadius:14, maxWidth:480, width:'100%',
            padding:'24px 22px', boxShadow:'0 20px 60px rgba(15,23,42,0.4)',
            maxHeight:'90vh', overflow:'auto',
          }}>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:6, fontFamily:'Sora,sans-serif' }}>
              {t('wallet.confirmFirstTitle') || 'Confirm your first withdrawal'}
            </div>
            <div style={{ fontSize:14, color:'var(--sap-text-secondary)', lineHeight:1.55, marginBottom:18 }}>
              {t('wallet.confirmFirstSub') || "We're showing this once to make sure your destination is correct. Crypto sent to the wrong network can't be recovered."}
            </div>

            {/* Amount */}
            <div style={{ padding:'12px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
                {t('wallet.amount') || 'Amount'}
              </div>
              <div style={{ fontSize:24, fontWeight:800, color:'var(--sap-text-primary)', fontFamily:'Sora,sans-serif' }}>
                ${formatMoney(pendingWithdrawal.amount)} <span style={{ fontSize:14, fontWeight:600, color:'var(--sap-text-muted)' }}>USDT</span>
              </div>
            </div>

            {/* Network */}
            <div style={{ padding:'12px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
                {t('wallet.network') || 'Network'}
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--sap-text-primary)' }}>
                {d.wallet_network === 'bsc'
                  ? 'BEP-20 · BNB Smart Chain'
                  : d.wallet_network === 'tron'
                    ? 'TRC-20 · Tron'
                    : (t('wallet.networkUnknown') || 'Unknown')}
              </div>
            </div>

            {/* Full destination address */}
            <div style={{ padding:'12px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
                {t('wallet.destinationAddress') || 'Destination address'}
              </div>
              <div style={{ fontSize:13, fontFamily:'monospace', color:'var(--sap-text-primary)', wordBreak:'break-all', lineHeight:1.5 }}>
                {d.wallet_address}
              </div>
            </div>

            {/* Network warning */}
            <div style={{ padding:'10px 14px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, marginBottom:18, fontSize:13, color:'#854d0e', lineHeight:1.5 }}>
              <strong>{t('wallet.networkWarningTitle') || 'Make sure your wallet supports this network.'}</strong> {t('wallet.networkWarningBody') || 'Funds sent to an address on a different network may be lost permanently. Tap Change above if you need to update your destination.'}
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={() => setPendingWithdrawal(null)}
                disabled={withdrawing}
                style={{
                  flex:1, padding:'12px 14px', borderRadius:10, border:'1.5px solid #e2e8f0',
                  background:'#fff', color:'var(--sap-text-primary)', fontWeight:700, fontSize:15,
                  cursor: withdrawing ? 'not-allowed' : 'pointer',
                }}>
                {t('wallet.cancel') || 'Cancel'}
              </button>
              <button
                onClick={() => dispatchWithdrawal(pendingWithdrawal)}
                disabled={withdrawing}
                style={{
                  flex:2, padding:'12px 14px', borderRadius:10, border:'none',
                  background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff',
                  fontWeight:700, fontSize:15, cursor: withdrawing ? 'not-allowed' : 'pointer',
                  opacity: withdrawing ? 0.7 : 1,
                }}>
                {withdrawing ? (t('wallet.processing') || 'Processing…') : (t('wallet.confirmWithdrawal') || 'Confirm Withdrawal')}
              </button>
            </div>
          </div>
        </div>
      )}
      <VoiceGuide />
    </AppLayout>
  );
}

// ── Shared sub-components ──
function Card({ title, dotColor, badge, headerRight, flex, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(15,25,60,.08)', borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)',
      overflow: 'hidden', transition: 'box-shadow .2s, border-color .2s',
      display: 'flex', flexDirection: 'column', ...(flex ? { flex: 1 } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--sap-cobalt-deep)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor || 'var(--sap-accent)', flexShrink: 0 }} />
          {title}
        </div>
        {badge && <span style={{ fontSize: 14, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: badge.bg, color: badge.color, border: '1px solid ' + badge.border }}>{badge.text}</span>}
        {headerRight}
      </div>
      <div style={{ padding: '18px 20px', flex: 1 }}>{children}</div>
    </div>
  );
}

function StatPill({ value, label, gradient }) {
  return (
    <div style={{
      background: gradient, borderRadius: 14, padding: '18px 20px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{position:'absolute',top:-20,right:-20,width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.1)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-15,left:-15,width:45,height:45,borderRadius:'50%',background:'rgba(255,255,255,0.06)',pointerEvents:'none'}}/>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: '#fff' }}>{value}</div>
    </div>
  );
}

function MiniStat({ val, lbl }) {
  return (
    <div style={{ background: '#f6f8fc', border: '1px solid rgba(15,25,60,.07)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{val}</div>
      <div style={{ fontSize: 14, color: '#7b91a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>{lbl}</div>
    </div>
  );
}

function EarningsCard({ icon, label, value, color, desc }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(15,25,60,.08)', borderRadius: 10, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--sap-text-primary)', marginTop: 2 }}>${formatMoney(value)}</div>
        {desc && <div style={{ fontSize: 15, color: 'var(--sap-text-faint)', marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
    <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: 'var(--sap-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>;
}

// ── Styles ──
const labelStyle = { fontSize: 13, fontWeight: 700, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', padding: '11px 14px', border: '1px solid rgba(15,25,60,.12)', borderRadius: 9, fontSize: 15, color: 'var(--sap-text-primary)', fontFamily: 'inherit', background: '#f6f8fc', boxSizing: 'border-box' };
const payoutNoteStyle = { fontSize: 14, color: '#0c4a6e', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '10px 12px', lineHeight: 1.45, textAlign: 'center' };
const p2pInputStyle = { width: '100%', padding: '11px 14px', border: '1px solid rgba(15,25,60,.12)', borderRadius: 9, fontSize: 15, fontFamily: 'inherit', color: 'var(--sap-text-primary)', background: '#f6f8fc', boxSizing: 'border-box' };
const btnPrimary = { fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', padding: '11px 22px', borderRadius: 9, textDecoration: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block' };
const thStyle = { fontSize: 14, fontWeight: 800, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 1, padding: '11px 14px', borderBottom: '1px solid rgba(15,25,60,.08)', textAlign: 'left', background: '#f6f8fc' };
const tdStyle = { padding: '12px 14px', borderBottom: '1px solid rgba(15,25,60,.05)', fontSize: 15, color: 'var(--sap-text-primary)', verticalAlign: 'middle' };
const badgeGreen = { fontSize: 13, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: 'rgba(22,163,74,.09)', color: 'var(--sap-green)', border: '1px solid rgba(22,163,74,.2)' };
const badgeAmber = { fontSize: 13, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: 'rgba(245,158,11,.09)', color: 'var(--sap-amber-dark)', border: '1px solid rgba(245,158,11,.2)' };
const badgeCyan = { fontSize: 13, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: 'rgba(14,165,233,.09)', color: '#0284c7', border: '1px solid rgba(14,165,233,.2)' };

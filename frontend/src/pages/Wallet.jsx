import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';

export default function Wallet() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberIdCopied, setMemberIdCopied] = useState(false);
  const [p2pResult, setP2pResult] = useState(null);
  const [p2pSending, setP2pSending] = useState(false);

  useEffect(() => {
    apiGet('/api/wallet').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const copyMemberId = () => {
    const id = `SAP-${String(user?.id || 0).padStart(5, '0')}`;
    navigator.clipboard.writeText(id);
    setMemberIdCopied(true);
    setTimeout(() => setMemberIdCopied(false), 2000);
  };

  const sendP2P = async () => {
    const recipient = document.getElementById('p2pRecipient')?.value?.trim();
    const amount = parseFloat(document.getElementById('p2pAmount')?.value);
    const note = document.getElementById('p2pNote')?.value?.trim() || '';
    if (!recipient) { setP2pResult({ type: 'error', msg: 'Please enter a member ID' }); return; }
    if (!amount || amount < 1) { setP2pResult({ type: 'error', msg: 'Please enter a valid amount (min $1)' }); return; }
    setP2pSending(true);
    try {
      const res = await apiPost('/api/p2p-transfer', { to_member_id: recipient, amount, note });
      if (res.success) {
        setP2pResult({ type: 'success', msg: `✓ $${amount.toFixed(2)} sent to ${res.recipient_name} (${res.recipient_id}). New balance: $${res.new_balance.toFixed(2)}` });
        document.getElementById('p2pRecipient').value = '';
        document.getElementById('p2pAmount').value = '';
        document.getElementById('p2pNote').value = '';
        setTimeout(() => { apiGet('/api/wallet').then(d => setData(d)); }, 2000);
      } else {
        setP2pResult({ type: 'error', msg: res.error || 'Transfer failed' });
      }
    } catch (e) { setP2pResult({ type: 'error', msg: e.message || 'Network error' }); }
    setP2pSending(false);
  };

  if (loading) return <AppLayout title="◎ Wallet"><LoadingSpinner /></AppLayout>;
  if (!data) return <AppLayout title="◎ Wallet"><div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Unable to load wallet</div></AppLayout>;

  const d = data;
  const memberId = `SAP-${String(user?.id || 0).padStart(5, '0')}`;
  const renewal = d.renewal || {};

  return (
    <AppLayout title="◎ Wallet" subtitle="Your balance, commissions & withdrawals"
      topbarActions={<>
        <div style={{ background: 'rgba(34,197,94,.09)', border: '1px solid rgba(34,197,94,.22)', borderRadius: 10, padding: '7px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(148,163,184,.5)' }}>Balance</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 800, color: '#4ade80' }}>${d.balance?.toFixed(2)}</div>
        </div>
      </>}
    >
      {/* 3 Stat Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        <StatPill value={`$${d.balance?.toFixed(2)}`} label="Available Balance" gradient="linear-gradient(90deg,#16a34a,#22c55e)" />
        <StatPill value={`$${d.total_earned?.toFixed(2)}`} label="Total Earned" gradient="linear-gradient(90deg,#0ea5e9,#38bdf8)" />
        <StatPill value={`$${d.total_withdrawn?.toFixed(2)}`} label="Total Withdrawn" gradient="linear-gradient(90deg,#6366f1,#818cf8)" />
      </div>

      {/* Row 1: 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
        {/* Col 1: Withdraw */}
        <Card title="Withdraw USDC" dotColor="#16a34a">
          {d.wallet_address ? (
            d.balance >= 10 ? (
              <form method="POST" action="/withdraw" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Amount (USDC)</label>
                  <input style={inputStyle} type="number" name="amount" min="10" max={d.balance} step="0.01" placeholder="0.00" required />
                </div>
                {user?.totp_enabled && (
                  <div>
                    <label style={labelStyle}>2FA Code</label>
                    <input style={{ ...inputStyle, textAlign: 'center', letterSpacing: 6, fontWeight: 700, fontSize: 18 }} type="text" name="totp_code" maxLength="6" pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" required />
                  </div>
                )}
                <button type="submit" style={btnPrimary}>Withdraw →</button>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, color: '#3d5068' }}>💳 <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0284c7' }}>{d.wallet_address?.slice(0, 10)}…{d.wallet_address?.slice(-6)}</span></div>
                  <div style={{ fontSize: 13, color: '#3d5068' }}>💰 Min <strong>$10</strong> · 🏷️ Fee <strong>$1.00</strong></div>
                </div>
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.18)', borderRadius: 10, fontSize: 13, color: '#16a34a' }}>
                  ⚡ Sent automatically as USDC on Base chain.
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>◎</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#3d5068', marginBottom: 6 }}>Minimum $10 USDC to withdraw</div>
                <div style={{ fontSize: 13, color: '#7b91a8', marginBottom: 16 }}>Your balance is ${d.balance?.toFixed(2)}.</div>
                <div style={{ fontSize: 12, color: '#7b91a8', marginTop: 8 }}>Minimum withdrawal is <strong style={{ color: '#3d5068' }}>$10 USDC</strong></div>
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3d5068', marginBottom: 6 }}>No wallet address set</div>
              <div style={{ fontSize: 13, color: '#7b91a8', marginBottom: 16 }}>Add your Base chain wallet address in Account settings.</div>
              <Link to="/account" style={btnPrimary}>Go to Account Settings</Link>
            </div>
          )}
        </Card>

        {/* Col 2: Commission History */}
        <Card title="Commission History" dotColor="#0284c7">
          {(d.commissions || []).length > 0 ? (
            <div style={{ margin: '-18px -20px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Type', 'Tier', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {d.commissions.slice(0, 8).map((c, i) => (
                    <tr key={i} style={{ ':hover': { background: 'rgba(15,25,60,.02)' } }}>
                      <td style={{ ...tdStyle, fontSize: 13 }}>
                        {c.commission_type === 'direct_sponsor' ? '💚 Direct' :
                         c.commission_type === 'uni_level' ? '⚡ Uni-Level' :
                         c.commission_type === 'upline' ? '🔗 Upline' :
                         (c.commission_type || '').replace(/_/g, ' ')}
                      </td>
                      <td style={tdStyle}><span style={badgeCyan}>T{c.package_tier}</span></td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#16a34a' }}>+${(c.amount_usdt || 0).toFixed(2)}</td>
                      <td style={tdStyle}>
                        <span style={c.status === 'paid' ? badgeGreen : badgeAmber}>{(c.status || '').charAt(0).toUpperCase() + (c.status || '').slice(1)}</span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#6b7d94' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3d5068', marginBottom: 6 }}>No commissions yet</div>
              <div style={{ fontSize: 13, color: '#7b91a8', marginBottom: 16 }}>Activate your Income Grid to start earning.</div>
              <Link to="/campaign-tiers" style={{ ...btnPrimary, fontSize: 13, padding: '8px 18px' }}>Activate Grid</Link>
            </div>
          )}
        </Card>

        {/* Col 3: Member ID + Withdrawal History stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
          <Card title="Your Member ID" dotColor="#0ea5e9">
            <p style={{ fontSize: 13, color: '#3d5068', marginBottom: 12 }}>Share this ID so other members can send you funds via P2P transfer.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div onClick={copyMemberId} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: memberIdCopied ? '#dcfce7' : '#f6f8fc', border: '1px solid rgba(14,165,233,.25)',
                borderRadius: 10, padding: '10px 16px', fontSize: 15, fontWeight: 700, color: '#0284c7', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <span>🪪</span>
                <span>{memberId}</span>
                <span style={{ fontSize: 13, color: '#38bdf8' }}>{memberIdCopied ? '✓ Copied!' : 'Copy'}</span>
              </div>
            </div>
          </Card>

          <Card title="Withdrawal History" dotColor="#f59e0b" flex>
            {(d.withdrawals || []).length > 0 ? (
              <div style={{ margin: '-18px -20px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Amount', 'Net', 'Status', 'Date'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {d.withdrawals.map((w, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>${w.amount?.toFixed(2)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#16a34a' }}>${(w.amount - 1).toFixed(2)}</td>
                        <td style={tdStyle}>
                          <span style={w.status === 'paid' ? badgeGreen : w.status === 'processing' ? badgeCyan : badgeAmber}>
                            {(w.status || '').charAt(0).toUpperCase() + (w.status || '').slice(1)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, color: '#6b7d94' }}>{w.requested_at ? new Date(w.requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#7b91a8' }}>No withdrawals yet.</div>
            )}
          </Card>
        </div>
      </div>

      {/* Row 2: Membership Renewal | Send Funds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
        {/* Membership Renewal */}
        <Card title="Membership Renewal"
          dotColor={renewal.in_grace_period ? '#dc2626' : renewal.status === 'warning' ? '#f59e0b' : '#10b981'}
          badge={renewal.has_renewal ? (
            renewal.in_grace_period ? { text: '⚠ Grace Period', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' } :
            renewal.status === 'warning' ? { text: '⏱ Renews Soon', bg: '#fefce8', color: '#b45309', border: '#fde68a' } :
            { text: '✓ Active', bg: '#f0fdf4', color: '#16a34a', border: '#86efac' }
          ) : null}>
          {renewal.has_renewal ? (<>
            {renewal.in_grace_period && (
              <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>⚠ Balance insufficient at renewal — top up to $20 USDC.</div>
            )}
            {renewal.status === 'warning' && !renewal.in_grace_period && (
              <div style={{ background: '#fefce8', border: '1px solid rgba(234,179,8,.25)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: '#b45309', fontWeight: 600 }}>⏱ Renewal in {renewal.days_remaining} day{renewal.days_remaining !== 1 ? 's' : ''} — {renewal.can_afford ? "you're covered ✓" : 'top up needed'}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <MiniStat val={`${renewal.days_remaining || 0}d`} lbl="Until Renewal" />
              <MiniStat val={`$${renewal.balance || 0}`} lbl="Wallet Balance" />
              <MiniStat val={renewal.total_renewals || 0} lbl="Total Renewals" />
            </div>
            <div style={{ height: 5, borderRadius: 999, background: '#eef1f8', overflow: 'hidden', margin: '10px 0' }}>
              <div style={{ height: '100%', borderRadius: 999, width: `${Math.max(5, 100 - ((renewal.days_remaining || 30) / 30 * 100))}%`, background: renewal.in_grace_period ? '#dc2626' : renewal.status === 'warning' ? '#f59e0b' : '#10b981', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#7b91a8', textAlign: 'right', marginTop: 6 }}>Next renewal: {renewal.next_renewal_date || 'N/A'}</div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(15,25,60,.07)', fontSize: 13, color: '#7b91a8', lineHeight: 1.6 }}>
              💡 Your $20 renewal is deducted automatically from your wallet. As long as your wallet has funds your membership stays active — no manual action needed.
            </div>
          </>) : (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 14, color: '#7b91a8' }}>No renewal data available.</div>
          )}
        </Card>

        {/* Send Funds */}
        <Card title="Send Funds to a Member" dotColor="#0ea5e9">
          <p style={{ fontSize: 14, color: '#3d5068', marginBottom: 16 }}>Transfer USDC to any active member using their member ID (e.g. SAP-00042). Instant and fee-free.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Recipient Member ID</label>
              <input id="p2pRecipient" type="text" placeholder="e.g. SAP-00042" autoComplete="off" style={p2pInputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Amount (USDC)</label>
              <input id="p2pAmount" type="number" placeholder="e.g. 20.00" min="1" max="500" step="0.01" style={p2pInputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, fontSize: 11 }}>Note (optional)</label>
            <input id="p2pNote" type="text" placeholder="e.g. Membership gift, commission split..." maxLength="200" style={p2pInputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={sendP2P} disabled={p2pSending} style={{
              padding: '12px 26px', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', border: 'none', borderRadius: 9,
              fontSize: 16, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              opacity: p2pSending ? 0.6 : 1,
            }}>{p2pSending ? 'Sending...' : 'Send Funds →'}</button>
            <span style={{ fontSize: 12, color: '#7b91a8' }}>Min $1 · Max $500 per transfer · Active members only</span>
          </div>
          {p2pResult && (
            <div style={{ marginTop: 12, padding: '11px 14px', borderRadius: 8, fontSize: 16, fontWeight: 600,
              ...(p2pResult.type === 'success' ? { background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' } : { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' })
            }}>{p2pResult.msg}</div>
          )}
        </Card>
      </div>

      {/* Recent Commissions full-width */}
      <Card title="Recent Commissions" dotColor="#f59e0b" headerRight={<Link to="/wallet" style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>Full History →</Link>}>
        {(d.commissions || []).length > 0 ? (
          <div style={{ margin: '0 -20px' }}>
            {d.commissions.slice(0, 5).map((c, i) => {
              const iconBg = c.commission_type === 'direct_sponsor' ? 'rgba(22,163,74,.09)' : c.commission_type === 'uni_level' ? 'rgba(99,102,241,.09)' : 'rgba(14,165,233,.09)';
              const iconBorder = c.commission_type === 'direct_sponsor' ? 'rgba(22,163,74,.15)' : c.commission_type === 'uni_level' ? 'rgba(99,102,241,.15)' : 'rgba(14,165,233,.15)';
              const icon = c.commission_type === 'direct_sponsor' ? '💚' : c.commission_type === 'uni_level' ? '⚡' : c.commission_type === 'membership' ? '🔑' : '◎';
              const title = c.commission_type === 'direct_sponsor' ? 'Direct Sponsor Commission' : c.commission_type === 'uni_level' ? 'Uni-Level Commission' : c.commission_type === 'membership' ? 'Membership Residual' : (c.commission_type || '').replace(/_/g, ' ');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(15,25,60,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: iconBg, border: `1px solid ${iconBorder}` }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
                      <div style={{ fontSize: 13, color: '#7b91a8', marginTop: 2 }}>${c.package_tier} Campaign Tier · {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: c.status === 'paid' ? '#16a34a' : '#f59e0b' }}>+${(c.amount_usdt || 0).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#3d5068', marginBottom: 4 }}>No Commissions Yet</div>
            <div style={{ fontSize: 13, color: '#7b91a8', marginBottom: 14 }}>Activate a tier to start earning</div>
            <Link to="/campaign-tiers" style={{ ...btnPrimary, fontSize: 13, padding: '8px 18px' }}>Activate Grid</Link>
          </div>
        )}
      </Card>

      {/* P2P Transfer History */}
      {(d.p2p_history || []).length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Card title="Transfer History" dotColor="#0ea5e9">
            <div style={{ margin: '-18px -20px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Date', 'Direction', 'Member', 'Note', 'Amount'].map(h => <th key={h} style={{ ...thStyle, ...(h === 'Amount' ? { textAlign: 'right' } : {}) }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {d.p2p_history.map((t, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontSize: 13, color: '#7b91a8' }}>{t.created_at}</td>
                      <td style={tdStyle}>{t.direction === 'sent' ? <span style={{ color: '#dc2626', fontWeight: 700 }}>↑ Sent</span> : <span style={{ color: '#16a34a', fontWeight: 700 }}>↓ Received</span>}</td>
                      <td style={{ ...tdStyle, fontSize: 16, fontWeight: 600 }}>{t.other_party || t.other_user}<br /><span style={{ fontSize: 13, color: '#7b91a8' }}>{t.other_id || ''}</span></td>
                      <td style={{ ...tdStyle, fontSize: 13, color: '#3d5068' }}>{t.note || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: t.direction === 'sent' ? '#dc2626' : '#16a34a' }}>
                        {t.direction === 'sent' ? '-' : '+'}${(t.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}

// ── Shared sub-components ──
function Card({ title, dotColor, badge, headerRight, flex, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(15,25,60,.08)', borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)',
      overflow: 'hidden', transition: 'box-shadow .2s, border-color .2s',
      display: 'flex', flexDirection: 'column', ...(flex ? { flex: 1 } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid rgba(15,25,60,.07)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          {title}
        </div>
        {badge && <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.text}</span>}
        {headerRight}
      </div>
      <div style={{ padding: '18px 20px', flex: 1 }}>{children}</div>
    </div>
  );
}

function StatPill({ value, label, gradient }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(15,25,60,.08)', borderRadius: 16, padding: 20, textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)',
      position: 'relative', overflow: 'hidden', transition: 'box-shadow .2s, transform .15s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient }} />
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, marginBottom: 6, color: '#16a34a' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 6 }}>{label}</div>
    </div>
  );
}

function MiniStat({ val, lbl }) {
  return (
    <div style={{ background: '#f6f8fc', border: '1px solid rgba(15,25,60,.07)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{val}</div>
      <div style={{ fontSize: 10, color: '#7b91a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>{lbl}</div>
    </div>
  );
}

function LoadingSpinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
    <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>;
}

// ── Styles ──
const labelStyle = { fontSize: 12, fontWeight: 700, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', padding: '11px 14px', border: '1px solid rgba(15,25,60,.12)', borderRadius: 9, fontSize: 15, color: '#0f172a', fontFamily: 'inherit', background: '#f6f8fc', boxSizing: 'border-box' };
const p2pInputStyle = { width: '100%', padding: '11px 14px', border: '1px solid rgba(15,25,60,.12)', borderRadius: 9, fontSize: 15, fontFamily: 'inherit', color: '#0f172a', background: '#f6f8fc', boxSizing: 'border-box' };
const btnPrimary = { fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', padding: '11px 22px', borderRadius: 9, textDecoration: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block' };
const thStyle = { fontSize: 11, fontWeight: 800, color: '#7b91a8', textTransform: 'uppercase', letterSpacing: 1, padding: '11px 14px', borderBottom: '1px solid rgba(15,25,60,.08)', textAlign: 'left', background: '#f6f8fc' };
const tdStyle = { padding: '12px 14px', borderBottom: '1px solid rgba(15,25,60,.05)', fontSize: 15, color: '#0f172a', verticalAlign: 'middle' };
const badgeGreen = { fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: 'rgba(22,163,74,.09)', color: '#16a34a', border: '1px solid rgba(22,163,74,.2)' };
const badgeAmber = { fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: 'rgba(245,158,11,.09)', color: '#d97706', border: '1px solid rgba(245,158,11,.2)' };
const badgeCyan = { fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: 'rgba(14,165,233,.09)', color: '#0284c7', border: '1px solid rgba(14,165,233,.2)' };

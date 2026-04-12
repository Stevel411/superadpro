import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';

var HELP_SECTIONS = [
  {
    category: 'Understanding Your Wallets',
    color: 'var(--sap-green)',
    items: [
      { title: 'Why are there two wallets?', desc: 'SuperAdPro separates your earnings into two wallets to keep things transparent and fair. Your Affiliate Wallet holds earnings from referrals and sponsoring — these are always yours to withdraw. Your Campaign Wallet holds earnings from the 8×8 Income Grid — these require you to have an active Campaign Tier and be watching your daily videos.' },
      { title: 'What goes into my Affiliate Wallet?', desc: 'Membership referral commissions ($10 per Basic, $17.50 per Pro referral), Creative Studio sponsor micro-commissions ($0.025 per credit your referrals use), course sales commissions, and Pay It Forward gift commissions. This balance is always available to withdraw.' },
      { title: 'What goes into my Campaign Wallet?', desc: 'Campaign Tier grid commissions: 40% direct sponsor commission when your referral activates a tier, 6.25% uni-level commission from 8 levels deep in your network, and grid completion bonuses when your 8×8 grid fills all 64 positions.' },
      { title: 'Can I move money between wallets?', desc: 'No — earnings are automatically credited to the correct wallet based on where they came from. This protects the integrity of the campaign system and ensures everyone is contributing to the network.' },
    ],
  },
  {
    category: 'Withdrawals',
    color: 'var(--sap-accent)',
    items: [
      { title: 'How do I withdraw from my Affiliate Wallet?', desc: 'Go to your Wallet page, find the green Affiliate Wallet card, enter the amount you want to withdraw (minimum $10), enter your 2FA code, and click Withdraw. The USDT is sent automatically to your Polygon wallet address.' },
      { title: 'How do I withdraw from my Campaign Wallet?', desc: 'Same process, but using the purple Campaign Wallet card. You must have an active Campaign Tier and be meeting your daily Watch-to-Earn video quota. If either requirement is not met, you will see a clear error message explaining what to do.' },
      { title: 'What are the withdrawal requirements?', desc: 'For both wallets: KYC identity verification must be approved, 2FA must be enabled, minimum withdrawal is $10, there is a $1 flat fee per withdrawal, maximum $500 per day, and your account must be at least 7 days old.' },
      { title: 'What additional requirements does the Campaign Wallet have?', desc: 'You must have at least one active (non-complete) Campaign Tier grid, and your Watch-to-Earn daily video quota must not be paused. If you miss your quota for 5 or more consecutive days, campaign withdrawals are temporarily blocked until you resume watching.' },
      { title: 'Where does my withdrawal go?', desc: 'Withdrawals are sent as USDT on the Polygon network to the wallet address you have saved in your Account settings. Make sure your wallet supports Polygon (MetaMask, Trust Wallet, Coinbase Wallet all do). Sending to the wrong network will result in lost funds.' },
      { title: 'How long does a withdrawal take?', desc: 'Withdrawals are processed automatically and typically arrive within 1-2 minutes. In rare cases, if the treasury needs a top-up, withdrawals are queued and processed within 24 hours.' },
    ],
  },
  {
    category: 'Campaign Tier Requirements',
    color: 'var(--sap-indigo)',
    items: [
      { title: 'Why do I need a Campaign Tier to withdraw grid earnings?', desc: 'Campaign Tiers fund the video advertising engine. When you activate a tier, your video campaigns run across the network. Other members watch your videos as part of Watch-to-Earn. This creates real value — views for your content and commissions for watchers. Requiring an active tier ensures everyone is contributing.' },
      { title: 'What is Watch-to-Earn?', desc: 'Every member with an active Campaign Tier must watch a set number of videos daily (1-8 depending on your tier level). This delivers views to other members campaigns and keeps the ecosystem active. Missing your quota for 5 consecutive days pauses your campaign wallet withdrawals.' },
      { title: 'My campaign wallet withdrawal was blocked — what do I do?', desc: 'Check two things: 1) Do you have an active Campaign Tier? If not, go to Campaign Tiers and activate one. 2) Have you been watching your daily videos? If your Watch-to-Earn quota is paused, complete today\'s videos to reactivate. Your campaign earnings are safe — they never expire.' },
      { title: 'Do I lose my campaign earnings if my tier expires?', desc: 'No. Your campaign balance is always preserved. You just cannot withdraw until you reactivate a tier and resume your daily watch quota. Think of it as a pause, not a loss.' },
    ],
  },
  {
    category: 'Fees & Limits',
    color: 'var(--sap-amber)',
    items: [
      { title: 'What fees are there?', desc: 'A flat $1 fee is deducted from every withdrawal to cover Polygon network gas costs. There are no percentage-based fees. What you see in your wallet is what you earn — the $1 is only taken at withdrawal.' },
      { title: 'What is the minimum withdrawal?', desc: '$10 minimum per withdrawal (before the $1 fee, so you receive $9 minimum). This applies to both wallets.' },
      { title: 'Is there a daily limit?', desc: 'Yes — maximum $500 per day across both wallets combined. This is a security measure to protect your account.' },
      { title: 'What is the cooldown period?', desc: 'New accounts must wait 7 days after registration before their first withdrawal. This prevents fraud and protects the community.' },
    ],
  },
  {
    category: 'Security',
    color: 'var(--sap-red-bright)',
    items: [
      { title: 'What is KYC?', desc: 'Know Your Customer — identity verification required before withdrawals. Upload a government-issued photo ID in your Account settings. This is reviewed within 24-48 hours and is a one-time process.' },
      { title: 'What is 2FA?', desc: 'Two-Factor Authentication adds an extra security layer. You need an authenticator app (Google Authenticator, Authy) that generates a 6-digit code. Enable it in Account settings. Every withdrawal requires this code.' },
      { title: 'Is my money safe?', desc: 'Yes. Your balances are stored in our secure database and all withdrawals are processed on the Polygon blockchain — fully transparent and verifiable. The dual wallet system ensures commission integrity, and 2FA + KYC protect against unauthorised access.' },
    ],
  },
];

export default function WalletHelp({ onBack }) {
  var [search, setSearch] = useState('');
  var [openSection, setOpenSection] = useState(0);
  var [openItem, setOpenItem] = useState(null);

  var filtered = HELP_SECTIONS.map(function(section) {
    if (!search) return section;
    var items = section.items.filter(function(item) {
      return item.title.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase());
    });
    return items.length > 0 ? Object.assign({}, section, { items: items }) : null;
  }).filter(Boolean);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--sap-text-primary)' }}>{t('walletHelp.walletGuide')}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--sap-text-muted)' }}>{t('walletHelp.walletGuideDesc')}</p>
        </div>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color="var(--sap-text-faint)"/>
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} color="var(--sap-text-faint)" style={{ position: 'absolute', left: 14, top: 12 }}/>
        <input value={search} onChange={function(e) { setSearch(e.target.value); }}
          placeholder={t('walletHelp.searchWalletHelp')}
          style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
      </div>

      {filtered.map(function(section, si) {
        var isOpen = openSection === si || search;
        return (
          <div key={si} style={{ marginBottom: 12 }}>
            <div onClick={function() { setOpenSection(isOpen && !search ? -1 : si); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: isOpen ? '12px 12px 0 0' : 12, cursor: 'pointer' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: section.color, flexShrink: 0 }}/>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{section.category}</div>
              <div style={{ color: 'var(--sap-text-faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><ChevronRight size={16}/></div>
            </div>
            {isOpen && (
              <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                {section.items.map(function(item, ii) {
                  var itemKey = si + '-' + ii;
                  var itemOpen = openItem === itemKey;
                  return (
                    <div key={ii}>
                      <div onClick={function() { setOpenItem(itemOpen ? null : itemKey); }}
                        style={{ padding: '12px 18px', background: itemOpen ? 'var(--sap-bg-elevated)' : '#fff', cursor: 'pointer', borderTop: ii > 0 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{item.title}</span>
                        <ChevronDown size={14} color="var(--sap-text-faint)" style={{ transform: itemOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}/>
                      </div>
                      {itemOpen && (
                        <div style={{ padding: '0 18px 14px', background: 'var(--sap-bg-elevated)', fontSize: 13, color: 'var(--sap-text-secondary)', lineHeight: 1.8 }}>{item.desc}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

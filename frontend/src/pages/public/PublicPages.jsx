import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';

function FAQItem({ q, a }) {
  var [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <button onClick={function(){setOpen(!open);}} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{q}</span>
        <span style={{ fontSize: 20, color: '#38bdf8', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
      </button>
      {open && <div style={{ paddingBottom: 20, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>{a}</div>}
    </div>
  );
}

var faqs = [
  { q: 'Is SuperAdPro free to join?', a: 'Yes — registering is completely free. You pay for membership ($20/mo Basic or $30/mo Pro) to activate your earning ability and access the platform features.' },
  { q: 'When do I get paid?', a: 'Commissions are credited to your platform wallet instantly when they\'re earned. You can withdraw to your crypto wallet at any time, subject to a minimum withdrawal threshold.' },
  { q: 'What\'s the difference between Basic and Pro?', a: 'Basic ($20/mo) gives you full affiliate earnings, campaign grid access, and your affiliate link. Pro ($30/mo) adds AI Co-Pilot, SuperLeads CRM, SuperSeller automation, SuperPages builder, email autoresponder, and lead analytics.' },
  { q: 'Do I have to recruit people to earn?', a: 'Not exclusively. While referring others accelerates income through membership commissions, you also earn grid completion bonuses driven by your whole team\'s activity — not just people you personally recruited.' },
  { q: 'How does the campaign grid work?', a: 'Each campaign tier has an 8×8 grid with 64 positions. As members across your network join that tier, positions fill. When all 64 fill, a completion bonus is triggered and paid to the grid owner. A single campaign can complete multiple times.' },
  { q: 'What are uni-level commissions?', a: 'When anyone in your network (up to 8 levels deep) makes a grid purchase, you earn 6.25% of that purchase automatically. This means a large team generates passive income for you without any additional effort.' },
  { q: 'What currency are earnings paid in?', a: 'All earnings are in USDT (a dollar-pegged stablecoin) paid on the Base blockchain. You need a compatible crypto wallet to receive withdrawals.' },
  { q: 'How do course commissions work?', a: 'When you sell a course, you earn a direct commission. Every 3rd sale passes up to your sponsor — who earns a larger commission. This creates a powerful incentive chain.' },
  { q: 'Is there a lock-in period for membership?', a: 'No. Membership is billed monthly with no contract. You can cancel at any time, though your earnings will stop when membership lapses.' },
  { q: 'How do I get support?', a: 'Members can access support through the platform\'s help system. You can also reach us through the contact page.' },
];

export function FAQ() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>FAQ</div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, margin: '0 0 16px' }}>Frequently Asked Questions</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Everything you need to know before joining.</p>
        </div>

        <div style={{ marginBottom: 56 }}>
          {faqs.map(function(f) { return <FAQItem key={f.q} q={f.q} a={f.a}/>; })}
        </div>

        <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Still have questions?</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/support" style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>Contact Support</Link>
            <Link to="/register" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>Join Free</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function LegalSection({ title, children }) {
  var hS = { fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#38bdf8', marginBottom: 14 };
  var wS = { fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.85 };
  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={hS}>{title}</h2>
      <div style={wS}>{children}</div>
    </div>
  );
}

export function Legal() {
  var p = { marginBottom: 14 };
  var bold = { marginBottom: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)' };
  return (
    <PublicLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 40, fontWeight: 900, marginBottom: 8 }}>Legal</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 48 }}>Last updated: March 2026</p>

        <LegalSection title="Terms of Service">
          <p style={p}>By using SuperAdPro, you agree to these terms. SuperAdPro is a video advertising and affiliate marketing platform. Members earn commissions by referring others and participating in campaign grids.</p>
          <p style={p}>Membership fees are non-refundable after the billing period begins. We reserve the right to terminate accounts that violate our policies. Continued use of the platform constitutes acceptance of these terms.</p>
        </LegalSection>

        <LegalSection title="Earnings Disclaimer">
          <p style={p}>Income examples shown on this platform are illustrative only. Individual results will vary based on effort, network size, market conditions, and other factors. SuperAdPro does not guarantee any specific level of income.</p>
          <p style={p}>Participation in the platform involves financial risk and should be treated as a business venture. Past performance of other members is not indicative of your own results.</p>
        </LegalSection>

        <LegalSection title="Privacy Policy">
          <p style={p}>We collect the minimum data necessary to operate the platform - your name, email, username, transaction history, and identity documents where required for withdrawal verification.</p>
          <p style={p}>We do not sell your data to third parties. We use industry-standard encryption to protect your information. You may request access to, correction of, or deletion of your data at any time by contacting support.</p>
        </LegalSection>

        <LegalSection title="Acceptable Use">
          <p style={p}>Members may not use SuperAdPro to promote illegal products or services, spam other members, create fake accounts, or manipulate the referral system. Violations may result in immediate account termination and forfeiture of earnings.</p>
        </LegalSection>

        <LegalSection title="Cryptocurrency & Payments">
          <p style={p}>All earnings are paid in USDT on the Base blockchain. Cryptocurrency transactions are irreversible. SuperAdPro is not responsible for losses due to incorrect wallet addresses provided by members. Exchange rates and network fees are the responsibility of the member.</p>
        </LegalSection>

        <LegalSection title="Identity Verification (KYC) Policy">
          <p style={p}>SuperAdPro is required to verify the identity of members before processing withdrawals, in compliance with anti-money laundering (AML) regulations. Identity verification (Know Your Customer, or KYC) is completed once, before your first withdrawal.</p>
          <p style={bold}>What we collect</p>
          <p style={p}>Full legal name, date of birth, and a government-issued photo ID - passport, driver's licence, or national ID card.</p>
          <p style={bold}>How we use it</p>
          <p style={p}>Your documents are used solely to verify your identity and comply with our legal obligations. We do not share your documents with third parties except where required by law.</p>
          <p style={bold}>How we store it</p>
          <p style={p}>Documents are encrypted and stored securely in Cloudflare R2 object storage. Access is restricted to authorised staff only. Documents are retained for a minimum of 5 years as required by UK AML regulations.</p>
          <p style={bold}>Your rights</p>
          <p style={p}>You have the right to request access to your personal data, request correction of inaccuracies, or request deletion (subject to legal retention requirements). Contact our support team to exercise these rights.</p>
          <p style={bold}>Processing time</p>
          <p style={p}>KYC applications are typically reviewed within 24-48 hours. You will be notified once a decision has been made.</p>
        </LegalSection>

        <LegalSection title="Anti-Money Laundering (AML) Policy">
          <p style={p}>SuperAdPro is committed to preventing money laundering and the financing of illegal activities. We operate in compliance with applicable UK AML legislation including the Proceeds of Crime Act 2002 and the Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017.</p>
          <p style={p}>We monitor transactions for suspicious activity and reserve the right to suspend or terminate accounts, withhold funds, and report activity to relevant authorities where required by law.</p>
          <p style={p}>Members are prohibited from using SuperAdPro to launder funds, obscure the origins of payments, or facilitate any illegal financial activity. Violation of this policy will result in immediate account termination and may be reported to law enforcement.</p>
        </LegalSection>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 32, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          Questions about our legal terms? <Link to="/support" style={{ color: '#38bdf8', textDecoration: 'none' }}>Contact us</Link>
        </div>
      </div>
    </PublicLayout>
  );
}


export function ForAdvertisers() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Advertisers</div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, margin: '0 0 20px' }}>
            Reach an engaged<br/>video audience
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
            SuperAdPro members watch videos as part of earning campaigns. Your ads get genuine attention from motivated viewers.
          </p>
          <Link to="/register" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: "'Sora',sans-serif" }}>
            Get Started →
          </Link>
        </div>

        {/* Benefits */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 64 }}>
          {[
            { icon: '👁️', title: 'Genuine views', desc: 'Members are incentivised to watch fully — no bots, no skipping, no fake engagement.' },
            { icon: '🎯', title: 'Motivated audience', desc: 'Our members are entrepreneurs and business-minded individuals — a high-quality demographic.' },
            { icon: '📊', title: 'Transparent reporting', desc: 'Track your views, engagement, and campaign performance in real time.' },
            { icon: '💰', title: 'Cost effective', desc: 'Competitive CPM rates with guaranteed view delivery across our member network.' },
            { icon: '🔄', title: 'Recurring exposure', desc: 'Members return daily to watch campaigns — your brand gets repeated exposure.' },
            { icon: '⚡', title: 'Fast setup', desc: 'Submit your video, set your budget, and go live within 24 hours.' },
          ].map(function(b) {
            return (
              <div key={b.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{b.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{b.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{b.desc}</div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.1),rgba(99,102,241,0.08))', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 20, padding: '48px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>Ready to advertise?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>Create a free account and launch your first campaign today.</p>
          <Link to="/register" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: "'Sora',sans-serif" }}>
            Create Advertiser Account →
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

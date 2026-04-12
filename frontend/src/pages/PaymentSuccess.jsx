import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Loader, ArrowRight, Home } from 'lucide-react';

var TYPE_CONFIG = {
  membership: {
    icon: '🎉',
    title: 'Membership Activated!',
    desc: 'Your SuperAdPro membership is now active. Welcome to the network!',
    action: '/dashboard',
    actionLabel: 'Go to Dashboard',
    color: 'var(--sap-green-mid)',
  },
  grid: {
    icon: '⚡',
    title: 'Campaign Tier Purchased!',
    desc: 'You\'ve been placed in the grid. Your commissions are now active.',
    action: '/campaign-tiers',
    actionLabel: 'View Campaign Tiers',
    color: 'var(--sap-indigo)',
  },
  course: {
    icon: '🎓',
    title: 'Course Unlocked!',
    desc: 'Your course is now available. Head to My Courses to start learning.',
    action: '/courses/my-courses',
    actionLabel: 'View My Courses',
    color: 'var(--sap-purple)',
  },
  supermarket: {
    icon: '🛒',
    title: 'Purchase Complete!',
    desc: 'Your digital product is ready to download.',
    action: '/marketplace',
    actionLabel: 'View SuperMarket',
    color: 'var(--sap-accent)',
  },
  email_boost: {
    icon: '🚀',
    title: 'Email Boost Activated!',
    desc: 'Your email credits have been added. Start sending!',
    action: '/pro/leads',
    actionLabel: 'Go to SuperLeads',
    color: 'var(--sap-red-bright)',
  },
};

export default function PaymentSuccess() {
  var { t } = useTranslation();
  var [params] = useSearchParams();
  var navigate = useNavigate();
  var { refreshUser } = useAuth();
  var [status, setStatus] = useState('loading'); // loading | success | error

  var type = params.get('type') || 'membership';
  var config = TYPE_CONFIG[type] || TYPE_CONFIG.membership;

  useEffect(function() {
    // Give webhook a moment to process, then refresh user data
    var timer = setTimeout(function() {
      refreshUser().then(function() {
        setStatus('success');
      }).catch(function() {
        setStatus('success'); // Still show success even if refresh fails
      });
    }, 2000);
    return function() { clearTimeout(timer); };
  }, []);

  return (
    <AppLayout title={t('paymentSuccess.paymentComplete')}>
      <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>

        {status === 'loading' ? (
          <div style={{ padding: '60px 40px', background: '#fff', borderRadius: 24, border: '1px solid #e8ecf2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={28} color={config.color} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 8 }}>{t('paymentSuccess.confirming')}</div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-faint)' }}>{t('paymentSuccess.pleaseWaitFull')}</div>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #e8ecf2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Top colour bar */}
            <div style={{ height: 6, background: `linear-gradient(90deg, ${config.color}, ${config.color}88)` }} />

            <div style={{ padding: '48px 40px 40px' }}>
              {/* Icon */}
              <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>{config.icon}</div>

              {/* Check badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${config.color}12`, border: `1px solid ${config.color}30`, borderRadius: 99, padding: '4px 14px', marginBottom: 20 }}>
                <CheckCircle size={14} color={config.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: config.color }}>{t('paymentSuccess.paymentConfirmed')}</span>
              </div>

              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--sap-text-primary)', marginBottom: 10 }}>
                {config.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
                {config.desc}
              </div>

              {/* CTA */}
              <button
                onClick={function() { navigate(config.action); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: `0 4px 16px ${config.color}40`, marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                {config.actionLabel} <ArrowRight size={16} />
              </button>

              <button
                onClick={function() { navigate('/dashboard'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1px solid #e8ecf2', background: '#fff', color: 'var(--sap-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
              >
                <Home size={14} /> Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

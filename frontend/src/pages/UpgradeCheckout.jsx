// Legacy upgrade-checkout page — Basic/Pro tier selection + payment flow
// retired 20 May 2026. Under flat-pricing (locked 15 May 2026) the only
// paid tier is Partner ($20/mo) with the Founding inventory for the first
// 100 ($15/mo locked). The real payment flow lives at /upgrade
// (PartnerPayment.jsx). This file is kept only because the route is still
// wired in App.jsx for any stale bookmarks or emails pointing at
// /upgrade/checkout.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UpgradeCheckout() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/upgrade', { replace: true });
  }, [navigate]);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      fontFamily: "'DM Sans', sans-serif",
      color: '#475569',
    }}>
      Redirecting to the current upgrade page…
    </div>
  );
}

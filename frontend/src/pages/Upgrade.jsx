// Legacy upgrade page — Basic/Pro tier selector retired 20 May 2026.
// Under flat-pricing (locked 15 May 2026) there is one paid tier (Partner)
// and a Founding inventory for the first 100 active members. The real
// activation flow lives at /upgrade (PartnerPayment.jsx). This file is
// kept only because the route is still wired in App.jsx for any stale
// bookmarks pointing at /upgrade/legacy.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Upgrade() {
  const navigate = useNavigate();
  useEffect(() => {
    window.location.replace('/join');
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

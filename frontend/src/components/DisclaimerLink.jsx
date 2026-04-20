import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * DisclaimerLink — small centred link to the public income disclosure page.
 * Drop this at the very bottom of any public page's content (above or below
 * any existing page-specific footer). Purely an end-of-page anchor — not
 * fixed/floating.
 */
export default function DisclaimerLink() {
  var { t } = useTranslation();
  return (
    <div style={{
      textAlign: 'center',
      padding: '32px 20px 28px',
      fontSize: 12,
      color: 'rgba(200,220,255,0.35)',
    }}>
      <Link to="/legal/income-disclosure" style={{
        color: 'rgba(200,220,255,0.5)',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(200,220,255,0.2)',
        paddingBottom: 2,
        transition: 'color .2s, border-color .2s',
      }}
      onMouseEnter={function(e) { e.currentTarget.style.color = 'rgba(200,220,255,0.9)'; e.currentTarget.style.borderBottomColor = 'rgba(200,220,255,0.5)'; }}
      onMouseLeave={function(e) { e.currentTarget.style.color = 'rgba(200,220,255,0.5)'; e.currentTarget.style.borderBottomColor = 'rgba(200,220,255,0.2)'; }}
      >
        {t('common.disclaimerLink', { defaultValue: 'Disclaimer' })}
      </Link>
    </div>
  );
}

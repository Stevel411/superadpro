/*
  ScriptsPanel — analytics & tracking pixel manager.

  Built 22 May 2026 for the inspector's empty-state page settings.
  Steve's brief: 'industry standard' approach. That's the hybrid
  model — restricted provider fields for the 95% case (GA4, Meta
  Pixel, GTM, TikTok Pixel, Microsoft Clarity), advanced raw-script
  textareas behind a warning toggle for power users.

  This component is presentational; persistence happens via the
  onChange callback which writes to pageSettings.scripts in the
  inspector parent. The published-page export reads the same data
  and injects the right <script> tags into the page <head>/<body>.

  Security model:
  - Restricted providers: members paste only an ID (e.g.
    'G-XXXXXXXXXX' for GA4). The platform generates the snippet,
    so members can't break or inject anything.
  - Advanced (head + body) raw script blocks: members can paste any
    HTML. The platform doesn't sanitise — output is verbatim. This
    is industry standard (Webflow, Carrd, Leadpages all behave the
    same way). Members enable this via the toggle which makes it
    explicit they're choosing power-user mode.

  ID format validation is light — we strip whitespace and warn but
  don't block. The published-page export will silently skip empty
  fields, so a member who pastes a malformed ID just gets nothing.
*/
import { useState, useEffect } from 'react';

// Provider definitions. id is the storage key on pageSettings.scripts.
// pattern is a regex for soft-validation (warning, not blocking).
// docsUrl is shown as a 'Where do I find this?' link.
const PROVIDERS = [
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    icon: '◬',
    placeholder: 'G-XXXXXXXXXX',
    pattern: /^G-[A-Z0-9]+$/,
    docsUrl: 'https://support.google.com/analytics/answer/9304153',
    docsLabel: 'Find your G- ID',
  },
  {
    id: 'metaPixel',
    label: 'Meta Pixel (Facebook / Instagram)',
    icon: 'ƒ',
    placeholder: '1234567890123456',
    pattern: /^\d{10,20}$/,
    docsUrl: 'https://www.facebook.com/business/help/952192354843755',
    docsLabel: 'Find your Pixel ID',
  },
  {
    id: 'gtm',
    label: 'Google Tag Manager',
    icon: '⌧',
    placeholder: 'GTM-XXXXXXX',
    pattern: /^GTM-[A-Z0-9]+$/,
    docsUrl: 'https://support.google.com/tagmanager/answer/6103696',
    docsLabel: 'Find your GTM ID',
  },
  {
    id: 'tiktokPixel',
    label: 'TikTok Pixel',
    icon: '♪',
    placeholder: 'C123ABC456DEF789',
    pattern: /^[A-Z0-9]{16,}$/,
    docsUrl: 'https://ads.tiktok.com/help/article/get-started-pixel',
    docsLabel: 'Find your Pixel ID',
  },
  {
    id: 'clarity',
    label: 'Microsoft Clarity',
    icon: 'Ⓒ',
    placeholder: 'abcdefghij',
    pattern: /^[a-z0-9]{8,15}$/,
    docsUrl: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup',
    docsLabel: 'Find your Project ID',
  },
];

const labelStyle = {
  fontSize: 10, fontWeight: 800,
  color: '#4d648c',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #0a1438',
  borderRadius: 6,
  fontSize: 12,
  color: '#0f172a',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'monospace',
};

function ProviderRow({ provider, value, onChange }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);

  const trimmed = local.trim();
  const hasValue = trimmed.length > 0;
  const formatValid = !hasValue || provider.pattern.test(trimmed);

  return (
    <div style={{
      padding: 10,
      background: '#f3f8fd',
      border: '1px solid #c5d7ef',
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18,
            background: hasValue ? '#22d3ee' : '#c5d7ef',
            color: hasValue ? '#0a1438' : '#6b80a8',
            borderRadius: 4,
            fontSize: 11, fontWeight: 700,
          }}>{provider.icon}</span>
          <span style={{ ...labelStyle, marginBottom: 0 }}>{provider.label}</span>
        </div>
        {hasValue && formatValid && (
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: '#34d399',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 4,
            padding: '1px 6px',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>Active</span>
        )}
      </div>
      <input
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onChange(trimmed)}
        placeholder={provider.placeholder}
        style={{
          ...inputStyle,
          borderColor: hasValue && !formatValid ? '#f59e0b' : '#0a1438',
        }}
      />
      {hasValue && !formatValid && (
        <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>
          Format looks off — expected like <code style={{background:'#fff',padding:'1px 5px',borderRadius:4,border:'1px solid #c5d7ef',color:'#1e293b'}}>{provider.placeholder}</code>
        </div>
      )}
      <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-block',
        fontSize: 10, color: '#0369a1', fontWeight: 600,
        marginTop: 4,
        textDecoration: 'none',
      }}>
        {provider.docsLabel} ↗
      </a>
    </div>
  );
}

export default function ScriptsPanel({ scripts, onChange }) {
  const s = scripts || {};
  const advancedEnabled = !!s.advancedEnabled;

  const updateField = (key, value) => {
    onChange({ ...s, [key]: value });
  };

  const activeCount = PROVIDERS.filter(p => (s[p.id] || '').trim().length > 0).length;
  const advancedHasContent = !!(s.customHead || s.customBody);

  return (
    <div>
      {/* Summary */}
      {activeCount > 0 && (
        <div style={{
          fontSize: 11,
          color: '#4d648c',
          marginBottom: 8,
          padding: '6px 10px',
          background: 'rgba(34,211,238,0.08)',
          border: '1px solid rgba(34,211,238,0.2)',
          borderRadius: 6,
        }}>
          {activeCount} tracker{activeCount === 1 ? '' : 's'} active on this page
        </div>
      )}

      {/* Providers */}
      {PROVIDERS.map(provider => (
        <ProviderRow
          key={provider.id}
          provider={provider}
          value={s[provider.id]}
          onChange={(v) => updateField(provider.id, v)}
        />
      ))}

      {/* Advanced — raw scripts */}
      <div style={{
        marginTop: 14,
        padding: 10,
        border: '1px solid ' + (advancedEnabled ? 'rgba(245,158,11,0.4)' : '#c5d7ef'),
        background: advancedEnabled ? 'rgba(245,158,11,0.05)' : '#f3f8fd',
        borderRadius: 8,
      }}>
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          cursor: 'pointer',
          marginBottom: advancedEnabled ? 10 : 0,
        }}>
          <input
            type="checkbox"
            checked={advancedEnabled}
            onChange={e => updateField('advancedEnabled', e.target.checked)}
            style={{ marginTop: 2, cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
              Advanced — raw script tags
            </div>
            <div style={{ fontSize: 12, color: '#4d648c', lineHeight: 1.5 }}>
              Paste any HTML or <code style={{background:'#fff',padding:'1px 5px',borderRadius:4,border:'1px solid #c5d7ef',color:'#1e293b'}}>&lt;script&gt;</code> tags directly into your page.
              Use this only if you know what you're doing — code here runs on every visitor's browser
              and isn't checked for safety.
            </div>
          </div>
        </label>

        {advancedEnabled && (
          <>
            <div style={{ marginTop: 12 }}>
              <div style={labelStyle}>In page &lt;head&gt;</div>
              <textarea
                value={s.customHead || ''}
                onChange={e => updateField('customHead', e.target.value)}
                placeholder={'<script>\n  // Your code here\n</script>'}
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical', minHeight: 80,
                  fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5,
                }}
              />
              <div style={{ fontSize: 12, color: '#6b80a8', marginTop: 4, lineHeight: 1.4 }}>
                Runs first, before page renders. Best for analytics, fonts, meta tags.
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={labelStyle}>Before &lt;/body&gt;</div>
              <textarea
                value={s.customBody || ''}
                onChange={e => updateField('customBody', e.target.value)}
                placeholder={'<script>\n  // Your code here\n</script>'}
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical', minHeight: 80,
                  fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5,
                }}
              />
              <div style={{ fontSize: 12, color: '#6b80a8', marginTop: 4, lineHeight: 1.4 }}>
                Runs after page loads. Best for chat widgets, lazy-loaded scripts.
              </div>
            </div>
          </>
        )}

        {!advancedEnabled && advancedHasContent && (
          <div style={{
            marginTop: 10,
            padding: '6px 10px',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 6,
            fontSize: 10, color: '#fbbf24',
            lineHeight: 1.4,
          }}>
            You have custom scripts saved but advanced mode is off — those scripts won't run on the published page until you re-enable advanced.
          </div>
        )}
      </div>
    </div>
  );
}

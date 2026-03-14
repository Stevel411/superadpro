import { Play } from 'lucide-react';

export default function EditorTopbar({ title, slug, saving, dirty, onSave, onClear, onShowSettings, onUndo, onRedo, onBack }) {
  return (
    <div style={{
      height: 50, background: '#141829', borderBottom: '1px solid #1f2440',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 15, color: '#fff' }}>
        SuperAd<em style={{ color: '#0ea5e9', fontStyle: 'normal' }}>Pro</em>
      </div>
      <div style={{ width: 1, height: 22, background: '#1f2440' }} />
      <div style={{ fontSize: 12, color: '#5a6080', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        ✨ {title || 'Untitled Page'}
      </div>

      {/* Undo/Redo */}
      <button onClick={onUndo} style={tbGhostStyle} title="Undo (Ctrl+Z)">↶</button>
      <button onClick={onRedo} style={tbGhostStyle} title="Redo (Ctrl+Y)">↷</button>

      <button onClick={onBack} style={tbGhostStyle}>← Funnels</button>
      <button onClick={onShowSettings} style={tbGhostStyle}>⚙ Settings</button>
      <button onClick={onClear} style={{ ...tbGhostStyle, color: '#dc2626' }}>🗑 Clear</button>
      <button onClick={onSave} disabled={saving}
        style={{ ...tbBtnBase, background: saving ? '#64748b' : '#10b981', color: '#fff' }}>
        {saving ? '⏳ Saving...' : '💾 Save'}
      </button>
      {slug && (
        <a href={`/f/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{ ...tbBtnBase, background: '#0ea5e9', color: '#fff', textDecoration: 'none' }}>
          👁 Preview
        </a>
      )}
    </div>
  );
}

const tbBtnBase = {
  padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', transition: '0.15s', display: 'inline-flex', alignItems: 'center', gap: 4,
  fontFamily: 'DM Sans,sans-serif',
};

const tbGhostStyle = {
  ...tbBtnBase,
  background: 'rgba(255,255,255,0.05)', color: '#6a7090',
  border: '1px solid #1f2440',
};

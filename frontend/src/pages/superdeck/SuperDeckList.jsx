import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { apiGet, apiPost, apiDelete } from '../../utils/api';
import { THEMES } from './themes';
import { Plus, Trash2, Pencil, Presentation, Sparkles } from 'lucide-react';

export default function SuperDeckList() {
  var [decks, setDecks] = useState([]);
  var [loading, setLoading] = useState(true);
  var [creating, setCreating] = useState(false);
  var navigate = useNavigate();

  function load() {
    apiGet('/api/superdeck/presentations').then(function(d) { setDecks(d.presentations || []); setLoading(false); }).catch(function() { setLoading(false); });
  }
  useEffect(function() { load(); }, []);

  function create(themeName) {
    setCreating(true);
    apiPost('/api/superdeck/create', { title: 'Untitled Presentation', theme: themeName || 'midnight' })
      .then(function(r) { if (r.id) navigate('/superdeck/edit/' + r.id); setCreating(false); })
      .catch(function() { setCreating(false); });
  }

  function del(id) {
    if (!window.confirm('Delete this presentation?')) return;
    apiDelete('/api/superdeck/' + id).then(function() { load(); });
  }

  if (loading) return <AppLayout title="SuperDeck"><div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
    <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
  </div></AppLayout>;

  return (
    <AppLayout title="SuperDeck" subtitle="AI Presentation Studio">

      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Presentations</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Create beautiful slide decks and download as PowerPoint</div>
          </div>
          <button onClick={function() { create('midnight'); }} disabled={creating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={16}/> {creating ? 'Creating...' : 'New presentation'}
          </button>
        </div>
      </div>

      {/* Choose theme */}
      {decks.length === 0 && !creating && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '32px 28px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Start with a theme</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Choose a colour theme for your first presentation</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 600, margin: '0 auto' }}>
            {Object.entries(THEMES).map(function(entry) {
              var k = entry[0]; var th = entry[1];
              return <button key={k} onClick={function() { create(k); }}
                style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, background: th.primary, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: th.text, opacity: 0.6 }}>Aa</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{th.name}</div>
              </button>;
            })}
          </div>
        </div>
      )}

      {/* Existing decks */}
      {decks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260, 1fr))', gap: 16 }}>
          {decks.map(function(d) {
            var th = THEMES[d.theme] || THEMES.midnight;
            return <div key={d.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div onClick={function() { navigate('/superdeck/edit/' + d.id); }}
                style={{ aspectRatio: '16/9', background: th.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={th.muted} strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{d.slide_count} slide{d.slide_count !== 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={function() { navigate('/superdeck/edit/' + d.id); }}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Pencil size={12}/> Edit
                  </button>
                  <button onClick={function() { del(d.id); }}
                    style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            </div>;
          })}
        </div>
      )}

    </AppLayout>
  );
}

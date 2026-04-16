import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { Search, MapPin, Download, Upload, Star, Phone, Globe, Mail, Building2, Loader2 } from 'lucide-react';

export default function LeadFinder() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var [niche, setNiche] = useState('');
  var [location, setLocation] = useState('');
  var [results, setResults] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var [searched, setSearched] = useState(false);
  var [query, setQuery] = useState('');
  var [remaining, setRemaining] = useState(10);
  var [importing, setImporting] = useState(false);
  var [importResult, setImportResult] = useState(null);
  var [selected, setSelected] = useState({});

  var isPro = user && ((user.membership_tier || '').toLowerCase() === 'pro' || user.is_admin);

  async function doSearch() {
    if (!niche.trim() || !location.trim()) { setError(t('leadFinder.enterBoth')); return; }
    setError('');
    setLoading(true);
    setSearched(true);
    setImportResult(null);
    setSelected({});
    try {
      var res = await apiPost('/api/lead-finder/search', { niche: niche.trim(), location: location.trim() });
      if (res.success) {
        setResults(res.results || []);
        setQuery(res.query || '');
        setRemaining(res.remaining != null ? res.remaining : 10);
        if (res.results.length === 0) setError(t('leadFinder.noResults'));
      } else {
        setError(res.error || t('leadFinder.searchFailed'));
        setResults([]);
      }
    } catch (e) {
      setError(e.message || t('leadFinder.searchFailedRetry'));
      setResults([]);
    }
    setLoading(false);
  }

  function toggleSelect(idx) {
    setSelected(function(prev) {
      var next = Object.assign({}, prev);
      if (next[idx]) delete next[idx]; else next[idx] = true;
      return next;
    });
  }

  function selectAll() {
    if (Object.keys(selected).length === results.length) {
      setSelected({});
    } else {
      var all = {};
      results.forEach(function(_, i) { all[i] = true; });
      setSelected(all);
    }
  }

  var selectedLeads = Object.keys(selected).map(function(i) { return results[parseInt(i)]; }).filter(function(r) { return r && r.email; });

  async function importLeads() {
    if (selectedLeads.length === 0) { setError(t('leadFinder.selectLeadsEmail')); return; }
    setImporting(true);
    setError('');
    try {
      var listName = query || t('leadFinder.importedLeadsDefault');
      var res = await apiPost('/api/lead-finder/import', { leads: selectedLeads, list_name: listName });
      if (res.success) {
        setImportResult(res);
      } else {
        setError(res.error || t('leadFinder.importFailed'));
      }
    } catch (e) {
      setError(e.message || t('leadFinder.importFailed'));
    }
    setImporting(false);
  }

  function exportCSV() {
    var headers = [
      t('leadFinder.colName'), t('leadFinder.colAddress'), t('leadFinder.colPhone'),
      t('leadFinder.colEmail'), t('leadFinder.colWebsite'), t('leadFinder.colRating'), t('leadFinder.colCategory')
    ];
    var rows = [headers];
    results.forEach(function(r) {
      rows.push([r.name, r.address, r.phone, r.email, r.website, r.rating, r.category]);
    });
    var csv = rows.map(function(r) { return r.map(function(c) { return '"' + (c || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (query || 'leads').replace(/[^a-zA-Z0-9]/g, '-') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isPro) {
    return <AppLayout title={t('leadFinder.title')} subtitle={t('leadFinder.subtitleShort')}>
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{t('leadFinder.proOnlyTitle')}</h2>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>{t('leadFinder.proOnlyDesc')}</p>
        <a href="/upgrade" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>{t('leadFinder.upgradeBtn')}</a>
      </div>
    </AppLayout>;
  }

  return <AppLayout title={t('leadFinder.title')} subtitle={t('leadFinder.subtitle')}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      <div style={{ background: 'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#c084fc"/>
          </div>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>{t('leadFinder.findBusinessLeads')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{t('leadFinder.searchGoogleMaps')}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>{t('leadFinder.searchesToday')}: {10 - remaining}/10</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px' }}>
            <Building2 size={14} color="rgba(255,255,255,.4)"/>
            <input value={niche} onChange={function(e) { setNiche(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && !loading) doSearch(); }}
              placeholder={t('leadFinder.nichePlaceholder')}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', padding: '12px 0' }}/>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px' }}>
            <MapPin size={14} color="rgba(255,255,255,.4)"/>
            <input value={location} onChange={function(e) { setLocation(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && !loading) doSearch(); }}
              placeholder={t('leadFinder.locationPlaceholder')}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', padding: '12px 0' }}/>
          </div>
          <button onClick={doSearch} disabled={loading}
            style={{ padding: '12px 24px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(139,92,246,.3)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.6 : 1, transition: 'all .15s', whiteSpace: 'nowrap' }}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }}/> {t('leadFinder.searching')}</> : <><Search size={14}/> {t('leadFinder.findLeadsBtn')}</>}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}

      {importResult && <div style={{ padding: '14px 18px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>✓ {t('leadFinder.importedTo', { count: importResult.imported, list: importResult.list_name })}</div>
          {importResult.skipped > 0 && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t('leadFinder.skippedCount', { count: importResult.skipped })}</div>}
        </div>
        <a href="/pro/leads" style={{ padding: '8px 16px', borderRadius: 8, background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>{t('leadFinder.openAutoResponder')}</a>
      </div>}

      {loading && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }}/>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{t('leadFinder.searchingMaps')}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{t('leadFinder.searchingTime')}</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>}

      {!loading && searched && results.length > 0 && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={Object.keys(selected).length === results.length} onChange={selectAll} style={{ width: 16, height: 16, cursor: 'pointer' }}/>
              {t('leadFinder.selectAll')}
            </label>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{t('leadFinder.foundWithEmail', { total: results.length, withEmail: results.filter(function(r){return r.email;}).length })}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Download size={13}/> {t('leadFinder.exportCsv')}
            </button>
            <button onClick={importLeads} disabled={importing || selectedLeads.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none',
                background: selectedLeads.length > 0 ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '#e2e8f0',
                fontSize: 12, fontWeight: 700, color: selectedLeads.length > 0 ? '#fff' : '#94a3b8',
                cursor: selectedLeads.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .15s' }}>
              <Upload size={13}/> {importing ? t('leadFinder.importing') : t('leadFinder.importCount', { count: selectedLeads.length })}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1.5fr 1fr 70px', padding: '10px 20px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f1f5f9' }}>
          <div></div>
          <div>{t('leadFinder.colBusiness')}</div>
          <div>{t('leadFinder.colContact')}</div>
          <div>{t('leadFinder.colWebsite')}</div>
          <div style={{ textAlign: 'center' }}>{t('leadFinder.colRating')}</div>
        </div>

        {results.map(function(r, i) {
          var isSelected = selected[i];
          var hasEmail = r.email && r.email.includes('@');
          return <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1.5fr 1fr 70px', padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(139,92,246,.04)' : i % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background .1s' }}>
            <div>
              <input type="checkbox" checked={!!isSelected} onChange={function() { toggleSelect(i); }} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#8b5cf6' }}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={10}/> {r.address || t('leadFinder.noAddress')}
              </div>
              {r.category && <div style={{ display: 'inline-flex', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', fontSize: 10, fontWeight: 600, color: '#64748b' }}>{r.category}</div>}
            </div>
            <div>
              {r.phone && <div style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} color="#94a3b8"/> {r.phone}</div>}
              {hasEmail ? <div style={{ fontSize: 12, color: '#2563eb', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> {r.email}</div>
                : <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> {t('leadFinder.noEmail')}</div>}
            </div>
            <div>
              {r.website ? <a href={r.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Globe size={11}/> {r.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').substring(0, 25)}
              </a> : <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>}
            </div>
            <div style={{ textAlign: 'center' }}>
              {r.rating ? <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}><Star size={12} fill="#f59e0b" color="#f59e0b" style={{ marginRight: 3, verticalAlign: -1 }}/>{r.rating}</span> : <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>}
              {r.review_count && <div style={{ fontSize: 10, color: '#94a3b8' }}>({r.review_count})</div>}
            </div>
          </div>;
        })}

        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('leadFinder.resultsFooter', { total: results.length, withEmail: results.filter(function(r){return r.email;}).length })}</span>
          <span>{t('leadFinder.remainingToday', { count: remaining })}</span>
        </div>
      </div>}

      {!loading && !searched && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔍</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#475569' }}>{t('leadFinder.emptyTitle')}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, maxWidth: 400, margin: '6px auto 0', lineHeight: 1.6 }}>{t('leadFinder.emptyDesc')}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { n: t('leadFinder.suggest1Niche'), l: t('leadFinder.suggest1Loc') },
            { n: t('leadFinder.suggest2Niche'), l: t('leadFinder.suggest2Loc') },
            { n: t('leadFinder.suggest3Niche'), l: t('leadFinder.suggest3Loc') },
            { n: t('leadFinder.suggest4Niche'), l: t('leadFinder.suggest4Loc') },
          ].map(function(s, i) {
            return <button key={i} onClick={function() { setNiche(s.n); setLocation(s.l); }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>{s.n} · {s.l}</button>;
          })}
        </div>
      </div>}

      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        {t('leadFinder.disclaimer')}
      </div>
    </div>
  </AppLayout>;
}

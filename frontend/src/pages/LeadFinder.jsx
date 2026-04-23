import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../utils/api';
import { Search, MapPin, Download, Upload, Star, Phone, Globe, Mail, Building2, Loader2 } from 'lucide-react';

export default function LeadFinder() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var [mode, setMode] = useState('web'); // 'web' for network marketers (primary), 'maps' for local businesses
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
    // For maps mode: need both niche and location. For web mode: just niche is enough
    if (!niche.trim()) { setError(t('leadFinder.enterBoth')); return; }
    if (mode === 'maps' && !location.trim()) { setError(t('leadFinder.enterBoth')); return; }
    setError('');
    setLoading(true);
    setSearched(true);
    setImportResult(null);
    setSelected({});
    try {
      var res = await apiPost('/api/lead-finder/search', { niche: niche.trim(), location: location.trim(), mode: mode });
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
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>{t('leadFinder.proOnlyDesc')}</p>
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{mode === 'maps' ? t('leadFinder.searchGoogleMaps') : t('leadFinder.searchWebDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>{t('leadFinder.searchesToday')}: {10 - remaining}/10</div>
        </div>

        {/* Mode toggle - Web Search is primary (first) for network marketers */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: 'rgba(0,0,0,.2)', padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)' }}>
          <button onClick={function() { setMode('web'); setSearched(false); setResults([]); }}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: mode === 'web' ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'transparent',
              color: mode === 'web' ? '#fff' : 'rgba(255,255,255,.5)',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .15s' }}>
            <Globe size={13}/> {t('leadFinder.modeWebSearch')}
          </button>
          <button onClick={function() { setMode('maps'); setSearched(false); setResults([]); }}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: mode === 'maps' ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'transparent',
              color: mode === 'maps' ? '#fff' : 'rgba(255,255,255,.5)',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .15s' }}>
            <Building2 size={13}/> {t('leadFinder.modeLocalBusinesses')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: mode === 'web' ? 2 : 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px' }}>
            <Building2 size={14} color="rgba(255,255,255,.4)"/>
            <input value={niche} onChange={function(e) { setNiche(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && !loading) doSearch(); }}
              placeholder={mode === 'maps' ? t('leadFinder.nichePlaceholder') : t('leadFinder.webNichePlaceholder')}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', padding: '12px 0' }}/>
          </div>
          {mode === 'maps' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px' }}>
            <MapPin size={14} color="rgba(255,255,255,.4)"/>
            <input value={location} onChange={function(e) { setLocation(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && !loading) doSearch(); }}
              placeholder={t('leadFinder.locationPlaceholder')}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', padding: '12px 0' }}/>
          </div>}
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
          {importResult.skipped > 0 && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{t('leadFinder.skippedCount', { count: importResult.skipped })}</div>}
        </div>
        <a href="/pro/leads" style={{ padding: '8px 16px', borderRadius: 8, background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>{t('leadFinder.openAutoResponder')}</a>
      </div>}

      {loading && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }}/>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          {t('leadFinder.searchingFor')} "<span style={{ color: '#8b5cf6' }}>{niche}{mode === 'maps' && location ? ' · ' + location : ''}</span>"
        </div>
        <div style={{ fontSize: 13, color: '#7a8899', marginTop: 6 }}>{t('leadFinder.searchingTime')}</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>}

      {!loading && searched && results.length > 0 && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={Object.keys(selected).length === results.length} onChange={selectAll} style={{ width: 16, height: 16, cursor: 'pointer' }}/>
              {t('leadFinder.selectAll')}
            </label>
            <span style={{ fontSize: 13, color: '#7a8899' }}>{t('leadFinder.foundWithEmail', { total: results.length, withEmail: results.filter(function(r){return r.email;}).length })}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Download size={13}/> {t('leadFinder.exportCsv')}
            </button>
            <button onClick={importLeads} disabled={importing || selectedLeads.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none',
                background: selectedLeads.length > 0 ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '#e2e8f0',
                fontSize: 12, fontWeight: 700, color: selectedLeads.length > 0 ? '#fff' : '#7a8899',
                cursor: selectedLeads.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .15s' }}>
              <Upload size={13}/> {importing ? t('leadFinder.importing') : t('leadFinder.importCount', { count: selectedLeads.length })}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1.5fr 1fr 70px', padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#7a8899', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f1f5f9' }}>
          <div></div>
          <div>{t('leadFinder.colBusiness')}</div>
          <div>{t('leadFinder.colContact')}</div>
          <div>{t('leadFinder.colWebsite')}</div>
          <div style={{ textAlign: 'center' }}>{t('leadFinder.colRating')}</div>
        </div>

        {results.map(function(r, i) {
          var isSelected = selected[i];
          var hasEmail = typeof r.email === 'string' && r.email.includes('@');
          return <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1.5fr 1fr 70px', padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(139,92,246,.04)' : i % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background .1s' }}>
            <div>
              <input type="checkbox" checked={!!isSelected} onChange={function() { toggleSelect(i); }} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#8b5cf6' }}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#7a8899', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={10}/> {r.address || t('leadFinder.noAddress')}
              </div>
              {r.category && <div style={{ display: 'inline-flex', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', fontSize: 13, fontWeight: 600, color: '#475569' }}>{r.category}</div>}
            </div>
            <div>
              {typeof r.phone === 'string' && r.phone && <div style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} color="#7a8899"/> {r.phone}</div>}
              {hasEmail ? <div style={{ fontSize: 12, color: '#2563eb', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> {r.email}</div>
                : <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> {t('leadFinder.noEmail')}</div>}
            </div>
            <div>
              {r.website ? <a href={r.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Globe size={11}/> {r.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').substring(0, 25)}
              </a> : <span style={{ fontSize: 13, color: '#cbd5e1' }}>—</span>}
            </div>
            <div style={{ textAlign: 'center' }}>
              {r.rating ? <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}><Star size={12} fill="#f59e0b" color="#f59e0b" style={{ marginRight: 3, verticalAlign: -1 }}/>{r.rating}</span> : <span style={{ fontSize: 13, color: '#cbd5e1' }}>—</span>}
              {r.review_count && <div style={{ fontSize: 13, color: '#7a8899' }}>({r.review_count})</div>}
            </div>
          </div>;
        })}

        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#7a8899', display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('leadFinder.resultsFooter', { total: results.length, withEmail: results.filter(function(r){return r.email;}).length })} · {mode === 'web' ? t('leadFinder.dataSourceWeb', { defaultValue: 'Data from web search' }) : t('leadFinder.dataSourceMaps', { defaultValue: 'Data from Google Maps' })}</span>
          <span>{t('leadFinder.remainingToday', { count: remaining })}</span>
        </div>
      </div>}

      {!loading && !searched && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '32px 28px', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{mode === 'web' ? t('leadFinder.searchLibraryTitle') : t('leadFinder.searchLibraryMapsTitle')}</div>
          <div style={{ fontSize: 13, color: '#7a8899', marginTop: 6, maxWidth: 520, margin: '6px auto 0', lineHeight: 1.6 }}>{mode === 'web' ? t('leadFinder.searchLibraryDesc') : t('leadFinder.searchLibraryMapsDesc')}</div>
        </div>

        {mode === 'web' ? (
          /* Web Search Library — targeted network marketer categories */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                title: t('leadFinder.libHealthWellness'),
                icon: '🌿',
                color: '#10b981',
                bg: '#ecfdf5',
                searches: [
                  { n: 'Herbalife distributor', l: 'UK' },
                  { n: 'doTERRA wellness advocate', l: '' },
                  { n: 'Young Living essential oils', l: '' },
                  { n: 'Isagenix distributor', l: '' },
                  { n: 'Plexus ambassador', l: '' },
                ]
              },
              {
                title: t('leadFinder.libBeautySkincare'),
                icon: '💄',
                color: '#ec4899',
                bg: '#fdf2f8',
                searches: [
                  { n: 'Rodan and Fields consultant', l: '' },
                  { n: 'Mary Kay consultant', l: '' },
                  { n: 'Avon representative', l: '' },
                  { n: 'Arbonne consultant', l: '' },
                  { n: 'Nu Skin distributor', l: '' },
                ]
              },
              {
                title: t('leadFinder.libBusinessFinance'),
                icon: '💼',
                color: '#3b82f6',
                bg: '#eff6ff',
                searches: [
                  { n: 'Primerica agent', l: '' },
                  { n: 'WFG associate', l: '' },
                  { n: 'affiliate marketer', l: 'blog' },
                  { n: 'network marketing coach', l: '' },
                  { n: 'online business mentor', l: '' },
                ]
              },
              {
                title: t('leadFinder.libLifestyleHome'),
                icon: '🏠',
                color: '#f59e0b',
                bg: '#fffbeb',
                searches: [
                  { n: 'Amway distributor', l: '' },
                  { n: 'Tupperware consultant', l: '' },
                  { n: 'Pampered Chef consultant', l: '' },
                  { n: 'Scentsy consultant', l: '' },
                  { n: 'Usborne Books consultant', l: '' },
                ]
              },
              {
                title: t('leadFinder.libFitness'),
                icon: '💪',
                color: '#ef4444',
                bg: '#fef2f2',
                searches: [
                  { n: 'Beachbody coach', l: '' },
                  { n: 'Optavia coach', l: '' },
                  { n: 'Team BeachBody', l: '' },
                  { n: 'fitness coach', l: 'blog' },
                  { n: 'Herbalife nutrition coach', l: '' },
                ]
              },
              {
                title: t('leadFinder.libEcommerce'),
                icon: '🛒',
                color: '#8b5cf6',
                bg: '#f5f3ff',
                searches: [
                  { n: 'dropshipping coach', l: '' },
                  { n: 'Amazon FBA mentor', l: '' },
                  { n: 'Shopify store owner', l: 'blog' },
                  { n: 'Etsy shop owner', l: 'blog' },
                  { n: 'print on demand', l: 'mentor' },
                ]
              },
            ].map(function(category, ci) {
              return <div key={ci} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: category.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {category.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: "'Sora',sans-serif" }}>{category.title}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {category.searches.map(function(s, si) {
                    return <button key={si} onClick={function() { setNiche(s.n); setLocation(s.l); }}
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: '1px solid transparent', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}
                      onMouseEnter={function(e) { e.currentTarget.style.background = category.bg; e.currentTarget.style.color = category.color; e.currentTarget.style.borderColor = category.color + '40'; }}
                      onMouseLeave={function(e) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = 'transparent'; }}>
                      <span style={{ opacity: 0.5, fontSize: 13 }}>→</span> {s.n}{s.l ? ' · ' + s.l : ''}
                    </button>;
                  })}
                </div>
              </div>;
            })}
          </div>
        ) : (
          /* Maps Search Library — local business categories */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                title: t('leadFinder.libFoodDrink'),
                icon: '🍴',
                color: '#ef4444',
                bg: '#fef2f2',
                searches: [
                  { n: 'Restaurants', l: 'London' },
                  { n: 'Cafes', l: 'Manchester' },
                  { n: 'Bars', l: 'New York' },
                  { n: 'Pizzerias', l: 'Sydney' },
                  { n: 'Bakeries', l: 'Paris' },
                ]
              },
              {
                title: t('leadFinder.libHealthFitness'),
                icon: '💪',
                color: '#10b981',
                bg: '#ecfdf5',
                searches: [
                  { n: 'Gyms', l: 'Dubai' },
                  { n: 'Personal trainers', l: 'Miami' },
                  { n: 'Yoga studios', l: 'Los Angeles' },
                  { n: 'Chiropractors', l: 'Toronto' },
                  { n: 'Physiotherapists', l: 'Melbourne' },
                ]
              },
              {
                title: t('leadFinder.libBeautyWellness'),
                icon: '💄',
                color: '#ec4899',
                bg: '#fdf2f8',
                searches: [
                  { n: 'Hair salons', l: 'Birmingham' },
                  { n: 'Beauty salons', l: 'Glasgow' },
                  { n: 'Nail salons', l: 'Dublin' },
                  { n: 'Spas', l: 'Bristol' },
                  { n: 'Barber shops', l: 'Edinburgh' },
                ]
              },
              {
                title: t('leadFinder.libHomeServices'),
                icon: '🔧',
                color: '#f59e0b',
                bg: '#fffbeb',
                searches: [
                  { n: 'Plumbers', l: 'Leeds' },
                  { n: 'Electricians', l: 'Liverpool' },
                  { n: 'Cleaners', l: 'Sheffield' },
                  { n: 'Landscapers', l: 'Newcastle' },
                  { n: 'Painters', l: 'Cardiff' },
                ]
              },
              {
                title: t('leadFinder.libProfessional'),
                icon: '💼',
                color: '#3b82f6',
                bg: '#eff6ff',
                searches: [
                  { n: 'Estate agents', l: 'London' },
                  { n: 'Accountants', l: 'Manchester' },
                  { n: 'Law firms', l: 'Edinburgh' },
                  { n: 'Marketing agencies', l: 'Leeds' },
                  { n: 'Financial advisors', l: 'Birmingham' },
                ]
              },
              {
                title: t('leadFinder.libRetail'),
                icon: '🛍️',
                color: '#8b5cf6',
                bg: '#f5f3ff',
                searches: [
                  { n: 'Boutiques', l: 'Brighton' },
                  { n: 'Jewellers', l: 'Cambridge' },
                  { n: 'Bookshops', l: 'Oxford' },
                  { n: 'Florists', l: 'York' },
                  { n: 'Pet shops', l: 'Bath' },
                ]
              },
            ].map(function(category, ci) {
              return <div key={ci} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: category.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {category.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: "'Sora',sans-serif" }}>{category.title}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {category.searches.map(function(s, si) {
                    return <button key={si} onClick={function() { setNiche(s.n); setLocation(s.l); }}
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: '1px solid transparent', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}
                      onMouseEnter={function(e) { e.currentTarget.style.background = category.bg; e.currentTarget.style.color = category.color; e.currentTarget.style.borderColor = category.color + '40'; }}
                      onMouseLeave={function(e) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = 'transparent'; }}>
                      <span style={{ opacity: 0.5, fontSize: 13 }}>→</span> {s.n}{s.l ? ' · ' + s.l : ''}
                    </button>;
                  })}
                </div>
              </div>;
            })}
          </div>
        )}

        <div style={{ marginTop: 24, padding: '14px 18px', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius: 10, border: '1px solid #f59e0b30', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>💡 {t('leadFinder.proTipTitle')}:</strong> {mode === 'web' ? t('leadFinder.proTipWeb') : t('leadFinder.proTipMaps')}
        </div>
      </div>}

      <div style={{ fontSize: 13, color: '#7a8899', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        {t('leadFinder.disclaimer')}
      </div>
    </div>
  </AppLayout>;
}

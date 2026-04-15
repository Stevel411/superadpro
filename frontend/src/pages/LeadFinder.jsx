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
    if (!niche.trim() || !location.trim()) { setError('Please enter both a niche and location.'); return; }
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
        if (res.results.length === 0) setError('No businesses found. Try a different search.');
      } else {
        setError(res.error || 'Search failed.');
        setResults([]);
      }
    } catch (e) {
      setError(e.message || 'Search failed. Please try again.');
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
    if (selectedLeads.length === 0) { setError('Select leads with email addresses to import.'); return; }
    setImporting(true);
    setError('');
    try {
      var listName = query || 'Imported Leads';
      var res = await apiPost('/api/lead-finder/import', { leads: selectedLeads, list_name: listName });
      if (res.success) {
        setImportResult(res);
      } else {
        setError(res.error || 'Import failed.');
      }
    } catch (e) {
      setError(e.message || 'Import failed.');
    }
    setImporting(false);
  }

  function exportCSV() {
    var rows = [['Name', 'Address', 'Phone', 'Email', 'Website', 'Rating', 'Category']];
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
    return <AppLayout title="Lead Finder" subtitle="Find business leads in any niche">
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Lead Finder is a Pro feature</h2>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>Upgrade to Pro to unlock Lead Finder — search for business leads in any niche and location, then import them directly into your AutoResponder.</p>
        <a href="/upgrade" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Upgrade to Pro</a>
      </div>
    </AppLayout>;
  }

  return <AppLayout title="Lead Finder" subtitle="Find business leads in any niche and location">
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Search bar */}
      <div style={{ background: 'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#c084fc"/>
          </div>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>Find business leads</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Search Google Maps for businesses in any niche and location</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>Searches today: {10 - remaining}/10</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px' }}>
            <Building2 size={14} color="rgba(255,255,255,.4)"/>
            <input value={niche} onChange={function(e) { setNiche(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && !loading) doSearch(); }}
              placeholder="e.g. Personal trainers, Restaurants, Plumbers..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', padding: '12px 0' }}/>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px' }}>
            <MapPin size={14} color="rgba(255,255,255,.4)"/>
            <input value={location} onChange={function(e) { setLocation(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && !loading) doSearch(); }}
              placeholder="e.g. Manchester UK, New York, Lagos..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', padding: '12px 0' }}/>
          </div>
          <button onClick={doSearch} disabled={loading}
            style={{ padding: '12px 24px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(139,92,246,.3)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.6 : 1, transition: 'all .15s', whiteSpace: 'nowrap' }}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }}/> Searching...</> : <><Search size={14}/> Find leads</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}

      {/* Import success */}
      {importResult && <div style={{ padding: '14px 18px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>✓ {importResult.imported} leads imported to "{importResult.list_name}"</div>
          {importResult.skipped > 0 && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{importResult.skipped} skipped (no email or duplicate)</div>}
        </div>
        <a href="/pro/leads" style={{ padding: '8px 16px', borderRadius: 8, background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Open AutoResponder</a>
      </div>}

      {/* Loading state */}
      {loading && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }}/>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Searching Google Maps...</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>This may take 30-60 seconds as we visit each business listing</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>}

      {/* Results */}
      {!loading && searched && results.length > 0 && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={Object.keys(selected).length === results.length} onChange={selectAll}
                style={{ width: 16, height: 16, cursor: 'pointer' }}/>
              Select all
            </label>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{results.length} businesses found · {results.filter(function(r){return r.email;}).length} with email</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Download size={13}/> Export CSV
            </button>
            <button onClick={importLeads} disabled={importing || selectedLeads.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none',
                background: selectedLeads.length > 0 ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '#e2e8f0',
                fontSize: 12, fontWeight: 700, color: selectedLeads.length > 0 ? '#fff' : '#94a3b8',
                cursor: selectedLeads.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .15s' }}>
              <Upload size={13}/> {importing ? 'Importing...' : 'Import ' + selectedLeads.length + ' to AutoResponder'}
            </button>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1.5fr 1fr 70px', padding: '10px 20px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f1f5f9' }}>
          <div></div>
          <div>Business</div>
          <div>Contact</div>
          <div>Website</div>
          <div style={{ textAlign: 'center' }}>Rating</div>
        </div>

        {/* Rows */}
        {results.map(function(r, i) {
          var isSelected = selected[i];
          var hasEmail = r.email && r.email.includes('@');
          return <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 1.5fr 1fr 70px', padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(139,92,246,.04)' : i % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background .1s' }}>
            <div>
              <input type="checkbox" checked={!!isSelected} onChange={function() { toggleSelect(i); }}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#8b5cf6' }}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={10}/> {r.address || 'No address'}
              </div>
              {r.category && <div style={{ display: 'inline-flex', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', fontSize: 10, fontWeight: 600, color: '#64748b' }}>{r.category}</div>}
            </div>
            <div>
              {r.phone && <div style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} color="#94a3b8"/> {r.phone}</div>}
              {hasEmail ? <div style={{ fontSize: 12, color: '#2563eb', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> {r.email}</div>
                : <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> No email found</div>}
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

        {/* Footer */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
          <span>{results.length} results · {results.filter(function(r){return r.email;}).length} with email · Data from Google Maps</span>
          <span>Searches remaining today: {remaining}</span>
        </div>
      </div>}

      {/* Empty state */}
      {!loading && !searched && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔍</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#475569' }}>Search for business leads</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, maxWidth: 400, margin: '6px auto 0', lineHeight: 1.6 }}>Enter a business type and location above. Results include business name, address, phone, website, rating, and email when available.</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {['Restaurants in London', 'Real estate agents in Dubai', 'Gyms in New York', 'Dentists in Sydney'].map(function(s) {
            var parts = s.split(' in ');
            return <button key={s} onClick={function() { setNiche(parts[0]); setLocation(parts[1]); }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>;
          })}
        </div>
      </div>}

      {/* Disclaimer */}
      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        Lead Finder extracts publicly available business information from Google Maps. Please ensure you comply with local data protection regulations when contacting businesses.
      </div>
    </div>
  </AppLayout>;
}

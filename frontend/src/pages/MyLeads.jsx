import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Mail, Flame, UserPlus, MailOpen, Send, Filter } from 'lucide-react';

export default function MyLeads() {
  var { t } = useTranslation();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [filter, setFilter] = useState('all');

  useEffect(function() {
    apiGet('/api/leads').then(function(r) { setData(r); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return <AppLayout title={t("leads.title")}><Spin/></AppLayout>;

  var d = data || {};
  var leads = d.leads || [];
  var hotCount = leads.filter(function(l) { return l.is_hot; }).length;
  var totalEmails = leads.reduce(function(s, l) { return s + (l.emails_sent || 0); }, 0);
  var totalOpens = leads.reduce(function(s, l) { return s + (l.emails_opened || 0); }, 0);

  var filtered = filter === 'all' ? leads :
    filter === 'hot' ? leads.filter(function(l) { return l.is_hot; }) :
    leads.filter(function(l) { return l.status === filter; });

  return (
    <AppLayout title={t("leads.title")} subtitle={t("leads.subtitle")}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {value:d.total||0,label:'Total Leads',color:'#0ea5e9',bg:'#f0f9ff',border:'#bae6fd',icon:UserPlus},
          {value:hotCount,label:'Hot Leads',color:'#ef4444',bg:'#fef2f2',border:'#fecaca',icon:Flame},
          {value:totalEmails,label:'Emails Sent',color:'#6366f1',bg:'#f5f3ff',border:'#e9d5ff',icon:Send},
          {value:totalOpens,label:'Emails Opened',color:'#16a34a',bg:'#f0fdf4',border:'#dcfce7',icon:MailOpen},
        ].map(function(s, i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:s.bg,border:'1px solid '+s.border,borderRadius:14,padding:20,position:'relative'}}>
              <div style={{position:'absolute',top:12,right:12,width:32,height:32,borderRadius:8,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={16} color={s.color}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Leads table */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'#1c223d',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Mail size={16} color="#38bdf8"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Lead Database</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{filtered.length} leads</div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:4,padding:'12px 20px',borderBottom:'1px solid #f1f5f9'}}>
          {[{key:'all',label:'All'},{key:'new',label:'New'},{key:'contacted',label:'Contacted'},{key:'hot',label:'Hot'}].map(function(f) {
            var on = filter === f.key;
            return (
              <button key={f.key} onClick={function() { setFilter(f.key); }}
                style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',
                  border:on?'1px solid #0ea5e9':'1px solid #e8ecf2',
                  background:on?'rgba(14,165,233,.06)':'transparent',color:on?'#0ea5e9':'#94a3b8',transition:'all .15s'}}>
                {f.key === 'hot' && '🔥 '}{f.label}
              </button>
            );
          })}
        </div>

        {filtered.length > 0 ? (
          <div style={{maxHeight:500,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Lead','Status','Emails','Source','Captured'].map(function(h) {
                    return <th key={h} style={{fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,padding:'11px 16px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'}}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map(function(l, i) {
                  return (
                    <tr key={l.id || i}>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {l.is_hot && <Flame size={12} color="#ef4444"/>}
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{l.name || l.email}</div>
                            {l.name && <div style={{fontSize:10,color:'#94a3b8'}}>{l.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,textTransform:'capitalize',
                          background:l.status==='new'?'rgba(14,165,233,.08)':l.status==='contacted'?'rgba(139,92,246,.08)':'rgba(245,158,11,.08)',
                          color:l.status==='new'?'#0ea5e9':l.status==='contacted'?'#8b5cf6':'#f59e0b'}}>{l.status || 'new'}</span>
                      </td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontSize:12,color:'#64748b'}}>
                        {l.emails_sent || 0} sent · {l.emails_opened || 0} opened
                      </td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontSize:11,color:'#94a3b8',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {l.source_url || '—'}
                      </td>
                      <td style={{padding:'12px 16px',borderBottom:'1px solid #f5f6f8',fontSize:11,color:'#94a3b8'}}>
                        {l.created_at ? new Date(l.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.3}}>📧</div>
            <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No leads captured yet</div>
            <div style={{fontSize:13,color:'#94a3b8'}}>Use SuperPages and funnels to capture leads</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }

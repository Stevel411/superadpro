import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Badge, PageLoading, EmptyState } from '../components/ui';
import { apiGet } from '../utils/api';
import { Mail, Users, Flame, Inbox, Send } from 'lucide-react';

export default function MyLeads() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiGet('/api/leads').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="My Leads"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="My Leads"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  const leads = data.leads || [];
  const filtered = filter === 'all' ? leads :
    filter === 'hot' ? leads.filter(l => l.is_hot) :
    leads.filter(l => l.status === filter);

  const hotCount = leads.filter(l => l.is_hot).length;
  const newCount = leads.filter(l => l.status === 'new').length;

  return (
    <AppLayout title="My Leads" subtitle={`${data.total || 0} total leads captured`}>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Inbox className="w-5 h-5 text-cyan" />} label="Total Leads"
          value={data.total || 0} className="[--icon-bg:#e0f2fe]" />
        <StatCard icon={<Users className="w-5 h-5 text-emerald" />} label="New"
          value={newCount} className="[--icon-bg:#dcfce7]" />
        <StatCard icon={<Flame className="w-5 h-5 text-rose" />} label="Hot Leads"
          value={hotCount} className="[--icon-bg:#ffe4e6]" />
        <StatCard icon={<Send className="w-5 h-5 text-violet" />} label="Emails Sent"
          value={leads.reduce((s, l) => s + (l.emails_sent || 0), 0)} className="[--icon-bg:#ede9fe]" />
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {['all', 'new', 'hot', 'nurturing', 'converted'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border
              ${filter === f ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${leads.length})` : ''}
          </button>
        ))}
      </div>

      {/* Lead List */}
      <Card hover={false}>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon="📩" title="No leads yet"
              description="Leads captured from your funnels and landing pages will appear here." />
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((l, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-cyan/10 flex items-center justify-center text-sm font-bold text-cyan shrink-0">
                      {(l.name || l.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{l.name || l.email}</div>
                      <div className="text-xs text-slate-400 truncate">{l.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {l.is_hot && <Flame className="w-4 h-4 text-rose" />}
                    <div className="text-right">
                      <div className="text-xs text-slate-400">{l.emails_sent} sent · {l.emails_opened} opened</div>
                    </div>
                    <Badge color={l.status === 'new' ? 'cyan' : l.status === 'converted' ? 'green' : 'amber'}>
                      {l.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </AppLayout>
  );
}

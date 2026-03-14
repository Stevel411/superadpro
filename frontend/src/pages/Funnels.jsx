import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, StatCard, Badge, Button, PageLoading, EmptyState } from '../components/ui';
import { apiGet } from '../utils/api';
import { Globe, Eye, Inbox, Plus, ExternalLink, PenLine, Sparkles } from 'lucide-react';

export default function Funnels() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/funnels').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="SuperPages"><PageLoading /></AppLayout>;
  if (!data) return <AppLayout title="SuperPages"><div className="text-center py-20 text-slate-400">Unable to load</div></AppLayout>;

  const funnels = data.funnels || [];
  const totalViews = funnels.reduce((s, f) => s + (f.views || 0), 0);
  const totalLeads = funnels.reduce((s, f) => s + (f.leads_captured || 0), 0);

  return (
    <AppLayout title="SuperPages" subtitle="Landing pages and funnels"
      topbarActions={<Button size="sm"><Plus className="w-3.5 h-3.5" /> New Page</Button>}>

      {funnels.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard icon={<Globe className="w-5 h-5 text-cyan" />} label="Total Pages"
            value={funnels.length} className="[--icon-bg:#e0f2fe]" />
          <StatCard icon={<Eye className="w-5 h-5 text-emerald" />} label="Total Views"
            value={totalViews} className="[--icon-bg:#dcfce7]" />
          <StatCard icon={<Inbox className="w-5 h-5 text-violet" />} label="Leads Captured"
            value={totalLeads} className="[--icon-bg:#ede9fe]" />
        </div>
      )}

      {funnels.length === 0 ? (
        <EmptyState icon="🌐" title="No pages created yet"
          description="Build landing pages to capture leads and promote your affiliate links. Use the AI funnel generator to create one in seconds."
          action={<Button><Sparkles className="w-4 h-4" /> Create with AI</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {funnels.map(f => (
            <Card key={f.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{f.title}</h3>
                    <div className="text-xs text-cyan truncate mt-0.5">superadpro.com/f/{f.slug}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge color={f.status === 'published' ? 'green' : 'slate'}>{f.status}</Badge>
                    {f.is_ai_generated && <Badge color="violet">AI</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {f.views || 0} views</span>
                  <span className="flex items-center gap-1"><Inbox className="w-3.5 h-3.5" /> {f.leads_captured || 0} leads</span>
                </div>
                <div className="flex gap-2">
                  <a href={`/pro/funnel-editor/${f.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full"><PenLine className="w-3.5 h-3.5" /> Edit</Button>
                  </a>
                  <a href={`/f/${f.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="w-3.5 h-3.5" /></Button>
                  </a>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

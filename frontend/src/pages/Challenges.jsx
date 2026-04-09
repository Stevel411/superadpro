import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Trophy, Target, Flame, Zap } from 'lucide-react';

export default function Challenges() {
  var [challenges, setChallenges] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    apiGet('/api/challenges').then(function(r) {
      setChallenges(r.challenges || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return <AppLayout title="Challenges"><div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Loading...</div></AppLayout>;

  return (
    <AppLayout title="Challenges" subtitle="Hit milestones, earn rewards, climb the ranks">
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {challenges.map(function(ch) {
          var maxTarget = ch.milestones[ch.milestones.length - 1].target;
          var pct = Math.min(100, (ch.progress / maxTarget) * 100);
          var nextMilestone = ch.milestones.find(function(m) { return ch.progress < m.target; });
          var achieved = ch.milestones.filter(function(m) { return ch.progress >= m.target; });

          var iconMap = { referral: Trophy, engagement: Flame, grid: Target };
          var Icon = iconMap[ch.type] || Zap;
          var gradMap = { referral: 'linear-gradient(135deg,#065f46,#34d399)', engagement: 'linear-gradient(135deg,#92400e,#f59e0b)', grid: 'linear-gradient(135deg,#4338ca,#818cf8)' };

          return (
            <div key={ch.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
              {/* Header */}
              <div style={{background:gradMap[ch.type]||'linear-gradient(90deg,#172554,#1e3a8a)',padding:'22px 24px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',right:16,top:12,opacity:.15}}><Icon size={60}/></div>
                <div style={{fontSize:18,fontWeight:900,color:'#fff',position:'relative',zIndex:1}}>{ch.title}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,.7)',marginTop:4,position:'relative',zIndex:1,maxWidth:400}}>{ch.description}</div>
              </div>

              {/* Progress */}
              <div style={{padding:'20px 24px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{fontSize:32,fontWeight:900,color:'#0f172a'}}>{ch.progress}</div>
                  {nextMilestone && (
                    <div style={{fontSize:12,fontWeight:700,color:'#94a3b8'}}>
                      Next: {nextMilestone.emoji} {nextMilestone.reward} ({nextMilestone.target - ch.progress} to go)
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{height:10,background:'#f1f5f9',borderRadius:5,overflow:'hidden',marginBottom:20,position:'relative'}}>
                  <div style={{height:'100%',width:pct+'%',background:gradMap[ch.type],borderRadius:5,transition:'width .8s ease'}}/>
                  {/* Milestone markers */}
                  {ch.milestones.map(function(m) {
                    var markerPct = (m.target / maxTarget) * 100;
                    return (
                      <div key={m.target} style={{position:'absolute',left:markerPct+'%',top:-4,width:2,height:18,background:ch.progress>=m.target?'#fff':'#cbd5e1',zIndex:1}}/>
                    );
                  })}
                </div>

                {/* Milestones */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                  {ch.milestones.map(function(m) {
                    var done = ch.progress >= m.target;
                    return (
                      <div key={m.target} style={{padding:'14px 16px',borderRadius:10,
                        background:done?'#f0fdf4':'#f8fafc',border:done?'1.5px solid #86efac':'1px solid #e8ecf2',
                        display:'flex',alignItems:'center',gap:10,transition:'all .2s'}}>
                        <div style={{fontSize:22}}>{m.emoji}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:800,color:done?'#16a34a':'#64748b'}}>{m.target} {ch.type === 'referral' ? 'referrals' : ch.type === 'grid' ? 'members' : 'days'}</div>
                          <div style={{fontSize:11,color:done?'#16a34a':'#94a3b8',fontWeight:600}}>{m.reward}</div>
                        </div>
                        {done && <div style={{marginLeft:'auto',fontSize:14}}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

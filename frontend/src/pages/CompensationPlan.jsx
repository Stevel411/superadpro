import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
export default function CompensationPlan() {
  return (
    <AppLayout title="📋 Compensation Plan" subtitle="Full breakdown of all income streams">
      <div style={{maxWidth:900,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:28}}>
          {[{icon:'🔑',title:'Membership',val:'$10/mo',desc:'50% per referral',color:'#16a34a'},{icon:'⚡',title:'Grid',val:'40%',desc:'Direct sponsor',color:'#0ea5e9'},{icon:'🌐',title:'Uni-Level',val:'6.25%',desc:'8 levels deep',color:'#6366f1'},{icon:'🎓',title:'Courses',val:'50/25/25',desc:'Creator/Affiliate/Passup',color:'#d97706'}].map((s,i) => (
            <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:20,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.12)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color}}/>
              <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.color,marginBottom:2}}>{s.val}</div>
              <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:2}}>{s.title}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:24,boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>
          <h3 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:16}}>8-Level Uni-Level Commission Table</h3>
          <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Level','Rate','On $20','On $200','On $1,000'].map(h=><th key={h} style={{fontSize:11,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,padding:'10px 14px',borderBottom:'1px solid rgba(15,25,60,.08)',textAlign:'left',background:'#f6f8fc'}}>{h}</th>)}</tr></thead>
          <tbody>{Array.from({length:8}).map((_,i)=><tr key={i}><td style={{padding:'10px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',fontWeight:700}}>Level {i+1}</td><td style={{padding:'10px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',color:'#0ea5e9',fontWeight:700}}>6.25%</td><td style={{padding:'10px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',color:'#16a34a',fontWeight:700}}>$1.25</td><td style={{padding:'10px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',color:'#16a34a',fontWeight:700}}>$12.50</td><td style={{padding:'10px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',color:'#16a34a',fontWeight:700}}>$62.50</td></tr>)}</tbody></table>
        </div>
      </div>
    </AppLayout>
  );
}

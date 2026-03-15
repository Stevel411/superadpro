import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';

export default function Support() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!subject || !message) return;
    setSending(true);
    try {
      await apiPost('/api/support/ticket', { subject, message });
      setSent(true); setSubject(''); setMessage('');
    } catch (e) { alert(e.message); }
    setSending(false);
  };

  return (
    <AppLayout title="💬 Support" subtitle="Get help, report issues, or contact the team">
      <div style={{maxWidth:800,margin:'0 auto'}}>
        {/* Quick Links */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
          {[
            {icon:'📖',title:'FAQ & Guides',desc:'Browse common questions',link:'/courses/how-it-works'},
            {icon:'💰',title:'Compensation Plan',desc:'How earnings work',link:'/compensation-plan'},
            {icon:'🤝',title:'Community',desc:'Connect with members',link:'/ad-board'},
          ].map((q,i) => (
            <Link key={i} to={q.link} className="sup-card" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:20,textDecoration:'none',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',transition:'all .15s'}}>
              <div style={{fontSize:28,marginBottom:8}}>{q.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:2}}>{q.title}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{q.desc}</div>
            </Link>
          ))}
        </div>

        {/* Contact Form */}
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',overflow:'hidden'}}>
          <div style={{padding:'12px 20px',background:'#1c223d',display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#0ea5e9'}}/>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Submit a Ticket</span>
          </div>
          <div style={{padding:20}}>
            {sent ? (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontSize:16,fontWeight:700,color:'#16a34a',marginBottom:6}}>Ticket Submitted</div>
                <div style={{fontSize:13,color:'#7b91a8',marginBottom:16}}>We'll get back to you within 24 hours.</div>
                <button onClick={() => setSent(false)} style={{padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',background:'#0ea5e9',color:'#fff'}}>Submit Another</button>
              </div>
            ) : (<>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:5,display:'block'}}>Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What do you need help with?" style={{width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#f8f9fb',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:5,display:'block'}}>Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue or question..." rows={5} style={{width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#f8f9fb',resize:'vertical',boxSizing:'border-box'}}/>
              </div>
              <button onClick={submit} disabled={sending} style={{width:'100%',padding:'12px 20px',borderRadius:10,fontSize:14,fontWeight:700,border:'none',cursor:'pointer',background:'#0ea5e9',color:'#fff',opacity:sending?.6:1}}>
                {sending ? 'Sending...' : 'Submit Ticket'}
              </button>
            </>)}
          </div>
        </div>
      </div>
      <style>{`.sup-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.22),0 12px 40px rgba(0,0,0,.16)!important;transform:translateY(-2px)}`}</style>
    </AppLayout>
  );
}

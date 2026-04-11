import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { BookOpen, FileText, MessageCircle, Send, HelpCircle, Mail, CheckCircle, ChevronDown, ChevronRight, Zap, Shield, CreditCard, Users, Eye, LayoutGrid } from 'lucide-react';

// FAQ_ITEMS moved inside component

export default function Support() {
  var { t } = useTranslation();

  var FAQ_ITEMS = [
    { q: t('support.faq1Q'), a: t('support.faq1A'), icon: Zap, color: '#16a34a' },
    { q: t('support.faq2Q'), a: t('support.faq2A'), icon: Eye, color: '#0ea5e9' },
    { q: t('support.faq3Q'), a: t('support.faq3A'), icon: LayoutGrid, color: '#8b5cf6' },
    { q: t('support.faq4Q'), a: t('support.faq4A'), icon: CreditCard, color: '#f59e0b' },
    { q: t('support.faq5Q'), a: t('support.faq5A'), icon: Shield, color: '#ec4899' },
    { q: t('support.faq6Q'), a: t('support.faq6A'), icon: Users, color: '#6366f1' },
  ];

  var [subject, setSubject] = useState('');
  var [message, setMessage] = useState('');
  var [category, setCategory] = useState('general');
  var [sending, setSending] = useState(false);
  var [sent, setSent] = useState(false);
  var [openFaq, setOpenFaq] = useState(-1);

  function submit() {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    apiPost('/api/support/ticket', { subject: '[' + category + '] ' + subject, message: message })
      .then(function() { setSent(true); setSubject(''); setMessage(''); setSending(false); })
      .catch(function(e) { alert(e.message); setSending(false); });
  }

  var categories = [
    { value: 'general', label: t('support.catGeneral') },
    { value: 'billing', label: t('support.catBilling') },
    { value: 'technical', label: t('support.catTechnical') },
    { value: 'commissions', label: t('support.catCommissions') },
    { value: 'kyc', label: t('support.catKyc') },
    { value: 'feature', label: t('support.catFeature') },
  ];

  return (
    <AppLayout title={t("support.title")} subtitle={t("support.subtitle")}>

      {/* Quick action cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
        {[
          { icon: BookOpen, title: t('support.trainingCentre'), desc: t('support.trainingCentreDesc'), link: '/training', color: '#16a34a' },
          { icon: FileText, title: t('support.compensationPlan'), desc: t('support.compensationPlanDesc'), link: '/compensation-plan', color: '#6366f1' },
          { icon: MessageCircle, title: t('support.teamMessenger'), desc: t('support.teamMessengerDesc'), link: '/team-messenger', color: '#f59e0b' },
        ].map(function(q) {
          var Icon = q.icon;
          return (
            <Link key={q.title} to={q.link} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'22px 20px',textDecoration:'none',
              boxShadow:'0 2px 8px rgba(0,0,0,.04)',transition:'all .2s',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:q.color}}/>
              <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(90deg,#172554,#1e3a8a)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                <Icon size={20} color="#fff"/>
              </div>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{q.title}</div>
              <div style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{q.desc}</div>
            </Link>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

        {/* FAQ Section */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{background:'linear-gradient(135deg,#172554,#1e3a8a)',padding:'18px 22px',display:'flex',alignItems:'center',gap:10}}>
            <HelpCircle size={18} color="#38bdf8"/>
            <span style={{fontSize:15,fontWeight:800,color:'#fff'}}>{t('support.faq')}</span>
          </div>
          <div>
            {FAQ_ITEMS.map(function(faq, i) {
              var isOpen = openFaq === i;
              var Icon = faq.icon;
              return (
                <div key={i} style={{borderBottom:i < FAQ_ITEMS.length - 1 ? '1px solid #f1f5f9' : 'none'}}>
                  <div onClick={function(){setOpenFaq(isOpen ? -1 : i);}}
                    style={{padding:'15px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,
                      background:isOpen ? '#f8fafc' : '#fff', transition:'background .15s'}}>
                    <div style={{width:32,height:32,borderRadius:8,background:faq.color + '12',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon size={15} color={faq.color}/>
                    </div>
                    <div style={{flex:1,fontSize:13,fontWeight:700,color:'#0f172a'}}>{faq.q}</div>
                    {isOpen ? <ChevronDown size={16} color="#64748b"/> : <ChevronRight size={16} color="#cbd5e1"/>}
                  </div>
                  {isOpen && (
                    <div style={{padding:'0 20px 16px 64px'}}>
                      <div style={{fontSize:13,color:'#475569',lineHeight:1.8}}>{faq.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Form */}
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{background:'linear-gradient(135deg,#172554,#1e3a8a)',padding:'18px 22px',display:'flex',alignItems:'center',gap:10}}>
            <Mail size={18} color="#38bdf8"/>
            <span style={{fontSize:15,fontWeight:800,color:'#fff'}}>{t('support.submitTicket')}</span>
          </div>

          <div style={{padding:'22px'}}>
            {sent ? (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                  <CheckCircle size={28} color="#16a34a"/>
                </div>
                <div style={{fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:6}}>{t('support.ticketSubmitted')}</div>
                <div style={{fontSize:13,color:'#64748b',marginBottom:20,lineHeight:1.6}}>{t('support.wellGetBack')}</div>
                <button onClick={function(){setSent(false);}}
                  style={{padding:'10px 24px',borderRadius:10,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',
                    background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontFamily:'inherit'}}>
                  Submit Another
                </button>
              </div>
            ) : (
              <div>
                {/* Category */}
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,display:'block'}}>{t('support.categoryLabel')}</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {categories.map(function(c) {
                      var on = category === c.value;
                      return (
                        <button key={c.value} onClick={function(){setCategory(c.value);}}
                          style={{padding:'7px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                            border:on ? '1.5px solid #0ea5e9' : '1px solid #e2e8f0',
                            background:on ? 'rgba(14,165,233,.06)' : '#fff',
                            color:on ? '#0ea5e9' : '#64748b',transition:'all .15s'}}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,display:'block'}}>{t('support.subject')}</label>
                  <input value={subject} onChange={function(e){setSubject(e.target.value);}}
                    placeholder={t("support.subjectPlaceholder")}
                    style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,
                      fontFamily:'inherit',background:'#f8fafc',boxSizing:'border-box',outline:'none',color:'#0f172a'}}
                    onFocus={function(e){e.target.style.borderColor='#0ea5e9';}}
                    onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
                </div>

                {/* Message */}
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,display:'block'}}>{t('support.message')}</label>
                  <textarea value={message} onChange={function(e){setMessage(e.target.value);}}
                    placeholder={t("support.messagePlaceholder")}
                    rows={6}
                    style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,
                      fontFamily:'inherit',background:'#f8fafc',boxSizing:'border-box',outline:'none',color:'#0f172a',resize:'vertical'}}
                    onFocus={function(e){e.target.style.borderColor='#0ea5e9';}}
                    onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
                </div>

                {/* Submit */}
                <button onClick={submit} disabled={sending || !subject.trim() || !message.trim()}
                  style={{width:'100%',padding:'13px',borderRadius:10,fontSize:14,fontWeight:800,border:'none',cursor:'pointer',
                    fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                    background:(subject.trim() && message.trim()) ? 'linear-gradient(135deg,#0ea5e9,#38bdf8)' : '#e2e8f0',
                    color:'#fff',boxShadow:(subject.trim() && message.trim()) ? '0 4px 16px rgba(14,165,233,.3)' : 'none',
                    transition:'all .2s',opacity:sending ? 0.6 : 1}}>
                  <Send size={15}/> {sending ? t('support.sending') : t('support.submitBtn')}
                </button>

                <div style={{textAlign:'center',marginTop:12,fontSize:11,color:'#cbd5e1',lineHeight:1.5}}>
                  We typically respond within 24 hours. Check your email for our reply.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact info footer */}
      <div style={{marginTop:20,background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'18px 24px',
        display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Mail size={16} color="#64748b"/>
          <span style={{fontSize:13,color:'#64748b'}}>{t('support.emailDirectly')} <span style={{fontWeight:700,color:'#0ea5e9'}}>steve@superadpro.com</span></span>
        </div>
        <div style={{fontSize:11,color:'#cbd5e1'}}>{t('support.responseTime')}</div>
      </div>
    </AppLayout>
  );
}

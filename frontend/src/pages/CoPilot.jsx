import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import { Bot, RefreshCw, Send, ChevronDown, ChevronUp, Sparkles, Zap } from 'lucide-react';

export default function CoPilot() {
  var [briefing, setBriefing] = useState(null);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [collapsed, setCollapsed] = useState(false);
  var [question, setQuestion] = useState('');
  var [asking, setAsking] = useState(false);
  var [reply, setReply] = useState(null);
  var [remaining, setRemaining] = useState(10);
  var [limitReached, setLimitReached] = useState(false);

  useEffect(function() { fetchBriefing(); }, []);

  function fetchBriefing() {
    setLoading(true);
    apiGet('/api/copilot/briefing')
      .then(function(d) { setBriefing(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }

  function refresh() {
    setRefreshing(true);
    setReply(null);
    apiPost('/api/copilot/refresh', {})
      .then(function(d) { setBriefing(d); setRefreshing(false); })
      .catch(function() { setRefreshing(false); });
  }

  function ask() {
    if (!question.trim() || asking || limitReached) return;
    setAsking(true);
    setReply(null);
    apiPost('/api/copilot/ask', { question: question.trim() })
      .then(function(d) {
        if (d.limit_reached) {
          setLimitReached(true);
          setReply(d.error);
        } else {
          setReply(d.reply);
          if (typeof d.remaining === 'number') setRemaining(d.remaining);
        }
        setAsking(false);
        setQuestion('');
      })
      .catch(function() { setAsking(false); });
  }

  var priorityColor = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #172554 0%, #172554 60%, #172554 100%)',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: 16, marginBottom: 20, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.08)',
    }}>
      <style>{`
        @keyframes cpSpin{to{transform:rotate(360deg)}}
        @keyframes cpPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.15)}}
        @keyframes cpFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cp-action:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(0,0,0,0.3)!important;}
        .cp-ask-btn:hover{background:rgba(99,102,241,0.3)!important;}
        .cp-refresh:hover{color:#a5b4fc!important;}
      `}</style>

      {/* ── Header ── */}
      <div
        onClick={function() { setCollapsed(function(c) { return !c; }); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Bot avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#6366f1,#818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(99,102,241,0.4)',
        }}>
          <Bot size={18} color="#fff"/>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 800, color: '#fff' }}>
              AI Co-Pilot
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
              background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', letterSpacing: 0.5,
            }}>PRO</span>
            {briefing && !briefing.cached && (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>
                • Fresh today
              </span>
            )}
            {briefing && briefing.cached && (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>
                • Cached
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            Your personal business advisor — powered by Claude
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!collapsed && (
            <button
              onClick={function(e) { e.stopPropagation(); refresh(); }}
              className="cp-refresh"
              disabled={refreshing}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
                gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'color .15s',
              }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'cpSpin 1s linear infinite' : 'none' }}/>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
          {collapsed
            ? <ChevronDown size={16} color="rgba(255,255,255,0.3)"/>
            : <ChevronUp size={16} color="rgba(255,255,255,0.3)"/>
          }
        </div>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '20px' }}>

          {/* Loading state */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0,1,2].map(function(i) {
                  return <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                    animation: 'cpPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}/>;
                })}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Analysing your account...</span>
            </div>
          )}

          {/* Briefing */}
          {!loading && briefing && (
            <div style={{ animation: 'cpFade .4s ease-out' }}>

              {/* Narrative */}
              <div style={{
                display: 'flex', gap: 12, marginBottom: 18,
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}>
                <Sparkles size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: 2 }}/>
                <p style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.7, margin: 0, fontStyle: 'italic',
                }}>
                  {briefing.narrative}
                </p>
              </div>

              {/* Action Cards */}
              {briefing.actions && briefing.actions.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: 2,
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                    marginBottom: 10,
                  }}>
                    Today's Actions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${briefing.actions.length}, 1fr)`, gap: 10 }}>
                    {briefing.actions.map(function(action, i) {
                      return (
                        <Link
                          key={i}
                          to={action.link || '/dashboard'}
                          className="cp-action"
                          style={{
                            display: 'block', textDecoration: 'none',
                            background: `${action.color || '#6366f1'}12`,
                            border: `1px solid ${action.color || '#6366f1'}25`,
                            borderRadius: 12, padding: '14px 14px',
                            transition: 'all .2s', cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>{action.emoji}</span>
                            {action.priority && (
                              <div style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: priorityColor[action.priority] || '#6366f1',
                                animation: action.priority === 'high' ? 'cpPulse 2s ease-in-out infinite' : 'none',
                              }}/>
                            )}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                            {action.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                            {action.description}
                          </div>
                          <div style={{
                            marginTop: 10, fontSize: 10, fontWeight: 700,
                            color: action.color || '#818cf8', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <Zap size={10}/> Do this now →
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ask input */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: 2,
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                  padding: '10px 14px 0',
                }}>
                  Ask your Co-Pilot
                </div>

                {reply && (
                  <div style={{
                    margin: '8px 14px',
                    padding: '10px 12px',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 8, fontSize: 12,
                    color: 'rgba(255,255,255,0.8)', lineHeight: 1.6,
                    animation: 'cpFade .3s ease-out',
                  }}>
                    <Bot size={12} color="#818cf8" style={{ marginRight: 6, verticalAlign: 'middle' }}/>
                    {reply}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, padding: '8px 10px' }}>
                  <input
                    value={question}
                    onChange={function(e) { setQuestion(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') ask(); }}
                    disabled={limitReached}
                    placeholder={limitReached ? 'Daily limit reached — back tomorrow' : 'e.g. How do I get my next grid completion faster?'}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, padding: '9px 12px',
                      fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={ask}
                    disabled={asking || !question.trim()}
                    className="cp-ask-btn"
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: 'none',
                      background: asking || !question.trim() ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.2)',
                      cursor: asking || !question.trim() ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background .15s', flexShrink: 0,
                    }}
                  >
                    <Send size={14} color={asking || !question.trim() ? 'rgba(255,255,255,0.2)' : '#818cf8'}
                      style={{ animation: asking ? 'cpSpin 1s linear infinite' : 'none' }}/>
                  </button>
                </div>

                {/* Quick prompts */}
                <div style={{ display: 'flex', gap: 6, padding: '0 10px 10px', flexWrap: 'wrap' }}>
                  {[
                    'How do I fill my grid faster?',
                    'What should I focus on today?',
                    'How do I grow my recurring income?',
                  ].map(function(q, i) {
                    return (
                      <button key={i} onClick={function() { setQuestion(q); }}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '4px 10px',
                          borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                        }}
                        onMouseEnter={function(e) {
                          e.target.style.borderColor = 'rgba(99,102,241,0.4)';
                          e.target.style.color = '#a5b4fc';
                        }}
                        onMouseLeave={function(e) {
                          e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.target.style.color = 'rgba(255,255,255,0.4)';
                        }}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Error / empty state */}
          {!loading && !briefing && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>Couldn't load your briefing</div>
              <button onClick={refresh} style={{
                fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)',
                color: '#818cf8', cursor: 'pointer', fontFamily: 'inherit',
              }}>Try again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

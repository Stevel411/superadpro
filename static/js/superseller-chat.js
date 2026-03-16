/**
 * SuperSeller AI Sales Agent — Chatbot Widget
 * Embed on any page: <script src="/static/js/superseller-chat.js" data-campaign="CAMPAIGN_ID"></script>
 */
(function() {
  var script = document.currentScript;
  var campaignId = script ? script.getAttribute('data-campaign') : null;
  if (!campaignId) return;

  var API = '/api/superseller/chat/' + campaignId;
  var history = [];
  var isOpen = false;
  var isTyping = false;

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#ss-chat-btn{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#a78bfa);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(139,92,246,.4);z-index:9998;display:flex;align-items:center;justify-content:center;transition:all .3s}',
    '#ss-chat-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(139,92,246,.5)}',
    '#ss-chat-btn svg{width:28px;height:28px;fill:#fff}',
    '#ss-chat-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#16a34a;border:2px solid #fff;animation:ssPulse 2s infinite}',
    '#ss-chat-win{position:fixed;bottom:96px;right:24px;width:380px;max-height:520px;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);z-index:9999;display:none;flex-direction:column;background:#fff;border:1px solid rgba(0,0,0,.08)}',
    '#ss-chat-win.open{display:flex}',
    '#ss-chat-head{background:linear-gradient(135deg,#1c223d,#0f172a);padding:16px 18px;display:flex;align-items:center;gap:10px}',
    '#ss-chat-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#a78bfa);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '#ss-chat-head .av svg{width:18px;height:18px;fill:#fff}',
    '#ss-chat-head .info{flex:1}',
    '#ss-chat-head .name{font-size:14px;font-weight:800;color:#fff}',
    '#ss-chat-head .status{font-size:11px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:4px}',
    '#ss-chat-head .dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:ssPulse 2s infinite}',
    '#ss-chat-head .close{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:18px;padding:4px}',
    '#ss-chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:280px;max-height:340px;background:#f8f9fb}',
    '.ss-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;animation:ssSlide .3s ease}',
    '.ss-msg.bot{align-self:flex-start;background:#fff;color:#334155;border:1px solid #e8ecf2;border-bottom-left-radius:4px}',
    '.ss-msg.user{align-self:flex-end;background:linear-gradient(135deg,#8b5cf6,#a78bfa);color:#fff;border-bottom-right-radius:4px}',
    '.ss-typing{align-self:flex-start;padding:10px 14px;background:#fff;border:1px solid #e8ecf2;border-radius:12px;border-bottom-left-radius:4px;display:flex;gap:4px}',
    '.ss-typing span{width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:ssBounce .6s infinite}',
    '.ss-typing span:nth-child(2){animation-delay:.15s}',
    '.ss-typing span:nth-child(3){animation-delay:.3s}',
    '#ss-chat-input{display:flex;gap:8px;padding:12px;border-top:1px solid #e8ecf2;background:#fff}',
    '#ss-chat-input input{flex:1;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;font-family:inherit}',
    '#ss-chat-input input:focus{border-color:#8b5cf6}',
    '#ss-chat-input button{padding:10px 16px;border-radius:10px;border:none;background:#8b5cf6;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}',
    '#ss-chat-input button:hover{background:#7c3aed}',
    '#ss-chat-input button:disabled{background:#94a3b8;cursor:default}',
    '@keyframes ssPulse{0%,100%{opacity:1}50%{opacity:.5}}',
    '@keyframes ssSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes ssBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@media(max-width:480px){#ss-chat-win{right:8px;left:8px;width:auto;bottom:80px}}',
  ].join('\n');
  document.head.appendChild(style);

  // Create chat button
  var btn = document.createElement('button');
  btn.id = 'ss-chat-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><div id="ss-chat-badge"></div>';
  btn.onclick = function() { toggleChat(); };
  document.body.appendChild(btn);

  // Create chat window
  var win = document.createElement('div');
  win.id = 'ss-chat-win';
  win.innerHTML = [
    '<div id="ss-chat-head">',
    '  <div class="av"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>',
    '  <div class="info"><div class="name">SuperAdPro Assistant</div><div class="status"><span class="dot"></span> Online — Ask me anything</div></div>',
    '  <button class="close" onclick="document.getElementById(\'ss-chat-win\').classList.remove(\'open\')">&times;</button>',
    '</div>',
    '<div id="ss-chat-msgs"></div>',
    '<div id="ss-chat-input">',
    '  <input type="text" id="ss-input" placeholder="Ask about SuperAdPro..." onkeydown="if(event.key===\'Enter\')document.getElementById(\'ss-send\').click()">',
    '  <button id="ss-send" onclick="window._ssSend()">Send</button>',
    '</div>',
  ].join('');
  document.body.appendChild(win);

  // Add welcome message after small delay
  setTimeout(function() {
    addMsg('bot', "Hi there! 👋 I'm the SuperAdPro assistant. I can answer any questions about the platform, tools, pricing, or how it all works. What would you like to know?");
  }, 500);

  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen) document.getElementById('ss-input').focus();
  }

  function addMsg(role, text) {
    var msgs = document.getElementById('ss-chat-msgs');
    var div = document.createElement('div');
    div.className = 'ss-msg ' + role;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('ss-chat-msgs');
    var div = document.createElement('div');
    div.className = 'ss-typing';
    div.id = 'ss-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('ss-typing');
    if (el) el.remove();
  }

  window._ssSend = function() {
    var input = document.getElementById('ss-input');
    var sendBtn = document.getElementById('ss-send');
    var msg = (input.value || '').trim();
    if (!msg || isTyping) return;

    addMsg('user', msg);
    history.push({role: 'user', content: msg});
    input.value = '';
    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: msg, history: history}),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      hideTyping();
      var reply = data.reply || "Sorry, could you try again?";
      addMsg('bot', reply);
      history.push({role: 'assistant', content: reply});
      isTyping = false;
      sendBtn.disabled = false;
      input.focus();
    })
    .catch(function() {
      hideTyping();
      addMsg('bot', "I had a hiccup — could you try asking again?");
      isTyping = false;
      sendBtn.disabled = false;
    });
  };
})();

/* AdvantageLife banner network — reusable ad loader (ad tag).
 * Drop placeholders on any page:  <div class="al-ad" data-size="728x90"></div>
 * Then include:  <script src="/static/al-ads.js?v=1" data-owner="USERNAME"></script>
 * Fills each placeholder from the qualified pool (owner-first), tracks a viewable
 * impression (IAB 50% for 1s) and click-throughs, and shows a house recruiter in
 * empty slots. Works on server-HTML and React pages alike. */
(function () {
  var script = document.currentScript;
  var owner = (script && script.getAttribute('data-owner')) || '';
  if (owner === '{{SPONSOR_NAME}}' || owner === 'a member') owner = '';

  function run() {
    var slots = [].slice.call(document.querySelectorAll('.al-ad'));
    if (!slots.length) return;
    var counts = {};
    slots.forEach(function (el) {
      var sz = el.getAttribute('data-size') || '728x90';
      counts[sz] = (counts[sz] || 0) + 1;
    });
    var req = Object.keys(counts).map(function (sz) { return sz + ':' + counts[sz]; }).join(',');
    var url = '/api/al/network-ads?req=' + encodeURIComponent(req) + (owner ? '&owner=' + encodeURIComponent(owner) : '');
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      var pools = (d && d.slots) || {};
      var idx = {};
      slots.forEach(function (el) {
        var sz = el.getAttribute('data-size') || '728x90';
        idx[sz] = idx[sz] || 0;
        var banner = pools[sz] && pools[sz][idx[sz]];
        idx[sz]++;
        render(el, sz, banner);
      });
    }).catch(function () {});
  }

  function render(el, sz, banner) {
    var p = sz.split('x'), w = p[0], h = p[1];
    el.style.width = '100%'; el.style.maxWidth = w + 'px'; el.style.height = h + 'px';
    el.style.margin = '0 auto'; el.style.overflow = 'hidden'; el.style.borderRadius = '12px';
    el.innerHTML = '';
    if (!banner) {
      var a = document.createElement('a');
      a.href = '/my-banners';
      a.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;height:100%;text-decoration:none;background:repeating-linear-gradient(45deg,#eef2fb,#eef2fb 12px,#e6ecf5 12px,#e6ecf5 24px);border:2px dashed #b9c6e4;color:#5a6584;font-weight:800;font-size:13px;text-align:center;box-sizing:border-box;padding:12px;font-family:Inter,system-ui,sans-serif';
      a.innerHTML = '<span>Display your banner here \u2192</span><span style="font-size:11px;font-weight:700;color:#8b97b4">' + w + ' \u00d7 ' + h + ' banner</span>';
      el.appendChild(a);
      return;
    }
    var node;
    if (banner.mode === 'html') {
      node = document.createElement('div');
      node.style.cssText = 'width:100%;height:100%';
      node.innerHTML = banner.html_code || '';
    } else {
      node = document.createElement('a');
      node.href = banner.click_url; node.target = '_blank'; node.rel = 'noreferrer';
      node.style.cssText = 'display:block;width:100%;height:100%';
      var img = document.createElement('img');
      img.src = banner.image_url; img.alt = banner.title || 'Advertisement';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      node.appendChild(img);
    }
    el.appendChild(node);
    track(el, banner.id);
  }

  function track(el, id) {
    if (!('IntersectionObserver' in window)) return;
    var timer = null;
    var io = new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (e && e.isIntersecting && e.intersectionRatio >= 0.5) {
        timer = setTimeout(function () {
          fetch('/api/al/banner/' + id + '/impression', { method: 'POST' }).catch(function () {});
          io.disconnect();
        }, 1000);
      } else if (timer) { clearTimeout(timer); timer = null; }
    }, { threshold: [0, 0.5, 1] });
    io.observe(el);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

import { SOCIAL_SVGS } from './elementDefaults';

export default function exportHTML(els, canvasBg, canvasBgImage) {
  let bgStyle = `background:${canvasBg};`;
  if (canvasBgImage) bgStyle += `background-image:url(${canvasBgImage});background-size:cover;background-position:center;background-repeat:no-repeat;`;

  const maxY = els.length > 0 ? Math.max(...els.map(e => e.y + e.h)) + 80 : 900;
  let h = `<div style="${bgStyle}min-height:100vh;width:100%;font-family:'Outfit',sans-serif">`;
  h += `<div style="position:relative;width:1100px;max-width:100%;margin:0 auto;min-height:${Math.max(900, maxY)}px;overflow-x:hidden">`;

  els.forEach(el => {
    const allStyles = { position: 'absolute', left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', boxSizing: 'border-box', ...(el.s || {}) };
    const st = Object.entries(allStyles).map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v).join(';');

    if (el.type === 'video' && el.txt) {
      const isMP4 = el._isMP4 || /\.(mp4|webm|ogg)/.test(el.txt) || el.txt.includes('funnel-videos');
      if (isMP4) {
        h += `<video src="${el.txt}" style="${st};border-radius:12px;object-fit:cover" autoplay muted loop playsinline></video>`;
      } else {
        let embedUrl = el.txt;
        if (embedUrl.includes('youtube.com/embed/') && !embedUrl.includes('modestbranding')) {
          embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'modestbranding=1&rel=0&showinfo=0&color=white&iv_load_policy=3';
        } else if (embedUrl.includes('player.vimeo.com/') && !embedUrl.includes('byline=0')) {
          embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'byline=0&portrait=0&title=0';
        }
        h += `<iframe src="${embedUrl}" style="${st};border:none;border-radius:12px" allowfullscreen></iframe>`;
      }
    } else if (el.type === 'video' && !el.txt?.trim()) {
      // Skip empty video placeholders
    } else if (el.type === 'image' && el.txt) {
      h += `<img src="${el.txt}" style="${st};object-fit:cover">`;
    } else if (el.type === 'image' && !el.txt?.trim()) {
      // Skip empty image placeholders
    } else if (['spacer', 'divider', 'box'].includes(el.type) && !el.txt) {
      h += `<div style="${st}"></div>`;
    } else if ((el.type === 'button' || el.type === 'cta') && el.url) {
      h += `<a href="${el.url}" style="${st};text-decoration:none;display:flex;align-items:center;justify-content:center">${el.txt || ''}</a>`;
    } else if ((el.type === 'button' || el.type === 'cta') && !el.url) {
      h += `<div style="${st};display:flex;align-items:center;justify-content:center">${el.txt || ''}</div>`;
    } else if (el.type === 'audio' && el._audioUrl) {
      h += `<audio src="${el._audioUrl}" style="${st};border-radius:12px" controls></audio>`;
    } else if (el.type === 'embed' && el._embedCode) {
      h += `<div style="${st};overflow:hidden">${el._embedCode}</div>`;
    } else if (el.type === 'countdown') {
      const td = el._targetDate || '';
      const cdId = 'cd_' + el.id;
      h += `<div style="${st}"><div id="${cdId}" data-target="${td}" style="display:flex;gap:12px;justify-content:center;align-items:center;width:100%;height:100%">${['Days', 'Hrs', 'Min', 'Sec'].map((l, i) => `<div style="text-align:center"><div class="cdv" style="font-family:Sora,sans-serif;font-size:28px;font-weight:900;color:#fff;background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 14px;min-width:50px;border:1px solid rgba(255,255,255,0.08)">00</div><div style="font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px">${l}</div></div>`).join('')}</div></div>`;
    } else if (el.type === 'progress') {
      const pct = el._percent || 75, lbl = el._label || 'Progress', clr = el._color || '#0ea5e9';
      h += `<div style="${st}"><div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;font-weight:600;color:#e2e8f0">${lbl}</span><span style="font-size:13px;font-weight:700;color:${clr}">${pct}%</span></div><div style="width:100%;height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${clr};border-radius:5px"></div></div></div></div>`;
    } else if (el.type === 'socialicons') {
      const links = el._links || {};
      h += `<div style="${st};display:flex;gap:14px;justify-content:center;align-items:center">${Object.entries(SOCIAL_SVGS).map(([k, d]) => {
        const url = links[k] || '#';
        const tag = url && url !== '#' && url !== '' ? 'a' : 'span';
        const href = tag === 'a' ? ` href="${url}" target="_blank"` : '';
        return `<${tag}${href} style="display:inline-flex"><svg viewBox="0 0 24 24" width="22" height="22" fill="#94a3b8"><path d="${d}"/></svg></${tag}>`;
      }).join('')}</div>`;
    } else if (el.type === 'form') {
      // Wrap in actual <form> tag and convert div submit buttons to real buttons
      let formHtml = (el.txt || '').replace(
        /<div([^>]*?)style="([^"]*?)"([^>]*)>(Get Access|Submit|Sign Up|Join|Download|Get Started|Subscribe|Claim|Register)[^<]*<\/div>/gi,
        '<button type="submit" style="$2;border:none;cursor:pointer;font-family:inherit">$4</button>'
      );
      formHtml = formHtml.replace(
        /placeholder="([^"]*?name[^"]*?)"/gi,
        'placeholder="$1" name="name"'
      ).replace(
        /placeholder="([^"]*?email[^"]*?)"/gi,
        'placeholder="$1" name="email" type="email"'
      ).replace(
        /placeholder="([^"]*?phone[^"]*?)"/gi,
        'placeholder="$1" name="phone" type="tel"'
      );
      h += `<form style="${st}" onsubmit="return true">${formHtml}</form>`;
    } else {
      h += `<div style="${st}">${el.txt || ''}</div>`;
    }
  });

  h += '</div></div>';
  return h;
}

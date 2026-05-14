// ═══════════════════════════════════════════════════════════════
// Custom templates store
// ═══════════════════════════════════════════════════════════════
//
// Members can save their current page as a personal template, then
// apply it to other pages or share via a SAP-XXXX-XXXX code.
//
// Storage strategy:
//   - Custom templates live in localStorage under key 'labs_custom_templates'
//   - Up to 30 personal templates per browser (FIFO)
//   - Each has the same shape as the built-in LABS_TEMPLATES entries
//     plus a `_custom: true` flag and `_savedAt` timestamp
//
// SAP code scheme:
//   - SAP-XXXX-XXXX where X is a base32 character (Crockford alphabet,
//     no I/L/O/U so codes can't be misread)
//   - Code → compressed-base64 template JSON, decoded back on import
//   - Members share the code in a chat or post; pasting it imports
//     the template
//
// Future: server-backed sharing so codes work across browsers without
// the URL. For now codes work via direct paste only — no server round-trip.

const STORAGE_KEY = 'labs_custom_templates';
const MAX_CUSTOM = 30;

// Crockford base32 (excludes I, L, O, U — visually ambiguous chars)
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomCode4() {
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────
// Local storage CRUD
// ─────────────────────────────────────────────────────────────────

export function loadCustomTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplate(name, els, canvasBg, canvasBgImage) {
  const existing = loadCustomTemplates();
  const tpl = {
    id: 'custom_' + Date.now().toString(36),
    name: (name || 'Untitled template').slice(0, 60),
    category: 'My templates',
    description: `Saved ${new Date().toLocaleDateString()} · ${els.length} ${els.length === 1 ? 'element' : 'elements'}`,
    accent: '#0ea5e9',
    thumbnailGradient: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)',
    canvasBg: canvasBg || '#ffffff',
    canvasBgImage: canvasBgImage || '',
    els: JSON.parse(JSON.stringify(els)), // deep clone so future edits don't mutate
    _custom: true,
    _savedAt: Date.now(),
    _shareCode: generateShareCode(),
  };
  const next = [tpl, ...existing].slice(0, MAX_CUSTOM);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    // localStorage might be full or disabled; surface to caller via return
    console.error('Could not save custom template:', e);
    return null;
  }
  return tpl;
}

export function deleteCustomTemplate(id) {
  const existing = loadCustomTemplates();
  const next = existing.filter(t => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// ─────────────────────────────────────────────────────────────────
// SAP share codes
// ─────────────────────────────────────────────────────────────────

function generateShareCode() {
  return `SAP-${randomCode4()}-${randomCode4()}`;
}

// Encode an entire template into a string for sharing. Format:
//   SAP-XXXX-XXXX::<base64-encoded JSON>
// The SAP prefix is the human-friendly part; the payload after :: is
// the actual template data. Members copy the WHOLE thing including
// payload — the leading code is just a recognisable label.
//
// We use TextEncoder + btoa to safely round-trip non-ASCII chars
// (template copy may contain emoji, accented chars, etc).
export function encodeTemplateForShare(tpl) {
  try {
    const payload = JSON.stringify({
      name: tpl.name,
      canvasBg: tpl.canvasBg,
      canvasBgImage: tpl.canvasBgImage,
      els: tpl.els,
    });
    const bytes = new TextEncoder().encode(payload);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    const code = tpl._shareCode || generateShareCode();
    return `${code}::${b64}`;
  } catch (e) {
    console.error('encodeTemplateForShare failed:', e);
    return null;
  }
}

// Decode a SAP code back into a template. Returns null on bad input.
// The caller decides what to do (apply to canvas, save to library, etc).
export function decodeTemplateFromShare(input) {
  try {
    const raw = (input || '').trim();
    const sepIdx = raw.indexOf('::');
    if (sepIdx < 0) return null;
    const code = raw.slice(0, sepIdx);
    const b64 = raw.slice(sepIdx + 2);
    if (!/^SAP-[0-9A-HJKMNPQRSTVWXYZ]{4}-[0-9A-HJKMNPQRSTVWXYZ]{4}$/i.test(code)) return null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || !Array.isArray(payload.els)) return null;
    return {
      id: 'imported_' + Date.now().toString(36),
      name: payload.name || 'Imported template',
      category: 'My templates',
      description: `Imported from ${code} · ${payload.els.length} ${payload.els.length === 1 ? 'element' : 'elements'}`,
      accent: '#a855f7',
      thumbnailGradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #0ea5e9 100%)',
      canvasBg: payload.canvasBg || '#ffffff',
      canvasBgImage: payload.canvasBgImage || '',
      els: payload.els,
      _custom: true,
      _savedAt: Date.now(),
      _shareCode: code,
      _imported: true,
    };
  } catch (e) {
    console.error('decodeTemplateFromShare failed:', e);
    return null;
  }
}

// Import a SAP code into the personal template library. Returns the
// added template or null on failure.
export function importTemplateFromCode(input) {
  const decoded = decodeTemplateFromShare(input);
  if (!decoded) return null;
  const existing = loadCustomTemplates();
  const next = [decoded, ...existing].slice(0, MAX_CUSTOM);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return decoded;
  } catch (e) {
    console.error('Could not save imported template:', e);
    return null;
  }
}

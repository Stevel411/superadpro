// ═══════════════════════════════════════════════════════════════
// Sandbox storage for the Labs page builder
// ═══════════════════════════════════════════════════════════════
//
// Labs pages live entirely in localStorage. They never touch the
// production `funnels` table. This means:
//   - You can build, break, experiment freely
//   - No risk of accidentally publishing a half-baked test page
//   - Clearing site data wipes them (intentional — they're sandbox)
//   - Sandboxes don't sync between browsers/devices
//
// When a sandbox page is ready for production, the editor's
// "Export to production" button copies it via /api/funnels/save
// so it becomes a real funnel in /pro/funnels.
//
// Storage shape:
//   localStorage['labs_sandbox_pages'] = JSON array of pages
//
// Each page:
//   {
//     id: 'sbx_<timestamp>_<rand>',
//     name: 'Untitled sandbox',
//     created_at: ISO string,
//     updated_at: ISO string,
//     els: [...],
//     canvasBg: '#ffffff',
//     canvasBgImage: '',
//     metaDescription: '',
//     ogImage: '',
//   }

const STORAGE_KEY = 'labs_sandbox_pages';
const MAX_PAGES = 50;

function newId() {
  return 'sbx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// ─────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────

export function listSandboxPages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Sort by updated_at descending so the most recently edited
    // shows up first in the picker
    return [...arr].sort((a, b) => {
      const at = new Date(a.updated_at || 0).getTime();
      const bt = new Date(b.updated_at || 0).getTime();
      return bt - at;
    });
  } catch {
    return [];
  }
}

export function loadSandboxPage(id) {
  if (!id) return null;
  const all = listSandboxPages();
  return all.find(p => p.id === id) || null;
}

// Create a fresh sandbox page. Returns the full page object so the
// caller can immediately route into the editor with its id.
export function createSandboxPage(name = 'Untitled sandbox') {
  const now = new Date().toISOString();
  const page = {
    id: newId(),
    name: (name || 'Untitled sandbox').slice(0, 80),
    created_at: now,
    updated_at: now,
    els: [],
    canvasBg: '#ffffff',
    canvasBgImage: '',
    metaDescription: '',
    ogImage: '',
  };
  const existing = listSandboxPages();
  const next = [page, ...existing].slice(0, MAX_PAGES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Could not create sandbox page:', e);
    return null;
  }
  return page;
}

// Save changes back. Merges over existing fields so partial updates
// (e.g. just els) don't blow away unrelated fields.
export function saveSandboxPage(id, updates) {
  if (!id || !updates) return null;
  const existing = listSandboxPages();
  const idx = existing.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const merged = {
    ...existing[idx],
    ...updates,
    id, // never let updates override id
    updated_at: new Date().toISOString(),
  };
  existing[idx] = merged;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return merged;
  } catch (e) {
    console.error('Could not save sandbox page:', e);
    return null;
  }
}

export function deleteSandboxPage(id) {
  if (!id) return false;
  const existing = listSandboxPages();
  const next = existing.filter(p => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function duplicateSandboxPage(id) {
  const original = loadSandboxPage(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const copy = {
    ...original,
    id: newId(),
    name: original.name + ' (copy)',
    created_at: now,
    updated_at: now,
  };
  const existing = listSandboxPages();
  const next = [copy, ...existing].slice(0, MAX_PAGES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return copy;
  } catch {
    return null;
  }
}

// Helper for the "Export to production" button. Returns a payload
// shaped for /api/funnels/save (creates a new funnel record). The
// caller handles the actual API call.
export function exportToProductionPayload(sandboxPage) {
  if (!sandboxPage) return null;
  return {
    title: sandboxPage.name || 'Untitled (from Labs sandbox)',
    headline: sandboxPage.name || 'Untitled (from Labs sandbox)',
    meta_description: sandboxPage.metaDescription || '',
    image_url: sandboxPage.ogImage || '',
    gjs_css: JSON.stringify({
      els: sandboxPage.els || [],
      canvasBg: sandboxPage.canvasBg || '#ffffff',
      canvasBgImage: sandboxPage.canvasBgImage || '',
    }),
    status: 'draft', // exports start as drafts, never auto-published
  };
}

// ═══════════════════════════════════════════════════════════════
// Block favourites + recents
// ═══════════════════════════════════════════════════════════════
//
// Tracks which palette blocks each member uses most so the palette
// can surface a personalised "Quick blocks" row at the top.
//
// Two complementary signals:
//   - Recents: last N block types added, FIFO. Updated on every add.
//   - Favourites: explicit member pick via the ⭐ button on each tile.
//     Stored as an ordered list; member-controlled.
//
// Both live in localStorage (per-browser, per-user). Survives reloads
// but doesn't cross devices.

const RECENT_KEY = 'labs_block_recents';
const FAV_KEY = 'labs_block_favourites';
const MAX_RECENT = 8;

export function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function pushRecent(type) {
  if (!type) return;
  try {
    const existing = loadRecents();
    // De-dupe — move to front if already present
    const next = [type, ...existing.filter(t => t !== type)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function loadFavourites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function toggleFavourite(type) {
  if (!type) return [];
  try {
    const existing = loadFavourites();
    const next = existing.includes(type)
      ? existing.filter(t => t !== type)
      : [...existing, type];
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

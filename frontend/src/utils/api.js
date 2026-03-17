const API_BASE = '';

export async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  var text = '';
  try { text = await res.text(); } catch(e) {}
  var data = {};
  try { data = JSON.parse(text); } catch(e) {}
  if (!res.ok) {
    var msg = data.error || data.detail || ('HTTP ' + res.status + ': ' + (text || '').slice(0, 200));
    throw new Error(msg);
  }
  return data;
}

export async function apiGet(path) {
  return api(path);
}

export async function apiPost(path, body) {
  return api(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut(path, body) {
  return api(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDelete(path) {
  return api(path, { method: 'DELETE' });
}

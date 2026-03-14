const API_BASE = '';

export async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = '/login';
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed');
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

const KEY = 'wdd.viewAs';

/** Dev-mode identity: the email chosen in "Viewing as". Ignored by the API in proxy (SSO) mode. */
export const viewAs = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } }
};

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const who = viewAs.get();
  if (who) headers['x-user-email'] = who;
  const res = await fetch('/api' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const qs = obj => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== '' && v !== false && v != null) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

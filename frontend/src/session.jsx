import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ToastNotification } from '@carbon/react';
import { api, viewAs } from './api.js';

const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [devUsers, setDevUsers] = useState(null);
  const [me, setMe] = useState(null);
  const [reference, setReference] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, r, s] = await Promise.all([api('/me'), api('/reference'), api('/settings')]);
      setMe(m); setReference(r); setSettings(s);
    } catch (e) { setMe(null); setError(e.message); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const users = await api('/dev/users');
        setDevUsers(users);
        if (!users.some(u => u.email === viewAs.get())) viewAs.set(users[0]?.email || '');
      } catch { /* proxy/SSO mode: no switcher */ }
      await load();
    })();
  }, [load]);

  const switchUser = email => { viewAs.set(email); load(); };
  const refreshMe = async () => setMe(await api('/me'));
  const notify = useCallback((kind, title, subtitle) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, kind, title, subtitle }]);
  }, []);
  const fail = useCallback(e => notify('error', 'That didn’t work', e.message), [notify]);

  return (
    <Ctx.Provider value={{ me, reference, settings, setSettings, devUsers, switchUser, refreshMe, notify, fail, error, reload: load }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => (
          <ToastNotification key={t.id} kind={t.kind} title={t.title} subtitle={t.subtitle} timeout={t.kind === 'error' ? 8000 : 4000}
            onClose={() => setToasts(x => x.filter(y => y.id !== t.id))} onCloseButtonClick={() => setToasts(x => x.filter(y => y.id !== t.id))} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

/** Small data-loading hook: { data, error, loading, reload, setData } */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try { setState({ data: await fn(), error: null, loading: false }); }
    catch (e) { setState({ data: null, error: e.message, loading: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: d => setState(s => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

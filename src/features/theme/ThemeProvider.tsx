import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Mode = 'light' | 'dark' | 'system';
const KEY = 'knowledge114-theme';
const normalize = (value: string | null): Mode => value === 'dark' || value === 'light' ? value : 'system';
function read(): Mode { try { return normalize(localStorage.getItem(KEY)); } catch { return 'system'; } }
const ThemeContext = createContext<{ mode: Mode; setMode: (mode: Mode) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, update] = useState<Mode>(read);
  useEffect(() => {
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = mode;
  }, [mode]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) update(read());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const setMode = (next: Mode) => {
    update(next);
    try { if (next === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, next); } catch { /* 無儲存權限仍可切換 */ }
  };
  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
}
export function ThemeSelect() {
  const theme = useContext(ThemeContext)!;
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  const dark = theme.mode === 'dark' || (theme.mode === 'system' && systemDark);
  return <div className="theme-select" data-dark={dark} data-auto={theme.mode === 'system'} aria-label="顯示主題">
    <button className="theme-switch-button" type="button" role="switch" aria-label="深色模式" aria-checked={dark} title={`切換為${dark ? '淺色' : '深色'}主題`} onClick={() => theme.setMode(dark ? 'light' : 'dark')}>
      <span className="theme-switch-mark" aria-hidden="true">✦</span><span className="theme-switch-label" aria-hidden="true">{dark ? '深色' : '淺色'}</span>
      <span className="theme-switch-track" aria-hidden="true"><span className="theme-switch-thumb" /></span>
    </button>
    <button className="theme-auto-button" type="button" aria-label="跟隨系統主題" aria-pressed={theme.mode === 'system'} title="跟隨系統主題" onClick={() => theme.setMode('system')}>自動</button>
  </div>;
}

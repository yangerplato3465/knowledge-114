import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

type Mode = 'light' | 'dark';
const KEY = 'knowledge114-theme';
const normalize = (value: string | null): Mode => value === 'dark' ? 'dark' : 'light';
function read(): Mode { try { return normalize(localStorage.getItem(KEY)); } catch { return 'light'; } }
const ThemeContext = createContext<{ mode: Mode; setMode: (mode: Mode) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, update] = useState<Mode>(read);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
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
    try { localStorage.setItem(KEY, next); } catch { /* 無儲存權限仍可切換 */ }
  };
  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
}
export function ThemeSelect() {
  const theme = useContext(ThemeContext)!;
  const dark = theme.mode === 'dark';
  return <div className="theme-select" data-dark={dark} aria-label="顯示主題">
    <button className="theme-switch-button" type="button" role="switch" aria-label="深色模式" aria-checked={dark} title={`切換為${dark ? '淺色' : '深色'}主題`} onClick={() => theme.setMode(dark ? 'light' : 'dark')}>
      <span className="theme-switch-mark" aria-hidden="true">✦</span><span className="theme-switch-label" aria-hidden="true">{dark ? '深色' : '淺色'}</span>
      <span className="theme-switch-track" aria-hidden="true"><span className="theme-switch-thumb" /></span>
    </button>
  </div>;
}

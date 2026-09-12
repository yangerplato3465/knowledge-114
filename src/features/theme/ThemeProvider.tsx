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
  return <label>顯示主題 <select value={theme.mode} onChange={e => theme.setMode(e.target.value as Mode)}>
    <option value="system">跟隨系統</option><option value="light">淺色</option><option value="dark">深色</option>
  </select></label>;
}

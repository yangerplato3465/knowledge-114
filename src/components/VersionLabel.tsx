import { useEffect, useState } from 'react';
export function VersionLabel() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}config.json`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('Version unavailable'); return response.json(); })
      .then((config: unknown) => {
        if (!config || typeof config !== 'object') return;
        const { version, lastUpdated } = config as Record<string, unknown>;
        if (!abort.signal.aborted && typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)
          && typeof lastUpdated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)) setLabel(`v${version} · ${lastUpdated}`);
      }).catch(() => { /* 版號讀取失敗不阻擋教學入口，與原版相同。 */ });
    return () => abort.abort();
  }, []);
  return <p className="version-label" aria-label="網站版本">{label}</p>;
}

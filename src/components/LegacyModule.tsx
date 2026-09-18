import { useEffect, useState } from 'react';

/**
 * 在 React 完成可存取 DOM 後才啟動保留的 imperative 模組。
 * module 必須自行擁有資料訂閱與 pagehide 清理；新頁面不以 innerHTML 搬運 UI。
 */
export function LegacyModule({ src, loading }: { src: string; loading: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setError(false);
    setLoaded(false);
    const script = document.createElement('script');
    script.type = 'module';
    script.src = `${import.meta.env.BASE_URL}${src}`;
    script.dataset.reactLegacyAdapter = src;
    const fail = () => setError(true);
    const ready = () => setLoaded(true);
    script.addEventListener('error', fail, { once: true });
    script.addEventListener('load', ready, { once: true });
    document.body.append(script);
    return () => {
      script.removeEventListener('error', fail);
      script.removeEventListener('load', ready);
      script.remove();
    };
  }, [src]);
  return <span className="legacy-module-state" role="status">{error ? '功能載入失敗，請重新整理後再試。' : loaded ? '' : loading}</span>;
}

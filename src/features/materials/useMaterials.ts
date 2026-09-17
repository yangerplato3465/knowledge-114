import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, listMaterials, type Material } from './api';

export function useMaterials(initialToken = '') {
  const initial = useRef(initialToken);
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ loading: boolean; files: Material[]; error: string }>({ loading: true, files: [], error: '' });
  const reload = useCallback(async (token = '') => {
    request.current?.abort();
    const current = new AbortController(); request.current = current;
    setState({ loading: true, files: [], error: '' });
    try {
      const files = await listMaterials(token, current.signal);
      if (!current.signal.aborted) setState({ loading: false, files, error: '' });
    } catch (error) {
      if (!current.signal.aborted) setState({ loading: false, files: [], error: errorMessage(error) });
    }
  }, []);
  useEffect(() => { void reload(initial.current); return () => request.current?.abort(); }, [reload]);
  return { ...state, reload };
}

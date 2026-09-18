import { Icon } from '../../components/Icon';
import { useEffect, useRef, useState } from 'react';
import { PageLayout } from '../../components/PageLayout';
import { deleteMaterial, errorMessage, formatSize, uploadMaterial, type Material } from './api';
import { useMaterials } from './useMaterials';
import './materials.css';

const KEY = 'gh_upload_token';
function savedToken() { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } }
interface Result { name: string; state: 'pending' | 'ok' | 'error'; message: string }
export function Upload() {
  const [saved] = useState(savedToken);
  const [token, setToken] = useState(saved);
  const [remember, setRemember] = useState(!!saved);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useMaterials(saved);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (operation.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { operation.current?.abort(); window.removeEventListener('beforeunload', warn); };
  }, []);
  function begin() {
    if (operation.current) return null;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(''); setMessage('');
    return controller;
  }
  function finish(controller: AbortController) {
    if (operation.current === controller) operation.current = null;
    if (!controller.signal.aborted) setBusy(false);
  }
  async function upload() {
    if (!token.trim() || !files.length) return;
    const controller = begin(); if (!controller) return;
    const batch = [...files]; const credential = token.trim();
    try { if (remember) localStorage.setItem(KEY, credential); else localStorage.removeItem(KEY); } catch { /* 禁止 storage 時仍可手動操作 */ }
    setResults(batch.map(file => ({ name: file.name, state: 'pending', message: '等待上傳' })));
    try {
      for (let i = 0; i < batch.length; i++) {
        if (controller.signal.aborted) break;
        setResults(rows => rows.map((row, index) => index === i ? { ...row, message: '上傳中…' } : row));
        try {
          const response = await uploadMaterial(batch[i], credential, controller.signal);
          if (!controller.signal.aborted) setResults(rows => rows.map((row, index) => index === i ? { ...row, state: 'ok', message: response } : row));
        } catch (reason) {
          if (!controller.signal.aborted) setResults(rows => rows.map((row, index) => index === i ? { ...row, state: 'error', message: errorMessage(reason) } : row));
        }
      }
      if (!controller.signal.aborted) await list.reload(credential);
    } finally { finish(controller); }
  }
  async function remove(file: Material) {
    if (operation.current) return;
    if (!token.trim()) { setError('請先在上方貼上 GitHub 權杖，才能刪除檔案。'); return; }
    if (!window.confirm(`確定要刪除「${file.name}」嗎？`)) return;
    const controller = begin(); if (!controller) return;
    try {
      await deleteMaterial(file, token.trim(), controller.signal);
      if (!controller.signal.aborted) { setMessage(`已刪除「${file.name}」。`); await list.reload(token.trim()); }
    } catch (reason) { if (!controller.signal.aborted) setError(errorMessage(reason)); }
    finally { finish(controller); }
  }
  return <PageLayout><section className="hub-card materials" aria-labelledby="upload-title">
    <div className="section-icon"><Icon name="upload" /></div><h1 id="upload-title">上傳素材</h1><p>上傳的檔案會存到網站的素材庫，任何人都能在下載頁取得。</p>
    <div className="material-field"><label htmlFor="token">GitHub 存取權杖（Token）</label>
      <input id="token" type="password" autoComplete="off" value={token} disabled={busy} onChange={e => setToken(e.target.value)} placeholder="ghp_... 或 github_pat_..." />
      <p className="material-hint">到 <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">GitHub 設定</a> 建立 Fine-grained token，對 <b>knowledge-114</b> 開啟 <b>Contents: Read and write</b> 權限。切勿分享給別人。</p>
      <label className="material-remember"><input type="checkbox" checked={remember} disabled={busy} onChange={e => { setRemember(e.target.checked); if (!e.target.checked) { try { localStorage.removeItem(KEY); } catch { /* 可繼續 */ } } }} />記住權杖（僅存在這台裝置的瀏覽器）</label>
    </div>
    <div className="material-field"><label htmlFor="material-files">選擇檔案</label>
      <button className={`material-drop ${dragging ? 'dragging' : ''}`} disabled={busy} onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); if (!operation.current) setFiles(Array.from(e.dataTransfer.files)); }}>點這裡選檔，或把檔案拖進來</button>
      <input ref={input} id="material-files" type="file" multiple disabled={busy} onChange={e => { if (!operation.current) setFiles(Array.from(e.target.files || [])); }} />
      {files.length > 0 && <p className="material-selection">已選 {files.length} 個檔案：{files.map(file => file.name).join('、')}</p>}
    </div>
    <button className="material-primary" disabled={busy || !token.trim() || !files.length} onClick={() => void upload()}>{busy ? '處理中…' : '上傳'}</button>
    <div aria-live="polite">{results.map((row, i) => <p key={`${i}-${row.name}`} className={`material-result ${row.state}`}><strong>{row.name}</strong><span>{row.message}</span></p>)}</div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <section className="material-manage" aria-labelledby="manage-title"><div className="material-toolbar"><h2 id="manage-title">已上傳的素材</h2><button disabled={busy} onClick={() => void list.reload(token.trim())}>重新整理</button></div>
      {list.loading ? <p role="status">載入中…</p> : list.error ? <p role="alert">{list.error}</p> : !list.files.length ? <p role="status">素材庫還是空的。</p> :
        <ul className="material-list">{list.files.map(file => <li key={file.name} className="material-row"><div><strong>{file.name}</strong><small>{formatSize(file.size)}</small></div><button disabled={busy} aria-label={`刪除 ${file.name}`} onClick={() => void remove(file)}>刪除</button></li>)}</ul>}
    </section>
  </section></PageLayout>;
}

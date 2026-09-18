const ROOT = 'https://api.github.com/repos/yangerplato3465/knowledge-114/contents/assets/uploads';
const BRANCH = 'main';
export interface Material { name: string; size: number; sha: string }
const headers = (token = '') => ({ Accept: 'application/vnd.github+json', ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}) });
const validName = (name: string) => !!name && name !== '.' && name !== '..' && !/[\\/\u0000-\u001f]/.test(name);
function fileURL(name: string) {
  if (!validName(name)) throw new Error('檔名不合法。');
  return `${ROOT}/${encodeURIComponent(name)}`;
}
export const downloadURL = (name: string) => `https://raw.githubusercontent.com/yangerplato3465/knowledge-114/main/assets/uploads/${encodeURIComponent(name)}`;
export const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

function check(response: Response, action: string) {
  if (response.ok) return;
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub 查詢次數暫時用完了，請稍後再試，或在上傳頁使用權杖重新整理。');
  if (response.status === 401) throw new Error('權杖無效或已過期，請重新輸入。');
  if (response.status === 409) throw new Error('素材已被其他操作更新，請重新整理後再試。');
  throw new Error(`${action}（HTTP ${response.status}）`);
}
export const errorMessage = (error: unknown) => error instanceof TypeError ? '無法連線，請稍後再試。' : error instanceof Error ? error.message : '操作失敗，請稍後再試。';

export async function listMaterials(token = '', signal?: AbortSignal): Promise<Material[]> {
  const response = await fetch(`${ROOT}?ref=${BRANCH}`, { headers: headers(token), signal });
  if (response.status === 404) return [];
  check(response, '載入失敗');
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error('素材清單格式有誤，請稍後再試。'); }
  if (!Array.isArray(data)) throw new Error('素材清單格式有誤，請稍後再試。');
  const files: Material[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object' || typeof item.type !== 'string') throw new Error('素材清單格式有誤，請稍後再試。');
    if (item.type !== 'file' || item.name === '.gitkeep') continue;
    if (typeof item.name !== 'string' || !validName(item.name) || typeof item.sha !== 'string' || !item.sha || typeof item.size !== 'number' || !Number.isFinite(item.size) || item.size < 0) throw new Error('素材清單格式有誤，請稍後再試。');
    files.push({ name: item.name, sha: item.sha, size: item.size });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

export function fileToBase64(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => signal.removeEventListener('abort', abort);
    const abort = () => { reader.abort(); cleanup(); reject(new DOMException('已取消', 'AbortError')); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    reader.onerror = () => { cleanup(); reject(new Error('無法讀取檔案。')); };
    reader.onload = () => {
      cleanup();
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      resolve(btoa(binary));
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function uploadMaterial(file: File, token: string, signal: AbortSignal) {
  if (!token.trim()) throw new Error('請先輸入 GitHub 權杖。');
  const url = fileURL(file.name);
  const existing = await fetch(`${url}?ref=${BRANCH}`, { headers: headers(token), signal });
  let sha: string | undefined;
  if (existing.ok) {
    const data = await existing.json().catch(() => { throw new Error('無法確認現有檔案，請重新整理後再試。'); });
    if (typeof data?.sha !== 'string' || !data.sha || data.type !== 'file') throw new Error('無法確認現有檔案，請重新整理後再試。');
    sha = data.sha;
  } else if (existing.status !== 404) check(existing, '無法確認現有檔案');
  const content = await fileToBase64(file, signal);
  signal.throwIfAborted();
  const response = await fetch(url, { method: 'PUT', headers: headers(token), signal,
    body: JSON.stringify({ message: `上傳素材：${file.name}`, content, branch: BRANCH, ...(sha ? { sha } : {}) }) });
  check(response, '上傳失敗');
  return sha ? '已更新' : '完成';
}

export async function deleteMaterial(file: Material, token: string, signal: AbortSignal) {
  if (!token.trim()) throw new Error('請先輸入 GitHub 權杖。');
  if (!file.sha) throw new Error('無法確認現有檔案，請重新整理後再試。');
  const response = await fetch(fileURL(file.name), { method: 'DELETE', headers: headers(token), signal,
    body: JSON.stringify({ message: `刪除素材：${file.name}`, sha: file.sha, branch: BRANCH }) });
  check(response, '刪除失敗');
}

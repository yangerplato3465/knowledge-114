// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { Downloads } from './Downloads';
import { Upload } from './Upload';
import { deleteMaterial, fileToBase64, listMaterials, uploadMaterial } from './api';

const file = { type: 'file', name: '教材 #1.txt', sha: 'old-sha', size: 2048 };
const response = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });
function setupUpload() { return render(<StrictMode><ThemeProvider><Upload /></ThemeProvider></StrictMode>); }
function chooseFiles() {
  fireEvent.change(screen.getByLabelText('GitHub 存取權杖（Token）'), { target: { value: 'test-only-token' } });
  fireEvent.change(screen.getByLabelText('選擇檔案'), { target: { files: [new File(['內容'], '教材 #1.txt')] } });
}
it('檔名作純文字呈現並編碼下載路徑，排除資料夾及 gitkeep', async () => {
  const name = '<img src=x onerror=alert(1)> #.txt';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ ...file, name }, { type: 'dir' }, { type: 'file', name: '.gitkeep' }])));
  render(<ThemeProvider><Downloads /></ThemeProvider>);
  expect(await screen.findByText(name)).toBeTruthy();
  expect(document.querySelector('img')).toBeNull();
  expect(screen.getByRole('link', { name: `下載 ${name}` }).getAttribute('href')).toContain(encodeURIComponent(name));
  expect(screen.getByText('2.0 KB')).toBeTruthy();
});
it('格式錯誤、限流與空目錄可辨認並重新整理恢復', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response({ wrong: true }))
    .mockResolvedValueOnce(response({}, 403, { 'x-ratelimit-remaining': '0' }))
    .mockResolvedValueOnce(response({}, 404));
  vi.stubGlobal('fetch', fetcher);
  render(<ThemeProvider><Downloads /></ThemeProvider>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '素材清單格式有誤，請稍後再試。');
  fireEvent.click(screen.getByRole('button', { name: '重新整理' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('查詢次數'));
  fireEvent.click(screen.getByRole('button', { name: '重新整理' }));
  expect(await screen.findByText('素材庫還是空的，快去上傳第一個檔案吧！')).toBeTruthy();
});
it('舊回應較晚完成也不能覆蓋新清單', async () => {
  let finish!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue(response([{ ...file, name: '最新.txt' }])));
  render(<ThemeProvider><Downloads /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: '重新整理' }));
  expect(await screen.findByText('最新.txt')).toBeTruthy();
  await act(async () => finish(response([{ ...file, name: '過期.txt' }])));
  expect(screen.queryByText('過期.txt')).toBeNull();
});
it('二進位讀取維持 Base64，查詢失敗或無效 SHA 絕不 PUT', async () => {
  const signal = new AbortController().signal;
  expect(await fileToBase64(new File([new Uint8Array([0, 128, 255])], 'binary.bin'), signal)).toBe('AID/');
  const fetcher = vi.fn().mockResolvedValue(response({}, 500)); vi.stubGlobal('fetch', fetcher);
  await expect(uploadMaterial(new File(['x'], 'a.txt'), 'test', signal)).rejects.toThrow('無法確認');
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockReset().mockResolvedValue(response({ type: 'file' }));
  await expect(uploadMaterial(new File(['x'], 'a.txt'), 'test', signal)).rejects.toThrow('無法確認');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('更新檔案傳入 SHA，檔名編碼且寫入 main', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response(file)).mockResolvedValueOnce(response({}));
  vi.stubGlobal('fetch', fetcher);
  expect(await uploadMaterial(new File(['abc'], file.name), 'test', new AbortController().signal)).toBe('已更新');
  const [url, options] = fetcher.mock.calls[1];
  expect(url).toContain('assets/uploads/' + encodeURIComponent(file.name));
  expect(JSON.parse(options.body)).toMatchObject({ sha: file.sha, content: 'YWJj', branch: 'main' });
});
it('封鎖 storage 仍能上傳，重複點擊只送出一份 PUT', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'PUT') return response({});
    return url.includes('uploads?') ? response([]) : response({}, 404);
  });
  vi.stubGlobal('fetch', fetcher); setupUpload(); chooseFiles();
  fireEvent.click(screen.getByLabelText(/記住權杖/));
  const button = screen.getByRole('button', { name: '上傳' });
  fireEvent.click(button); fireEvent.click(button);
  expect(await screen.findByText('完成')).toBeTruthy();
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
});
it('上傳前置查詢未完成就卸載，不繼續 PUT 或下一個檔案', async () => {
  let finish!: (value: Response) => void;
  const fetcher = vi.fn((url: string) => url.includes('uploads?') ? Promise.resolve(response([])) : new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetcher); const view = setupUpload(); chooseFiles();
  fireEvent.click(screen.getByRole('button', { name: '上傳' }));
  view.unmount(); await act(async () => finish(response({}, 404)));
  expect(fetcher.mock.calls.filter(([url]) => !url.includes('uploads?'))).toHaveLength(1);
});
it('取消刪除不寫入，確認刪除後使用原 SHA 並重新整理', async () => {
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => response(options?.method === 'DELETE' ? {} : [file]));
  vi.stubGlobal('fetch', fetcher);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  setupUpload(); chooseFiles();
  fireEvent.click(await screen.findByRole('button', { name: `刪除 ${file.name}` }));
  expect(fetcher.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: `刪除 ${file.name}` }));
  expect(await screen.findByText(`已刪除「${file.name}」。`)).toBeTruthy();
  const operation = fetcher.mock.calls.find(([, options]) => options?.method === 'DELETE')!;
  expect(JSON.parse(operation[1]!.body as string)).toMatchObject({ sha: file.sha, branch: 'main' });
});
it('非法路徑及無權杖刪除不發送請求', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  await expect(deleteMaterial(file, '', signal)).rejects.toThrow('權杖');
  await expect(uploadMaterial(new File(['x'], '../outside.txt'), 'test', signal)).rejects.toThrow('檔名');
  expect(fetcher).not.toHaveBeenCalled();
});
it('清單內容型別不合法時顯示格式錯誤', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ type: 'file', name: 123 }])));
  await expect(listMaterials()).rejects.toThrow('素材清單格式');
});

it('批次依序上傳，一檔失敗仍處理下一檔', async () => {
  let finish!: (value: Response) => void;
  const writes: string[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (options?.method === 'PUT') {
      writes.push(url);
      if (writes.length === 1) return new Promise<Response>(resolve => { finish = resolve; });
      return Promise.resolve(response({}));
    }
    return Promise.resolve(url.includes('uploads?') ? response([]) : response({}, 404));
  }));
  setupUpload(); chooseFiles();
  fireEvent.change(screen.getByLabelText('選擇檔案'), { target: { files: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')] } });
  fireEvent.click(screen.getByRole('button', { name: '上傳' }));
  await waitFor(() => expect(writes).toHaveLength(1));
  await act(async () => finish(response({}, 500)));
  expect(await screen.findByText('上傳失敗（HTTP 500）')).toBeTruthy();
  expect(await screen.findByText('完成')).toBeTruthy();
  expect(writes.map(url => url.split('/').at(-1))).toEqual(['a.txt', 'b.txt']);
});

it('取消記住權杖立即刪除既有 key', () => {
  localStorage.setItem('gh_upload_token', 'test-saved-token');
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response([]))));
  setupUpload();
  expect((screen.getByLabelText(/記住權杖/) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByLabelText(/記住權杖/));
  expect(localStorage.getItem('gh_upload_token')).toBeNull();
});

it('刪除衝突保留清單並重新啟用按鈕', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: RequestInit) => options?.method === 'DELETE' ? response({}, 409) : response([file])));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  setupUpload(); chooseFiles();
  fireEvent.click(await screen.findByRole('button', { name: `刪除 ${file.name}` }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '素材已被其他操作更新，請重新整理後再試。');
  expect((screen.getByRole('button', { name: `刪除 ${file.name}` }) as HTMLButtonElement).disabled).toBe(false);
});

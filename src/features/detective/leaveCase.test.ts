// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { leaveCase } from './leaveCase';

afterEach(() => { delete window.DETECTIVE_FLUSH; vi.restoreAllMocks(); });

test('引擎尚未啟動可直接離開，無須存檔', async () => {
  const navigate = vi.fn();
  await leaveCase(navigate);
  expect(navigate).toHaveBeenCalledOnce();
});

test('等強制存檔成功後才離開', async () => {
  let finish!: (saved: boolean) => void;
  window.DETECTIVE_FLUSH = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
  const navigate = vi.fn();
  const pending = leaveCase(navigate);
  expect(window.DETECTIVE_FLUSH).toHaveBeenCalledWith(true);
  expect(navigate).not.toHaveBeenCalled();
  finish(true);
  await pending;
  expect(navigate).toHaveBeenCalledOnce();
});

test.each([false, true])('存檔失敗且使用者選擇離開=%s', async accepted => {
  window.DETECTIVE_FLUSH = vi.fn().mockResolvedValue(false);
  vi.spyOn(window, 'confirm').mockReturnValue(accepted);
  const navigate = vi.fn();
  await leaveCase(navigate);
  expect(navigate).toHaveBeenCalledTimes(accepted ? 1 : 0);
});

test('存檔拋出錯誤也保留目前頁面讓使用者決定', async () => {
  window.DETECTIVE_FLUSH = vi.fn().mockRejectedValue(new Error('offline'));
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const navigate = vi.fn();
  await leaveCase(navigate);
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(navigate).not.toHaveBeenCalled();
});

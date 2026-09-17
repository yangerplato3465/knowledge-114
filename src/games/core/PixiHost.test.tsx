// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PixiHost } from './PixiHost';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('初始化等待最新偏好，更新不重建，卸載解除監聽', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  let matches = false;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return matches; },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  let finish!: () => void;
  const controller = { mount: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })), resize: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), dispatch: vi.fn() };
  const create = vi.fn(() => controller);
  const view = render(<PixiHost createController={create} label="測試" paused />);
  act(() => { matches = true; listeners.forEach(fn => fn()); });
  expect(controller.dispatch).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(controller.dispatch).toHaveBeenLastCalledWith({ type: 'set-reduced-motion', enabled: true });
  act(() => { matches = false; listeners.forEach(fn => fn()); });
  expect(controller.dispatch).toHaveBeenLastCalledWith({ type: 'set-reduced-motion', enabled: false });
  expect(controller.resume).not.toHaveBeenCalled();
  expect(controller.pause).toHaveBeenCalled();
  expect(create).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(listeners.size).toBe(0);
  expect(controller.destroy).toHaveBeenCalledTimes(1);
});

it('無 matchMedia 時採減少動態，仍正常啟動遊戲', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', undefined);
  const controller = { mount: vi.fn().mockResolvedValue(undefined), resize: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), dispatch: vi.fn() };
  render(<PixiHost createController={() => controller} label="測試" />);
  await act(async () => {});
  expect(controller.dispatch).toHaveBeenCalledWith({ type: 'set-reduced-motion', enabled: true });
  expect(controller.resume).toHaveBeenCalledTimes(1);
});
it('StrictMode 提前離場時，等待 mount 完成再釋放各自的 controller', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const pending: (() => void)[] = [];
  const controllers: { mount: ReturnType<typeof vi.fn>; resize: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[] = [];
  const create = () => {
    const controller = { mount: vi.fn(() => new Promise<void>(resolve => pending.push(resolve))), resize: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), dispatch: vi.fn() };
    controllers.push(controller);
    return controller;
  };
  const view = render(<StrictMode><PixiHost createController={create} label="測試遊戲" /></StrictMode>);
  expect(controllers).toHaveLength(2);
  view.unmount();
  expect(controllers[0].destroy).not.toHaveBeenCalled();
  await act(async () => { pending.forEach(resolve => resolve()); });
  controllers.forEach(controller => {
    expect(controller.destroy).toHaveBeenCalledTimes(1);
    expect(controller.resume).not.toHaveBeenCalled();
  });
});
it('初始化失敗時釋放資源並提供錯誤提示', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const controller = { mount: vi.fn().mockRejectedValue(new Error('GPU')), resize: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), dispatch: vi.fn() };
  const view = render(<PixiHost createController={() => controller} label="測試遊戲" />);
  expect(await view.findByRole('alert')).toBeTruthy();
  view.unmount();
  expect(controller.destroy).toHaveBeenCalledTimes(1);
});

// @vitest-environment jsdom
import { StrictMode, useRef } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PixiBattle } from './PixiBattle';
import { initialBattle } from './model';
import type { BattleSnapshot } from './session';
const instances = vi.hoisted(() => [] as { mount: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; resolve: (v: boolean) => void; reject: (e: Error) => void }[]);
vi.mock('./pixiLayers', () => ({ createBattleGraphics: () => {
  let resolve!: (v: boolean) => void, reject!: (e: Error) => void;
  const promise = new Promise<boolean>((yes, no) => { resolve = yes; reject = no; });
  const value = { mount: vi.fn(() => promise), update: vi.fn(), destroy: vi.fn(), resolve, reject };
  instances.push(value); return value;
} }));
afterEach(() => { cleanup(); instances.length = 0; history.replaceState(null, '', '/'); });
const snapshot: BattleSnapshot = { state: initialBattle(), phase: 'question', questionId: 1, deadline: 30000, cue: null, hit: null, offers: [] };
function Harness() {
  const card = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  return <div ref={card}><div ref={stage} data-testid="stage"><img data-character="hero" /><img data-character="enemy" /></div><PixiBattle snapshot={snapshot} card={card} stage={stage} /></div>;
}
it('StrictMode 舊初始化不能隱藏新局備援；成功與離場只影響所屬實例', async () => {
  const view = render(<StrictMode><Harness /></StrictMode>);
  expect(instances).toHaveLength(2);
  expect(instances[0].destroy).toHaveBeenCalledTimes(1);
  await act(async () => instances[0].resolve(true));
  expect(screen.getByTestId('stage').classList.contains('mr-pixi-ready')).toBe(false);
  await act(async () => instances[1].resolve(true));
  expect(screen.getByTestId('stage').classList.contains('mr-pixi-ready')).toBe(true);
  expect(instances[1].update).toHaveBeenCalledWith(snapshot);
  view.unmount(); expect(instances[1].destroy).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.mr-overlay-canvas')).toBeNull();
});
it('載入失敗保留 DOM 圖片並顯示備援提示', async () => {
  render(<Harness />);
  await act(async () => instances[0].reject(new Error('GPU')));
  expect(screen.getByText(/特效無法載入/)).toBeTruthy();
  expect(screen.getByTestId('stage').classList.contains('mr-pixi-ready')).toBe(false);
});
it('nopixi 不載入 runtime', () => {
  history.replaceState(null, '', '/?nopixi'); render(<Harness />);
  expect(instances).toHaveLength(0);
  expect(screen.getByText('已使用基本角色顯示。')).toBeTruthy();
});

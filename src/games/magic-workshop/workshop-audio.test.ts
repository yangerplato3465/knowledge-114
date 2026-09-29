// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createWorkshopAudio, soundCues } from './workshop-audio';
import { gameReducer, initialGame } from './session';

afterEach(() => { vi.restoreAllMocks(); });

function device(running = true) {
  const parameter = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    state: running ? 'running' : 'suspended', currentTime: 10, destination: {},
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createOscillator: vi.fn(() => {
      const oscillator = { frequency: parameter(), type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null };
      oscillators.push(oscillator); return oscillator;
    }),
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  return { context, oscillators, factory };
}

it('無效操作、提示與選取無音效；有效操作及首次達標各有回饋', () => {
  const game = gameReducer(initialGame, { type: 'practice' });
  expect(soundCues(game, { type: 'select', index: 0 })).toEqual([]);
  expect(soundCues(game, { type: 'hint' })).toEqual([]);
  expect(soundCues(game, { type: 'operate', action: { kind: 'empty', from: 0 } })).toEqual([]);
  expect(soundCues(game, { type: 'operate', action: { kind: 'fill', from: 0 } })).toEqual(['fill', 'success']);
  const filled = gameReducer(game, { type: 'operate', action: { kind: 'fill', from: 1 } });
  expect(soundCues(filled, { type: 'operate', action: { kind: 'fill', from: 1 } })).toEqual([]);
  expect(soundCues(filled, { type: 'operate', action: { kind: 'empty', from: 1 } })).toEqual(['empty']);
  expect(soundCues(filled, { type: 'operate', action: { kind: 'pour', from: 1, to: 0 } })).toEqual(['pour', 'success']);
  const ready = gameReducer(game, { type: 'operate', action: { kind: 'fill', from: 0 } });
  expect(soundCues(ready, { type: 'operate', action: { kind: 'fill', from: 0 } })).toEqual([]);
  expect(soundCues(ready, { type: 'deliver' })).toEqual(['deliver']);
});

it('只在操作時啟用音效，新音效停止舊聲音，離頁釋放裝置', () => {
  const { factory, context, oscillators } = device();
  const player = createWorkshopAudio(factory);
  expect(factory).not.toHaveBeenCalled();
  player.play(['fill']);
  const old = [...oscillators];
  expect(old.length).toBeGreaterThan(0);
  player.play(['empty']);
  old.forEach(voice => expect(voice.disconnect).toHaveBeenCalledOnce());
  player.suspend();
  expect(context.suspend).toHaveBeenCalledOnce();
  player.destroy();
  expect(context.close).toHaveBeenCalledOnce();
  player.play(['success']);
  expect(factory).toHaveBeenCalledOnce();
});

it('復原或離頁後，遲到的音訊啟用回呼不能播放舊聲音', async () => {
  const { factory, context } = device(false);
  let resume!: () => void;
  context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { context.state = 'running'; resolve(); }; }));
  const player = createWorkshopAudio(factory);
  player.play(['fill']); player.stop(); resume();
  await Promise.resolve();
  expect(context.createOscillator).not.toHaveBeenCalled();
  player.destroy();
});

it('背景不啟動音效，音訊 API 不可用也不阻擋遊戲', () => {
  const { factory } = device();
  const player = createWorkshopAudio(factory);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  player.play(['success']);
  expect(factory).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  expect(() => createWorkshopAudio(() => { throw new Error('unavailable'); }).play(['fill'])).not.toThrow();
});

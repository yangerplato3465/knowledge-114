// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createWorkshopMusic } from './workshop-music';

afterEach(() => vi.restoreAllMocks());
function setup() {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document.body, 'append').mockImplementation(() => {});
  const track = {
    paused: true, currentTime: 12, loop: false, volume: 1, preload: '',
    play: vi.fn(async () => { track.paused = false; }),
    pause: vi.fn(() => { track.paused = true; }), removeAttribute: vi.fn(), load: vi.fn(),
    setAttribute: vi.fn(), remove: vi.fn(),
  };
  const factory = vi.fn(() => track as unknown as HTMLAudioElement);
  return { track, factory, music: createWorkshopMusic(factory) };
}
it('音樂由開始操作解鎖，跨關不重播，背景暫停後繼續，首頁與離場清理', async () => {
  const { music, track, factory } = setup();
  music.resume(); expect(factory).not.toHaveBeenCalled();
  music.start(); await vi.waitFor(() => expect(track.paused).toBe(false));
  expect(track.loop).toBe(true); expect(track.volume).toBe(.18);
  music.resume(); expect(track.play).toHaveBeenCalledTimes(1);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  music.visibility(); expect(track.paused).toBe(true);
  expect(track.currentTime).toBe(12);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  music.visibility(); await vi.waitFor(() => expect(track.play).toHaveBeenCalledTimes(2));
  music.stop(); expect(track.paused).toBe(true); expect(track.currentTime).toBe(0);
  music.visibility(); expect(track.play).toHaveBeenCalledTimes(2);
  music.destroy(); expect(track.removeAttribute).toHaveBeenCalledWith('src');
  music.start(); expect(track.play).toHaveBeenCalledTimes(2);
});
it('播放被阻擋可由下次操作重試，離場後延遲完成不可繼續播放', async () => {
  const { music, track } = setup();
  track.play.mockRejectedValueOnce(new Error('blocked'));
  music.start(); await new Promise(resolve => setTimeout(resolve, 0));
  let finish!: () => void;
  track.play.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  music.resume(); expect(track.play).toHaveBeenCalledTimes(2);
  music.destroy(); track.paused = false; finish();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(track.paused).toBe(true);
});

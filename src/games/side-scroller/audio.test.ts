// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createSideScrollerAudio } from './audio';

afterEach(() => vi.restoreAllMocks());

it('loads nothing before a gesture, plays short cues on demand, and releases every source on exit', () => {
  const tracks: Array<HTMLAudioElement & { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> }> = [];
  const factory = vi.fn((src: string) => {
    const track = {
      src, paused: true, currentTime: 0, loop: false, volume: 1, preload: '',
      play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(),
      removeAttribute: vi.fn(), load: vi.fn(),
    } as unknown as typeof tracks[number];
    tracks.push(track); return track;
  });
  const audio = createSideScrollerAudio(factory);
  expect(factory).not.toHaveBeenCalled();
  audio.cue('jump'); expect(factory).not.toHaveBeenCalled();
  audio.start();
  expect(factory).toHaveBeenCalledWith('/assets/audio/side-scroller/music/bgm.mp3');
  expect(tracks[0].loop).toBe(true);
  expect(tracks[0].volume).toBe(0.65);
  audio.cue('jump'); audio.cue('jump');
  expect(factory).toHaveBeenCalledTimes(2);
  expect(tracks[1].play).toHaveBeenCalledTimes(2);
  expect(tracks[1].volume).toBe(0.12);
  audio.cue('lamp');
  expect(tracks[2].volume).toBeLessThan(tracks[1].volume);
  audio.setEffectsEnabled(false); audio.cue('gem'); expect(factory).toHaveBeenCalledTimes(3);
  audio.setMusicEnabled(false); expect(tracks[0].pause).toHaveBeenCalled();
  audio.destroy();
  tracks.forEach(track => expect(track.removeAttribute).toHaveBeenCalledWith('src'));
  audio.start(); audio.cue('exit'); expect(factory).toHaveBeenCalledTimes(3);
});

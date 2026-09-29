/** One continuous track across guests; playback only starts from a player gesture. */
export function createWorkshopMusic(factory: () => HTMLAudioElement = () => new Audio(`${import.meta.env.BASE_URL}assets/audio/magic-workshop/bgm.mp3`)) {
  let track: HTMLAudioElement | null = null;
  let active = false, disposed = false, pending = false;
  let retryRequested = false;
  const resume = () => {
    if (!active || disposed || document.hidden) return;
    if (pending) { retryRequested = true; return; }
    if (!track) {
      track = factory();
      track.loop = true;
      track.volume = .18;
      track.preload = 'none';
      track.hidden = true;
      track.setAttribute('data-workshop-music', '');
      document.body.append(track);
    }
    if (!track.paused) return;
    pending = true;
    void track.play().then(() => {
      if (!active || disposed || document.hidden) track?.pause();
    }).catch(() => { /* A blocked or unavailable track must not interrupt play. */ })
      .finally(() => {
        pending = false;
        if (retryRequested) { retryRequested = false; resume(); }
      });
  };
  const stop = () => {
    active = false;
    retryRequested = false;
    track?.pause();
    if (track) track.currentTime = 0;
  };
  return {
    start() { active = true; resume(); },
    resume,
    visibility() { if (document.hidden) track?.pause(); else resume(); },
    stop,
    destroy() {
      disposed = true;
      stop();
      track?.removeAttribute('src');
      track?.load();
      track?.remove();
    },
  };
}

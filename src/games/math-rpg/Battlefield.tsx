import { useEffect, useRef, useState } from 'react';
interface Graphic { rect(x: number, y: number, w: number, h: number): Graphic; fill(color: number): Graphic }
interface App {
  init(options: Record<string, unknown>): Promise<void>; canvas: HTMLCanvasElement;
  stage: { addChild(...items: Graphic[]): void }; render(): void;
  destroy(options: { removeView: boolean }, children: { children: boolean }): void;
}
interface Vendor { Application: new () => App; Graphics: new () => Graphic }
export function Battlefield({ stage, feedback }: { stage: number; feedback: boolean | null }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let app: App | undefined;
    let ready = false;
    const destroy = () => { if (ready) { ready = false; app?.destroy({ removeView: true }, { children: true }); } };
    const load = async () => {
      try {
        const url = `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`;
        const { Application, Graphics } = await import(/* @vite-ignore */ url) as Vendor;
        if (cancelled) return;
        app = new Application();
        await app.init({ width: 256, height: 72, backgroundAlpha: 0, antialias: false, autoStart: false, preference: 'webgl' });
        ready = true;
        if (cancelled) { destroy(); return; }
        const ground = new Graphics().rect(12, 61, 232, 2).fill(0x799da5);
        const hero = new Graphics().rect(45, 26, 12, 12).fill(0x6384be).rect(41, 38, 20, 16).fill(0x6384be)
          .rect(43, 54, 6, 8).fill(0x6384be).rect(53, 54, 6, 8).fill(0x6384be)
          .rect(65, 27, 3, 25).fill(0x8a9baf).rect(61, 46, 11, 3).fill(0x8a9baf);
        const enemy = new Graphics().rect(188, 33, 24, 29).fill(0xc18455).rect(184, 41, 32, 16).fill(0xc18455);
        app.stage.addChild(ground, hero, enemy);
        host.current?.append(app.canvas);
        app.render();
      } catch {
        destroy();
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    return () => { cancelled = true; destroy(); };
  }, []);
  return <div className="mr-field" aria-hidden="true" data-feedback={feedback === null ? '' : feedback ? 'correct' : 'wrong'}>
    <span className="mr-field-label">{stage === 4 ? '最後的試煉' : `第 ${stage + 1} 關試煉`} · 角色佔位</span>
    <div ref={host} className="mr-canvas">{failed && <span>勇者 ───────── 敵人</span>}</div>
  </div>;
}

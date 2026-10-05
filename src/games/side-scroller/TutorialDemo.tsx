import { useEffect, useRef, useState } from 'react';
import type { App, Texture } from '../magic-workshop/scene-types';
import { createMilo, createSpriteArt, loadImage, loadSpriteImages, type SpriteArt } from './art';
import { colorMatrix, type ColorPixi } from './scene';
import { isLightOn, type WorldColor } from './model';

export function TutorialDemo({ page }: { page: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState<WorldColor>('red'), [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let active = true, initialized = false, released = false;
    let app: App | undefined, art: SpriteArt | undefined, tile: Texture | undefined;
    const filters: { destroy(): void }[] = [];
    setFailed(false); setColor('red');
    const dispose = () => {
      if (released) return; released = true;
      if (initialized) app?.destroy({ removeView: true }, { children: true });
      art?.destroy(); tile?.destroy(true); filters.forEach(filter => filter.destroy());
    };
    void (async () => {
      const [P, images, ground] = await Promise.all([
        import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Promise<ColorPixi>,
        loadSpriteImages(controller.signal),
        loadImage(`${import.meta.env.BASE_URL}assets/images/side-scroller/kenney/terrain_sand_horizontal_middle.png`, controller.signal),
      ]);
      controller.signal.throwIfAborted();
      app = new P.Application(); art = createSpriteArt(P, images); tile = P.Texture.from(ground);
      await app.init({ width: 620, height: 206, backgroundAlpha: 0, antialias: true, autoStart: false, sharedTicker: false, preference: 'webgl', resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true });
      initialized = true; controller.signal.throwIfAborted();
      const platforms: { filter: InstanceType<ColorPixi['ColorMatrixFilter']> }[] = [];
      const count = page === 1 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const group = new P.Container(); app.stage.addChild(group);
        const x = page === 1 ? 40 + i * 310 : page === 0 ? 36 : 188, width = page === 0 ? 548 : 232;
        for (let n = 0; n < Math.ceil(width / 58); n++) {
          const block = new P.Sprite(tile); block.position.set(x + n * 58, 158); block.width = Math.min(58, width - n * 58); block.height = 30; group.addChild(block);
        }
        const filter = new P.ColorMatrixFilter(); filters.push(filter);
        if (page > 0) (group as typeof group & { filters: unknown[] }).filters = [filter];
        platforms.push({ filter });
      }
      const actors = Array.from({ length: count }, () => createMilo(P, art!, app!.stage));
      const portal = art.create('portal'); portal.scale.set(0.64); portal.position.set(488, 105); portal.visible = page === 0; app.stage.addChild(portal);
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      let elapsed = 0, lastColor: WorldColor | null = null;
      const draw = (dt: number) => {
        // Reduced-motion keeps both contrasting outcomes visible without repeated falling.
        elapsed += motion.matches ? 0 : dt;
        const phase = elapsed % 7.2;
        const current: WorldColor = motion.matches ? 'purple' : phase < 1.4 ? 'red' : phase < 3.6 ? 'purple' : phase < 5 ? 'blue' : 'purple';
        if (lastColor !== current) { lastColor = current; if (active) setColor(current); }
        actors.forEach((actor, i) => {
          const fall = page === 1 && i === 1 ? (motion.matches ? 0.95 : elapsed % 2.6) : page === 2 && current !== 'purple' ? phase % 3.6 : 0;
          const y = 158 + Math.min(170, Math.max(0, fall - 0.45) ** 2 * 180);
          actor.sprite.position.set(page === 0 ? 100 + (elapsed % 3) * 100 : page === 1 ? 150 + i * 310 : 310, y);
          actor.sprite.alpha = y > 220 ? 0 : 1;
          actor.update({ grounded: fall < 0.45, vy: fall > 0.45 ? 400 : 0 }, dt, motion.matches);
        });
        platforms.forEach(({ filter }, i) => {
          if (page === 1) filter.matrix = colorMatrix('red', i === 0 ? 1 : 0.26);
          if (page === 2) filter.matrix = colorMatrix('purple', current === 'purple' ? 1 : 0.26);
        });
        if (!motion.matches) portal.update({ deltaTime: dt * 60 });
      };
      app.ticker.add(ticker => { if (!document.hidden) draw(Math.min(ticker.deltaMS / 1000, 0.05)); });
      app.ticker.maxFPS = 30; draw(0);
      app.canvas.style.width = app.canvas.style.height = '100%';
      host.current!.append(app.canvas); app.start();
    })().catch(() => { dispose(); if (active) setFailed(true); });
    return () => { active = false; controller.abort(); if (initialized) dispose(); };
  }, [page]);
  return <div className="ss-demo">
    {page === 1 && <div className="ss-demo-labels"><span className="ss-demo-red">紅燈開啟 · 站穩</span><span>紅燈關閉 · 掉落</span></div>}
    {page === 2 && <div className="ss-demo-lights" aria-hidden="true"><span data-lit={isLightOn(color, 'red')} className="ss-demo-red">紅燈</span><b>＋</b><span data-lit={isLightOn(color, 'blue')} className="ss-demo-blue">藍燈</span><b>＝</b><span className="ss-demo-purple">{color === 'purple' ? '紫色實體' : '紫色透明'}</span></div>}
    <div className="ss-demo-canvas" ref={host} aria-hidden="true" />
    {failed && <p role="status">{page === 1 ? '紅燈開啟：紅地板可站；紅燈關閉：地板透明，米洛會掉落。' : page === 2 ? '紅燈和藍燈一起開啟，紫色地板就能站立。' : '跟著米洛一路向右，碰到傳送門就能離開。'}</p>}
  </div>;
}

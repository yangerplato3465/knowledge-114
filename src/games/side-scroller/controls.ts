import type { Node, Pixi, Sprite } from '../magic-workshop/scene-types';
import { isLightOn, type WorldColor } from './model';

export const CONTROL_IDS = ['jump', 'red', 'blue'] as const;
export type ControlId = typeof CONTROL_IDS[number];
export const CONTROL_IMAGES = CONTROL_IDS.flatMap(id => [`${id}-raised`, `${id}-pressed`]);
export type ControlPixi = Pixi & {
  NineSliceSprite: new (options: { texture: Sprite['texture']; leftWidth: number; rightWidth: number; topHeight: number; bottomHeight: number }) => Sprite;
};
interface ControlState { mode: 'preview' | 'play'; paused: boolean; completed: boolean; color: WorldColor | null; tutorialOpen: boolean }

// The DOM supplies semantic hit targets and pointer capture; this scene-owned Pixi layer supplies every visible button.
export function createTouchControls(P: ControlPixi, images: HTMLImageElement[], parent: Node, host: HTMLElement) {
  const textures = images.map(image => P.Texture.from(image));
  const root = parent.addChild(new P.Container());
  const views = CONTROL_IDS.map((id, index) => {
    const group = root.addChild(new P.Container()), surface = group.addChild(new P.Container());
    const face = surface.addChild(new P.NineSliceSprite({ texture: textures[index * 2], leftWidth: 12, rightWidth: 12, topHeight: 12, bottomHeight: 20 }));
    const label = surface.addChild(new P.Text({ text: id === 'jump' ? '跳躍' : id === 'red' ? '紅燈' : '藍燈', style: { fontFamily: 'Microsoft JhengHei, sans-serif', fontSize: 32, fontWeight: '900', fill: id === 'jump' ? 0x49340a : 0x20263d } }));
    label.anchor.set(0.5);
    return { id, group, surface, face, label, sources: new Set<string>(), pulse: 0, depth: 0, width: 0, height: 0, enabled: false, selected: false };
  });
  const layout = () => {
    const bounds = host.getBoundingClientRect();
    root.scale.set(600 / Math.max(1, bounds.height));
    for (const view of views) {
      const target = host.parentElement?.querySelector<HTMLElement>(`[data-control="${view.id}"]`);
      if (!target) { view.group.visible = false; continue; }
      const rect = target.getBoundingClientRect();
      view.group.visible = true; view.group.position.set(rect.left - bounds.left, rect.top - bounds.top);
      view.width = rect.width; view.height = rect.height;
      const font = Math.max(18, Math.min(32, rect.width * 0.15));
      view.label.scale.set(font / 32);
      view.label.position.set(rect.width / 2, (rect.height - 8) / 2);
    }
  };
  const clear = () => { views.forEach(view => { view.sources.clear(); view.pulse = 0; }); };
  return {
    layout,
    clear,
    press(id: ControlId, pressed: boolean, source: string) {
      const view = views.find(view => view.id === id)!;
      if (pressed && view.enabled) { view.sources.add(source); view.pulse = 0.12; }
      else view.sources.delete(source);
    },
    pulse(id: ControlId) { const view = views.find(view => view.id === id)!; if (view.enabled) view.pulse = 0.12; },
    sync(state: ControlState) {
      for (const view of views) {
        view.enabled = !state.tutorialOpen && (view.id === 'jump' ? state.mode === 'play' && !state.paused && !state.completed : state.mode === 'preview' || (!state.paused && !state.completed));
        if (!view.enabled) { view.sources.clear(); view.pulse = 0; }
        const lit = view.id !== 'jump' && isLightOn(state.color, view.id);
        view.selected = lit;
        view.face.tint = view.id === 'jump' || lit ? 0xffffff : 0xededf5;
        view.group.alpha = view.enabled ? 1 : 0.5;
      }
    },
    update(dt: number, reduced: boolean) {
      views.forEach((view, index) => {
        view.pulse = Math.max(0, view.pulse - dt);
        const target = view.selected || view.sources.size || view.pulse > 0 ? 1 : 0;
        view.depth = reduced ? target : view.depth + (target - view.depth) * (1 - Math.exp(-dt * 28));
        const down = view.depth > 0.5;
        view.face.texture = textures[index * 2 + (down ? 1 : 0)];
        view.face.width = view.width; view.face.height = Math.max(1, view.height - (down ? 8 : 0));
        view.surface.y = view.depth * 8;
      });
    },
    destroy() { textures.forEach(texture => texture.destroy(true)); },
  };
}
export type TouchControls = ReturnType<typeof createTouchControls>;

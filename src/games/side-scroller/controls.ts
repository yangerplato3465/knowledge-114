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

/** Scene artwork follows the same DOM hit targets used by keyboard and touch input. */
export function createFrameControls(P: ControlPixi, starImage: HTMLImageElement, parent: Node, host: HTMLElement, playfield: HTMLElement) {
  const root = parent.addChild(new P.Container()), panel = root.addChild(new P.Graphics());
  const starTexture = P.Texture.from(starImage);
  const makeLabel = (text: string) => {
    const label = new P.Text({ text, style: { fontFamily: 'Microsoft JhengHei, sans-serif', fontSize: 32, fontWeight: '900', fill: 0x493449 } });
    label.anchor.set(0.5); return label;
  };
  const titleTarget = host.parentElement!.querySelector<HTMLElement>('[data-frame-title]')!;
  const title = root.addChild(makeLabel(titleTarget.textContent!));
  const views = Array.from(host.parentElement!.querySelectorAll<HTMLElement>('[data-frame-control]')).map(target => {
    const group = root.addChild(new P.Container()), face = group.addChild(new P.Graphics());
    const labelTarget = target.querySelector<HTMLElement>('.ss-menu-label')!;
    const label = group.addChild(makeLabel(labelTarget.textContent!));
    const starTarget = target.querySelector<HTMLElement>('.ss-star-space');
    const numberTarget = target.querySelector<HTMLElement>('strong');
    const star = starTarget ? group.addChild(new P.Sprite(starTexture)) : null;
    const number = numberTarget ? group.addChild(makeLabel(numberTarget.textContent!)) : null;
    return { target, group, face, labelTarget, label, starTarget, star, numberTarget, number, width: 0, height: 0, last: '' };
  });
  const placeLabel = (label: ReturnType<typeof makeLabel>, target: HTMLElement, origin: DOMRect) => {
    const rect = target.getBoundingClientRect();
    label.text = target.textContent!;
    label.position.set(rect.left - origin.left + rect.width / 2, rect.top - origin.top + rect.height / 2);
    label.scale.set(parseFloat(getComputedStyle(target).fontSize) / 32);
  };
  const frame = {
    layout() {
      const bounds = host.getBoundingClientRect(), field = playfield.getBoundingClientRect();
      root.scale.set(600 / Math.max(1, field.height));
      const header = field.top - bounds.top;
      panel.clear().rect(0, 0, bounds.width, header).fill(0xd2a86e)
        .rect(0, 0, bounds.width, 6).fill(0xf9df9b)
        .rect(0, header - 5, bounds.width, 5).fill(0x6a4e59);
      placeLabel(title, titleTarget, bounds);
      title.visible = titleTarget.getBoundingClientRect().width > 0;
      for (const view of views) {
        const rect = view.target.getBoundingClientRect();
        view.group.visible = rect.width > 0 && rect.height > 0;
        view.group.position.set(rect.left - bounds.left, rect.top - bounds.top);
        view.width = rect.width; view.height = rect.height; view.last = '';
        placeLabel(view.label, view.labelTarget, rect);
        if (view.star && view.starTarget) {
          const icon = view.starTarget.getBoundingClientRect();
          view.star.position.set(icon.left - rect.left, icon.top - rect.top);
          view.star.width = icon.width; view.star.height = icon.height;
        }
        if (view.number && view.numberTarget) placeLabel(view.number, view.numberTarget, rect);
      }
    },
    sync() {
      if (views.some(view => view.group.visible === view.target.hidden || view.label.text !== view.labelTarget.textContent)) frame.layout();
      for (const view of views) {
        if (!view.group.visible) continue;
        const disabled = view.target instanceof HTMLButtonElement && view.target.disabled;
        const selected = view.target.hasAttribute('data-frame-primary') || view.target.getAttribute('aria-pressed') === 'true';
        const caption = view.labelTarget.textContent!;
        const key = `${selected}/${disabled}/${caption}`;
        if (key === view.last) continue;
        view.last = key; view.label.text = caption;
        view.group.alpha = disabled ? 0.5 : 1;
        view.face.clear().roundRect(0, 3, view.width, view.height - 3, 10).fill(0x796070)
          .roundRect(0, 0, view.width, view.height - 3, 10).fill(selected ? 0xffdf87 : 0xfff3d9)
          .stroke({ color: selected ? 0x976130 : 0x665064, width: 2 });
      }
    },
    destroy() { starTexture.destroy(true); },
  };
  return frame;
}

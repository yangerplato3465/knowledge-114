import type { App, Graphic, Label, Node, Pixi } from '../magic-workshop/scene-types';

export interface InventoryItem { id: string; label: string; description: string }
export interface DetectiveScene {
  setInventory(items: InventoryItem[]): void;
  setDialogue(message: string | null): void;
  toggleDialogue(): void;
  focusDialogue(focused: boolean): void;
  destroy(): void;
}

interface InteractiveGraphic extends Graphic {
  eventMode: string;
  cursor: string;
  on(event: string, listener: () => void): this;
}
interface EventRenderer {
  events: {
    resolution: number;
    mapPositionToPoint(point: { x: number; y: number }, clientX: number, clientY: number): void;
  };
}

const W = 960, H = 600;
const C = {
  night: 0x1e1b31, wall: 0x302943, wallLight: 0x423650, floor: 0x342b3d,
  gold: 0xd9ad68, paper: 0xf6e8c8, ink: 0x352943, muted: 0x8d785f,
  tray: 0x25213f, slot: 0x3b354f, teal: 0x80c6be,
};

function label(P: Pixi, value: string, size: number, color: number, weight = '500', wrapWidth = 700): Label {
  return new P.Text({ text: value, style: {
    fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
    fontSize: size, fontWeight: weight, fill: color,
    wordWrap: true, wordWrapWidth: wrapWidth, breakWords: true,
  } });
}

/** Empty case stage. Future case data enters through the inventory and dialogue setters. */
export async function createDetectiveScene(
  host: HTMLElement,
  signal: AbortSignal,
  onDialogueOpenChange: (open: boolean) => void,
): Promise<DetectiveScene> {
  const P = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}assets/vendor/pixi.esm.min.js`) as Pixi;
  signal.throwIfAborted();
  const app: App = new P.Application();
  let initialized = false;
  try {
    await app.init({ width: W, height: H, background: C.night, antialias: true,
      autoStart: false, preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    initialized = true;
    signal.throwIfAborted();

    // The portrait mobile layout rotates the whole canvas. Undo that rotation
    // for Pixi pointer hit testing, as in the existing detective game.
    const events = (app.renderer as typeof app.renderer & EventRenderer).events;
    const defaultMap = events.mapPositionToPoint.bind(events);
    events.mapPositionToPoint = (point, clientX, clientY) => {
      if (!window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches) {
        defaultMap(point, clientX, clientY);
        return;
      }
      const bounds = app.canvas.getBoundingClientRect();
      point.x = (clientY - bounds.top) * W / app.canvas.clientWidth;
      point.y = (bounds.right - clientX) * H / app.canvas.clientHeight;
    };

    const room = new P.Container();
    const hud = new P.Container();
    app.stage.addChild(room);
    app.stage.addChild(hud);
    const wall = new P.Graphics();
    wall.rect(0, 0, W, 520).fill(C.wall);
    wall.rect(0, 0, W, 78).fill(C.night);
    wall.rect(0, 78, W, 5).fill(C.gold);
    wall.rect(0, 83, W, 320).fill({ color: C.wallLight, alpha: 0.25 });
    wall.rect(0, 398, W, 122).fill(C.floor);
    wall.rect(0, 398, W, 4).fill({ color: C.gold, alpha: 0.5 });
    for (let x = 80; x < W; x += 200) {
      wall.rect(x, 88, 4, 310).fill({ color: C.gold, alpha: 0.12 });
    }
    room.addChild(wall);

    // The scene is intentionally empty; no clues, characters or story text.
    const stageFrame = new P.Graphics();
    stageFrame.roundRect(32, 100, 896, 298, 20).stroke({ width: 2, color: C.gold, alpha: 0.42 });
    stageFrame.roundRect(43, 111, 874, 276, 14).stroke({ width: 1, color: C.gold, alpha: 0.19 });
    room.addChild(stageFrame);

    const tray = new P.Container();
    hud.addChild(tray);
    const trayBack = new P.Graphics();
    trayBack.rect(0, 520, W, 80).fill(C.tray);
    trayBack.rect(0, 520, W, 3).fill(C.gold);
    tray.addChild(trayBack);
    const trayName = label(P, '物品欄', 17, C.paper, '700');
    trayName.position.set(36, 545);
    tray.addChild(trayName);
    const slots = new P.Container();
    tray.addChild(slots);
    const slotNodes: { caption: Label; border: InteractiveGraphic }[] = [];
    let inventory: InventoryItem[] = [];
    for (let index = 0; index < 8; index++) {
      const x = 170 + index * 86;
      const slot = new P.Container();
      slot.position.set(x, 531);
      const border = new P.Graphics().roundRect(0, 0, 64, 58, 11)
        .fill(C.slot).stroke({ width: 2, color: C.gold, alpha: 0.52 }) as InteractiveGraphic;
      border.eventMode = 'static';
      border.on('pointertap', () => {
        const item = inventory[index];
        if (!item) return;
        message.text = item.description;
        setOpen(true);
      });
      const caption = label(P, '', 13, C.paper, '700');
      caption.anchor.set(0.5);
      caption.position.set(32, 29);
      slot.addChild(border);
      slot.addChild(caption);
      slots.addChild(slot);
      slotNodes.push({ caption, border });
    }

    const dialogue = new P.Container();
    hud.addChild(dialogue);
    const paper = new P.Graphics().roundRect(30, 416, 900, 94, 18)
      .fill(C.paper).stroke({ width: 4, color: C.gold });
    dialogue.addChild(paper);
    const portrait = new P.Graphics().circle(84, 463, 30)
      .fill({ color: C.wallLight }).stroke({ width: 3, color: C.gold });
    dialogue.addChild(portrait);
    const heading = label(P, '對話', 16, C.muted, '700');
    heading.position.set(134, 427);
    dialogue.addChild(heading);
    const message = label(P, '', 19, C.ink, '500', 670);
    message.position.set(134, 454);
    dialogue.addChild(message);
    const close = new P.Graphics() as InteractiveGraphic;
    close.roundRect(826, 423, 80, 80, 17).fill(C.wall).stroke({ width: 2, color: C.gold });
    close.eventMode = 'static'; close.cursor = 'pointer';
    const closeText = label(P, '×', 30, C.paper, '700');
    closeText.anchor.set(0.5); closeText.position.set(866, 463);
    dialogue.addChild(close);
    dialogue.addChild(closeText);

    const reopen = new P.Container();
    hud.addChild(reopen);
    const reopenButton = new P.Graphics() as InteractiveGraphic;
    reopenButton.roundRect(30, 428, 160, 80, 17).fill(C.paper).stroke({ width: 3, color: C.gold });
    reopenButton.eventMode = 'static'; reopenButton.cursor = 'pointer';
    const reopenText = label(P, '展開對話', 17, C.ink, '700');
    reopenText.position.set(50, 452);
    reopen.addChild(reopenButton);
    reopen.addChild(reopenText);
    reopen.visible = false;

    const focusRing = new P.Graphics();
    hud.addChild(focusRing);
    let isOpen = true;
    let hasFocus = false;
    const drawFocus = () => {
      focusRing.clear();
      if (!hasFocus) return;
      if (isOpen) focusRing.roundRect(821, 418, 90, 90, 20).stroke({ width: 4, color: C.teal });
      else focusRing.roundRect(25, 423, 170, 90, 20).stroke({ width: 4, color: C.teal });
    };
    const setOpen = (open: boolean) => {
      isOpen = open; dialogue.visible = open; reopen.visible = !open;
      drawFocus(); onDialogueOpenChange(open); app.render();
    };
    close.on('pointertap', () => setOpen(false));
    reopenButton.on('pointertap', () => setOpen(true));

    // autoDensity sets pixel-sized inline dimensions; the host scales the
    // fixed 960×600 drawing uniformly for desktop and rotated mobile layouts.
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    host.append(app.canvas);
    app.render();
    let destroyed = false;
    return {
      setInventory(items) {
        inventory = items.slice(0, slotNodes.length);
        slotNodes.forEach(({ caption, border }, index) => {
          caption.text = inventory[index]?.label ?? '';
          border.alpha = inventory[index] ? 1 : 0.72;
          border.cursor = inventory[index] ? 'pointer' : 'default';
        });
        app.render();
      },
      setDialogue(value) { message.text = value ?? ''; if (value) setOpen(true); else app.render(); },
      toggleDialogue() { setOpen(!isOpen); },
      focusDialogue(focused) { hasFocus = focused; drawFocus(); app.render(); },
      destroy() { if (destroyed) return; destroyed = true; app.destroy({ removeView: true }, { children: true }); },
    };
  } catch (error) {
    if (initialized) app.destroy({ removeView: true }, { children: true });
    throw error;
  }
}

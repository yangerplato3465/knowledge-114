/** Small typed boundary for the locally hosted Pixi 8 ESM bundle. */
export interface XY { x: number; y: number; set(x: number, y?: number): void }
export interface Node {
  x: number; y: number; width: number; height: number; alpha: number; rotation: number; visible: boolean;
  scale: XY; position: XY; pivot: XY; mask: Node | null;
  addChild<T extends Node>(child: T): T;
  removeChildren(): Node[];
  destroy(options?: { children?: boolean }): void;
}
export interface Graphic extends Node {
  clear(): this; rect(x: number, y: number, w: number, h: number): this;
  roundRect(x: number, y: number, w: number, h: number, radius: number): this;
  circle(x: number, y: number, r: number): this; ellipse(x: number, y: number, rx: number, ry: number): this;
  poly(points: number[]): this; moveTo(x: number, y: number): this; lineTo(x: number, y: number): this;
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): this;
  quadraticCurveTo(a: number, b: number, x: number, y: number): this;
  fill(style: number | { color: number; alpha?: number }): this;
  stroke(style: { color: number; alpha?: number; width: number }): this;
}
export interface Texture { width: number; height: number; destroy(source: boolean): void }
export interface Sprite extends Node { anchor: XY; texture: Texture; tint: number }
export interface Label extends Node { anchor: XY; text: string }
export interface App {
  init(options: Record<string, unknown>): Promise<void>;
  canvas: HTMLCanvasElement; stage: Node;
  renderer: { resize(width: number, height: number, resolution?: number): void };
  ticker: { add(fn: (ticker: { deltaMS: number }) => void): void; maxFPS: number };
  start(): void; stop(): void; render(): void;
  destroy(options: { removeView: boolean }, children: { children: boolean }): void;
}
export interface Pixi {
  Application: new () => App; Container: new () => Node; Graphics: new () => Graphic;
  Sprite: new (texture: Texture) => Sprite;
  Text: new (options: { text: string; style: Record<string, unknown> }) => Label;
  Texture: { from(source: HTMLImageElement | HTMLCanvasElement): Texture };
}

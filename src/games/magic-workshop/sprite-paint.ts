import { UI_ART, type UiArtKey } from './ui-art';
import type { Node, Pixi, Sprite, Texture } from './scene-types';

/** Positions complete small WebP textures using measured alpha bounds, never cropping artwork. */
export function placeIllustration(sprite: Sprite, key: UiArtKey, textures: Map<string, Texture>, x: number, y: number, w: number, h: number, stretch=false) {
  const [l,t,r,b]=UI_ART[key].bounds;
  sprite.texture=textures.get(`ui:${key}`)!;sprite.anchor.set((l+r)/2,(t+b)/2);
  const width=w/(r-l),height=h/(b-t);
  if(stretch){sprite.width=width;sprite.height=height;}
  else sprite.scale.set(Math.min(width/sprite.texture.width,height/sprite.texture.height));
  sprite.position.set(x,y);sprite.visible=true;sprite.rotation=0;sprite.alpha=1;sprite.tint=0xffffff;
  return sprite;
}
export interface PaintLayer extends Node {
  clear(): PaintLayer;
  paint(key: UiArtKey,x: number,y: number,w: number,h: number,alpha?: number,stretch?: boolean): Sprite;
}
/** Bounded reusable sprite pool: no per-frame texture uploads or particle allocation. */
export function createPaintLayer(P: Pixi,textures: Map<string,Texture>): PaintLayer {
  const root=new P.Container(),sprites:Sprite[]=[];let used=0;
  const layer: PaintLayer=Object.assign(root,{
    clear(): PaintLayer {used=0;sprites.forEach(sprite=>{sprite.visible=false;});return layer;},
    paint(key:UiArtKey,x:number,y:number,w:number,h:number,alpha=1,stretch=false){
      let sprite=sprites[used];
      if(!sprite){sprite=root.addChild(new P.Sprite(textures.get(`ui:${key}`)!));sprites.push(sprite);}
      used++;placeIllustration(sprite,key,textures,x,y,w,h,stretch);sprite.alpha=alpha;return sprite;
    },
  });
  return layer;
}

import type { Node } from '../magic-workshop/scene-types';
import { animationFrames, type BattleArt, type BattlePixi, type Sheet } from './battle-art';
import { BATTLE_RULES, type BattleEvent } from './battle-model';

interface Point { x: number; y: number }
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Sample elapsed battle time, so frame drops cannot skip a narrow start window. */
export function attackPresentation(elapsed: number, reduced: boolean) {
  const active = elapsed >= 0 && elapsed < BATTLE_RULES.resolveMs;
  if (!active) return { active, flight: 0, trail: 0, impact: 0, impactFrame: 0 };
  if (reduced) return { active, flight: 1, trail: 0, impact: .8, impactFrame: 1 };
  const flight = clamp((elapsed - 140) / 400);
  const impactTime = elapsed - 540;
  return { active, flight, trail: elapsed < 140 ? 0 : clamp((740 - elapsed) / 200),
    impact: impactTime < 0 ? 0 : 1 - clamp((impactTime - 160) / 520),
    impactFrame: Math.min(3, Math.floor(Math.max(0, impactTime) / 170)) };
}

export function createBattleEffects(P: BattlePixi, parent: Node, art: BattleArt) {
  const root = parent.addChild(new P.Container());
  const trail = root.addChild(new P.Graphics());
  const slash = root.addChild(new P.AnimatedSprite({ textures: animationFrames(art.values['sword-sweep.json'] as Sheet), autoUpdate: false, loop: false }));
  const spark = root.addChild(new P.AnimatedSprite({ textures: animationFrames(art.values['hit-spark.json'] as Sheet), autoUpdate: false, loop: false }));
  const burst = root.addChild(new P.Graphics());
  slash.anchor.set(.5); spark.anchor.set(.5); root.visible = false;
  function clear() { root.visible = false; slash.visible = spark.visible = false; slash.stop(); spark.stop(); trail.clear(); burst.clear(); }
  return {
    clear,
    render(event: BattleEvent, elapsed: number, source: Point, target: Point, reduced: boolean) {
      const sample = attackPresentation(elapsed, reduced);
      if (!event || !sample.active) { clear(); return; }
      root.visible = true; trail.clear(); burst.clear();
      const correct = event === 'correct', color = correct ? 0x5edcff : 0xbe91ed;
      const direction = Math.sign(target.x - source.x), x = source.x + (target.x - source.x) * sample.flight;
      const y = source.y + (target.y - source.y) * sample.flight;
      slash.visible = correct && sample.trail > 0;
      if (sample.trail > 0) {
        const tail = x - direction * Math.min(170, Math.abs(x - source.x));
        trail.poly([tail,y-3,x-direction*22,y-17,x+direction*22,y,x-direction*22,y+17,tail,y+3]).fill({ color, alpha: sample.trail * .85 });
        trail.poly([tail,y,x-direction*15,y-5,x+direction*25,y,x-direction*15,y+5]).fill({ color: 0xf5f2df, alpha: sample.trail });
        if (!correct) {
          trail.poly([x-direction*12,y-45,x+direction*40,y,x-direction*12,y+45,x-direction*34,y]).fill({ color, alpha: sample.trail });
          trail.poly([x-direction*4,y-25,x+direction*24,y,x-direction*4,y+25,x-direction*16,y]).fill({ color: 0xffeed6, alpha: sample.trail });
        }
        slash.position.set(x,y); slash.scale.set(3.2); slash.alpha = sample.trail;
        slash.gotoAndStop(Math.min(3, Math.floor(sample.flight * 4)));
      }
      spark.visible = sample.impact > 0;
      if (sample.impact > 0) {
        spark.position.set(target.x,target.y); spark.scale.set(4.5); spark.alpha = sample.impact;
        spark.gotoAndStop(sample.impactFrame);
        const expansion = reduced ? 0 : clamp((elapsed - 540) / 550);
        // Broad pixel cut and a few purposeful fragments; no full-screen flash.
        burst.poly([target.x-15,target.y-65,target.x+20,target.y-13,target.x+62,target.y,
          target.x+15,target.y+17,target.x+9,target.y+63,target.x-18,target.y+13,target.x-56,target.y,target.x-18,target.y-13])
          .fill({ color, alpha: sample.impact * .72 });
        burst.poly([target.x-6,target.y-42,target.x+8,target.y-8,target.x+35,target.y,
          target.x+6,target.y+8,target.x+4,target.y+39,target.x-7,target.y+7,target.x-32,target.y,target.x-7,target.y-7])
          .fill({ color: 0xfff5d8, alpha: sample.impact });
        for (const [dx,dy] of [[-1,-.6],[.8,-1],[-.8,.7],[1,.55]]) {
          const distance = 45 + expansion * 37;
          burst.rect(Math.round((target.x+dx*distance)/4)*4,Math.round((target.y+dy*distance)/4)*4,8,8).fill({ color, alpha: sample.impact });
        }
      }
    },
  };
}

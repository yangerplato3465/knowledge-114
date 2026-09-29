export interface ArtSpec {
  file: string;
  /** Measured alpha >= 16 bounds, expanded by the placement gutter; source remains intact. */
  bounds: readonly [number, number, number, number];
  stature?: number;
  sway?: number;
  pace?: number;
}
export const ART = {
  guide: { file: 'apprentice-v2.png', bounds: [343, 116, 932, 1122], stature: 1, sway: .007, pace: 1.3 },
  fox: { file: 'forest-visitor-v3.png', bounds: [356, 232, 889, 1044], stature: .91, sway: .009, pace: 1.4 },
  deer: { file: 'visitor-deer-post-v4.png', bounds: [387, 211, 870, 1048], stature: .98, sway: .006, pace: 1.2 },
  bear: { file: 'visitor-bear-artisan-v2.png', bounds: [445, 244, 879, 1053], stature: .90, sway: .005, pace: 1.05 },
  owl: { file: 'visitor-owl-keeper-v1.png', bounds: [344, 292, 889, 1052], stature: .78, sway: .01, pace: 1.5 },
  rabbit: { file: 'visitor-rabbit-dew-v2.png', bounds: [416, 265, 928, 1035], stature: .90, sway: .008, pace: 1.6 },
  guideHappy: { file: 'apprentice-celebrate-v1.png', bounds: [343, 117, 934, 1115], stature: 1, sway: .007, pace: 1.3 },
  rabbitHappy: { file: 'visitor-rabbit-happy-v1.png', bounds: [440, 256, 941, 1048], stature: .90, sway: .008, pace: 1.6 },
  deerHappy: { file: 'visitor-deer-happy-v1.png', bounds: [368, 170, 909, 1118], stature: .98, sway: .006, pace: 1.2 },
  owlHappy: { file: 'visitor-owl-happy-v1.png', bounds: [312, 236, 900, 1092], stature: .78, sway: .01, pace: 1.5 },
  foxHappy: { file: 'visitor-fox-happy-v1.png', bounds: [299, 165, 930, 1127], stature: .91, sway: .009, pace: 1.4 },
  bearHappy: { file: 'visitor-bear-happy-v1.png', bounds: [423, 224, 902, 1089], stature: .90, sway: .005, pace: 1.05 },
  bottle: { file: 'bottle-empty-v1.png', bounds: [345, 212, 905, 1063] },
  gift: { file: 'potion-gift-v2.png', bounds: [378, 227, 875, 1036] },
  spring: { file: 'magic-spring-v1.png', bounds: [383, 274, 912, 1082] },
  recycler: { file: 'recycling-cauldron-v1.png', bounds: [211, 321, 1063, 995] },
} as const satisfies Record<string, ArtSpec>;
export type ArtKey = keyof typeof ART;
export const REACTIONS: Partial<Record<ArtKey, ArtKey>> = { guide: 'guideHappy', rabbit: 'rabbitHappy', deer: 'deerHappy', owl: 'owlHappy', fox: 'foxHappy', bear: 'bearHappy' };
export const artUrl = (file: string) => `${import.meta.env.BASE_URL}assets/images/magic-workshop/display/${file.replace(/\.png$/, '.webp')}`;

/** Fit visible content, not transparent canvas. Reserve 16px for fur, glow and motion. */
export function fitArt(spec: ArtSpec, width: number, height: number, gutter = 16) {
  const [left, top, right, bottom] = spec.bounds;
  const scale = Math.min((width - gutter * 2) / (right - left), (height - gutter * 2) * (spec.stature ?? 1) / (bottom - top));
  const anchorX = (left + right) / 2;
  return { scale, x: width / 2 - anchorX * scale, y: height - gutter - bottom * scale,
    size: 1254 * scale, anchorX: anchorX / 1254, anchorY: bottom / 1254, baseline: height - gutter };
}

export const GUIDE = { art: 'guide', name: '米洛', title: '工坊學徒', dialogue: {
  request: '我們一起試試吧！先量出這個份量。', ready: '就是這樣！你已經掌握訣竅了！', thanks: '成功了！下一份委託，也一起加油吧！',
} } as const;
export const GUESTS = [
  { art: 'rabbit', name: '露米', title: '露珠採集師', dialogue: {
    request: '早安呀！露珠都採好了，就差這份魔力液囉！', ready: '哇，剛剛好！露珠都要開心地跳起來了！', thanks: '謝謝你呀！我要帶著這瓶閃亮亮的魔法出發囉！',
  } },
  { art: 'deer', name: '奧利', title: '森林郵差', dialogue: {
    request: '森林郵件準備出發！請幫我備好這份魔力液。', ready: '份量確認，準備收件！你真可靠！', thanks: '收到！有你幫忙，今天的好消息一定準時送達！',
  } },
  { art: 'owl', name: '諾爾', title: '星燈看守人', dialogue: {
    request: '夜色快到了。請替星燈量一份剛好的光。', ready: '不多，也不少。這份光，正合適。', thanks: '謝謝你。今夜的燈光，會為晚歸的人留著。',
  } },
  { art: 'fox', name: '菲恩', title: '草藥師', dialogue: {
    request: '草藥的香氣有了，再添這份魔力液就完美了。', ready: '嗯，分寸拿捏得真好！你很有調配的天分。', thanks: '多謝啦！這帖配方的妙處，也有你的一份功勞。',
  } },
  { art: 'bear', name: '布諾', title: '火光修理師', dialogue: {
    request: '嘿，小幫手！爐火要修好了，就缺這份魔力液。', ready: '好嘞，份量正好！這下能把爐火點起來了。', thanks: '謝啦，搭檔！等爐火暖了，請你來喝杯熱可可！',
  } },
] as const;

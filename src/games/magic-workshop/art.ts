export interface ArtSpec {
  file: string;
  /** Measured alpha >= 16 bounds, expanded by the placement gutter; source remains intact. */
  bounds: readonly [number, number, number, number];
}
export const ART = {
  guide: { file: 'apprentice-v2.png', bounds: [343, 116, 932, 1122] },
  fox: { file: 'forest-visitor-v3.png', bounds: [356, 232, 889, 1044] },
  deer: { file: 'visitor-deer-post-v4.png', bounds: [387, 211, 870, 1048] },
  bear: { file: 'visitor-bear-artisan-v2.png', bounds: [445, 244, 879, 1053] },
  owl: { file: 'visitor-owl-keeper-v1.png', bounds: [344, 292, 889, 1052] },
  rabbit: { file: 'visitor-rabbit-dew-v2.png', bounds: [416, 265, 928, 1035] },
  guideHappy: { file: 'apprentice-celebrate-v1.png', bounds: [343, 117, 934, 1115] },
  rabbitHappy: { file: 'visitor-rabbit-happy-v1.png', bounds: [440, 256, 941, 1048] },
  deerHappy: { file: 'visitor-deer-happy-v1.png', bounds: [368, 170, 909, 1118] },
  owlHappy: { file: 'visitor-owl-happy-v1.png', bounds: [312, 236, 900, 1092] },
  foxHappy: { file: 'visitor-fox-happy-v1.png', bounds: [299, 165, 930, 1127] },
  bearHappy: { file: 'visitor-bear-happy-v1.png', bounds: [423, 224, 902, 1089] },
  bottle: { file: 'bottle-empty-v1.png', bounds: [345, 212, 905, 1063] },
  gift: { file: 'potion-gift-v2.png', bounds: [378, 227, 875, 1036] },
  spring: { file: 'magic-spring-v1.png', bounds: [383, 274, 912, 1082] },
  recycler: { file: 'recycling-cauldron-v1.png', bounds: [211, 321, 1063, 995] },
} as const satisfies Record<string, ArtSpec>;
export type ArtKey = keyof typeof ART;
export const REACTIONS: Partial<Record<ArtKey, ArtKey>> = { guide: 'guideHappy', rabbit: 'rabbitHappy', deer: 'deerHappy', owl: 'owlHappy', fox: 'foxHappy', bear: 'bearHappy' };
export const artUrl = (file: string) => `${import.meta.env.BASE_URL}assets/images/magic-workshop/display/${file.replace(/\.png$/, '.webp')}`;

/** Fixed cast order shared by portraits, guest motion, and the five story visits. */
export const GUIDE = { art: 'guide', name: '米洛', title: '工坊學徒' } as const;
export const GUESTS = [
  { art: 'rabbit', name: '露米', title: '露珠採集師' },
  { art: 'deer', name: '奧利', title: '森林郵差' },
  { art: 'owl', name: '諾爾', title: '星燈看守人' },
  { art: 'fox', name: '菲恩', title: '草藥師' },
  { art: 'bear', name: '布諾', title: '火光修理師' },
] as const;

/** Front-gaze edits are registered to the alpha bounds of the existing 512px idle frames. */
interface FrontGazeSpec {
  file: string;
  bounds: readonly [number, number, number, number];
  walkBounds: readonly [number, number, number, number];
}
export const FRONT_GAZE: Partial<Record<(typeof GUESTS)[number]['art'], FrontGazeSpec>> = {
  rabbit: { file: 'guest-rabbit-front-gaze-v2.png', bounds: [338, 244, 933, 1085], walkBounds: [145, 124, 369, 448] },
  owl: { file: 'guest-owl-front-gaze-v2.png', bounds: [314, 348, 904, 1100], walkBounds: [129, 144, 367, 448] },
  fox: { file: 'guest-fox-front-gaze-v2.png', bounds: [237, 196, 891, 1116], walkBounds: [107, 117, 341, 448] },
};

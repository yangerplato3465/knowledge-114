import type { GameState } from './session';

interface Visit {
  request: string;
  ready: string;
  thanks: string;
}
interface Story {
  title: string;
  ending: string;
  visits: readonly [Visit, Visit, Visit, Visit, Visit];
}

// Each beat fits the existing two-line bubble, including the narrow portrait layout.
// Visits follow the fixed rabbit → deer → owl → fox → bear cast.
export const STORIES = [
  {
    title: '月光茶會開席了',
    ending: '月光茶會開席了。\n你的位子一直留著。',
    visits: [
      { request: '露米想辦月光茶會。\n先替茶葉留住露香。', ready: '露香剛剛好！\n第一杯要留給你。', thanks: '露米捧著露香走了。\n邀請函也該出發了。' },
      { request: '奧利帶來茶會請帖。\n信封還缺一點星光。', ready: '請帖的星光備好了。\n蝸牛那份提早送！', thanks: '奧利去送請帖了。\n路邊的燈也要醒啦。' },
      { request: '諾爾要照亮小路。\n讓大家安心來喝茶。', ready: '點燈的魔法備好了。\n最矮那盞留給蝸牛。', thanks: '諾爾去點星燈了。\n接著等一縷茶香。' },
      { request: '菲恩帶來晚安草茶。\n想替茶香添點魔法。', ready: '茶香的魔法剛剛好。\n杯底藏著小葉船。', thanks: '菲恩去泡草茶了。\n只差暖暖的爐火。' },
      { request: '布諾要溫熱小茶壺。\n每位朋友都有一杯。', ready: '茶爐的魔法備好了。\n也有蝸牛的小杯子。', thanks: '布諾把茶壺暖好了。\n茶會就等你入座。' },
    ],
  },
  {
    title: '迷路的星星回家了',
    ending: '小星星找到家了。\n窗邊多了一聲晚安。',
    visits: [
      { request: '露米撿到迷路星星。\n想用露光替它洗臉。', ready: '洗臉的露光備好了。\n原來星星也怕癢。', thanks: '露米替星星洗了臉。\n現在要找它的家。' },
      { request: '奧利找到星星地址。\n想寄信報一聲平安。', ready: '送信的魔法備好了。\n地址是月亮左邊。', thanks: '奧利把信送上夜空。\n還得照亮回家路。' },
      { request: '諾爾要點亮引路燈。\n帶小星星穿過薄霧。', ready: '引路燈的光備好了。\n雲朵請排好隊喔。', thanks: '諾爾排好引路燈了。\n星星卻打了個呵欠。' },
      { request: '菲恩想做枕邊香包。\n陪小星星安心入睡。', ready: '香包的魔法剛剛好。\n夢裡有軟軟的雲。', thanks: '菲恩縫好小香包了。\n還差回家的小燈。' },
      { request: '布諾要修星星提燈。\n送它走完最後一段。', ready: '提燈的魔法備好了。\n提把像彎彎的月亮。', thanks: '布諾舉起星星提燈。\n夜空送來一聲晚安。' },
    ],
  },
  {
    title: '雨天也有小音樂會',
    ending: '雨滴也來唱歌了。\n你是今晚的小指揮。',
    visits: [
      { request: '露米想辦場音樂會。\n用露光收好雨滴聲。', ready: '露光的份量剛剛好。\n第一滴唱的是叮！', thanks: '露米收好雨滴聲了。\n該邀大家來聽啦。' },
      { request: '奧利要送防雨請帖。\n信上的音符怕淋濕。', ready: '防雨的魔法備好了。\n青蛙說牠不用傘。', thanks: '奧利去送音符信了。\n舞台還缺一盞燈。' },
      { request: '諾爾要點亮小舞台。\n讓大家看清演奏者。', ready: '舞台的燈可以亮了。\n飛蛾答應不搶唱。', thanks: '諾爾點亮舞台了。\n再等一陣葉子香。' },
      { request: '菲恩想喚醒葉笛聲。\n替葉尖添一份魔法。', ready: '葉笛的魔法剛剛好。\n葉子也會吹口哨。', thanks: '菲恩吹響葉笛了。\n最後等布諾打拍子。' },
      { request: '布諾要修暖爐小鼓。\n讓雨滴跟著打拍子。', ready: '小鼓的魔法備好了。\n咚咚，心也暖了。', thanks: '布諾輕輕敲響小鼓。\n雨滴合唱開始囉。' },
    ],
  },
  {
    title: '種子等到了春天',
    ending: '第一片嫩葉探頭了。\n謝謝你陪它等春天。',
    visits: [
      { request: '露米找到沉睡種子。\n想用露光輕輕喚醒。', ready: '露光已經準備好了。\n它還想賴床一下。', thanks: '露米帶種子曬月光。\n想替它找個花盆。' },
      { request: '奧利送來一個花盆。\n想替種子寫張名牌。', ready: '寫名字的光備好了。\n種子的小名叫慢慢。', thanks: '奧利掛好種子名牌。\n夜裡也要看得見。' },
      { request: '諾爾想留一盞夜燈。\n陪種子等一等春天。', ready: '夜燈的魔法備好了。\n不用整夜睜著眼。', thanks: '諾爾留下溫柔夜燈。\n土壤也想深呼吸。' },
      { request: '菲恩想替花盆鬆土。\n需要一點魔法幫忙。', ready: '泥土的魔法備好了。\n蚯蚓說房間很棒。', thanks: '菲恩輕輕鬆好土了。\n再等一點點溫暖。' },
      { request: '布諾想修溫室爐火。\n陪小種子慢慢長大。', ready: '溫室的魔法剛剛好。\n我們等它自己醒來。', thanks: '布諾暖好了小溫室。\n「慢慢」長出葉子了。' },
    ],
  },
] as const satisfies readonly Story[];

export const GUEST_SECRETS = [
  ['露米的口袋鼓鼓的。\n裡面是給雲的糖。', '露米替露珠取名字。\n最大的那顆叫小小。', '露米說月亮像餅乾。\n但她還沒咬過喔。'],
  ['奧利有張空白郵票。\n留給還沒說的謝謝。', '奧利的郵袋有暗袋。\n專門裝迷路的風。', '奧利送完信會等等。\n好消息也能慢慢讀。'],
  ['諾爾偷偷數過星星。\n數到呵欠就睡著了。', '諾爾有盞小小夜燈。\n是替怕黑的燈做的。', '露米替諾爾留了茶。\n等他睡醒再聊月亮。'],
  ['菲恩的配方有空白。\n留給下一次新發現。', '菲恩把落葉當書籤。\n記著採集那天的風。', '菲恩的香草會搖頭。\n其實是風在打招呼。'],
  ['布諾收好工具以後，\n小貓才來箱裡睡覺。', '布諾先問舊燈主人，\n要留下哪一道刻痕。', '布諾珍藏一顆螺絲。\n據說能修好壞心情。'],
] as const;

export const OPERATION_NOTES = {
  fill: ['瓶子已經裝滿了。\n容量是裝滿時的量。', '下一次互倒時，\n會先倒空還是裝滿？', '裝滿後再看看，\n哪一瓶還有空間？'],
  empty: ['回收釜會收好液體。\n倒空能騰出空間。', '瓶裡的量回到零。\n瓶子容量沒有變。', '留出空間了。\n接下來要補滿或互倒？'],
  pour: ['互倒只搬動魔力液。\n兩瓶總量沒有變喔。', '來源倒空或對方滿，\n互倒就會停下來。', '剩下多少空間呢？\n容量減液量就知道。'],
} as const;

export function storyFor(seed: number): Story {
  // Independent of the puzzle PRNG: story changes cannot change the deck.
  const value = seed >>> 0;
  return STORIES[((value ^ (value >>> 16)) >>> 0) % STORIES.length];
}

export function visitFor(g: GameState): Visit {
  return storyFor(g.seed).visits[g.index];
}

export function journeyDialogue(g: GameState): string {
  const visit = visitFor(g);
  if (g.screen === 'ready') return visit.ready;
  const steps = g.history.length;
  if (!steps) return visit.request;
  // Tied to effective moves, never to clicks, elapsed time, or render count.
  const variation = ((g.seed >>> 0) + g.index + Math.floor(steps / 2)) % 3;
  if (steps % 2 === 0) return GUEST_SECRETS[g.index][variation];
  return OPERATION_NOTES[g.history[steps - 1].action.kind][variation];
}

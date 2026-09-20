import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { BALANCE, battleReducer, createBattle, seededRandom, feedbackDuration } from '../src/games/math-rpg/battle.ts';

// 使用遊戲本身的 reducer；不是另外抄寫一套傷害公式。
export const profiles = [
  { name: '熟練', accuracy: .95, seconds: 10 },
  { name: '基準', accuracy: .8, seconds: 16 },
  { name: '慢而準', accuracy: .9, seconds: 24 },
  { name: '練習中', accuracy: .65, seconds: 20 },
  { name: '隨機猜答', accuracy: .25, seconds: 16 },
  { name: '快速亂猜', accuracy: .25, seconds: .5 },
  { name: '因倍基準', accuracy: .8, seconds: 10, pace: 'quick' },
  { name: '因倍慢答', accuracy: .9, seconds: 14, pace: 'quick' },
  { name: '因倍快速亂猜', accuracy: .25, seconds: .5, pace: 'quick' },
];
export const strategies = ['attack', 'guard', 'tempo', 'mixed', 'adaptive'];
export function simulate(profile, strategy, seed, route) {
  const random = seededRandom(seed);
  let state = createBattle(seed, route, profile.pace);
  while (state.phase !== 'won' && state.phase !== 'lost') {
    if (state.phase === 'battle') {
      // 相同 seed 共用作答亂數；均勻 ±35% 時間變動，不是固定節拍。
      state = battleReducer(state, { type: 'tick', seconds: profile.seconds * (.65 + random() * .7) });
      if (state.phase === 'lost') break;
      state = battleReducer(state, { type: 'answer', correct: random() < profile.accuracy });
    } else if (state.phase === 'feedback') {
      state = battleReducer(state, { type: 'tick', seconds: feedbackDuration(state) });
      state = battleReducer(state, { type: 'continue' });
    } else {
      state = battleReducer(state, { type: 'tick', seconds: 12 });
      const card = Array.isArray(strategy) ? strategy[state.stage] : strategy === 'mixed' ? ['attack', 'guard', 'tempo'][state.stage % 3]
        : strategy === 'adaptive' ? state.hp < BALANCE.heroHp * .6 ? 'guard' : 'attack' : strategy;
      state = battleReducer(state, { type: 'card', card });
    }
  }
  return state;
}
const mean = values => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? 0;
export function audit(samples = 200) {
  const rows = [];
  for (const profile of profiles) for (const strategy of strategies) {
    const results = [], routeRates = [];
    for (let mask = 0; mask < 32; mask++) {
      const route = Array.from({ length: 5 }, (_, i) => (mask >> i) & 1);
      const runs = Array.from({ length: samples }, (_, i) => simulate(profile, strategy, 114000 + i, route));
      results.push(...runs);
      routeRates.push(mean(runs.map(s => Number(s.phase === 'won'))));
    }
    const wins = results.filter(s => s.phase === 'won');
    rows.push({ profile: profile.name, strategy, runs: results.length,
      win: +(wins.length / results.length * 100).toFixed(1),
      routeGap: +((Math.max(...routeRates) - Math.min(...routeRates)) * 100).toFixed(1),
      minutesP10: +(percentile(wins.map(s => s.playSeconds), .1) / 60).toFixed(2),
      minutes: +(mean(wins.map(s => s.playSeconds)) / 60).toFixed(2),
      minutesP90: +(percentile(wins.map(s => s.playSeconds), .9) / 60).toFixed(2),
      answers: +mean(wins.map(s => s.answered)).toFixed(1),
      hp: +mean(wins.map(s => s.hp)).toFixed(1),
      strikes: +mean(wins.map(s => s.strikes)).toFixed(1) });
  }
  return rows;
}
export function auditAllBuilds(samples = 100) {
  return profiles.map(profile => {
    const builds = Array.from({ length: 81 }, (_, code) => {
      const cards = Array.from({ length: 4 }, (_, i) => ['attack', 'guard', 'tempo'][Math.floor(code / 3 ** i) % 3]);
      const states = [];
      const rates = [];
      for (let mask = 0; mask < 32; mask++) {
        const route = Array.from({ length: 5 }, (_, i) => mask >> i & 1);
        const runs = Array.from({ length: samples }, (_, i) => simulate(profile, cards, 214000 + i, route));
        states.push(...runs); rates.push(mean(runs.map(s => Number(s.phase === 'won'))));
      }
      const wins = states.filter(s => s.phase === 'won');
      return { cards: cards.join('/'), win: wins.length / states.length * 100,
        minutes: mean(wins.map(s => s.playSeconds)) / 60, routeGap: (Math.max(...rates) - Math.min(...rates)) * 100 };
    });
    const rateOrder = [...builds].sort((a, b) => a.win - b.win);
    const durations = builds.filter(b => b.win).map(b => b.minutes);
    return { profile: profile.name, runs: samples * 32 * 81,
      minWin: +rateOrder[0].win.toFixed(1), maxWin: +rateOrder[80].win.toFixed(1),
      minMinutes: durations.length ? +Math.min(...durations).toFixed(2) : null,
      maxMinutes: durations.length ? +Math.max(...durations).toFixed(2) : null,
      maxRouteGap: +Math.max(...builds.map(b => b.routeGap)).toFixed(1),
      leastSurvival: rateOrder[0].cards, mostSurvival: rateOrder[80].cards };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = audit();
  if (process.argv.includes('--check')) {
    assert.equal(BALANCE.heroHp, 200, '勇者 HP 必須固定為 200');
    for (const row of rows) {
      if (row.profile === '基準') { assert.ok(row.win >= 95, `基準通關率過低：${row.strategy}`); assert.ok(row.minutes >= 9 && row.minutes <= 12, `基準節奏偏離：${row.strategy}`); }
      // 提高怪物逐關傷害後，慢速情境允許需要再戰；保留首次通關至少一半的容錯底線。
      if (row.profile === '慢而準') assert.ok(row.win >= 50, `慢而準玩家容錯不足：${row.strategy}`);
      if (row.profile === '快速亂猜') assert.ok(row.win <= 5, `快速亂猜過強：${row.strategy}`);
      if (row.profile === '因倍基準') assert.ok(row.win >= 95, `因倍基準通關率過低：${row.strategy}`);
      if (row.profile === '因倍慢答') assert.ok(row.win >= 50, `因倍慢答容錯不足：${row.strategy}`);
      if (row.profile === '因倍快速亂猜') assert.ok(row.win <= 5, `因倍快速亂猜過強：${row.strategy}`);
      assert.ok(row.routeGap <= 10, `敵人路線差距超標：${row.profile}/${row.strategy}`);
    }
    console.log(`數學勇者平衡檢查通過：${rows.reduce((sum, r) => sum + r.runs, 0)} 局配對模擬；代表策略基準節奏、慢答容錯、亂猜及路線差距均在候選範圍。`);
  } else console.table(rows);
  if (process.argv.includes('--all-builds')) console.table(auditAllBuilds());
  console.log('通關時間／題數／剩餘 HP 僅計首次通關成功局；不含重試。每路線使用相同 200 組種子（配對比較，非 6400 個獨立樣本）。');
  console.log(`假設：各題獨立正確率、答題時間 ±35%、答對回饋 ${BALANCE.feedbackMinimum} 秒／答錯 ${BALANCE.wrongFeedbackSeconds} 秒、選卡 12 秒，不含暫停。非學生實測。`);
}

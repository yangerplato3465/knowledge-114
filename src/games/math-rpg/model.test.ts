import { readFileSync } from 'node:fs';
import { createContext, runInContext, runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { applyUpgrade, bleedDamagePerTick, comboBonus, currentHeroDamage, currentPlayerDamage, drawUpgrades, effectiveRoundTime,
  ENEMY_ATK_TABLE, ENEMY_HITS_TABLE, ENEMY_TRAITS, HERO_ATK_TABLE, initialBattle, rollCrit, spawnEnemy, strikeDamage, UPGRADES, type BattleState } from './model';
import { createQuestionPools, type Question, type QuestionPools } from './questions';

const source = readFileSync('assets/js/math-rpg.js', 'utf8');
const prelude = source.slice(0, source.indexOf('function startTimer()'));
const bleeding = source.slice(source.indexOf('function bleedDamagePerTick()'), source.indexOf('function renderMap()'));
const weighted = source.slice(source.indexOf('function pickWeighted(pool)'), source.indexOf('function showUpgradePanel()'));
const draw = source.slice(source.indexOf('    const pool = UPGRADES.filter'), source.indexOf("    const container = document.getElementById('upgrade-options')"));
const spawn = source.slice(source.indexOf('    currentEnemyIndex = index;', source.indexOf('function spawnEnemy(index)')), source.indexOf('    const look = ENEMY_LOOKS', source.indexOf('function spawnEnemy(index)')));
const fields: Record<keyof BattleState, string> = {
  playerMax: 'PLAYER_MAX', playerHP: 'playerHP', roundTime: 'ROUND_TIME', playerArmor: 'playerArmor',
  combo: 'combo', comboCap: 'comboCap', critChance: 'CRIT_CHANCE', critMult: 'CRIT_MULT',
  playerStatus: 'playerStatus', bleedResist: 'bleedResist', playerShield: 'playerShield', shieldUnlocked: 'shieldUnlocked',
  upgradeTaken: 'upgradeTaken', enemyIndex: 'currentEnemyIndex', enemyMax: 'enemyMax', enemyHP: 'enemyHP',
  enemyEnraged: 'enemyEnraged', enemyAttackCount: 'enemyAttackCount',
};
const snapshot = `{${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join(',')}}`;
const assign = Object.entries(fields).map(([key, value]) => `${value} = input.${key};`).join('\n');
function random(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function reference(state = initialBattle(), seed = 1) {
  const context = createContext({ input: structuredClone(state), Math: Object.assign(Object.create(Math), { random: random(seed) }) });
  runInContext(`${prelude}\n${bleeding}\n${weighted}\n${assign}`, context);
  return (expression: string) => JSON.parse(runInContext(`JSON.stringify(${expression})`, context));
}

it('六關數值、特性、八張卡片及初始狀態逐欄對照原版', () => {
  const ref = reference();
  expect({ ENEMY_HITS_TABLE, HERO_ATK_TABLE, ENEMY_ATK_TABLE, ENEMY_TRAITS }).toEqual(ref('({ ENEMY_HITS_TABLE, HERO_ATK_TABLE, ENEMY_ATK_TABLE, ENEMY_TRAITS })'));
  expect(JSON.parse(JSON.stringify(UPGRADES))).toEqual(ref('UPGRADES'));
  expect(initialBattle()).toEqual(JSON.parse(runInNewContext(`${prelude}; JSON.stringify(${snapshot})`)));
});

it('六關傷害、狂暴、連擊、護甲、流血與迷霧公式保持等價', () => {
  for (let stage = 0; stage < 6; stage++) for (const combo of [0, 1, 2, 10, 15, 22]) for (const armor of [0, 6, 18, 42]) {
    const state = { ...initialBattle(), enemyIndex: stage, combo, comboCap: 15, playerArmor: armor,
      enemyEnraged: stage === 5, playerStatus: { bleed: combo, fog: 2 }, bleedResist: combo % 3 };
    const ref = reference(state);
    expect([comboBonus(state), currentHeroDamage(state), currentPlayerDamage(state), effectiveRoundTime(state), bleedDamagePerTick(state)])
      .toEqual(ref('[comboBonus(), currentHeroDamage(), currentPlayerDamage(), effectiveRoundTime(), bleedDamagePerTick()]'));
    for (const crit of [false, true]) expect(strikeDamage(state, crit)).toBe(ref(`Math.max(1, Math.round(currentHeroDamage() * (${crit} ? CRIT_MULT : 1)) - enemyArmorValue())`));
  }
  const state = initialBattle(); state.roundTime = 10; state.playerStatus.fog = 5;
  expect(effectiveRoundTime(state)).toBe(8);
  expect(rollCrit(state, () => .149)).toBe(true); expect(rollCrit(state, () => .15)).toBe(false);
});

it('跨關重置敵人與負面狀態，保留連擊、護盾及玩家狀態', () => {
  const state = { ...initialBattle(), combo: 8, playerShield: 2, playerStatus: { bleed: 5, fog: 3 }, enemyAttackCount: 7, enemyEnraged: true };
  for (let index = 0; index < 6; index++) {
    const ref = reference(state);
    expect(spawnEnemy(state, index)).toEqual(ref(`(() => { const index = ${index}; ${spawn}; return ${snapshot}; })()`));
  }
  expect(state.playerStatus).toEqual({ bleed: 5, fog: 3 });
});

it('加權三選一：100 組種子、五輪強化與取滿限制均對照原版', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let state = initialBattle(); state.playerHP = 50; state.playerStatus = { bleed: 5, fog: 2 };
    const rng = random(seed); const ref = reference(state, seed);
    for (let round = 0; round < 5; round++) {
      const offered = drawUpgrades(state, rng);
      expect(offered.map(u => u.title)).toEqual(ref(`(() => { ${draw}; return picks.map(u => u.title); })()`));
      expect(new Set(offered.map(u => u.title)).size).toBe(3);
      const title = offered[round % 3].title;
      const before = structuredClone(state);
      const result = ref(`(() => { const u = UPGRADES.find(u => u.title === ${JSON.stringify(title)}); u.apply(); upgradeTaken[u.title] = (upgradeTaken[u.title] || 0) + 1; return ${snapshot}; })()`);
      const next = applyUpgrade(state, title);
      expect(next).toEqual(result); expect(state).toEqual(before); state = next;
    }
  }
  let state = applyUpgrade(initialBattle(), '止血繃帶'); state = applyUpgrade(state, '止血繃帶');
  expect(bleedDamagePerTick({ ...state, playerStatus: { bleed: 10, fog: 0 } })).toBe(0);
  expect(() => applyUpgrade(state, '止血繃帶')).toThrow();
  expect(drawUpgrades(state, () => .99).some(u => u.title === '止血繃帶')).toBe(false);
});

it('九組固定題庫內容與答案逐題等價', () => {
  const original = JSON.parse(runInNewContext(`${readFileSync('assets/js/math-rpg-pools.js', 'utf8')}; JSON.stringify(QUESTION_POOLS)`));
  const actual = JSON.parse(JSON.stringify(createQuestionPools()));
  expect(actual).toEqual(original);
  expect(Object.values(actual as QuestionPools).flatMap(grade => Object.values(grade)).flat()).toHaveLength(36);
});

it('動態除法題連續 1000 題的新舊亂數序列、選項與正解相同', () => {
  const seed = 12345;
  const original = runInNewContext(`${readFileSync('assets/js/math-rpg-pools.js', 'utf8')}; generateDivideQuestion`, { Math: Object.assign(Object.create(Math), { random: random(seed) }) }) as () => Question;
  const generate = createQuestionPools(random(seed))['五年級']['整數、小數除以整數'] as () => Question;
  for (let i = 0; i < 1000; i++) {
    const question = generate();
    expect(question).toEqual(JSON.parse(JSON.stringify(original())));
    expect(new Set(question.a).size).toBe(4);
    const [a, b] = question.q.match(/\d+/g)!.map(Number);
    expect(Number(question.a[question.correct])).toBeCloseTo(a / b, 3);
  }
});

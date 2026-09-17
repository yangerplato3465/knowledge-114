import { readFileSync } from 'node:fs';
import { createContext, runInContext, runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { applyUpgrade, bleedDamagePerTick, comboBonus, currentHeroDamage, currentPlayerDamage, drawUpgrades, effectiveRoundTime,
  ENEMY_ATK_TABLE, ENEMY_HITS_TABLE, ENEMY_TRAITS, HERO_ATK_TABLE, initialBattle, rollCrit, spawnEnemy, strikeDamage, UPGRADES, type BattleState } from './model';
import { createQuestionPools, type Question, type QuestionPools } from './questions';
import { resolveTurn, type Answer } from './turn';

const { prelude, bleeding, weighted, draw, spawn, turns } = JSON.parse(readFileSync('tests/fixtures/math-rpg-rules.json', 'utf8'));
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

function legacyTurn(input: BattleState, answer: Answer, rng: () => number) {
  let now = 0;
  const jobs: { at: number; run: () => void }[] = [];
  const outcomes: { at: number; cue: string }[] = [];
  const noop = () => {};
  const node = { classList: { add: noop }, disabled: false };
  const context = createContext({ input: structuredClone(input), Math: Object.assign(Object.create(Math), { random: rng }),
    document: { getElementById: () => ({}), querySelectorAll: () => [node, node] },
    setTimeout: (run: () => void, delay: number) => jobs.push({ at: now + delay, run }),
    stopTimer: noop, renderStatus: noop, fxSparks: noop, showDamage: noop, stageFlash: noop,
    updateBars: noop, act: noop, fxRing: noop, impact: noop, strike: noop, shakeScreen: noop, mapDefeat: noop,
    impactDelayFor: (who: string) => who === 'player' ? 400 : 190,
    scheduleNextRound: (seconds: number) => jobs.push({ at: now + seconds * 1000, run: () => outcomes.push({ at: now, cue: 'next-question' }) }),
    endGame: (win: boolean) => outcomes.push({ at: now, cue: win ? 'victory' : 'defeat' }),
    showUpgradePanel: () => outcomes.push({ at: now, cue: 'upgrade' }),
  });
  runInContext(`${prelude}\n${bleeding}\n${turns}\nconst IMPACT_DELAY=190, NEXT_DELAY_CORRECT=1.6, NEXT_DELAY_WRONG=3;
    ${assign}\ncurrentQuestion={correct:0,a:['a','b']};
    ${answer === 'timeout' ? 'handleTimeout()' : `checkAnswer(${answer === 'correct' ? 0 : 1})`};`, context);
  const read = () => JSON.parse(runInContext(`JSON.stringify(${snapshot})`, context));
  return { outcomes, read, advance(at: number) {
    while (true) {
      jobs.sort((a, b) => a.at - b.at);
      if (!jobs.length || jobs[0].at > at) break;
      const job = jobs.shift()!; now = job.at; job.run();
    }
    now = at;
    return read();
  } };
}

it('回合時間線：六關、答對／答錯／超時與狀態邊界逐拍對照舊碼', () => {
  for (let stage = 0; stage < 6; stage++) for (const answer of ['correct', 'wrong', 'timeout'] as const)
    for (let variant = 0; variant < 24; variant++) {
      const state = { ...spawnEnemy(initialBattle(), stage), combo: variant % 4, shieldUnlocked: true,
        playerShield: variant % 3 === 0 ? 1 : 0, playerHP: variant % 4 === 0 ? 2 : 100,
        playerArmor: variant % 5 === 0 ? 100 : 6, enemyAttackCount: variant % 3,
        enemyEnraged: stage === 5 && variant % 2 === 0, bleedResist: variant % 3,
        playerStatus: { bleed: variant % 4, fog: variant % 2 } };
      if (variant % 6 === 0) state.enemyHP = 1;
      if (stage === 5 && variant % 6 === 1) state.enemyHP = state.enemyMax / 2 + 1;
      const before = structuredClone(state);
      const plan = resolveTurn(state, answer, random(variant));
      const old = legacyTurn(state, answer, random(variant));
      expect(plan.immediate).toEqual(old.read());
      for (const at of [...new Set(plan.events.map(event => event.at))]) {
        const latest = plan.events.filter(event => event.at === at).at(-1)!;
        expect(latest.state).toEqual(old.advance(at));
      }
      old.advance(4000);
      expect(plan.events.filter(e => ['victory', 'defeat', 'upgrade', 'next-question'].includes(e.cue)).map(({ at, cue }) => ({ at, cue }))).toEqual(old.outcomes);
      expect(state).toEqual(before);
    }
});

it('已結束回合拒絕再結算；擊殺不結算既有流血', () => {
  expect(() => resolveTurn({ ...initialBattle(), playerHP: 0 }, 'correct')).toThrow(RangeError);
  expect(() => resolveTurn({ ...initialBattle(), enemyHP: 0 }, 'wrong')).toThrow(RangeError);
  const plan = resolveTurn({ ...initialBattle(), enemyHP: 1, playerHP: 1, playerStatus: { bleed: 5, fog: 2 } }, 'correct', () => 1);
  expect(plan.events.at(-1)?.cue).toBe('upgrade');
  expect(plan.events.at(-1)?.state.playerHP).toBe(1);
});

it('20 組完整六關戰鬥：每回合、選卡與跨關後狀態連續對照', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let state = initialBattle();
    let ended = false;
    for (let turn = 0; turn < 100; turn++) {
      const answer: Answer = turn % 7 === 2 ? 'wrong' : turn % 11 === 4 ? 'timeout' : 'correct';
      const plan = resolveTurn(state, answer, random(seed * 100 + turn));
      const old = legacyTurn(state, answer, random(seed * 100 + turn));
      state = plan.events.at(-1)!.state;
      expect(state).toEqual(old.advance(4000));
      const outcome = plan.events.at(-1)!.cue;
      if (outcome === 'victory' || outcome === 'defeat') { ended = true; break; }
      if (outcome === 'upgrade') {
        const offered = drawUpgrades(state, random(seed + turn));
        const title = offered[0].title;
        const ref = reference(state, seed + turn);
        expect(offered.map(u => u.title)).toEqual(ref(`(() => { ${draw}; return picks.map(u => u.title); })()`));
        state = applyUpgrade(state, title);
        expect(state).toEqual(ref(`(() => { const u=UPGRADES.find(u=>u.title===${JSON.stringify(title)}); u.apply(); upgradeTaken[u.title]=(upgradeTaken[u.title]||0)+1; return ${snapshot}; })()`));
        const index = state.enemyIndex + 1;
        state = spawnEnemy(state, index);
        expect(state).toEqual(ref(`(() => { const index=${index}; ${spawn}; return ${snapshot}; })()`));
      }
    }
    expect(ended).toBe(true);
  }
});

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
  const original = JSON.parse(runInNewContext(`${readFileSync('tests/fixtures/math-rpg-pools.reference.txt', 'utf8')}; JSON.stringify(QUESTION_POOLS)`));
  const actual = JSON.parse(JSON.stringify(createQuestionPools()));
  expect(actual).toEqual(original);
  expect(Object.values(actual as QuestionPools).flatMap(grade => Object.values(grade)).flat()).toHaveLength(36);
});

it('動態除法題連續 1000 題的新舊亂數序列、選項與正解相同', () => {
  const seed = 12345;
  const original = runInNewContext(`${readFileSync('tests/fixtures/math-rpg-pools.reference.txt', 'utf8')}; generateDivideQuestion`, { Math: Object.assign(Object.create(Math), { random: random(seed) }) }) as () => Question;
  const generate = createQuestionPools(random(seed))['五年級']['整數、小數除以整數'] as () => Question;
  for (let i = 0; i < 1000; i++) {
    const question = generate();
    expect(question).toEqual(JSON.parse(JSON.stringify(original())));
    expect(new Set(question.a).size).toBe(4);
    const [a, b] = question.q.match(/\d+/g)!.map(Number);
    expect(Number(question.a[question.correct])).toBeCloseTo(a / b, 3);
  }
});

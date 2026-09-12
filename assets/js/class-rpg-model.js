// 班級 RPG 共用成長規則；教師端與世界只使用這一份公式。
export const GROWTH = Object.freeze({ version: 1, maxLevel: 50, firstCost: 100, costStep: 20, hp: 100, hpStep: 12, atk: 12, atkStep: 3, def: 5, defStep: 2 });
const integer = (value, fallback = 0) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
export function expForLevel(level) {
    const n = Math.max(1, Math.min(GROWTH.maxLevel, integer(level, 1))) - 1;
    return GROWTH.firstCost * n + GROWTH.costStep * n * (n - 1) / 2;
}
export function growthOf(student = {}) {
    const exp = integer(student.exp);
    // 舊資料的人工等級轉成固定補值；首次獎勵寫入後不再重新推算。
    const expOffset = student.growthVersion === GROWTH.version
        ? integer(student.expOffset) : Math.max(0, expForLevel(student.level || 1) - exp);
    const total = exp + expOffset;
    let level = 1;
    while (level < GROWTH.maxLevel && total >= expForLevel(level + 1)) level++;
    const cost = level === GROWTH.maxLevel ? 0 : GROWTH.firstCost + GROWTH.costStep * (level - 1);
    const progress = level === GROWTH.maxLevel ? 0 : total - expForLevel(level);
    return { exp, expOffset, level, progress, cost, remaining: cost ? cost - progress : 0 };
}
export function growthFields(student, exp) {
    const { expOffset } = growthOf(student);
    const updated = { ...student, exp, expOffset, growthVersion: GROWTH.version };
    return { exp, expOffset, growthVersion: GROWTH.version, level: growthOf(updated).level };
}
export const WEAPONS = Object.freeze({
    '劍': { hp: 0, atk: 3, def: 1 }, '弓': { hp: 0, atk: 5, def: 0 },
    '槌': { hp: 0, atk: 7, def: -2 }, '法杖': { hp: 15, atk: 1, def: 0 }
});
export const ARMOR = Object.freeze({
    '布衣': { hp: 10, atk: 0, def: 1 }, '皮甲': { hp: 5, atk: 0, def: 3 }, '鐵甲': { hp: 0, atk: 0, def: 5 }
});
const aliases = { '木劍': '劍', '長劍': '劍', '木弓': '弓', '長弓': '弓', '木槌': '槌', '鐵槌': '槌', '木杖': '法杖' };
export function statsOf(student = {}) {
    const growth = growthOf(student), n = growth.level - 1;
    const weaponName = String(student.weapon || '').trim(), armorName = String(student.equipment || '').trim();
    const weapon = WEAPONS[aliases[weaponName] || weaponName] || {};
    const armor = ARMOR[armorName] || {};
    return { ...growth,
        hp: GROWTH.hp + GROWTH.hpStep * n + (weapon.hp || 0) + (armor.hp || 0),
        atk: GROWTH.atk + GROWTH.atkStep * n + (weapon.atk || 0),
        def: Math.max(0, GROWTH.def + GROWTH.defStep * n + (weapon.def || 0) + (armor.def || 0)),
        unknownEquipment: Boolean((weaponName && !Object.keys(weapon).length) || (armorName && !Object.keys(armor).length))
    };
}

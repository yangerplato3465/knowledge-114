export interface Action {
  kind: 'fill' | 'empty' | 'pour';
  from: number;
  to?: number;
}

export interface PuzzleRule {
  capacities: readonly number[];
  target: number;
}

export const emptyBottles = (capacities: readonly number[]) => capacities.map(() => 0);
export const hasTarget = (amounts: readonly number[], target: number) => amounts.includes(target);

export function applyAction(capacities: readonly number[], amounts: readonly number[], action: Action): number[] | null {
  if (capacities.length !== amounts.length || !Number.isInteger(action.from) || action.from < 0 || action.from >= capacities.length) return null;
  const next = [...amounts];
  const from = action.from;
  if (action.kind === 'fill') {
    if (next[from] >= capacities[from]) return null;
    next[from] = capacities[from];
  } else if (action.kind === 'empty') {
    if (next[from] === 0) return null;
    next[from] = 0;
  } else {
    const to = action.to;
    if (to === undefined || !Number.isInteger(to) || to < 0 || to >= capacities.length || to === from || next[from] === 0 || next[to] >= capacities[to]) return null;
    const poured = Math.min(next[from], capacities[to] - next[to]);
    next[from] -= poured;
    next[to] += poured;
  }
  return next;
}

export function legalActions(capacities: readonly number[], amounts: readonly number[]): Action[] {
  const actions: Action[] = [];
  for (let from = 0; from < capacities.length; from++) {
    if (amounts[from] < capacities[from]) actions.push({ kind: 'fill', from });
    if (amounts[from] > 0) actions.push({ kind: 'empty', from });
    for (let to = 0; to < capacities.length; to++) {
      if (to !== from && amounts[from] > 0 && amounts[to] < capacities[to]) actions.push({ kind: 'pour', from, to });
    }
  }
  return actions;
}

export function shortestSolution(rule: PuzzleRule, initial: readonly number[] = emptyBottles(rule.capacities)): Action[] | null {
  if (hasTarget(initial, rule.target)) return [];
  const key = (amounts: readonly number[]) => amounts.join(',');
  const queue: { amounts: number[]; path: Action[] }[] = [{ amounts: [...initial], path: [] }];
  const seen = new Set([key(initial)]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const action of legalActions(rule.capacities, current.amounts)) {
      const next = applyAction(rule.capacities, current.amounts, action)!;
      const id = key(next);
      if (seen.has(id)) continue;
      const path = [...current.path, action];
      if (hasTarget(next, rule.target)) return path;
      seen.add(id);
      queue.push({ amounts: next, path });
    }
  }
  return null;
}

export function shortestPathAudit(rule: PuzzleRule, limit = 256): { steps: number; count: number; paths: Action[][] } | null {
  const start = emptyBottles(rule.capacities);
  const key = (amounts: readonly number[]) => amounts.join(',');
  const origin = key(start);
  const queue = [start];
  const distances = new Map([[origin, 0]]);
  const parents = new Map<string, { state: string; action: Action }[]>();
  const goals = new Set<string>();
  let shortest = Infinity;
  for (let head = 0; head < queue.length; head++) {
    const amounts = queue[head];
    const distance = distances.get(key(amounts))!;
    if (distance >= shortest) continue;
    for (const action of legalActions(rule.capacities, amounts)) {
      const next = applyAction(rule.capacities, amounts, action)!;
      const id = key(next);
      if (!distances.has(id)) {
        distances.set(id, distance + 1);
        parents.set(id, [{ state: key(amounts), action }]);
        queue.push(next);
      } else if (distances.get(id) === distance + 1) parents.get(id)!.push({ state: key(amounts), action });
      if (hasTarget(next, rule.target) && distance + 1 <= shortest) {
        shortest = distance + 1;
        goals.add(id);
      }
    }
  }
  if (!Number.isFinite(shortest)) return null;
  const counts = new Map<string, number>([[origin, 1]]);
  const countTo = (state: string): number => {
    const known = counts.get(state);
    if (known !== undefined) return known;
    const count = (parents.get(state) ?? []).reduce((sum, parent) => sum + countTo(parent.state), 0);
    counts.set(state, count);
    return count;
  };
  const paths: Action[][] = [];
  const visit = (state: string, reverse: Action[]) => {
    if (paths.length >= limit) return;
    if (state === origin) { paths.push([...reverse].reverse()); return; }
    for (const parent of parents.get(state) ?? []) visit(parent.state, [...reverse, parent.action]);
  };
  for (const goal of goals) visit(goal, []);
  return { steps: shortest, count: [...goals].reduce((sum, goal) => sum + countTo(goal), 0), paths };
}

export function actionLabel(action: Action): string {
  const source = `第 ${action.from + 1} 瓶`;
  if (action.kind === 'fill') return `${source}到魔力泉補滿`;
  if (action.kind === 'empty') return `${source}倒進回收釜`;
  return `${source}倒入第 ${action.to! + 1} 瓶`;
}

// 自動散步使用每位角色自己的目的地和停留時間，不寫入雲端。
export function spawnPosition(index, count, width, height) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count) * width / height)));
    const rows = Math.ceil(Math.max(1, count) / cols);
    return { x: 60 + (width - 120) * ((index % cols) + 0.5) / cols,
        y: 80 + (height - 140) * (Math.floor(index / cols) + 0.5) / rows };
}
export function stepWalker(actor, seconds, width, height, random = Math.random) {
    const dt = Math.min(Math.max(seconds, 0), 0.05);
    actor.x = Math.max(48, Math.min(width - 48, actor.x));
    actor.y = Math.max(64, Math.min(height - 48, actor.y));
    if (actor.wait > 0) { actor.wait -= dt; return false; }
    if (!actor.target) actor.target = { x: 48 + random() * (width - 96), y: 64 + random() * (height - 112) };
    const dx = actor.target.x - actor.x, dy = actor.target.y - actor.y;
    const distance = Math.hypot(dx, dy), travel = actor.speed * dt;
    if (distance <= travel) {
        actor.x = actor.target.x; actor.y = actor.target.y; actor.target = null;
        actor.wait = 0.8 + random() * 2.5; return false;
    }
    actor.x += dx / distance * travel; actor.y += dy / distance * travel;
    actor.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    return true;
}

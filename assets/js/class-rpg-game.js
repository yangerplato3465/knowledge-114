import { Application, Assets, AnimatedSprite, Container, Graphics, Rectangle, Text, Texture } from '../vendor/pixi.esm.min.js';
import { statsOf } from './class-rpg-model.js';
import { spawnPosition, stepWalker } from './class-rpg-wander.js';

const $ = id => document.getElementById(id);
const container = $('gameContainer');
const color = name => getComputedStyle(document.body).getPropertyValue(name).trim();
const app = new Application();
const actors = new Map();
let world, scenery, animations, selectedId = '', paused = false, stopData;
let mapWidth = 1200, mapHeight = 700;

function status(message) { $('worldStatus').textContent = message; }
function details() {
    const actor = actors.get(selectedId);
    if (!actor) { $('characterInfo').textContent = '點選角色或使用名冊，查看能力與成長。'; return; }
    const s = actor.student, p = statsOf(s);
    $('characterInfo').textContent = `${s.name || '未命名'} · ${s.team || '未分組'} · Lv.${p.level} ｜ 生命 ${p.hp}　攻擊 ${p.atk}　防禦 ${p.def} ｜ ${p.cost ? `距離升級 ${p.remaining} 經驗` : '已達最高等級'} ｜ 武器：${s.weapon || '未裝備'}／防具：${s.equipment || '未裝備'}${p.unknownEquipment ? '（自訂裝備尚無能力加成）' : ''}`;
}
function selectActor(id) {
    selectedId = actors.has(id) ? id : '';
    $('studentFocus').value = selectedId;
    for (const a of actors.values()) a.marker.visible = a.student.id === selectedId;
    details();
}
function createActor(student, index, count) {
    const node = new Container();
    const marker = new Graphics().rect(-26, 20, 52, 6).fill(color('--primary'));
    marker.visible = false;
    const sprite = new AnimatedSprite(animations.down.stand);
    sprite.autoUpdate = false;
    sprite.anchor.set(0.5); sprite.scale.set(2); sprite.animationSpeed = 0.12;
    const label = new Text({ text: '', style: { fontFamily: '"Noto Sans TC", sans-serif', fontSize: 15, fontWeight: '700', fill: color('--ink'), stroke: { color: color('--surface'), width: 3 } } });
    label.anchor.set(0.5, 0); label.y = 32;
    node.addChild(marker, sprite, label);
    node.eventMode = 'static'; node.cursor = 'pointer'; node.interactiveChildren = false;
    node.hitArea = new Rectangle(-32, -34, 64, 94);
    node.on('pointertap', () => selectActor(student.id));
    world.addChild(node);
    const position = spawnPosition(index, count, mapWidth, mapHeight);
    return { student, node, sprite, marker, label, ...position, speed: 20 + Math.random() * 16,
        target: null, wait: Math.random() * 2, facing: 'down', animation: '', rewardTime: 0 };
}
function syncStudents(students) {
    const ids = new Set(students.map(s => s.id));
    for (const [id, actor] of actors) {
        if (!ids.has(id)) { actor.node.destroy({ children: true }); actors.delete(id); }
    }
    students.forEach((student, i) => {
        let actor = actors.get(student.id);
        if (!actor) { actor = createActor(student, i, students.length); actors.set(student.id, actor); }
        else if (Number(student.exp) > Number(actor.student.exp)) actor.rewardTime = 2;
        actor.student = student;
        const shortName = Array.from(String(student.name || '未命名')).slice(0, 8).join('');
        actor.label.text = `${shortName} · ${statsOf(student).level}`;
    });
    $('studentFocus').replaceChildren(new Option('選擇學生', ''), ...students.map(s => new Option(String(s.name || '未命名'), s.id)));
    $('studentFocus').disabled = !students.length;
    selectActor(selectedId);
    $('worldCount').textContent = `${students.length} 位冒險者`;
}
function layout() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    app.renderer.resize(width, height);
    mapWidth = Math.max(960, width); mapHeight = Math.max(600, height);
    const scale = Math.min(width / mapWidth, height / mapHeight);
    world.scale.set(scale); world.position.set((width - mapWidth * scale) / 2, (height - mapHeight * scale) / 2);
    scenery.scale.copyFrom(world.scale); scenery.position.copyFrom(world.position);
    scenery.clear().rect(0, 0, mapWidth, mapHeight).fill(color('--surface-2'));
    // 方格步道與樹木採硬邊矩形，維持像素視覺，不使用 emoji 裝飾。
    scenery.rect(0, mapHeight / 2 - 24, mapWidth, 48).fill(color('--border'));
    for (let x = 32; x < mapWidth; x += 128) {
        for (const y of [24, mapHeight - 42]) {
            scenery.rect(x + 12, y + 16, 8, 16).fill(color('--muted'));
            scenery.rect(x, y, 32, 20).fill(color('--primary'));
            scenery.rect(x + 8, y - 8, 16, 12).fill(color('--primary'));
        }
    }
    for (const actor of actors.values()) { actor.target = null; actor.x = Math.min(mapWidth - 48, actor.x); actor.y = Math.min(mapHeight - 48, actor.y); }
}
async function boot() {
    await app.init({ width: container.clientWidth, height: container.clientHeight, background: color('--surface'), antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    container.appendChild(app.canvas);
    app.canvas.setAttribute('aria-label', '全班角色自由散步的像素世界；可用上方學生名冊選取角色');
    const sheet = await Assets.load('../assets/images/char/char1.webp');
    sheet.source.scaleMode = 'nearest';
    const frame = (col, row) => new Texture({ source: sheet.source, frame: new Rectangle(col * 64, row * 64, 64, 64) });
    animations = {};
    ['down', 'up', 'right', 'left'].forEach((dir, row) => animations[dir] = { stand: [frame(0, row)], walk: [0,1,2,3,4,5].map(c => frame(c, row + 4)) });
    scenery = new Graphics(); scenery.eventMode = 'none';
    world = new Container(); world.sortableChildren = true;
    app.stage.addChild(scenery, world);
    // 提供本地除錯工具檢視場景，不提供測試假名冊的正式入口。
    globalThis.__PIXI_APP__ = app;
    layout(); $('gameLoading').remove();
    const resize = new ResizeObserver(layout); resize.observe(container);
    const theme = new MutationObserver(() => {
        layout();
        for (const a of actors.values()) { a.label.style.fill = color('--ink'); a.label.style.stroke = { color: color('--surface'), width: 3 }; }
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    app.ticker.maxFPS = 30;
    app.ticker.add(ticker => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05);
        for (const a of actors.values()) {
            const walking = !paused && !document.hidden && stepWalker(a, dt, mapWidth, mapHeight);
            const key = `${walking ? 'walk' : 'stand'}:${a.facing}`;
            if (a.animation !== key) {
                a.animation = key; a.sprite.textures = animations[a.facing][walking ? 'walk' : 'stand'];
                a.sprite.play();
            }
            if (walking) a.sprite.update(ticker);
            if (!paused && !document.hidden) a.rewardTime = Math.max(0, a.rewardTime - dt);
            a.sprite.y = a.rewardTime > 0 ? -Math.abs(Math.sin(a.rewardTime * 8)) * 8 : 0;
            a.node.position.set(Math.round(a.x), Math.round(a.y)); a.node.zIndex = a.y;
        }
    });
    $('pauseWorld').disabled = false;
    $('pauseWorld').addEventListener('click', () => { paused = !paused; $('pauseWorld').textContent = paused ? '繼續散步' : '暫停散步'; $('pauseWorld').setAttribute('aria-pressed', String(paused)); });
    $('studentFocus').addEventListener('change', () => selectActor($('studentFocus').value));
    try {
        const { connectWorld } = await import('./class-rpg-world-data.js');
        stopData = connectWorld({ select: $('worldClass'), onStudents: syncStudents, onStatus: status });
    } catch (error) { console.error(error); status('無法連接班級服務，請確認網路後重新整理；或回班級管理登入。'); }
    window.addEventListener('pagehide', event => {
        if (event.persisted) return;
        stopData?.(); resize.disconnect(); theme.disconnect(); app.destroy(true, { children: true });
        delete globalThis.__PIXI_APP__;
    }, { once: true });
}
boot().catch(error => { console.error(error); $('gameLoading').textContent = '世界載入失敗，請重新整理或回班級管理。'; status('圖集或繪圖引擎無法載入。'); });

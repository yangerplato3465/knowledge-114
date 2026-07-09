// =====================================================================
//  共用畫面工具
// =====================================================================
function setConsole(lines, isErr) {
    const el = document.getElementById("console");
    el.className = "console-screen" + (isErr ? " err" : "");
    el.innerHTML = lines.map(l => `<div class="console-line">${l}</div>`).join("");
}
function setSpeech(text, cls) {
    const el = document.getElementById("speech");
    el.className = "speech" + (cls ? " " + cls : "");
    el.innerHTML = text;
}
function setProduct(emoji, pop) {
    const el = document.getElementById("product");
    el.innerHTML = emoji;
    if (pop) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
}
function setRobot(cls) {
    const el = document.getElementById("robot");
    el.className = "robot";
    if (cls) { void el.offsetWidth; el.classList.add(cls); }
}
function setStatus(html) { document.getElementById("status-area").innerHTML = html; }
function clearTower() { const t = document.getElementById("tower"); t.className = "tower"; t.innerHTML = ""; }
function addStrawberry() {
    const s = document.createElement("span");
    s.className = "straw"; s.textContent = "🍓";
    document.getElementById("tower").appendChild(s);
}

function markBlock(i, cls) {
    const blocks = document.querySelectorAll("#block-list > .block");
    if (blocks[i]) blocks[i].classList.add(cls);
}
function clearActive() {
    document.querySelectorAll("#block-list > .block").forEach(b => b.classList.remove("active"));
}

// =====================================================================
//  遊戲主控（三種關卡共用的驅動）
// =====================================================================
let levelIndex = 0;
let L = null;          // 目前關卡定義
let engine = null;     // 目前關卡的引擎（依 type 決定）
let rt = {};           // 目前關卡的執行狀態
let execIndex = 0;     // 下一個要執行的積木
let locked = false;    // 執行開始後鎖定，不能再修改積木
let finished = false;  // 這一輪是否結束
let busy = false;      // 動畫進行中（例如迴圈爆走）
let runTimer = null;

function loadLevel(i) {
    levelIndex = i;
    L = LEVELS[i];
    engine = ENGINES[L.type];
    document.getElementById("level-badge").innerHTML = `關卡 ${i + 1}<br><span style="font-size:12px;font-weight:400">/ 共 ${LEVELS.length} 關</span>`;
    document.getElementById("mission-text").innerHTML =
        `<span class="goal-tag">教學目標：${L.goal}</span><b>${L.title}</b>　${L.mission}`;
    document.getElementById("left-hint").innerHTML = L.hint;
    document.getElementById("step-tip").innerHTML = L.tip;
    engine.init();   // 建立初始謎題狀態（只在進關卡時做一次）
    resetRun();
}

function resetRun() {
    clearInterval(runTimer); runTimer = null;
    execIndex = 0; locked = false; finished = false; busy = false;
    setConsole(["準備就緒，等待指令…"], false);
    setRobot("");
    clearTower();
    engine.reset();          // 由各關卡引擎設定初始積木 / 產物 / 狀態
    renderBlocks();
    setButtons();
}

function lockIfNeeded() {
    if (!locked) { locked = true; renderBlocks(); }
}

function stepOnce() {
    if (finished || busy) return;
    lockIfNeeded();
    engine.step();
}

function runAll() {
    if (finished) return;
    lockIfNeeded();
    setButtons(true);
    runTimer = setInterval(() => {
        if (finished) { clearInterval(runTimer); runTimer = null; setButtons(); return; }
        if (busy) return;
        engine.step();
    }, 850);
}

function setButtons(running) {
    const off = finished || busy || !!running;
    document.getElementById("btn-step").disabled = off;
    document.getElementById("btn-run").disabled = off;
}

function renderBlocks() { engine.render(); }

// ---- 結束處理 ----
function finishStuck(line, overlayText) {
    finished = true; busy = false;
    clearInterval(runTimer); runTimer = null;
    setButtons();
    if (line !== null && line !== undefined) markBlock(line, "buggy");
    setRobot("error");
    if (overlayText) {
        setTimeout(() => showOverlay("🐛", "抓到 Bug 了！機器人卡住！", overlayText,
            [{ label: "回去修正", cls: "pill-btn", fn: hideOverlayAndReset }]), 950);
    }
}

function winLevel(finalSpeech, finalProduct) {
    finished = true; busy = false;
    clearInterval(runTimer); runTimer = null;
    setRobot("happy");
    if (finalProduct) setProduct(finalProduct, true);
    setSpeech(finalSpeech, "good");
    setButtons();
    const isLast = levelIndex >= LEVELS.length - 1;
    setTimeout(() => {
        if (isLast) {
            showOverlay("🏆", "全部 Bug 都被你抓光了！",
                "變數覆蓋、巢狀判斷、死結並行——三種 Bug 你都修好了！<br>代碼麵包工廠恢復運作，你是最強的<b>工程師偵探</b>！",
                [
                    { label: "再玩一次", cls: "pill-btn", fn: () => { hideOverlay(); loadLevel(0); } },
                    { label: "回主頁", cls: "pill-btn ghost", fn: () => location.href = "../index.html" }
                ]);
        } else {
            showOverlay("🎉", "這一關修好了！", L.clear,
                [{ label: "挑戰下一關", cls: "pill-btn", fn: () => { hideOverlay(); loadLevel(levelIndex + 1); } }]);
        }
    }, 800);
}

// ---- 彈窗 ----
function showOverlay(icon, title, text, actions) {
    document.getElementById("o-icon").innerText = icon;
    document.getElementById("o-title").innerText = title;
    document.getElementById("o-text").innerHTML = text;
    const wrap = document.getElementById("o-actions");
    wrap.innerHTML = "";
    actions.forEach(a => {
        const btn = document.createElement("button");
        btn.className = a.cls; btn.innerText = a.label;
        btn.addEventListener("click", a.fn);
        wrap.appendChild(btn);
    });
    document.getElementById("overlay").classList.remove("hidden");
}
function hideOverlay() { document.getElementById("overlay").classList.add("hidden"); }
function hideOverlayAndReset() { hideOverlay(); resetRun(); }

// =====================================================================
//  積木共用小工具
// =====================================================================
// ▲▼ 重新排序積木（關卡一 swap 使用）
function moveBlock(idx, dir) {
    if (locked || (L.type !== "swap" && L.type !== "nested")) return;
    const to = idx + dir;
    if (to < 0 || to >= rt.order.length) return;
    [rt.order[idx], rt.order[to]] = [rt.order[to], rt.order[idx]];
    renderBlocks();
}

// =====================================================================
//  引擎一：醬料大風吹（變數覆蓋 Variable Overwriting / 暫存變數 Temp）
// =====================================================================
// 變數：A=左手、B=右手、Temp=暫存盤。值：'🍓' 草莓醬 / '🍫' 巧克力醬 / null 空
const VAR_LABEL = { A: "左手 Hand_A", B: "右手 Hand_B", Temp: "盤子 Temp" };
function jamName(v) { return v === "🍓" ? "草莓醬" : v === "🍫" ? "巧克力醬" : "空的"; }
function valueElsewhere(val, exceptKey) {
    return ["A", "B", "Temp"].some(k => k !== exceptKey && rt.vars[k] === val);
}

const swapEngine = {
    init() {
        // 原本的 Bug 指令：Hand_A = Hand_B、Hand_B = Hand_A（會覆蓋掉草莓醬）
        rt = {
            order: [ { lhs: "A", rhs: "B" }, { lhs: "B", rhs: "A" } ],
            hasTemp: false,
            vars: { A: "🍓", B: "🍫", Temp: null }
        };
    },
    reset() {   // 保留玩家排好的指令與是否已拿盤子，只清執行時的變數值
        rt.vars = { A: "🍓", B: "🍫", Temp: null };
        setProduct("🥧", false);
        setSpeech("國王要「巧克力草莓雙色派」，得把兩隻手的醬料<b>對調</b>。先單步執行，看看原本的指令會發生什麼事？", "");
        swapEngine.renderStatus();
    },
    renderStatus(changed) {
        const card = (key) => {
            const v = rt.vars[key];
            const jam = v ? `${v} ${jamName(v)}` : "🍽️ 空的";
            return `<div class="var-card v-${key} ${changed === key ? "flash" : ""}">
                      <div class="vc-name">${VAR_LABEL[key]}</div>
                      <div class="vc-jam">${jam}</div></div>`;
        };
        let cards = card("A") + card("B");
        if (rt.hasTemp) cards += card("Temp");
        setStatus(
            `<div class="vars-panel">${cards}</div>` +
            `<div class="order-ticket"><div class="ot-title">👑 國王的訂單</div>` +
            `巧克力草莓<b>雙色派</b>：把兩隻手對調 → 左手要 🍫、右手要 🍓</div>`);
    },
    render() {
        const list = document.getElementById("block-list");
        const dis = locked ? "disabled" : "";
        const opts = (sel) => {
            let o = `<option value="A" ${sel === "A" ? "selected" : ""}>左手 Hand_A</option>` +
                    `<option value="B" ${sel === "B" ? "selected" : ""}>右手 Hand_B</option>`;
            if (rt.hasTemp) o += `<option value="Temp" ${sel === "Temp" ? "selected" : ""}>盤子 Temp</option>`;
            return o;
        };
        let html = rt.order.map((ins, idx) =>
            `<div class="block asn-block ${locked ? "locked" : ""} ${idx < execIndex ? "done" : ""}" data-index="${idx}">
                <span class="b-num">${idx + 1}</span>
                <select class="var-sel" onchange="setOperand(${idx},'lhs',this.value)" ${dis}>${opts(ins.lhs)}</select>
                <span class="eq">=</span>
                <select class="var-sel" onchange="setOperand(${idx},'rhs',this.value)" ${dis}>${opts(ins.rhs)}</select>
                <span class="b-moves">
                    <button title="上移" onclick="moveBlock(${idx},-1)" ${idx === 0 ? "disabled" : ""}>▲</button>
                    <button title="下移" onclick="moveBlock(${idx},1)" ${idx === rt.order.length - 1 ? "disabled" : ""}>▼</button>
                </span>
            </div>`).join("");
        html +=
            `<div class="toolbox">
                <span class="tb-label">🧰 工具箱</span>
                <button class="tb-item" onclick="addTemp()" ${locked || rt.hasTemp ? "disabled" : ""} ${rt.hasTemp ? "data-added" : ""}>
                    🍽️ 拿出空盤子 Temp（暫存變數）
                </button>
            </div>`;
        list.innerHTML = html;
    },
    step() {
        if (execIndex >= rt.order.length) return;
        const ins = rt.order[execIndex];
        clearActive();
        const line = `${VAR_LABEL[ins.lhs]} = ${VAR_LABEL[ins.rhs]}`;
        const rv = rt.vars[ins.rhs];

        // 讀到空盤子 → 直接卡住（還沒放東西就想拿）
        if (rv === null) {
            markBlock(execIndex, "buggy");
            setConsole([`第 ${execIndex + 1} 行：${line}`, `✗ ${VAR_LABEL[ins.rhs]} 是空的，倒了個寂寞！`], true);
            setSpeech(`🐛 ${VAR_LABEL[ins.rhs]} 現在是空盤子，還沒放東西就想拿！`, "err");
            setProduct("💥", true);
            finishStuck(execIndex,
                `第 <b>${execIndex + 1}</b> 行想從 <b>${VAR_LABEL[ins.rhs]}</b> 拿醬料，但它是空的！<br>要先把醬料<b>放進</b>盤子，之後才能從盤子拿出來喔。`);
            return;
        }

        const oldLhs = rt.vars[ins.lhs];
        rt.vars[ins.lhs] = rv;   // 指派 = 覆蓋複製
        const lost = oldLhs !== null && oldLhs !== rv && !valueElsewhere(oldLhs, ins.lhs);

        markBlock(execIndex, "active");
        const done = execIndex;

        // 覆蓋掉唯一一份醬料 → 立刻抓到 Bug，停止執行（不再往下做）
        if (lost) {
            setTimeout(() => {
                const b = document.querySelectorAll("#block-list > .block")[done];
                if (b) { b.classList.remove("active"); b.classList.add("buggy"); }
            }, 380);
            setConsole([`第 ${execIndex + 1} 行：${line}`,
                `⚠️ ${VAR_LABEL[ins.lhs]} 原本的 ${oldLhs} ${jamName(oldLhs)} 被覆蓋，消失了！`], true);
            setSpeech(`🐛 抓到 Bug 了！${VAR_LABEL[ins.lhs]} 的 ${jamName(oldLhs)} 被直接覆蓋，永遠不見了！`, "err");
            setProduct("💥", true);
            swapEngine.renderStatus(ins.lhs);
            finishStuck(execIndex,
                `第 <b>${execIndex + 1}</b> 行 <b>${line}</b> 直接覆蓋，把 ${VAR_LABEL[ins.lhs]} 原本的 <b>${jamName(oldLhs)}</b> 蓋掉、永遠不見了！<br>💡 這就是「變數覆蓋」的 Bug。要先從工具箱<b>拿出空盤子 Temp</b> 暫存醬料，才不會弄丟。重新排出「大風吹」的順序再試一次！`);
            return;
        }

        // 沒有遺失 → 正常複製，繼續下一步
        setTimeout(() => {
            const b = document.querySelectorAll("#block-list > .block")[done];
            if (b) { b.classList.remove("active"); b.classList.add("done"); }
        }, 380);
        setConsole([`第 ${execIndex + 1} 行：${line}`,
            `✓ 把 ${rv} ${jamName(rv)} 複製給 ${VAR_LABEL[ins.lhs]}`], false);
        setSpeech(`把 ${jamName(rv)} 放到 ${VAR_LABEL[ins.lhs]}`, "good");
        setRobot("working");
        swapEngine.renderStatus(ins.lhs);
        execIndex++;
        setButtons();

        if (execIndex >= rt.order.length) {
            if (rt.vars.A === "🍫" && rt.vars.B === "🍓") {
                winLevel("🎉 成功對調！左手巧克力、右手草莓，雙色派完成，國王超滿意！", "🍓🍫🥧");
            } else {
                setProduct("🍫🥧", true);
                finishStuck(null,
                    `醬料沒有正確對調，做出來的派不對！<br>💡 目標是左手 🍫、右手 🍓。先用<b>空盤子 Temp</b> 暫存，再依序對調看看。`);
            }
        }
    }
};

// 修改指令的運算元（左邊 lhs 或右邊 rhs）
function setOperand(idx, side, value) {
    if (locked || L.type !== "swap") return;
    rt.order[idx][side] = value;
}
// 從工具箱拿出暫存盤 Temp：新增一行 Temp = 左手，並讓 Temp 可被選用
function addTemp() {
    if (locked || L.type !== "swap" || rt.hasTemp) return;
    rt.hasTemp = true;
    rt.order.push({ lhs: "Temp", rhs: "A" });
    renderBlocks();
    swapEngine.renderStatus();
    setSpeech("🍽️ 拿出一個空盤子 Temp！現在可以先把醬料暫存到盤子，再來對調。試試把它排到<b>最前面</b>，並想想最後一行要從哪裡拿草莓醬～", "");
}

// =====================================================================
//  引擎二：VIP 奧客防呆（多重巢狀判斷 Nested If-Else / 布林邏輯）
// =====================================================================
// 測試情境（正好會踩到 Bug 的那一刻）：點草莓蛋糕、下午 3 點（2 點後）、正在下雨
const SCENARIO = { strawberry: true, after2pm: true, rain: true };
// 兩個判斷分支：A＝(草莓 AND 2點後)→不加奶油；B＝(下雨)→加爆奶油
const NEST_BRANCHES = {
    A: { cond: "點草莓蛋糕 AND 下午 2 點後", action: "🚫 不加鮮奶油", act: "noCream",
         gate: "AND", parts: [["🍓 有點草莓蛋糕", "strawberry"], ["🕒 下午 2 點後", "after2pm"]] },
    B: { cond: "下雨", action: "🍦 加爆鮮奶油", act: "extra",
         gate: null, parts: [["🌧️ 正在下雨", "rain"]] }
};
function evalBranch(br) {
    const vals = br.parts.map(([, k]) => SCENARIO[k]);
    if (br.gate === "AND") return vals.every(Boolean);
    if (br.gate === "OR") return vals.some(Boolean);
    return vals[0];
}
function nestBlocks() { return document.querySelectorAll("#block-list > .block"); }

const nestEngine = {
    init() {
        rt = { order: ["A", "B"] };   // 原本的 Bug：先檢查「不加奶油」，下雨規則排在後面
    },
    reset() {   // 保留玩家排好的判斷順序，只清執行進度
        setProduct("🎂", false);
        setSpeech("VIP 奧客的規則很複雜！先<b>單步執行</b>，看機器人會先撞到哪一條判斷就停手。", "");
        nestEngine.renderStatus();
    },
    renderStatus() {
        const chip = (emoji, name, val) =>
            `<div class="var-card"><div class="vc-name">${emoji} ${name}</div><div class="vc-jam">${val}</div></div>`;
        setStatus(
            `<div class="vars-panel">` +
                chip("🍓", "點的餐", "草莓蛋糕") +
                chip("🕒", "現在時間", "下午 3 點") +
                chip("🌧️", "天氣", "正在下雨") +
            `</div>` +
            `<div class="order-ticket"><div class="ot-title">🧑‍💼 VIP 奧客的要求</div>` +
            `我要草莓蛋糕！下午 2 點後不要鮮奶油——<b>但只要下雨，不管幾點都要加爆鮮奶油！</b></div>`);
    },
    render() {
        const list = document.getElementById("block-list");
        list.innerHTML = rt.order.map((id, idx) => {
            const br = NEST_BRANCHES[id];
            const kw = idx === 0 ? "如果" : "否則如果";
            const skipCls = idx < execIndex ? " skipped" : "";
            return `<div class="block nest-block${locked ? " locked" : ""}${skipCls}" data-index="${idx}">
                <span class="b-num">${idx + 1}</span>
                <div class="nest-body">
                    <div class="nest-if"><span class="kw">${kw}</span> (<span class="cond">${br.cond}</span>)</div>
                    <div class="nest-then">→ 就 <span class="act">${br.action}</span></div>
                </div>
                <span class="b-moves">
                    <button title="上移" onclick="moveBlock(${idx},-1)" ${idx === 0 ? "disabled" : ""}>▲</button>
                    <button title="下移" onclick="moveBlock(${idx},1)" ${idx === rt.order.length - 1 ? "disabled" : ""}>▼</button>
                </span>
            </div>`;
        }).join("");
    },
    markRestSkipped(from) {
        const blocks = nestBlocks();
        for (let i = from + 1; i < blocks.length; i++) blocks[i].classList.add("skipped");
    },
    step() {
        if (execIndex >= rt.order.length) return;
        const id = rt.order[execIndex];
        const br = NEST_BRANCHES[id];
        const kw = execIndex === 0 ? "如果" : "否則如果";
        const val = evalBranch(br);
        const bd = br.parts.map(([label, k]) => `${label}(${SCENARIO[k] ? "✓" : "✗"})`)
                    .join(br.gate ? ` ${br.gate} ` : "");
        clearActive(); markBlock(execIndex, "active");

        if (!val) {
            // 條件不成立 → 跳過，換下一個判斷
            const done = execIndex;
            setTimeout(() => { const b = nestBlocks()[done]; if (b) { b.classList.remove("active"); b.classList.add("skipped"); } }, 380);
            setConsole([`第 ${execIndex + 1} 個判斷：${kw} (${br.cond})`, `${bd} → 條件不成立 ❌ 跳過`], false);
            setSpeech(`「${br.cond}」不成立，跳過，檢查下一條⋯`, "");
            setRobot("working");
            execIndex++; setButtons();
            return;
        }

        // 條件成立 → 執行這條動作，後面的判斷全部不會執行
        const isCorrect = br.act === "extra";   // 本情境（下雨）的正解＝加爆鮮奶油
        const done = execIndex;
        setTimeout(() => {
            const b = nestBlocks()[done];
            if (b) { b.classList.remove("active"); b.classList.add(isCorrect ? "done" : "buggy"); }
            nestEngine.markRestSkipped(done);
        }, 380);
        setConsole([`第 ${execIndex + 1} 個判斷：${kw} (${br.cond})`,
            `${bd} → 條件成立 ✅ 執行：${br.action}（後面的判斷不再檢查）`], !isCorrect);

        if (isCorrect) {
            winLevel("🎉 判斷正確！因為<b>下雨最優先</b>，機器人幫 VIP 加爆鮮奶油，奧客終於滿意了！", "🍓🍦🎂");
        } else {
            setSpeech("🐛 慘了！只因為這條規則<b>先</b>成立，機器人做了沒鮮奶油的蛋糕，VIP 氣瘋了！", "err");
            setProduct("🍰", true); setRobot("error");
            finishStuck(execIndex,
                `外面正在<b>下雨</b>又是下午 3 點，機器人卻先撞到「不加鮮奶油」就停手了！<br>💡 <b>否則如果（If-Else）</b>只要<b>前面的條件先成立，後面就不會執行</b>。<br>把最高優先的 <b>「如果（下雨）→ 加爆鮮奶油」</b> 用 ▲▼ 移到<b>最上面</b>，讓它先被檢查！`);
        }
    }
};

// =====================================================================
//  引擎三：機器人塞車（同步/非同步 · 死結 Deadlock · 共用資源）
// =====================================================================
// 兩隻機器人（執行緒 A / B）共用兩個鎖：🔥烤箱(oven)、🎢傳送帶(belt)。
// Bug：兩者用「相反的順序」搶鎖 → A 佔烤箱等傳送帶、B 佔傳送帶等烤箱 → 互相卡死。
// 修法：讓兩者用「相同順序」搶鎖（按「🔄 對調上鎖順序」）。
const DL_RES = { oven: "🔥 烤箱", belt: "🎢 傳送帶" };
function dlName(w) { return "機器人 " + w; }
function dlWork(w) { return w === "A" ? "🍰 烤好底座並送出" : "🎨 做裝飾"; }
function buildProg(locks) {
    return [
        { type: "lock", res: locks[0] },
        { type: "lock", res: locks[1] },
        { type: "work" },
        { type: "release" }   // 釋放所持有的全部鎖
    ];
}

const dlEngine = {
    init() {
        // 原本的 Bug：A 先鎖烤箱、B 先鎖傳送帶（相反順序）
        rt = { aLocks: ["oven", "belt"], bLocks: ["belt", "oven"] };
    },
    rebuild() {
        rt.prog = { A: buildProg(rt.aLocks), B: buildProg(rt.bLocks) };
    },
    reset() {   // 保留玩家設定的上鎖順序，只清執行進度
        rt.pc = { A: 0, B: 0 };
        rt.status = { A: "ready", B: "ready" };
        rt.owner = { oven: null, belt: null };
        rt.deadlock = false;
        dlEngine.rebuild();
        setProduct("🏭", false);
        setSpeech("兩隻機器人要合作，但<b>共用</b>烤箱和傳送帶。先<b>單步執行</b>，看它們會不會卡死！", "");
        dlEngine.renderStatus();
    },
    renderStatus() {
        const stMap = {
            ready: ["待命", "var(--muted)"], running: ["執行中 ⚙️", "var(--g1)"],
            waiting: ["等待中 ⏳", "var(--warn)"], done: ["完成 ✅", "var(--g1)"], dead: ["卡死 🔴", "var(--bad)"]
        };
        const robo = (w, job) => {
            const st = rt.deadlock && rt.status[w] === "waiting" ? "dead" : rt.status[w];
            const [txt, color] = stMap[st] || stMap.ready;
            return `<div class="var-card"><div class="vc-name">🤖 ${dlName(w)}</div>` +
                   `<div class="vc-jam">${job}<br><span style="color:${color}">${txt}</span></div></div>`;
        };
        const lock = (res) => {
            const o = rt.owner[res];
            const who = o === null ? "空閒 🟢" : `被 ${o} 佔用 🔒`;
            return `<div class="var-card"><div class="vc-name">${DL_RES[res]}</div><div class="vc-jam">${who}</div></div>`;
        };
        setStatus(
            `<div class="vars-panel">${robo("A", "烤蛋糕")}${robo("B", "做裝飾")}</div>` +
            `<div class="vars-panel">${lock("oven")}${lock("belt")}</div>` +
            `<div class="order-ticket"><div class="ot-title">🏭 協同作業</div>` +
            `兩隻機器人<b>同時</b>工作、共用烤箱和傳送帶。如果搶資源的<b>順序不一致</b>，就會互相等待、卡死（死結 Deadlock）！</div>`);
    },
    render() {
        const list = document.getElementById("block-list");
        list.innerHTML = ["A", "B"].map(w => {
            const prog = rt.prog[w];
            const rows = prog.map((s, idx) => {
                let cls = "thr-block";
                let tag = "";
                if (idx < rt.pc[w]) cls += " done";
                else if (idx === rt.pc[w]) {
                    if (rt.deadlock && rt.status[w] === "waiting") { cls += " dead"; tag = "　💥 卡死"; }
                    else if (rt.status[w] === "waiting") { cls += " waiting"; tag = "　⏳ 等待中"; }
                    else cls += " current";
                }
                let label;
                if (s.type === "lock") label = `🔒 鎖定 ${DL_RES[s.res]}`;
                else if (s.type === "work") label = dlWork(w);
                else label = "🔓 釋放烤箱和傳送帶";
                return `<div class="${cls}"><span class="tb-i">${idx + 1}</span><span>${label}${tag}</span></div>`;
            }).join("");
            const subtitle = w === "A" ? "主線 · 烤底座" : "副線 · 做裝飾";
            return `<div class="thread">
                <div class="thread-head">
                    <span>🤖 ${dlName(w)}（${subtitle}）</span>
                    <button class="swap-lock-btn" onclick="swapLocks('${w}')" ${locked ? "disabled" : ""}>🔄 對調上鎖順序</button>
                </div>${rows}</div>`;
        }).join("");
    },
    // 試著讓某一隻機器人前進一步；回傳這一步的 log 文字
    attempt(w) {
        const prog = rt.prog[w];
        if (rt.pc[w] >= prog.length) { rt.status[w] = "done"; return null; }
        const s = prog[rt.pc[w]];
        let log;
        if (s.type === "lock") {
            const o = rt.owner[s.res];
            if (o === w) { rt.pc[w]++; rt.status[w] = "running"; log = `${dlName(w)} 已持有 ${DL_RES[s.res]}`; }
            else if (o === null) { rt.owner[s.res] = w; rt.pc[w]++; rt.status[w] = "running"; log = `🔒 ${dlName(w)} 鎖定 ${DL_RES[s.res]}`; }
            else { rt.status[w] = "waiting"; return `⏳ ${dlName(w)} 想鎖 ${DL_RES[s.res]}，但被 ${o} 佔用 → 等待`; }
        } else if (s.type === "work") {
            rt.pc[w]++; rt.status[w] = "running"; log = `${dlWork(w)}（${dlName(w)}）`;
        } else {
            ["oven", "belt"].forEach(r => { if (rt.owner[r] === w) rt.owner[r] = null; });
            rt.pc[w]++; rt.status[w] = "running"; log = `🔓 ${dlName(w)} 釋放烤箱和傳送帶`;
        }
        if (rt.pc[w] >= prog.length) rt.status[w] = "done";
        return log;
    },
    step() {
        if (finished) return;
        const la = dlEngine.attempt("A");
        const lb = dlEngine.attempt("B");
        const dead = rt.status.A === "waiting" && rt.status.B === "waiting";
        const doneAll = rt.pc.A >= rt.prog.A.length && rt.pc.B >= rt.prog.B.length;

        if (dead) rt.deadlock = true;
        renderBlocks();
        dlEngine.renderStatus();

        if (dead) {
            setConsole(["💥 死結（Deadlock）發生了！", "A 等 B、B 等 A，兩邊都不放手 → 永遠卡住"], true);
            setSpeech("🐛 當機了！兩隻機器人互相等對方的資源，誰也不讓誰，程式卡死！", "err");
            setProduct("🔒💢🔒", true); setRobot("error");
            finishStuck(null,
                `<b>死結（Deadlock）！</b>機器人 A 佔著一個鎖等另一個，機器人 B 剛好<b>相反</b>，兩邊<b>互相等待、永不放手</b>。<br>💡 解法：讓兩隻機器人用<b>相同的順序</b>搶資源（都先鎖同一個）。按某隻機器人的 <b>🔄 對調上鎖順序</b>，讓它們一致！`);
            return;
        }

        const logs = [la, lb].filter(Boolean);
        setConsole(logs.length ? logs : ["（這一步沒有新動作）"], false);

        if (doneAll) {
            setProduct("🎂✨", true);
            winLevel("🎉 兩隻機器人合作無間、輪流用資源，沒有卡死！蛋糕順利完工！", "🎂✨");
            return;
        }
        setRobot("working");
        setButtons();
    }
};
// 對調某隻機器人的上鎖順序（只在執行前可調）
function swapLocks(w) {
    if (locked || L.type !== "deadlock") return;
    if (w === "A") rt.aLocks.reverse(); else rt.bLocks.reverse();
    dlEngine.rebuild();
    renderBlocks();
}

// =====================================================================
//  關卡資料
// =====================================================================
const ENGINES = { swap: swapEngine, nested: nestEngine, deadlock: dlEngine };

const LEVELS = [
    {
        type: "nested",
        goal: "巢狀判斷 & 布林邏輯",
        title: "VIP 奧客防呆",
        mission: "VIP 奧客規則超複雜：「要草莓蛋糕；下午 2 點後不加鮮奶油；<b>但只要下雨，不管幾點都要加爆鮮奶油！</b>」機器人的判斷卻<b>貼錯優先順序</b>——下大雨的下午 3 點，竟做出沒奶油的蛋糕！",
        hint: "<b>否則如果（If-Else）</b>只會執行<b>第一個成立</b>的條件。把最高優先的「如果（下雨）→ 加爆鮮奶油」用 ▲▼ 移到<b>最上面</b>。",
        tip: "💡 <b>巢狀判斷</b>由上往下檢查，<b>只要前面先成立，後面就不會執行</b>。所以「優先順序」很重要——最特別的例外要放最前面！",
        clear: "你把「下雨」規則移到最前面，優先順序對了，VIP 終於滿意！<br>下一關要當<b>記憶體偵探</b>——機器人兩隻手的醬料被<b>覆蓋消失</b>了！",
    },
    {
        type: "swap",
        goal: "變數覆蓋 & 暫存變數",
        title: "醬料大風吹",
        mission: "機器人兩隻手是變數：左手 Hand_A 拿🍓草莓醬、右手 Hand_B 拿🍫巧克力醬。國王要「巧克力草莓雙色派」，得把兩手<b>對調</b>。但原本的指令會讓草莓醬被<b>覆蓋消失</b>！",
        hint: "直接寫 <b>Hand_A = Hand_B</b> 會蓋掉左手原本的醬！從<b>工具箱</b>拿出「空盤子 Temp」，先暫存草莓醬，再玩大風吹對調。",
        tip: "💡 變數就像一隻手，一次只能拿一種東西。<b>X = Y</b> 會把 Y <b>複製</b>給 X，X 原本的東西就<b>被覆蓋不見</b>了。要對調兩個變數，需要一個<b>暫存盤 Temp</b>！",
        clear: "你用暫存盤成功對調了醬料，雙色派完成！<br>最終關最硬核——兩隻機器人搶資源搶到<b>當機</b>！",
    },
    {
        type: "deadlock",
        goal: "同步/非同步 & 死結",
        title: "機器人塞車",
        mission: "工廠請來兩隻機器人<b>同時</b>工作，共用一台烤箱和一條傳送帶。但它們用<b>相反的順序</b>搶資源——A 先鎖烤箱、B 先鎖傳送帶，結果<b>互相等待、整個當機（死結 Deadlock）</b>！",
        hint: "兩隻機器人搶鎖的<b>順序相反</b>就會卡死。按 <b>🔄 對調上鎖順序</b>，讓兩者都<b>先鎖同一個</b>（例如都先鎖傳送帶），順序一致就不會死結。",
        tip: "💡 多隻機器人（執行緒）<b>同時</b>共用資源時，若搶鎖順序不一致，就可能 A 等 B、B 等 A <b>互相卡死</b>。進階解法是改用<b>非同步事件</b>（A 烤好就發通知、B 收到通知才動）而不是一直霸佔著鎖。",
        clear: "",
    }
];

// ====== 啟動 ======
loadLevel(0);

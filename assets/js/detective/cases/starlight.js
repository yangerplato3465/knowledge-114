// 星燈小徑：觀察、推測、確認分開記錄。圖片以案件腳本 URL 為基準，支援子路徑部署。
(() => {
const IMG = new URL('../../../images/detective/starlight/', document.currentScript.src).href;
const WORKSHOP = new URL('../../../images/magic-workshop/display/', document.currentScript.src).href;
const paper = 0xf3dfb2;
const physical = (name, w, h) => [{ t: 'img', src: IMG + name + '.webp', x: 0, y: 0, w, h }];
const noelTalk = ({ hasClue, stored }) => {
    if (!hasClue('mark')) return '諾爾轉向你：「燈一盞也沒熄。先看岔路路標和落在地上的光，再回來告訴我哪裡不同。」';
    if (!hasClue('time')) return '諾爾看著你：「我只記下巡查時間，沒有記每盞燈的角度。把值勤板上的紙排好，先找出變動時段。」';
    if (!hasClue('trace')) return `諾爾放低提燈：「${stored('shadeCloth') ? '你帶回的折布線頭' : '夜花坡折布邊的線頭'}，能和燈罩卡榫的痕跡互相比對；花粉不能指認是誰。」`;
    if (!hasClue('route')) return '諾爾面向你：「我們已知道光怎麼偏了。再到石橋核對郵戳與腳程，別急著猜誰動了燈。」';
    return '諾爾望著你手中的筆記：「時間、燈罩和郵路都對得上。最後還要向照護夜蛾的人確認原因，不能只靠工具猜人。」';
};

window.DETECTIVE_CASE = {
    title: '星燈小徑燈光偏移事件',
    brief: '奧利看著退回的信：「燈亮著，怎麼會投進舊郵箱？」\n諾爾說：「昨晚的燈沒熄；光落下的地方變了。」\n\n跟米洛走訪夜花坡、石橋郵路與守燈亭，\n查明燈光、時間和錯投的關係。',
    startScene: 'trail',
    opening: {
        rear: IMG + 'oli-opening-rear-walk-v1.webp',
        oli: IMG + 'oli-opening-reactions-v1.webp',
        noel: IMG + 'noel-opening-reactions-v1.webp',
        miloKeys: IMG + 'milo-detective-transform-v2-keys.webp',
        miloBetween: IMG + 'milo-detective-transform-v2-inbetweens.webp',
        miloWalk: IMG + 'milo-opening-left-walk-v1.webp',
        oliSide: [0, 1, 2, 3].map(i => WORKSHOP + `guest-deer-walk-v1-${i}.webp`),
    },
    skin: 'workshop',
    skinAssets: {
        board: IMG + 'investigation-board.webp',
        speech: IMG + 'dialogue-scroll.webp',
        wood: WORKSHOP + 'ui-wood.webp',
        star: WORKSHOP + 'ui-star.webp',
    },
    assistantImg: IMG + 'milo-detective-transform-v2-keys.webp',
    // Portrait crop from the final detective costume cell (column 3, row 2).
    assistantFrame: { x: 1176, y: 620, w: 214, h: 220 },
    assistantName: '米洛',
    resolveLabel: '整理事件',
    resolveReadyText: '兩條支路和守燈亭的線索已能串起事件。點右上角「整理事件」，再確認還缺哪一個答案。',
    accuseMinClues: 8,
    resolutionClue: 'chain',
    clues: [
        { id: 'mail', icon: '✉️', name: '退回的信', desc: '信上有舊榛樹郵箱的投遞印記。' },
        { id: 'mark', icon: '🪧', name: '路標與光斑', desc: '星燈都亮著，舊地面標記卻沒有被照亮。' },
        { id: 'moth', icon: '🌼', name: '夜花坡的夜蛾', desc: '19:05 夜蛾聚在夜花旁；布簾替牠們遮住直射光。' },
        { id: 'time', icon: '⏱️', name: '異常時段', desc: '18:40 仍正常；19:20 前光已偏移。' },
        { id: 'trace', icon: '🔍', name: '燈罩痕跡', desc: '第二、三盞的卡榫與布纖維顯示燈罩被動過。' },
        { id: 'light', icon: '🕯️', name: '低光帶', desc: '遮光罩轉向夜花後，弱光沿岔路邊緣延伸。' },
        { id: 'bridge', icon: '🌉', name: '石橋舊郵路', desc: '橋頭舊路標與停用郵箱仍在；東側新郵路往村口延伸。' },
        { id: 'route', icon: '📯', name: '奧利的郵路', desc: '印記與目擊時間能排出誤入舊路的順序。' },
        { id: 'chain', icon: '📓', name: '待確認的動機', desc: '事件順序成立；還需向照護員確認原因。' },
    ],
    items: [],
    // 每件實物都須在案件裡被親手用一次；同一信封要先核時、再核郵路。
    objectUses: {
        signRubbing: [{ target: 'lightPuzzle', text: '星形吊牌的刻痕對準主路舊記號。現在能辨認哪一道光偏離了原本方向。' }],
        lampScratch: [{ target: 'traceBoard', text: '卡榫的新刮痕嵌進比對槽；第二盞燈的卡口確實被轉過。' }],
        dutySlip: [{ target: 'dutyBoard', text: '值勤紙固定在路線圖旁。18:40 是最後確定正常的巡查；19:20 已看到偏光。' }],
        mailEnvelope: [
            { target: 'dutyBoard', text: '把退信的 19:35 郵戳放到巡查時刻之後；錯投是結果，不是燈罩開始偏移的時間。' },
            { target: 'bridgeBox', text: '信封上的榛枝舊郵戳與停用印記吻合，確認奧利最後確實走到舊郵箱。' },
        ],
        brassHood: [{ target: 'traceBoard', text: '備用燈罩落入工作桌的圓槽。它的卡榫形狀可用來判斷刮痕來自轉動，不是風吹。' }],
        shadeCloth: [{ target: 'traceBoard', text: '折布的藍灰線頭與卡榫縫隙相合；這是接觸痕跡，仍不是某人的署名。' }],
        flowerNotes: [{ target: 'lightPuzzle', text: '札記指出夜蛾怕強光，花畦只需要柔暗的邊光；重現光束時可拿它作條件。' }],
        pollenSample: [{ target: 'traceBoard', text: '花粉瓶與工具上的粉末顏色相同，說明工具接近過夜花，不能單憑花粉指認人。' }],
        oldPostmark: [{ target: 'bridgeBox', text: '停用印記的榛枝圖案對上舊郵箱；封緘暗碼的終點是「榛」。' }],
        routeRubbing: [{ target: 'bridgeBox', text: '將拓片鋪在郵袋旁：起點的星標清楚，中段的半圓凹紋要和現場地形對照，終點印記尚待核對。' }],
    },
    hints: [
        { unless: 'mail', text: '米洛：「先到守燈亭看奧利帶回的信。郵戳是哪一條路的？」' },
        { unless: 'mark', text: '諾爾：「回小徑看看岔路口的路標。燈亮著，地上的舊記號呢？」' },
        { unless: 'moth', text: '米洛：「去夜花坡查看布簾、夜花和工作桌。折布、札記與花粉瓶都可以直接拿起來。」' },
        { unless: 'time', text: '諾爾：「選取物品欄的值勤紙與退信，各放到守燈亭中央的值勤板；再整理時刻。」' },
        { unless: 'trace', text: '米洛：「折布、備用燈罩、刮痕卡榫和花粉瓶要逐件放上守燈亭工作桌，才看得出接觸痕跡。」' },
        { unless: 'light', text: '諾爾：「帶星形吊牌與夜花札記到夜花坡重現台；主路與花畦是兩個比對基準。」' },
        { unless: 'bridge', text: '奧利：「小徑右邊通往石橋。看看舊郵路的路標和郵箱。」' },
        { unless: 'route', text: '奧利：「把拓片、停用印記與退信放在石橋長椅的郵袋旁；從岔口往舊郵箱讀三個地標，試開圖形鎖。」' },
        { unless: 'chain', text: '米洛：「筆記已有八條線索。把發生的事排成先後，最後再去問尚未確認的原因。」' },
        { text: '米洛：「證據齊了。點右上角整理事件；慢慢想，答錯也可以重排。」' },
    ],
    resolutionPuzzle: {
        type: 'starlight', kind: 'sequence', title: '事件順序與確認',
        prompt: '先排出已有證據支持的事件，最後選擇還需要向誰確認動機。',
        cards: [
            { id: 'mail', label: '旅人沿偏光走錯岔路', detail: '舊郵戳與目擊時間支持。' },
            { id: 'ask', label: '向照護員確認原因', detail: '工具不能當成身分證據。' },
            { id: 'shade', label: '第二、三盞燈罩轉向', detail: '新刮痕與纖維互相支持。' },
            { id: 'moths', label: '夜蛾聚在夜花旁', detail: '19:05 的花圃巡查記錄。' },
            { id: 'beam', label: '弱光沿岔路延伸', detail: '重現燈罩方向後可看見。' },
        ],
        answer: ['moths', 'shade', 'beam', 'mail', 'ask'],
        hint1: '先排現場發生的事，最後留下尚未被證實的問題。',
        hint2: '比較新刮痕、重現的光帶與錯投郵戳：哪一件是下一件的原因？',
    },
    endings: [{
        id: 'restored', title: '✨ 星燈小徑重新亮起', when: () => true,
        text: '夜蛾照護員芮雅承認自己轉了第二、三盞燈罩。她想讓剛孵化的夜蛾避開強光，卻沒發現柔光沿岔路延伸，讓奧利把信投進舊郵箱。\n\n大家一起把燈罩調回主路，替夜花加上柔光擋片，並在岔路立起不刺眼的新標記。信終於送到收件人。\n\n諾爾為旅人留盞夜燈，筆記也添了微光印記。',
    }],
    solution: '大家一起修好了星燈小徑。',
    scenes: {
        trail: {
            name: '星燈小徑', bg: IMG + 'trail-interactive-v1.webp',
            intro: '岔路仍在。左邊通往夜花坡，右邊通往石橋郵路。點擊可觀察現場；按住看得見的物件，拖進下方物品欄。',
            introBack: '左右兩條路都可回訪；路標、星燈與郵箱也能再次查看。',
            props: [
                { t: 'img', src: WORKSHOP + 'ui-wood.webp', x: 766, y: 54, w: 174, h: 86 },
                { t: 'text', s: '守燈亭', icon: '←', x: 853, y: 101, size: 18, c: paper, ax: 0.5, ay: 0.5 },
                { t: 'text', s: '夜花坡', icon: '↖', x: 287, y: 344, size: 17, c: paper, shadow: 0x1d1729, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'text', s: '石橋郵路', icon: '↗', iconSide: 'right', x: 775, y: 335, size: 17, c: paper, shadow: 0x1d1729, weight: '700', ax: 0.5, ay: 0.5 },
            ],
            objects: [
                { id: 'signRubbing', name: '舊路星形吊牌', x: 443, y: 238, w: 64, h: 60, draggable: true, icon: '✦', sourceHotspot: 'trailSign', revealStyle: 'physical', art: physical('star-route-tag-v1', 64, 60), gives: ['mark'], look: '路標下掛著舊路的星形吊牌。拿起它對準主路，再和地上的偏移光斑比較。', after: '吊牌上的星形仍對著主路；改變的是光落下的方向。' },
                { id: 'lampScratch', name: '第二盞刮痕卡榫', x: 649, y: 251, w: 50, h: 47, draggable: true, icon: '⌁', sourceHotspot: 'lampTwo', revealStyle: 'physical', art: physical('scratched-clasp-v1', 50, 47), look: '第二盞燈柱的備用卡榫留著新刮痕，還勾住一縷藍灰線頭。把它帶回守燈亭比對。', after: '刮痕只證明卡榫曾被轉動；還不能判定由誰動手。' },
            ], hotspots: [
                { id: 'trailSign', x: 425, y: 198, w: 92, h: 125, name: '岔路路標', look: '地面舊星形記號仍在主路；今晚的光斑卻落在岔路邊。路標下方的星形吊牌可拿起來對照。', gives: ['mark'], after: '路標沒移動；按住看得見的吊牌，可將它收進物品欄。' },
                { id: 'lampOne', x: 52, y: 75, w: 180, h: 300, name: '第一盞星燈', look: '觀察：第一盞的卡榫積著完整的薄灰，燈罩與地面主路標記對齊。', after: '第一盞沒有新刮痕；它提供正常方向的比對基準。' },
                { id: 'lampTwo', x: 614, y: 144, w: 104, h: 227, name: '第二盞星燈', look: '燈柱旁的備用卡榫有新刮痕，縫裡留著藍灰色纖維。看得見的黃銅小片可以取下比對。', after: '按住燈柱旁的黃銅卡榫片，可將它收進物品欄。' },
                { id: 'lampThree', x: 867, y: 152, w: 86, h: 190, name: '第三盞星燈', look: '觀察：第三盞燈罩有同色纖維，燈柱下的夜花花粉沾到工具套。花粉不能證明工具主人是誰。', after: '第三盞附近有纖維與花粉；仍須看別的證據判斷發生了什麼。' },
                { id: 'forkBox', x: 348, y: 231, w: 68, h: 110, name: '岔路邊的舊郵箱', look: '舊榛樹郵箱旁的路面通往右側石橋；它仍在，但正式郵路早已改走東側。', after: '想知道奧利怎麼走到這裡，可沿右側道路去石橋比對。' },
                { id: 'toFlower', x: 214, y: 307, w: 146, h: 75, name: '走左路到夜花坡', goto: 'flower', exit: true },
                { id: 'toBridge', x: 703, y: 297, w: 145, h: 76, name: '走右路到石橋郵路', goto: 'bridge', exit: true },
                { id: 'toHut', x: 771, y: 67, w: 169, h: 57, name: '前往守燈亭', goto: 'hut', exit: true },
            ],
        },
        hut: {
            name: '諾爾的守燈亭', bg: IMG + 'keeper-hut-interactive-v1.webp',
            intro: '諾爾替晚歸的人留著一盞小燈。值勤板和工作桌還保留昨夜的記錄。',
            introBack: '你回到守燈亭。值勤板、工具與奧利的信都能再查看。',
            props: [
                { t: 'img', src: WORKSHOP + 'ui-wood.webp', x: 12, y: 58, w: 170, h: 86 },
                { t: 'text', s: '返回小徑', icon: '←', x: 97, y: 104, size: 18, c: paper, ax: 0.5, ay: 0.5 },
                { t: 'img', src: IMG + 'lantern-route-chart-v1.webp', x: 382, y: 104, w: 125, h: 133 },
                { t: 'img', src: IMG + 'hood-maintenance-note-v1.webp', x: 503, y: 86, w: 60, h: 77 },
                { t: 'img', src: IMG + 'nightflower-field-note-v1.webp', x: 301, y: 170, w: 79, h: 81 },
                { t: 'img', src: IMG + 'star-route-tag-v1.webp', x: 510, y: 217, w: 40, h: 39 },
                // 與開場共用諾爾的正視幀；可見羽身約 198px，腳底落在 y=452。
                { t: 'img', src: IMG + 'noel-opening-reactions-v1.webp', frame: { x: 0, y: 0, w: 512, h: 512 }, x: 58, y: 226, w: 238, h: 238 },
            ],
            objects: [
                { id: 'dutySlip', name: '值勤時刻紙', x: 294, y: 91, w: 92, h: 91, draggable: true, icon: '◷', sourceHotspot: 'dutyPapers', revealStyle: 'physical', art: physical('duty-slip-v1', 92, 91), look: '左上角的值勤紙記著四個巡查時刻。把整張紙拖進物品欄，再到值勤板排序。', after: '18:40、19:05、19:20、19:35；先後順序可以確認變動時段。' },
                { id: 'mailEnvelope', name: '奧利退回的信', x: 515, y: 167, w: 79, h: 62, draggable: true, icon: '✉', sourceHotspot: 'envelope', revealStyle: 'physical', art: physical('returned-envelope-v1', 79, 62), gives: ['mail'], look: '信封留著舊榛樹郵箱的投遞印記。奧利說自己跟著光走；把信收好，稍後和郵路比對。', after: '舊路郵戳是真實印記，但不能單靠它推斷奧利故意改道。' },
                { id: 'brassHood', name: '桌邊備用燈罩', x: 797, y: 257, w: 71, h: 70, draggable: true, icon: '✧', sourceHotspot: 'hoodDisplay', revealStyle: 'physical', art: physical('brass-hood', 71, 70), look: '桌前還放著一只備用燈罩。拿起它看卡榫位置，再和路邊的刮痕片及布纖維比對。', after: '備用燈罩的卡榫形狀可與路邊刮痕對照。' },
            ], hotspots: [
                { id: 'noel', x: 96, y: 249, w: 151, h: 205, name: '與諾爾交談', look: noelTalk, after: noelTalk },
                { id: 'dutyPapers', x: 283, y: 85, w: 105, h: 99, name: '值勤板左上的巡查紙', look: '四個巡查時刻畫在左上的值勤紙上。按住那張有時鐘圖的紙，可將整張紙拖進物品欄。', after: '按住值勤紙可拿走它；木板會露出原本的木紋。' },
                { id: 'envelope', x: 505, y: 159, w: 92, h: 78, name: '奧利帶回的信', look: '奧利把退回信別在值勤板右下。信封有舊榛樹郵箱的投遞印記；收好信，再到石橋核對路線。', gives: ['mail'], after: '按住右下的信封可帶走它；郵戳不能證明奧利故意改道。' },
                { id: 'hoodDisplay', x: 658, y: 191, w: 263, h: 136, name: '工作桌上的黃銅燈罩', look: '桌上三只燈罩仍在；前緣另有一只可拿取的備用燈罩，可對照卡榫形狀。', after: '按住桌前的備用燈罩，可帶去比對路邊刮痕。' },
                { id: 'hoodNote', x: 503, y: 86, w: 60, h: 77, name: '燈罩檢修紙', look: '檢修紙畫著兩種卡榫形狀；它只能提供比對方法，不能證明是誰調整了燈罩。', after: '檢修紙仍釘在右上角，隨時可回來看。' },
                { id: 'flowerReport', x: 301, y: 170, w: 79, h: 81, name: '夜花巡查紙', look: '花況紙畫著夜花和夜蛾，提醒巡燈者不要讓強光直接照向花圃。', after: '花況紙是照護提醒，不是嫌疑人的署名。' },
                { id: 'boardTag', x: 510, y: 217, w: 40, h: 39, name: '值勤板的小星形吊牌', look: '小吊牌標記舊的巡燈路線，與岔路上可拿取的星形吊牌互相呼應。', after: '小吊牌留在板上作參考。' },
                { id: 'hutWindow', x: 689, y: 55, w: 103, h: 130, name: '窗外的巡燈小徑', look: '從窗邊能看見星燈都亮著，但距離太遠，無法靠窗景判定燈罩角度。', after: '要確認角度，仍要比對現場刮痕和布邊線頭。' },
                { id: 'dutyBoard', x: 389, y: 111, w: 112, h: 149, name: '巡燈值勤板中央', needsClue: 'mark', lockedClue: '先查看小徑路標，確認究竟有什麼改變。', requiresStored: ['dutySlip', 'mailEnvelope'], lockedStored: '先把左上角的值勤時刻紙與右下角的信封收進物品欄。', requiresUse: ['dutySlip', 'mailEnvelope'], lockedUse: '選取物品欄裡的值勤紙或退信，再點這塊值勤板；兩件都放好才能整理時刻。', look: '諾爾記下巡查地點與時間，沒有記每盞燈的角度。用值勤紙和信封上的郵戳，把時刻排回值勤板。', puzzle: { type: 'starlight', kind: 'sequence', title: '重排巡燈紀錄', prompt: '按時間排列四筆巡查紀錄，找出最後正常與最早偏移的時刻。', cards: [
                    { id: 'late', label: '19:35 舊郵箱有錯投信', detail: '奧利的郵戳。' },
                    { id: 'normal', label: '18:40 主路標記受光', detail: '最後一次確定方向正常。' },
                    { id: 'flower', label: '19:20 夜花旁出現低光', detail: '最早確定方向偏移。' },
                    { id: 'moths', label: '19:05 夜蛾聚在夜花旁', detail: '花圃巡查紙，尚未指向任何人。' },
                ], answer: ['normal', 'moths', 'flower', 'late'], hint1: '找最後一筆正常紀錄，再找第一筆提到偏移光線的紀錄。', hint2: '以紙上時間排序；要找改動時段，只需要正常與偏移的兩個界線。' }, gives: ['time'], solvedText: '燈光在 18:40 後、19:20 前偏移；值勤板沒有記錄誰轉了燈罩。', after: '已確認：18:40 正常，19:20 已偏移。改變發生於這段時間內。', reopen: true },
                { id: 'traceBoard', x: 640, y: 298, w: 151, h: 65, name: '工作桌上的痕跡比對', needsClue: 'time', lockedClue: '先整理巡燈紀錄，再看哪些燈可能在那段時間被動過。', requiresStored: ['shadeCloth', 'brassHood', 'lampScratch', 'pollenSample'], lockedStored: '收齊夜花坡的折布和花粉瓶、小徑燈柱的刮痕卡榫，以及桌前的備用燈罩，再到工作桌比對。', requiresUse: ['shadeCloth', 'brassHood', 'lampScratch', 'pollenSample'], lockedUse: '將四件實物逐一選取並放到工作桌的比對區，再檢查燈罩痕跡。', look: '米洛把四件實物並排，對照三盞燈的卡榫與纖維。', puzzle: { type: 'starlight', kind: 'match', title: '比對燈罩痕跡', prompt: '為三處燈具痕跡找到對應的星燈。花粉只能證明物件曾接近夜花。', rows: [
                    { id: 'fiber', label: '同色纖維＋花粉；附近工具套沾花粉', answer: '第三盞' },
                    { id: 'dust', label: '薄灰完整；卡榫沒有新刮痕', answer: '第一盞' },
                    { id: 'scratch', label: '新刮痕＋藍灰色布纖維', answer: '第二盞' },
                ], choices: ['第一盞', '第二盞', '第三盞'], hint1: '比較卡榫是否有新刮痕，以及纖維是否能互相對上。', hint2: '完整灰塵表示未轉動；刮痕和同色纖維要回現場比對。' }, gives: ['trace'], solvedText: '第二、三盞的燈罩被動過；花粉仍不能指認調整的人。', after: '第一盞灰塵完整；第二、三盞有互相支持的調整痕跡。', reopen: true },
                { id: 'toTrail', x: 15, y: 72, w: 163, h: 49, name: '返回星燈小徑', goto: 'trail', exit: true },
            ],
        },
        flower: {
            name: '夜花坡', bg: IMG + 'nightflower-slope-interactive-v1.webp',
            intro: '左路的夜花坡有布簾、花叢與小工作桌。桌邊的折布、札記和花粉瓶可直接拿取。',
            introBack: '夜花仍在夜色裡開著。花叢、布簾與小工作桌都可再次查看。',
            props: [
                { t: 'text', s: '返回岔路', icon: '↘', iconSide: 'right', x: 822, y: 344, size: 17, c: paper, shadow: 0x1d1729, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'img', src: WORKSHOP + 'ui-wood.webp', x: 605, y: 58, w: 216, h: 86 },
                { t: 'text', s: '重現燈光方向', x: 713, y: 104, size: 18, c: paper, ax: 0.5, ay: 0.5 },
            ],
            objects: [
                { id: 'shadeCloth', name: '桌邊折好的遮光布', x: 102, y: 242, w: 84, h: 69, draggable: true, icon: '≋', sourceHotspot: 'flowerClothEdge', revealStyle: 'physical', art: physical('shade-cloth', 84, 69), look: '桌邊折好的遮光布有鬆落的藍灰線頭。拿起這一小段折布，比對燈罩縫隙。', after: '藍灰纖維能對上燈罩縫隙，但不能單獨指認是誰動手。' },
                { id: 'flowerNotes', name: '夜花觀察札記', x: 187, y: 225, w: 74, h: 71, draggable: true, icon: '▤', sourceHotspot: 'flowerTable', revealStyle: 'physical', art: physical('flower-notes', 74, 71), look: '小工作桌上放著夜花與夜蛾的觀察札記。拿起小冊，查看柔光應照向哪裡。', after: '札記只記錄夜花與夜蛾的狀況，沒有寫誰調整燈罩。' },
                { id: 'pollenSample', name: '夜花花粉瓶', x: 314, y: 229, w: 51, h: 74, draggable: true, icon: '✿', sourceHotspot: 'flowerMoths', revealStyle: 'physical', art: physical('pollen-vial-v1', 51, 74), look: '花叢旁的小玻璃瓶封著散落花粉。花粉可比對燈具，但不能當作人的身分證明。', after: '花粉說明物件曾靠近夜花，不代表持有人就是調整者。' },
            ], hotspots: [
                { id: 'flowerMoths', x: 280, y: 131, w: 256, h: 172, name: '夜花與夜蛾', look: '19:05 的花圃巡查紙記著剛孵化的夜蛾聚在夜花旁；花間的小玻璃瓶封著花粉。', gives: ['moth'], after: '夜蛾聚集是可確認的現象；花粉瓶可拿去比對燈具。' },
                { id: 'flowerCanopy', x: 38, y: 55, w: 319, h: 135, name: '遮光布簾', look: '布簾固定在花圃上方，桌邊折布的邊緣有鬆落的藍灰線頭。不必拆下整片布簾，帶走折布即可。', after: '布簾說明夜花坡需要柔和光線；桌邊折布可帶去比對。' },
                { id: 'flowerTable', x: 59, y: 202, w: 207, h: 94, name: '夜花觀察工作桌', look: '燈、瓶罐和觀察小冊都在桌上。小冊可以整本拿起，供重現柔光方向時翻看。', after: '按住桌上的札記，可收進物品欄。' },
                { id: 'flowerClothEdge', x: 93, y: 233, w: 99, h: 78, name: '工作桌邊的遮光布', look: '桌邊折好的布與上方布簾質地相同，邊緣留有鬆落線頭。可以拿這片折布去比對。', after: '按住折布，可收進物品欄。' },
                { id: 'flowerLantern', x: 855, y: 85, w: 79, h: 165, name: '花坡邊的星燈', look: '這盞照向花坡的燈仍亮著；布簾擋住直射光。要找偏移原因，須比較小徑第二、三盞的燈罩。', after: '花坡的燈提供光照參考，不是小徑上的第二、三盞。' },
                { id: 'lightPuzzle', x: 616, y: 65, w: 198, h: 80, name: '重現燈光方向', needsClue: 'trace', lockedClue: '先在守燈亭比對卡榫與布纖維，再來重現光線。', requiresStored: ['flowerNotes', 'signRubbing'], lockedStored: '先把夜花觀察札記和小徑路標下的星形吊牌收進物品欄。', requiresUse: ['flowerNotes', 'signRubbing'], lockedUse: '把夜花札記與星形吊牌放到重現台，才有夜花和主路兩個比對基準。', look: '米洛用觀察札記和星形吊牌，重現兩盞燈罩轉向後的光帶。', puzzle: { type: 'starlight', kind: 'light', title: '重現燈光方向', prompt: '轉動第二、三盞燈罩；比較地面舊標記與夜花旁的弱光。', hint1: '星燈本身仍亮著；會改變光斑的是遮光罩。', hint2: '比對夜花旁殘留的弱光，想想遮光罩轉向何處才會形成低光帶。' }, gives: ['light'], solvedText: '弱光帶沿花叢與岔路延伸；主路舊標記因此變暗。', after: '已確認：遮光罩的轉向造成偏移光斑；動機仍待查證。', reopen: true },
                { id: 'flowerReturn', x: 750, y: 305, w: 145, h: 77, name: '從夜花坡返回岔路', goto: 'trail', exit: true },
            ],
        },
        bridge: {
            name: '石橋舊郵路', bg: IMG + 'postal-bridge-interactive-v1.webp',
            intro: '右路穿過石橋。舊郵箱、橋頭路標與往村口的新郵路都留在月光下。',
            introBack: '你回到石橋。舊郵箱和橋頭路標仍可比對。',
            props: [
                { t: 'text', s: '返回岔路', icon: '↙', x: 175, y: 386, size: 17, c: paper, shadow: 0x1d1729, weight: '700', ax: 0.5, ay: 0.5 },
            ],
            objects: [
                { id: 'oldPostmark', name: '停用郵路印記紙', x: 172, y: 228, w: 52, h: 48, draggable: true, icon: '◎', sourceHotspot: 'oldMailbox', revealStyle: 'physical', art: physical('old-postmark-slip-v1', 52, 48), look: '舊郵箱開口內卡著一張帶停用印記的退件紙。拿起它和奧利的信封核對。', after: '停用印記與退回郵戳一致，能確認信進過這只郵箱。' },
                { id: 'routeRubbing', name: '平石舊路拓片', x: 470, y: 337, w: 88, h: 66, draggable: true, icon: '⌁', sourceHotspot: 'bridgeStone', revealStyle: 'physical', art: physical('route-rubbing', 88, 66), look: '橋頭平石上壓著一張舊路拓片，記著通向停用郵箱的路。把這張紙帶走，和新郵路比對。', after: '平石舊路記號與東側的新郵路方向不同。' },
            ], hotspots: [
                { id: 'bridgeMarks', x: 786, y: 72, w: 139, h: 178, name: '橋頭的新舊路標', look: '橋頭兩塊木牌指向不同的郵路：舊榛樹郵箱仍在左側，村口的新路沿東側延伸。', gives: ['bridge'], after: '兩條路的方向明確，光斑偏移才讓人看錯。' },
                { id: 'oldMailbox', x: 57, y: 190, w: 174, h: 111, name: '榛樹舊郵箱', look: '舊郵箱裡有一張帶停用印記的退件紙，和奧利信封的郵戳形狀相同。', after: '按住郵箱內看得見的印記紙，可拿去和信封核對。' },
                { id: 'bridgeStone', x: 455, y: 328, w: 135, h: 85, name: '橋頭平石的舊路刻痕', look: '平石上壓著舊路拓片，指出通向停用郵箱的方向。光線偏移時，這條舊路很容易被誤認。', after: '按住平石上的拓片，可拿去整理郵路。' },
                { id: 'bridgeLantern', x: 322, y: 136, w: 94, h: 129, name: '橋邊的引路燈', look: '橋邊燈仍照亮橋面；問題出在岔路前第二、三盞燈的遮光方向。', after: '這盞燈沒有給奧利新的岔路指引。' },
                { id: 'villageRoad', x: 588, y: 124, w: 98, h: 181, name: '通往村口的新郵路', look: '穿過橋後的新郵路通往村口；奧利原本該沿這條路送信。', after: '新郵路和舊郵箱不是同一條路。' },
                { id: 'bridgeBox', x: 246, y: 250, w: 125, h: 72, name: '長椅上的封緘郵袋', needsClue: 'light', lockedClue: '先在夜花坡重現燈光方向，再來查奧利的郵路。', requiresStored: ['routeRubbing', 'oldPostmark', 'mailEnvelope'], lockedStored: '先收齊平石舊路拓片、郵箱內的停用印記紙與守燈亭裡的退回信封。', requiresUse: ['routeRubbing', 'oldPostmark', 'mailEnvelope'], lockedUse: '將拓片、停用印記紙與退信逐一放到長椅上的郵袋旁，才能解開封緘。', look: '奧利的郵袋用三環地標鎖封緘。順著他誤入舊路的方向，從拓片與郵戳辨認起點、途經處與終點。', puzzle: { type: 'starlight', kind: 'postalLock', title: '解開郵路封緘', prompt: '封緘的三環依「岔口起點 → 途中地標 → 停用郵箱」排列。旋轉圖形環，找出舊路的地標暗碼。', symbols: [
                    { id: 'star', label: '✦ 星標' },
                    { id: 'bridge', label: '⌒ 石橋' },
                    { id: 'hazel', label: '♧ 榛枝' },
                    { id: 'flower', label: '✿ 夜花' },
                ], answer: ['star', 'bridge', 'hazel'], hint1: '由岔口往停用郵箱走，先見路標，再經橋，最後看見郵箱上的榛枝。', hint2: '星形吊牌標起點；橋拱拓片標中段；退件紙的榛枝標終點。' }, gives: ['route'], solvedText: '郵袋打開後，投遞單顯示 19:18 東側仍正常；19:24、19:29 奧利沿偏光經第二、三盞，19:35 才把信誤投進舊郵箱。', after: '已確認：奧利沿偏移光帶誤入舊路，郵戳與目擊都說得通。', reopen: true },
                { id: 'bridgeReturn', x: 103, y: 373, w: 150, h: 72, name: '沿左下方道路返回岔路', goto: 'trail', exit: true },
            ],
        },
    },
};
})();

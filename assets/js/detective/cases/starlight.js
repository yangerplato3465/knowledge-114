// 星燈小徑：觀察、推測、確認分開記錄。圖片以案件腳本 URL 為基準，支援子路徑部署。
(() => {
const IMG = new URL('../../../images/detective/starlight/', document.currentScript.src).href;
const WORKSHOP = new URL('../../../images/magic-workshop/display/', document.currentScript.src).href;
const paper = 0xf3dfb2;

window.DETECTIVE_CASE = {
    title: '星燈小徑的錯位燈火',
    brief: '「燈明明亮著，信怎麼到了舊榛樹郵箱？」奧利把退回的信放到桌上。\n諾爾輕聲說：「昨晚沒有一盞燈熄掉。只是光落下來的地方，和以前不一樣。」\n\n跟米洛走進小徑左右兩條路，查看夜花坡、石橋郵路與守燈亭，找出燈光、時間和郵路之間的關係。',
    startScene: 'trail',
    skin: 'workshop',
    skinAssets: {
        board: IMG + 'investigation-board.webp',
        speech: IMG + 'dialogue-scroll.webp',
        wood: WORKSHOP + 'ui-wood.webp',
        star: WORKSHOP + 'ui-star.webp',
        font: new URL('../../../fonts/workshop/workshop-rounded.woff2', document.currentScript.src).href,
    },
    assistantImg: WORKSHOP + 'apprentice-v2.webp',
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
    hints: [
        { unless: 'mail', text: '米洛：「先到守燈亭看奧利帶回的信。郵戳是哪一條路的？」' },
        { unless: 'mark', text: '諾爾：「回小徑看看岔路口的路標。燈亮著，地上的舊記號呢？」' },
        { unless: 'moth', text: '米洛：「小徑左側通往夜花坡。看看夜蛾和遮光布簾，再把桌上的小物件收進物品欄。」' },
        { unless: 'time', text: '諾爾：「守燈亭的值勤板有四張紀錄。先依時間排，找最後正常和最早偏移。」' },
        { unless: 'trace', text: '米洛：「把夜花坡的遮光布和守燈亭的燈罩收進物品欄，再比對卡榫與纖維。」' },
        { unless: 'light', text: '諾爾：「帶著夜花觀察札記回夜花坡，轉動第二、三盞燈罩，比較弱光落在哪裡。」' },
        { unless: 'bridge', text: '奧利：「小徑右邊通往石橋。看看舊郵路的路標和郵箱。」' },
        { unless: 'route', text: '奧利：「把橋頭的郵路拓片收好，再將投遞印記和目擊時間連成路線。」' },
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
            name: '星燈小徑', bg: IMG + 'trail.webp',
            intro: '岔路仍在。左邊通往夜花坡，右邊通往石橋郵路；三盞星燈的光沒有落在舊標記上。',
            introBack: '左右兩條路都可回訪；路標、星燈與郵箱也能再次查看。',
            props: [
                { t: 'img', src: WORKSHOP + 'ui-wood.webp', x: 766, y: 54, w: 174, h: 86 },
                { t: 'text', s: '← 守燈亭', x: 853, y: 96, size: 18, c: paper, ax: 0.5, ay: 0.5 },
                { t: 'rect', x: 182, y: 386, w: 160, h: 38, r: 10, c: 0x352538, a: 0.92, s: 0xc89c61, sw: 2 },
                { t: 'text', s: '← 夜花坡', x: 262, y: 405, size: 18, c: paper, ax: 0.5, ay: 0.5 },
                { t: 'rect', x: 690, y: 386, w: 170, h: 38, r: 10, c: 0x352538, a: 0.92, s: 0xc89c61, sw: 2 },
                { t: 'text', s: '石橋郵路 →', x: 775, y: 405, size: 18, c: paper, ax: 0.5, ay: 0.5 },
            ],
            objects: [], hotspots: [
                { id: 'trailSign', x: 425, y: 198, w: 92, h: 125, name: '岔路路標', look: '觀察：地面舊星形記號在主路；今晚的光斑卻落在岔路邊。諾爾確認三盞燈昨夜都沒有熄掉。', gives: ['mark'], after: '已確認：舊路標的位置沒變，改變的是光照方向。' },
                { id: 'lampOne', x: 52, y: 75, w: 180, h: 300, name: '第一盞星燈', look: '觀察：第一盞的卡榫積著完整的薄灰，燈罩與地面主路標記對齊。', after: '第一盞沒有新刮痕；它提供正常方向的比對基準。' },
                { id: 'lampTwo', x: 614, y: 144, w: 104, h: 227, name: '第二盞星燈', look: '觀察：卡榫有一條新刮痕，縫裡留有藍灰色布纖維。', after: '第二盞被轉動過；新刮痕與纖維能互相支持。' },
                { id: 'lampThree', x: 867, y: 152, w: 86, h: 190, name: '第三盞星燈', look: '觀察：第三盞燈罩有同色纖維，燈柱下的夜花花粉沾到工具套。花粉不能證明工具主人是誰。', after: '第三盞附近有纖維與花粉；仍須看別的證據判斷發生了什麼。' },
                { id: 'forkBox', x: 348, y: 231, w: 68, h: 110, name: '岔路邊的舊郵箱', look: '舊榛樹郵箱旁的路面通往右側石橋；它仍在，但正式郵路早已改走東側。', after: '想知道奧利怎麼走到這裡，可沿右側道路去石橋比對。' },
                { id: 'toFlower', x: 182, y: 366, w: 160, h: 78, name: '走左路到夜花坡', goto: 'flower', exit: true },
                { id: 'toBridge', x: 690, y: 366, w: 170, h: 78, name: '走右路到石橋郵路', goto: 'bridge', exit: true },
                { id: 'toHut', x: 771, y: 67, w: 169, h: 57, name: '前往守燈亭', goto: 'hut', exit: true },
            ],
        },
        hut: {
            name: '諾爾的守燈亭', bg: IMG + 'keeper-hut.webp',
            intro: '諾爾替晚歸的人留著一盞小燈。值勤板和工作桌還保留昨夜的記錄。',
            introBack: '你回到守燈亭。值勤板、工具與奧利的信都能再查看。',
            props: [
                { t: 'img', src: WORKSHOP + 'ui-wood.webp', x: 12, y: 58, w: 170, h: 86 },
                { t: 'text', s: '← 返回小徑', x: 97, y: 100, size: 18, c: paper, ax: 0.5, ay: 0.5 },
                { t: 'img', src: WORKSHOP + 'visitor-owl-keeper-v1.webp', x: -65, y: 145, w: 345, h: 345 },
            ],
            objects: [
                { id: 'brassHood', name: '有新刮痕的燈罩', x: 710, y: 351, w: 106, h: 96, draggable: true, icon: '🪔', art: [{ t: 'img', src: IMG + 'brass-hood.webp', x: 0, y: 0, w: 106, h: 96 }], look: '觀察：燈罩卡榫有一道新刮痕。把它拖到下方物品欄，再和夜花坡的布料比對。', after: '卡榫上的新刮痕與藍灰色纖維可回頭比對。' },
            ], hotspots: [
                { id: 'envelope', x: 323, y: 269, w: 134, h: 92, name: '奧利帶回的信', look: '觀察：信封有「舊榛樹郵箱」的投遞印記。奧利說自己跟著燈走，沒有選擇停用郵路。這是他的說法，還待路線驗證。', gives: ['mail'], after: '信封上的舊路郵戳是真的；它尚不能證明奧利故意改道。' },
                { id: 'dutyBoard', x: 275, y: 98, w: 325, h: 186, name: '巡燈值勤板', needsClue: 'mark', lockedClue: '先查看小徑路標，確認究竟有什麼改變。', look: '諾爾保存了巡查地點與時間；板上沒有每盞燈的角度記錄。', puzzle: { type: 'starlight', kind: 'sequence', title: '重排巡燈紀錄', prompt: '按時間排列四張值勤紙。找出最後正常與最早偏移的紀錄。', cards: [
                    { id: 'late', label: '19:35 舊郵箱有錯投信', detail: '奧利的郵戳。' },
                    { id: 'normal', label: '18:40 主路標記受光', detail: '最後一次確定方向正常。' },
                    { id: 'flower', label: '19:20 夜花旁出現低光', detail: '最早確定方向偏移。' },
                    { id: 'moths', label: '19:05 夜蛾聚在夜花旁', detail: '花圃巡查紙，尚未指向任何人。' },
                ], answer: ['normal', 'moths', 'flower', 'late'], hint1: '找最後一筆正常紀錄，再找第一筆提到偏移光線的紀錄。', hint2: '以紙上時間排序；要找改動時段，只需要正常與偏移的兩個界線。' }, gives: ['time'], solvedText: '燈光在 18:40 後、19:20 前偏移；值勤板沒有記錄誰轉了燈罩。', after: '已確認：18:40 正常，19:20 已偏移。改變發生於這段時間內。', reopen: true },
                { id: 'traceBoard', x: 704, y: 217, w: 218, h: 140, name: '工作桌上的燈罩與痕跡', needsClue: 'time', lockedClue: '先整理巡燈紀錄，再看哪些燈可能在那段時間被動過。', requiresStored: ['shadeCloth', 'brassHood'], lockedStored: '先從夜花坡收起藍灰遮光布，再把守燈亭桌上的燈罩拖進物品欄。', look: '米洛把兩件小物與三盞燈的現場速寫攤在桌上。', puzzle: { type: 'starlight', kind: 'match', title: '比對燈罩痕跡', prompt: '為三張痕跡卡找到對應的星燈。花粉只能證明物件曾接近夜花。', rows: [
                    { id: 'fiber', label: '同色纖維＋花粉；附近工具套沾花粉', answer: '第三盞' },
                    { id: 'dust', label: '薄灰完整；卡榫沒有新刮痕', answer: '第一盞' },
                    { id: 'scratch', label: '新刮痕＋藍灰色布纖維', answer: '第二盞' },
                ], choices: ['第一盞', '第二盞', '第三盞'], hint1: '比較卡榫是否有新刮痕，以及纖維是否能互相對上。', hint2: '完整灰塵表示未轉動；刮痕和同色纖維要回現場比對。' }, gives: ['trace'], solvedText: '第二、三盞的燈罩被動過；花粉仍不能指認調整的人。', after: '第一盞灰塵完整；第二、三盞有互相支持的調整痕跡。', reopen: true },
                { id: 'toTrail', x: 15, y: 72, w: 163, h: 49, name: '返回星燈小徑', goto: 'trail', exit: true },
            ],
        },
        flower: {
            name: '夜花坡', bg: IMG + 'nightflower-slope.webp',
            intro: '左路的夜花坡有一張小工作桌，布簾替夜蛾擋住直射的星燈光。',
            introBack: '夜花仍在夜色裡開著。花叢、布簾與小工作桌都可再次查看。',
            props: [
                { t: 'rect', x: 704, y: 385, w: 184, h: 38, r: 10, c: 0x352538, a: 0.92, s: 0xc89c61, sw: 2 },
                { t: 'text', s: '返回岔路 →', x: 796, y: 404, size: 18, c: paper, ax: 0.5, ay: 0.5 },
                { t: 'img', src: WORKSHOP + 'ui-wood.webp', x: 605, y: 58, w: 216, h: 86 },
                { t: 'text', s: '重現燈光方向', x: 713, y: 100, size: 18, c: paper, ax: 0.5, ay: 0.5 },
            ],
            objects: [
                { id: 'shadeCloth', name: '藍灰遮光布', x: 220, y: 250, w: 112, h: 86, draggable: true, icon: '🧵', art: [{ t: 'img', src: IMG + 'shade-cloth.webp', x: 0, y: 0, w: 112, h: 86 }], look: '布邊的纖維和第二、三盞燈罩縫隙裡的顏色相近。把布拖進物品欄，才能仔細比對。', after: '藍灰纖維是物件痕跡；它還不能證明持有人就是調燈的人。' },
                { id: 'flowerNotes', name: '夜花觀察札記', x: 77, y: 230, w: 96, h: 91, draggable: true, icon: '📒', hiddenUntil: 'flowerMoths', art: [{ t: 'img', src: IMG + 'flower-notes.webp', x: 0, y: 0, w: 96, h: 91 }], look: '札記畫著夜花與夜蛾，記下花叢周圍的柔光方向。把它收進物品欄，重現光線時會用到。', after: '札記只記錄夜花與夜蛾的狀況，沒有寫誰調整燈罩。' },
            ], hotspots: [
                { id: 'flowerMoths', x: 280, y: 120, w: 255, h: 195, name: '夜花與夜蛾', look: '觀察：19:05 的花圃巡查紙記著剛孵化的夜蛾聚在夜花旁；布簾擋住直射強光。工作桌上的札記因此露了出來。', gives: ['moth'], after: '夜蛾聚集是可確認的現象，照護員的動機仍待詢問。' },
                { id: 'flowerCanopy', x: 28, y: 78, w: 335, h: 163, name: '遮光布簾', look: '布簾固定在花圃上方，邊緣的藍灰線和桌上的遮光布同色；它不是路標。', after: '布簾說明夜花坡需要柔和光線，不足以指認調燈的人。' },
                { id: 'lightPuzzle', x: 616, y: 65, w: 198, h: 80, name: '重現燈光方向', needsClue: 'trace', lockedClue: '先在守燈亭比對卡榫與布纖維，再來重現光線。', requiresStored: 'flowerNotes', lockedStored: '先查看夜花與夜蛾，把工作桌上的觀察札記拖進物品欄。', look: '米洛攤開札記和小徑縮圖，轉動燈罩方向，比較光斑落在哪裡。', puzzle: { type: 'starlight', kind: 'light', title: '重現燈光方向', prompt: '轉動第二、三盞燈罩；比較地面舊標記與夜花旁的弱光。', hint1: '星燈本身仍亮著；會改變光斑的是遮光罩。', hint2: '比對夜花旁殘留的弱光，想想遮光罩轉向何處才會形成低光帶。' }, gives: ['light'], solvedText: '弱光帶沿花叢與岔路延伸；主路舊標記因此變暗。', after: '已確認：遮光罩的轉向造成偏移光斑；動機仍待查證。', reopen: true },
                { id: 'flowerReturn', x: 704, y: 365, w: 184, h: 78, name: '從夜花坡返回岔路', goto: 'trail', exit: true },
            ],
        },
        bridge: {
            name: '石橋舊郵路', bg: IMG + 'postal-bridge.webp',
            intro: '右路穿過石橋。舊郵箱、橋頭路標與往村口的新郵路都留在月光下。',
            introBack: '你回到石橋。舊郵箱和橋頭路標仍可比對。',
            props: [
                { t: 'rect', x: 290, y: 387, w: 190, h: 38, r: 10, c: 0x352538, a: 0.92, s: 0xc89c61, sw: 2 },
                { t: 'text', s: '← 返回岔路', x: 385, y: 406, size: 18, c: paper, ax: 0.5, ay: 0.5 },
            ],
            objects: [
                { id: 'routeRubbing', name: '郵路印記拓片', x: 286, y: 247, w: 96, h: 98, draggable: true, icon: '🗺️', hiddenUntil: 'bridgeMarks', art: [{ t: 'img', src: IMG + 'route-rubbing.webp', x: 0, y: 0, w: 96, h: 98 }], look: '紙上拓有橋頭岔路和停用郵戳。把拓片拖進物品欄，才能和奧利的信比對。', after: '拓片可把舊路印記與橋頭位置放回郵路順序。' },
            ], hotspots: [
                { id: 'bridgeMarks', x: 516, y: 199, w: 232, h: 195, name: '橋頭的新舊路標', look: '觀察：石橋旁的舊路標仍指向榛樹郵箱；往村口的新郵路則沿東側延伸。橋頭平石上留著可拓印的路線記號。', gives: ['bridge'], after: '石橋舊路與東側新路分得很清楚；光斑偏移才讓人看錯。' },
                { id: 'bridgeBox', x: 74, y: 182, w: 183, h: 160, name: '舊榛樹郵箱與郵路', needsClue: 'light', lockedClue: '先在夜花坡重現燈光方向，再來整理奧利的走法。', requiresStored: 'routeRubbing', lockedStored: '先查看橋頭路標，再把平石旁的郵路拓片拖進物品欄。', look: '奧利拿出郵袋；你把拓片、投遞印記和目擊時間放回路線上。', puzzle: { type: 'starlight', kind: 'sequence', title: '整理郵路', prompt: '依時間排出奧利經過的位置。目擊者看見郵袋，不代表奧利故意改道。', cards: [
                    { id: 'east', label: '19:18 東側收件點', detail: '正常郵路的最後一枚投遞印記。' },
                    { id: 'box', label: '19:35 舊榛樹郵箱', detail: '退回的信留有停用郵路的印記。' },
                    { id: 'third', label: '19:29 第三盞燈旁', detail: '菲恩看到奧利的郵袋；無法證明他故意改道。' },
                    { id: 'second', label: '19:24 第二盞燈旁', detail: '奧利記得自己沿著光走。' },
                ], answer: ['east', 'second', 'third', 'box'], hint1: '從最早的正常投遞印記開始排。', hint2: '19:29 的目擊發生在 19:35 的錯誤郵戳之前。' }, gives: ['route'], solvedText: '奧利沿偏移光帶誤入舊路；目擊和他的說法並不矛盾。', after: '已確認：東側收件點 → 第二盞 → 第三盞 → 舊郵箱。', reopen: true },
                { id: 'bridgeReturn', x: 290, y: 367, w: 190, h: 78, name: '從石橋返回岔路', goto: 'trail', exit: true },
            ],
        },
    },
};
})();

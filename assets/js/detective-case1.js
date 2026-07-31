// ============================================================
// 偵探事件簿 · 第一號案件：消失的班級獎盃
// 這個檔案只放「資料」，不含任何 Pixi 程式碼。
// 由 assets/js/detective.js（Pixi 引擎）讀取 window.DETECTIVE_CASE。
//
// 場景美術用簡單圖形描述（props），引擎照著畫：
//   { t:'rect',   x, y, w, h, c, r?半徑, a?透明度, s?外框色, sw?外框粗細 }
//   { t:'circle', x, y, rad, c, a?, s?, sw? }
//   { t:'ellipse',x, y, rx, ry, c, a? }
//   { t:'poly',   pts:[x1,y1, x2,y2, ...], c, a? }
//   { t:'line',   pts:[x1,y1, x2,y2, ...], c, w? }
//   { t:'emoji',  s:'🗑️', x, y, size, rot?, a? }        // 以中心點定位
//   { t:'text',   s:'文字', x, y, size, c, weight?, ax?, ay? }  // ax/ay 為錨點
//
// 熱點 hotspots：
//   { id, name, x, y, w, h, look:'調查時說的話',
//     gives:'線索 id', givesItem:'道具 id',
//     requires:'需要的道具 id', locked:'沒道具時說的話',
//     after:'已經調查過再點一次說的話',
//     goto:'場景 id', exit:true, dir:'left'|'right' }
// 畫布設計尺寸固定 960 × 600，座標都以此為準。
// ============================================================

window.DETECTIVE_CASE = {
    title: '第一號案件 · 消失的班級獎盃',
    brief: '校慶剩下三天，五年二班的榮譽獎盃卻從展示櫃裡不見了！\n點擊場景中的東西調查，蒐集齊 6 條線索後就可以指認犯人。',
    startScene: 'classroom',

    // ---- 線索（蒐集後會記進偵探筆記）----
    clues: [
        { id: 'c1', icon: '🔒', name: '鎖沒有被破壞', desc: '展示櫃的玻璃和鎖都完好 —— 拿走獎盃的人有鑰匙。' },
        { id: 'c2', icon: '📋', name: '值日生表', desc: '今天午休由打掃股長王小杰留在教室整理。' },
        { id: 'c3', icon: '✨', name: '金色亮粉紙巾', desc: '教室垃圾桶裡有沾著金色亮粉的紙巾。' },
        { id: 'c4', icon: '📌', name: '美術社公告', desc: '午休美術社全社都在美術教室做海報，小美有不在場證明。' },
        { id: 'c5', icon: '🧢', name: '阿翔的目擊證詞', desc: '午休有個戴紅色帽子的人抱著大箱子走進器材室。' },
        { id: 'c6', icon: '🏆', name: '器材室裡的獎盃', desc: '獎盃和一頂紅帽放在架子上，帽子的名條寫著「王小杰」。' },
    ],

    // ---- 道具 ----
    items: [
        { id: 'key', icon: '🔑', name: '器材室鑰匙', desc: '吊牌上寫著「器材室」。' },
    ],

    // ---- 嫌疑人 ----
    suspects: [
        {
            id: 'jie', emoji: '🧢', name: '王小杰', role: '打掃股長',
            wrong: '',
        },
        {
            id: 'mei', emoji: '🎨', name: '林小美', role: '美術社社長',
            wrong: '再看一次公告：午休美術社全社都在美術教室做海報，小美不可能同時在教室喔！',
        },
        {
            id: 'xiang', emoji: '🏀', name: '陳阿翔', role: '籃球隊',
            wrong: '阿翔午休一直在操場打球，而且是他看到有人抱著箱子走進器材室的。',
        },
    ],
    culprit: 'jie',
    solution:
        '犯人是打掃股長 王小杰！\n\n' +
        '展示櫃沒有被撬開，代表拿走獎盃的人有鑰匙；值日生表寫著午休只有小杰留在教室；' +
        '阿翔看到戴紅帽的人抱著箱子走向器材室，而器材室裡的紅帽名條正是「王小杰」。\n\n' +
        '不過這不是偷竊 —— 小杰想在校慶前把獎盃擦得亮晶晶給大家一個驚喜（那些金色亮粉是擦拭時掉下來的），' +
        '卻忘了先告訴老師，才鬧出這場烏龍。案件偵破！',

    // ============================================================
    // 場景
    // ============================================================
    scenes: {

        // ---------- 教室 ----------
        classroom: {
            name: '五年二班教室',
            intro: '展示櫃空了。從這裡開始找線索吧！',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 380, c: 0xe9f1f4 },
                { t: 'rect', x: 0, y: 356, w: 960, h: 24, c: 0xd5e2e8 },
                { t: 'rect', x: 0, y: 380, w: 960, h: 220, c: 0xd9bf9d },
                { t: 'line', pts: [0, 440, 960, 440], c: 0xcaad89, w: 3 },
                { t: 'line', pts: [0, 510, 960, 510], c: 0xcaad89, w: 3 },
                // 黑板
                { t: 'rect', x: 60, y: 100, w: 330, h: 180, c: 0x8b6b4a, r: 10 },
                { t: 'rect', x: 72, y: 112, w: 306, h: 156, c: 0x35544a },
                { t: 'text', s: '5/12  值日生表', x: 92, y: 132, size: 20, c: 0xffffff, weight: '700' },
                { t: 'text', s: '午休打掃：王小杰', x: 92, y: 172, size: 18, c: 0xd8ece1 },
                { t: 'text', s: '校慶倒數 3 天！', x: 92, y: 210, size: 18, c: 0xffe08a },
                { t: 'rect', x: 60, y: 280, w: 330, h: 12, c: 0x74563b },
                // 榮譽櫃
                { t: 'rect', x: 420, y: 90, w: 170, h: 290, c: 0x8b6b4a, r: 12 },
                { t: 'rect', x: 434, y: 104, w: 142, h: 200, c: 0xd7eef6, a: 0.85 },
                { t: 'rect', x: 434, y: 200, w: 142, h: 8, c: 0x74563b },
                { t: 'text', s: '班級榮譽櫃', x: 505, y: 340, size: 17, c: 0xfff3e2, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'ellipse', x: 505, y: 178, rx: 34, ry: 9, c: 0xb9d8e2, a: 0.9 },
                // 窗戶
                { t: 'rect', x: 630, y: 100, w: 210, h: 150, c: 0xbfe3f5, r: 8, s: 0xffffff, sw: 8 },
                { t: 'line', pts: [735, 100, 735, 250], c: 0xffffff, w: 6 },
                { t: 'line', pts: [630, 175, 840, 175], c: 0xffffff, w: 6 },
                { t: 'emoji', s: '☁️', x: 685, y: 136, size: 26, a: 0.9 },
                // 門
                { t: 'rect', x: 862, y: 120, w: 88, h: 260, c: 0xa0764f, r: 8 },
                { t: 'circle', x: 878, y: 255, rad: 6, c: 0xf0d27a },
                // 老師的桌子
                { t: 'rect', x: 60, y: 398, w: 230, h: 26, c: 0xa87c4f, r: 6 },
                { t: 'rect', x: 74, y: 424, w: 12, h: 70, c: 0x8a6238 },
                { t: 'rect', x: 264, y: 424, w: 12, h: 70, c: 0x8a6238 },
                { t: 'emoji', s: '📋', x: 108, y: 382, size: 30 },
                { t: 'emoji', s: '☕', x: 244, y: 384, size: 26 },
                // 學生桌
                { t: 'rect', x: 340, y: 468, w: 120, h: 16, c: 0xc59a68, r: 4 },
                { t: 'rect', x: 350, y: 484, w: 10, h: 46, c: 0x9c7748 },
                { t: 'rect', x: 440, y: 484, w: 10, h: 46, c: 0x9c7748 },
                { t: 'rect', x: 520, y: 468, w: 120, h: 16, c: 0xc59a68, r: 4 },
                { t: 'rect', x: 530, y: 484, w: 10, h: 46, c: 0x9c7748 },
                { t: 'rect', x: 620, y: 484, w: 10, h: 46, c: 0x9c7748 },
                { t: 'emoji', s: '📖', x: 560, y: 456, size: 26 },
                { t: 'emoji', s: '🗑️', x: 900, y: 442, size: 60 },
            ],
            hotspots: [
                {
                    id: 'case', name: '班級榮譽櫃', x: 420, y: 90, w: 170, h: 290,
                    look: '櫃子空了，只剩下一圈沒有灰塵的印子。奇怪的是玻璃門完好，鎖也沒有被撬開的痕跡……',
                    gives: 'c1',
                    after: '沒有破壞的痕跡，看來是有人「打開」櫃子拿走的。',
                },
                {
                    id: 'board', name: '黑板', x: 60, y: 100, w: 330, h: 180,
                    look: '值日生表上寫著：今天午休由打掃股長「王小杰」留下來整理教室。',
                    gives: 'c2',
                    after: '午休留在教室的只有王小杰一個人。',
                },
                {
                    id: 'bin', name: '垃圾桶', x: 866, y: 408, w: 70, h: 70,
                    look: '垃圾桶裡有一張擦過東西的紙巾，上面沾著亮晶晶的金色粉末。',
                    gives: 'c3',
                    after: '紙巾上的金色亮粉閃閃發亮。',
                },
                {
                    id: 'teacherdesk', name: '老師的桌子', x: 60, y: 380, w: 230, h: 114,
                    look: '桌上有張便條：「校慶當天要展示班級獎盃」。抽屜裡空空的，備用鑰匙也不見了。',
                },
                {
                    id: 'window', name: '窗戶', x: 630, y: 100, w: 210, h: 150,
                    look: '從窗戶看出去就是操場，遠遠可以看到器材室的門。',
                },
                { id: 'toHall', name: '走廊', x: 862, y: 120, w: 88, h: 260, exit: true, dir: 'right', goto: 'hallway' },
            ],
        },

        // ---------- 走廊 ----------
        hallway: {
            name: '走廊 · 置物櫃區',
            intro: '三個嫌疑人的置物櫃都在這裡。',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 400, c: 0xe6edf2 },
                { t: 'rect', x: 0, y: 376, w: 960, h: 24, c: 0xccdae3 },
                { t: 'rect', x: 0, y: 400, w: 960, h: 200, c: 0xcdd5db },
                { t: 'line', pts: [0, 460, 960, 460], c: 0xbcc5cc, w: 3 },
                { t: 'line', pts: [0, 530, 960, 530], c: 0xbcc5cc, w: 3 },
                // 置物櫃 ×3
                { t: 'rect', x: 90, y: 130, w: 130, h: 250, c: 0x7fa8c9, r: 8 },
                { t: 'line', pts: [90, 200, 220, 200], c: 0x5f88a8, w: 3 },
                { t: 'circle', x: 200, y: 300, rad: 7, c: 0xe8f1f7 },
                { t: 'rect', x: 108, y: 146, w: 94, h: 26, c: 0xfdf6e6, r: 4 },
                { t: 'text', s: '王小杰', x: 155, y: 159, size: 15, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'rect', x: 250, y: 130, w: 130, h: 250, c: 0x7fa8c9, r: 8 },
                { t: 'line', pts: [250, 200, 380, 200], c: 0x5f88a8, w: 3 },
                { t: 'circle', x: 360, y: 300, rad: 7, c: 0xe8f1f7 },
                { t: 'rect', x: 268, y: 146, w: 94, h: 26, c: 0xfdf6e6, r: 4 },
                { t: 'text', s: '林小美', x: 315, y: 159, size: 15, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'rect', x: 410, y: 130, w: 130, h: 250, c: 0x7fa8c9, r: 8 },
                { t: 'line', pts: [410, 200, 540, 200], c: 0x5f88a8, w: 3 },
                { t: 'circle', x: 520, y: 300, rad: 7, c: 0xe8f1f7 },
                { t: 'rect', x: 428, y: 146, w: 94, h: 26, c: 0xfdf6e6, r: 4 },
                { t: 'text', s: '陳阿翔', x: 475, y: 159, size: 15, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                // 布告欄
                { t: 'rect', x: 620, y: 130, w: 250, h: 170, c: 0xb98d5f, r: 8 },
                { t: 'rect', x: 632, y: 142, w: 226, h: 146, c: 0xfdf6e6 },
                { t: 'text', s: '社團公告', x: 745, y: 172, size: 19, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'text', s: '美術社 · 午休集合', x: 745, y: 210, size: 15, c: 0x8a7b6d, ax: 0.5, ay: 0.5 },
                { t: 'text', s: '地點：美術教室', x: 745, y: 240, size: 15, c: 0x8a7b6d, ax: 0.5, ay: 0.5 },
                // 打掃用具
                { t: 'emoji', s: '🧹', x: 640, y: 400, size: 52, rot: -0.35 },
                { t: 'emoji', s: '🪣', x: 686, y: 432, size: 50 },
            ],
            hotspots: [
                {
                    id: 'lockerJie', name: '王小杰的置物櫃', x: 90, y: 130, w: 130, h: 250,
                    look: '裡面掛著抹布和一瓶「擦銅油」，還有一個空空的帽子掛勾 —— 他的紅帽今天不在櫃子裡。',
                },
                {
                    id: 'lockerMei', name: '林小美的置物櫃', x: 250, y: 130, w: 130, h: 250,
                    look: '滿滿的美術用品。一罐金蔥膠水沒蓋緊，金色亮粉撒了一角 —— 原來亮粉是從這裡流出去的。',
                },
                {
                    id: 'lockerXiang', name: '陳阿翔的置物櫃', x: 410, y: 130, w: 130, h: 250,
                    look: '球衣、護腕，籃球不在裡面。看來他午休真的跑去操場打球了。',
                },
                {
                    id: 'notice', name: '布告欄', x: 620, y: 130, w: 250, h: 170,
                    look: '公告寫著：美術社午休全社在美術教室做海報，缺席要登記。小美是社長，一定在場。',
                    gives: 'c4',
                    after: '午休時間美術社全員都在美術教室。',
                },
                {
                    id: 'bucket', name: '拖把水桶', x: 610, y: 380, w: 110, h: 90,
                    look: '水桶底下壓著一把鑰匙，吊牌上寫著「器材室」。你把它收進口袋。',
                    givesItem: 'key',
                    after: '空水桶，沒有別的東西了。',
                },
                { id: 'toClass', name: '教室', x: 0, y: 130, w: 70, h: 300, exit: true, dir: 'left', goto: 'classroom' },
                { id: 'toYard', name: '操場', x: 890, y: 130, w: 70, h: 300, exit: true, dir: 'right', goto: 'playground' },
            ],
        },

        // ---------- 操場 ----------
        playground: {
            name: '操場 · 器材室',
            intro: '阿翔正在這裡打球。',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 330, c: 0xbfe6f2 },
                { t: 'circle', x: 120, y: 80, rad: 44, c: 0xffe9a3 },
                { t: 'ellipse', x: 330, y: 90, rx: 60, ry: 24, c: 0xffffff, a: 0.85 },
                { t: 'ellipse', x: 380, y: 78, rx: 42, ry: 20, c: 0xffffff, a: 0.85 },
                { t: 'rect', x: 0, y: 330, w: 960, h: 270, c: 0xa9cf8a },
                { t: 'rect', x: 0, y: 500, w: 960, h: 62, c: 0xd98f6a, a: 0.65 },
                // 沙坑與腳印
                { t: 'ellipse', x: 300, y: 452, rx: 175, ry: 62, c: 0xe8d5a8 },
                { t: 'ellipse', x: 190, y: 470, rx: 11, ry: 7, c: 0xd0b483 },
                { t: 'ellipse', x: 232, y: 452, rx: 11, ry: 7, c: 0xd0b483 },
                { t: 'ellipse', x: 276, y: 468, rx: 11, ry: 7, c: 0xd0b483 },
                { t: 'ellipse', x: 320, y: 450, rx: 11, ry: 7, c: 0xd0b483 },
                { t: 'ellipse', x: 364, y: 464, rx: 11, ry: 7, c: 0xd0b483 },
                { t: 'ellipse', x: 408, y: 446, rx: 11, ry: 7, c: 0xd0b483 },
                // 器材室
                { t: 'rect', x: 640, y: 156, w: 300, h: 224, c: 0xcfc6b6, r: 6 },
                { t: 'poly', pts: [612, 156, 968, 156, 940, 116, 640, 116], c: 0x9c6f45 },
                { t: 'rect', x: 664, y: 196, w: 76, h: 60, c: 0xbfe3f5, r: 4, s: 0xf2eee4, sw: 5 },
                { t: 'text', s: '器材室', x: 838, y: 210, size: 26, c: 0x6b5a44, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'rect', x: 760, y: 250, w: 100, h: 130, c: 0x8b6b4a, r: 6 },
                { t: 'circle', x: 774, y: 316, rad: 6, c: 0xf0d27a },
                // 風景與人物
                { t: 'emoji', s: '🌳', x: 84, y: 350, size: 96 },
                { t: 'emoji', s: '🌳', x: 540, y: 300, size: 62 },
                { t: 'emoji', s: '🧒', x: 500, y: 380, size: 66 },
                { t: 'emoji', s: '🏀', x: 540, y: 416, size: 30 },
            ],
            hotspots: [
                {
                    id: 'xiang', name: '陳阿翔', x: 462, y: 342, w: 92, h: 96,
                    look: '「午休我一直在這裡打球啊。喔對了，我有看到一個戴紅色帽子的人，抱著一個大箱子走進器材室！」',
                    gives: 'c5',
                    after: '「戴紅帽的人喔，我記得很清楚！」',
                },
                {
                    id: 'sand', name: '沙坑', x: 150, y: 400, w: 300, h: 110,
                    look: '沙坑上有一排腳印，一路往器材室的方向去。',
                },
                {
                    id: 'shed', name: '器材室的門', x: 758, y: 248, w: 104, h: 134,
                    requires: 'key',
                    locked: '門鎖住了。得先找到器材室的鑰匙才行。',
                    look: '你用鑰匙打開門 —— 架子上放著班級獎盃，旁邊還有一頂紅色帽子，名條寫著「王小杰」！',
                    gives: 'c6',
                    after: '獎盃就放在架子上，旁邊是那頂紅帽。',
                },
                { id: 'toHall2', name: '走廊', x: 0, y: 150, w: 70, h: 300, exit: true, dir: 'left', goto: 'hallway' },
            ],
        },
    },
};

// ============================================================
// 偵探事件簿 · 案件：黃金貓頭鷹雕像失竊事件（聖楓小學）
// 這個檔案只放「資料」，不含任何 Pixi 程式碼。
// 由 assets/js/detective.js（引擎）讀取 window.DETECTIVE_CASE。
//
// ★ 之後要換成正式美術素材時：
//   把 scenes.<場景>.bg 設成圖片路徑（例如 '../assets/images/detective/office.png'），
//   或在 props 裡加 { t:'img', src:'...', x, y, w, h }。
//   熱點（hotspots）的座標是以 960 × 600 的畫面為準，換圖後不用重寫程式，
//   只要微調座標對準新圖上的東西即可。找不到圖時會自動退回下面的替代圖形。
//
// 圖形 props 寫法：
//   { t:'rect', x,y,w,h,c, r?,a?,s?外框色,sw? } { t:'circle', x,y,rad,c }
//   { t:'ellipse', x,y,rx,ry,c }  { t:'poly', pts:[...],c }
//   { t:'line', pts:[...],c,w }   { t:'emoji', s,x,y,size,rot?,a? }
//   { t:'text', s,x,y,size,c,weight?,ax?,ay? }   { t:'img', src,x,y,w,h }
//
// 熱點 hotspots：
//   { id, name, x,y,w,h, look, after?, gives?（線索 id 或陣列）, givesItem?,
//     requires?（需要道具）, locked?, needsClue?（需要某條線索）, lockedClue?,
//     puzzle?（謎題設定）, solvedText?, goto?, exit?, dir? }
// ============================================================

window.DETECTIVE_CASE = {
    title: '黃金貓頭鷹雕像失竊事件',
    brief:
        '聖楓小學的鎮校之寶「黃金貓頭鷹雕像」在昨晚不翼而飛！\n' +
        '現場沒有任何破壞痕跡，只留下一封寫著神秘字母的挑戰信，以及幾件奇怪的道具。\n\n' +
        '你是校長請來的小偵探 —— 用觀察力、密碼學和邏輯推理，把雕像找回來吧！',
    startScene: 'principal',

    // ---- 線索 ----
    clues: [
        { id: 'c1', icon: '🔍', name: '沒有闖入痕跡', desc: '玻璃罩完好、門鎖沒被破壞 —— 犯人有鑰匙。' },
        { id: 'c2', icon: '🔤', name: '挑戰信的密碼', desc: '凱撒密碼往回移 3 格：MUSIC ROOM ＝ 音樂教室。' },
        { id: 'c3', icon: '🕖', name: '紅濾鏡下的時間', desc: '卡片上的藍色字寫著「19:40」。' },
        { id: 'c4', icon: '🗼', name: '藍濾鏡下的地點', desc: '卡片上的紅色字寫著「鐘塔」。' },
        { id: 'c5', icon: '📺', name: '監視器畫面', desc: '19:40 的警衛室裡空無一人。' },
        { id: 'c6', icon: '🧩', name: '邏輯推理結果', desc: '19:40：林警衛在鐘塔、白老師在警衛室、阿宥在美術教室。' },
        { id: 'c7', icon: '🦉', name: '鐘塔木箱裡的東西', desc: '黃金貓頭鷹雕像，旁邊放著一張很舊的照片。' },
    ],

    items: [
        { id: 'towerkey', icon: '🔑', name: '鐘塔鑰匙', desc: '鑰匙櫃裡唯一掛錯位置的一把。' },
    ],

    // ---- 嫌疑人 ----
    suspects: [
        { id: 'guard', emoji: '🔦', name: '林警衛', role: '夜間警衛', wrong: '' },
        {
            id: 'art', emoji: '🎨', name: '白老師', role: '美術老師',
            wrong: '邏輯表推出白老師 19:40 在警衛室，而且她怕高，從來不上鐘塔。',
        },
        {
            id: 'kid', emoji: '💻', name: '阿宥', role: '資訊社社長',
            wrong: '阿宥的鞋底沾著還沒乾的紅色顏料，19:40 他人在美術教室。',
        },
    ],
    culprit: 'guard',
    solution:
        '犯人是夜間警衛 —— 林警衛！\n\n' +
        '① 現場沒有破壞痕跡，代表犯人有鑰匙；全校鑰匙都在警衛室。\n' +
        '② 濾鏡卡片藏著兩段訊息：時間「19:40」與地點「鐘塔」。\n' +
        '③ 監視器顯示 19:40 警衛室沒有人，邏輯表也推出那個時間林警衛正在鐘塔。\n\n' +
        '木箱裡雕像旁的老照片解開了動機：黃金貓頭鷹是林警衛的父親當年親手雕的。' +
        '學校打算把它換成新雕像，他捨不得，才把雕像先藏了起來 —— ' +
        '還故意留下密碼信和濾鏡卡，希望有人能找到它，順便想起這座雕像的故事。\n\n' +
        '雕像回到聖楓小學了，案件偵破！',

    // ============================================================
    scenes: {

        // ---------- 校長室 ----------
        principal: {
            name: '校長室 · 案發現場',
            intro: '雕像不見了，但玻璃罩還好好地放在旁邊。從展示座開始查吧！',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 370, c: 0xeae2d2 },
                { t: 'rect', x: 0, y: 300, w: 960, h: 70, c: 0xd8c8ae },
                { t: 'line', pts: [0, 300, 960, 300], c: 0xc4b092, w: 4 },
                { t: 'rect', x: 0, y: 370, w: 960, h: 230, c: 0xa9784f },
                { t: 'rect', x: 210, y: 430, w: 540, h: 160, c: 0x94493f, r: 16 },
                { t: 'rect', x: 232, y: 448, w: 496, h: 124, c: 0xa5564a, r: 10 },
                // 書櫃
                { t: 'rect', x: 40, y: 100, w: 220, h: 270, c: 0x7d5334, r: 6 },
                { t: 'rect', x: 52, y: 112, w: 196, h: 70, c: 0x5f3e27 },
                { t: 'rect', x: 52, y: 192, w: 196, h: 70, c: 0x5f3e27 },
                { t: 'rect', x: 52, y: 272, w: 196, h: 70, c: 0x5f3e27 },
                { t: 'rect', x: 60, y: 120, w: 14, h: 54, c: 0xd66b5a }, { t: 'rect', x: 78, y: 124, w: 12, h: 50, c: 0xe0a04b },
                { t: 'rect', x: 94, y: 118, w: 16, h: 56, c: 0x6f9fc4 }, { t: 'rect', x: 114, y: 126, w: 12, h: 48, c: 0x8bb87e },
                { t: 'rect', x: 60, y: 200, w: 12, h: 54, c: 0x8bb87e }, { t: 'rect', x: 76, y: 204, w: 16, h: 50, c: 0xd66b5a },
                { t: 'rect', x: 96, y: 198, w: 12, h: 56, c: 0xe0a04b }, { t: 'rect', x: 112, y: 206, w: 14, h: 48, c: 0x6f9fc4 },
                { t: 'rect', x: 60, y: 280, w: 16, h: 54, c: 0x6f9fc4 }, { t: 'rect', x: 80, y: 284, w: 12, h: 50, c: 0x8bb87e },
                // 窗戶
                { t: 'rect', x: 700, y: 100, w: 220, h: 170, c: 0xbfe3f5, r: 6, s: 0xfdfaf3, sw: 8 },
                { t: 'line', pts: [810, 100, 810, 270], c: 0xfdfaf3, w: 6 },
                { t: 'line', pts: [700, 185, 920, 185], c: 0xfdfaf3, w: 6 },
                { t: 'rect', x: 676, y: 92, w: 26, h: 190, c: 0x94493f, r: 4 },
                { t: 'rect', x: 918, y: 92, w: 26, h: 190, c: 0x94493f, r: 4 },
                // 展示座
                { t: 'rect', x: 418, y: 332, w: 164, h: 38, c: 0x5f4b34, r: 6 },
                { t: 'rect', x: 448, y: 236, w: 104, h: 100, c: 0x7d6244 },
                { t: 'rect', x: 412, y: 214, w: 176, h: 24, c: 0xc7b28c, r: 6 },
                { t: 'rect', x: 452, y: 348, w: 96, h: 18, c: 0xc7b28c, r: 4 },
                { t: 'text', s: '黃金貓頭鷹', x: 500, y: 357, size: 13, c: 0x5f4b34, weight: '700', ax: 0.5, ay: 0.5 },
                // 空空的位置（虛線示意）
                { t: 'ellipse', x: 500, y: 208, rx: 44, ry: 10, c: 0x000000, a: 0.12 },
                { t: 'text', s: '？', x: 500, y: 168, size: 46, c: 0xb9a88c, weight: '700', ax: 0.5, ay: 0.5 },
                // 玻璃罩被好好地放在旁邊
                { t: 'rect', x: 604, y: 286, w: 84, h: 84, c: 0xd7eef6, a: 0.75, r: 8 },
                { t: 'rect', x: 600, y: 362, w: 92, h: 12, c: 0xc7b28c, r: 4 },
                // 挑戰信
                { t: 'emoji', s: '✉️', x: 500, y: 196, size: 44 },
                // 校長桌
                { t: 'rect', x: 96, y: 402, w: 252, h: 26, c: 0x8a5c33, r: 6 },
                { t: 'rect', x: 110, y: 428, w: 14, h: 74, c: 0x734b28 },
                { t: 'rect', x: 320, y: 428, w: 14, h: 74, c: 0x734b28 },
                { t: 'emoji', s: '📄', x: 150, y: 386, size: 28 },
                { t: 'emoji', s: '☕', x: 300, y: 388, size: 24 },
                // 校長
                { t: 'emoji', s: '🧑‍🏫', x: 762, y: 402, size: 72 },
            ],
            hotspots: [
                {
                    id: 'pedestal', name: '展示座', x: 412, y: 214, w: 176, h: 156,
                    look: '雕像不見了，可是玻璃罩被「好好地」放在旁邊，底座連一道刮痕都沒有。門鎖也完好無缺 —— 犯人是用鑰匙進來的。',
                    gives: 'c1',
                    after: '沒有破壞、沒有慌張，犯人非常從容。',
                },
                {
                    id: 'letter', name: '挑戰信', x: 470, y: 168, w: 62, h: 62,
                    look: '信上只有一行奇怪的英文字母：「PXVLF URRP」，署名是「影子」。',
                    puzzle: {
                        type: 'caesar',
                        title: '🔤 挑戰信 · 凱撒密碼',
                        cipher: 'PXVLF URRP',
                        answer: 'MUSIC ROOM',
                        translate: '＝ 音樂教室',
                        hint: '提示：信封角落畫了三顆小星星 ★★★，也許代表要往回移幾格？',
                    },
                    solvedText: '密碼解開了！MUSIC ROOM ＝ 音樂教室。「影子」要你去音樂教室。',
                    gives: 'c2',
                    after: '信上的密碼已經解開：MUSIC ROOM ＝ 音樂教室。',
                },
                {
                    id: 'window', name: '窗戶', x: 676, y: 92, w: 268, h: 190,
                    look: '窗戶從裡面鎖得好好的，窗台上的灰塵也沒有被踩過。犯人不是從這裡進來的。',
                },
                {
                    id: 'shelf', name: '書櫃', x: 40, y: 100, w: 220, h: 270,
                    look: '一整排校史紀錄。其中一本翻開著，寫著：黃金貓頭鷹雕像是三十年前由學校的老工友親手雕成的。',
                },
                {
                    id: 'principalNpc', name: '校長', x: 726, y: 366, w: 74, h: 84,
                    look: '「小偵探，拜託你了！昨晚只有值班的人有鑰匙……但我實在不敢懷疑任何人。」',
                },
                {
                    id: 'toMusic', name: '音樂教室', x: 890, y: 300, w: 70, h: 260,
                    exit: true, dir: 'right', goto: 'music',
                    needsClue: 'c2', lockedClue: '先解開挑戰信上的密碼，才知道下一站要去哪裡。',
                },
            ],
        },

        // ---------- 音樂教室 ----------
        music: {
            name: '音樂教室',
            intro: '密碼指向這裡。「影子」留下了什麼？',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 360, c: 0xe7ecdf },
                { t: 'rect', x: 0, y: 336, w: 960, h: 24, c: 0xd3dcc7 },
                { t: 'rect', x: 0, y: 360, w: 960, h: 240, c: 0xc9a97e },
                { t: 'line', pts: [0, 440, 960, 440], c: 0xb8956a, w: 3 },
                { t: 'line', pts: [0, 520, 960, 520], c: 0xb8956a, w: 3 },
                // 牆上五線譜
                { t: 'line', pts: [60, 70, 900, 70], c: 0xc0c9b4, w: 2 },
                { t: 'line', pts: [60, 84, 900, 84], c: 0xc0c9b4, w: 2 },
                { t: 'line', pts: [60, 98, 900, 98], c: 0xc0c9b4, w: 2 },
                { t: 'emoji', s: '🎵', x: 220, y: 84, size: 30 },
                { t: 'emoji', s: '🎶', x: 640, y: 80, size: 32 },
                // 鋼琴
                { t: 'rect', x: 120, y: 186, w: 300, h: 116, c: 0x2b2b30, r: 8 },
                { t: 'rect', x: 134, y: 200, w: 272, h: 66, c: 0x3a3a42, r: 4 },
                { t: 'rect', x: 112, y: 296, w: 316, h: 22, c: 0x22222a, r: 4 },
                { t: 'rect', x: 138, y: 318, w: 264, h: 42, c: 0xfdfdfa, r: 3 },
                { t: 'rect', x: 152, y: 318, w: 10, h: 26, c: 0x1c1c22 }, { t: 'rect', x: 176, y: 318, w: 10, h: 26, c: 0x1c1c22 },
                { t: 'rect', x: 214, y: 318, w: 10, h: 26, c: 0x1c1c22 }, { t: 'rect', x: 238, y: 318, w: 10, h: 26, c: 0x1c1c22 },
                { t: 'rect', x: 262, y: 318, w: 10, h: 26, c: 0x1c1c22 }, { t: 'rect', x: 300, y: 318, w: 10, h: 26, c: 0x1c1c22 },
                { t: 'rect', x: 324, y: 318, w: 10, h: 26, c: 0x1c1c22 }, { t: 'rect', x: 362, y: 318, w: 10, h: 26, c: 0x1c1c22 },
                { t: 'rect', x: 150, y: 360, w: 18, h: 44, c: 0x22222a }, { t: 'rect', x: 372, y: 360, w: 18, h: 44, c: 0x22222a },
                // 琴椅
                { t: 'rect', x: 214, y: 428, w: 120, h: 16, c: 0x8a5c33, r: 4 },
                { t: 'rect', x: 224, y: 444, w: 10, h: 40, c: 0x734b28 },
                { t: 'rect', x: 314, y: 444, w: 10, h: 40, c: 0x734b28 },
                // 譜架
                { t: 'rect', x: 520, y: 214, w: 110, h: 70, c: 0xb6bcc2, r: 4, rot: 0 },
                { t: 'rect', x: 532, y: 226, w: 86, h: 48, c: 0xfdf8ee },
                { t: 'rect', x: 570, y: 284, w: 8, h: 80, c: 0x9aa1a8 },
                { t: 'line', pts: [546, 366, 574, 340, 602, 366], c: 0x9aa1a8, w: 6 },
                // 置物櫃
                { t: 'rect', x: 700, y: 170, w: 200, h: 190, c: 0x9c7748, r: 6 },
                { t: 'line', pts: [800, 170, 800, 360], c: 0x7f5f38, w: 4 },
                { t: 'circle', x: 788, y: 268, rad: 6, c: 0xe4d9cd },
                { t: 'circle', x: 812, y: 268, rad: 6, c: 0xe4d9cd },
                { t: 'emoji', s: '🥁', x: 660, y: 400, size: 54 },
                { t: 'emoji', s: '🎺', x: 860, y: 408, size: 48 },
            ],
            hotspots: [
                {
                    id: 'piano', name: '鋼琴', x: 112, y: 186, w: 316, h: 174,
                    look: '掀開琴蓋，裡面卡著一張畫滿亂線的卡片，還有兩片透明塑膠片 —— 一片紅、一片藍。',
                    puzzle: {
                        type: 'filter',
                        title: '🔴🔵 濾鏡卡片 · 光學疊色',
                        throughRed: '19:40',
                        throughBlue: '鐘塔',
                    },
                    solvedText: '兩段訊息都讀出來了！紅色濾鏡下是「19:40」，藍色濾鏡下是「鐘塔」。',
                    gives: ['c3', 'c4'],
                    after: '卡片上的秘密已經讀出來了：19:40 · 鐘塔。',
                },
                {
                    id: 'stand', name: '譜架', x: 520, y: 214, w: 110, h: 150,
                    look: '樂譜停在《貓頭鷹之歌》這一頁 —— 那是聖楓小學的校歌。有人昨晚翻過它。',
                },
                {
                    id: 'cabinet', name: '置物櫃', x: 700, y: 170, w: 200, h: 190,
                    look: '直笛、鈴鼓和一堆樂譜。沒有雕像，也沒有能藏下雕像的空間。',
                },
                { id: 'toPrincipal', name: '校長室', x: 0, y: 150, w: 70, h: 300, exit: true, dir: 'left', goto: 'principal' },
                { id: 'toGuard', name: '警衛室', x: 890, y: 150, w: 70, h: 300, exit: true, dir: 'right', goto: 'guard' },
            ],
        },

        // ---------- 警衛室 ----------
        guard: {
            name: '警衛室',
            intro: '監視器、值班表、三個人的證詞都在這裡。',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 360, c: 0xdfe4e8 },
                { t: 'rect', x: 0, y: 336, w: 960, h: 24, c: 0xc8d0d6 },
                { t: 'rect', x: 0, y: 360, w: 960, h: 240, c: 0x9aa3aa },
                { t: 'line', pts: [0, 450, 960, 450], c: 0x8b949b, w: 3 },
                // 監視器牆
                { t: 'rect', x: 80, y: 84, w: 350, h: 200, c: 0x2f3438, r: 10 },
                { t: 'rect', x: 96, y: 100, w: 100, h: 78, c: 0x4a6b7a, r: 4 },
                { t: 'rect', x: 206, y: 100, w: 100, h: 78, c: 0x4a6b7a, r: 4 },
                { t: 'rect', x: 316, y: 100, w: 100, h: 78, c: 0x3c5866, r: 4 },
                { t: 'rect', x: 96, y: 190, w: 100, h: 78, c: 0x4a6b7a, r: 4 },
                { t: 'rect', x: 206, y: 190, w: 100, h: 78, c: 0x3c5866, r: 4 },
                { t: 'rect', x: 316, y: 190, w: 100, h: 78, c: 0x4a6b7a, r: 4 },
                { t: 'text', s: '19:40', x: 366, y: 139, size: 17, c: 0x9fe8c4, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'line', pts: [96, 120, 196, 120], c: 0x6d8d99, w: 1 },
                { t: 'line', pts: [206, 220, 306, 220], c: 0x6d8d99, w: 1 },
                // 值班表
                { t: 'rect', x: 470, y: 100, w: 190, h: 150, c: 0xb98d5f, r: 6 },
                { t: 'rect', x: 482, y: 112, w: 166, h: 126, c: 0xfdf6e6 },
                { t: 'text', s: '值班表', x: 565, y: 136, size: 17, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'text', s: '週三夜間', x: 565, y: 166, size: 14, c: 0x8a7b6d, ax: 0.5, ay: 0.5 },
                { t: 'text', s: '林警衛', x: 565, y: 196, size: 15, c: 0x8a7b6d, ax: 0.5, ay: 0.5 },
                // 鑰匙櫃
                { t: 'rect', x: 700, y: 100, w: 190, h: 210, c: 0x7f8b93, r: 6 },
                { t: 'rect', x: 714, y: 114, w: 162, h: 182, c: 0x94a0a8, r: 4 },
                { t: 'emoji', s: '🔑', x: 748, y: 150, size: 26 }, { t: 'emoji', s: '🔑', x: 796, y: 150, size: 26 },
                { t: 'emoji', s: '🔑', x: 844, y: 150, size: 26 }, { t: 'emoji', s: '🔑', x: 748, y: 210, size: 26 },
                { t: 'emoji', s: '🔑', x: 796, y: 210, size: 26 }, { t: 'emoji', s: '🔑', x: 844, y: 262, size: 26, rot: 0.3 },
                { t: 'circle', x: 884, y: 205, rad: 6, c: 0xe4d9cd },
                // 桌子
                { t: 'rect', x: 110, y: 398, w: 320, h: 26, c: 0x8a5c33, r: 6 },
                { t: 'rect', x: 126, y: 424, w: 14, h: 76, c: 0x734b28 },
                { t: 'rect', x: 400, y: 424, w: 14, h: 76, c: 0x734b28 },
                { t: 'emoji', s: '🔦', x: 156, y: 382, size: 30 },
                { t: 'emoji', s: '☕', x: 396, y: 384, size: 24 },
                { t: 'emoji', s: '📋', x: 300, y: 378, size: 46 },
                { t: 'emoji', s: '🪑', x: 560, y: 420, size: 60 },
            ],
            hotspots: [
                {
                    id: 'monitors', name: '監視器', x: 80, y: 84, w: 350, h: 200,
                    look: '倒帶到 19:40 —— 那個時間點，警衛室裡空無一人。走廊的鏡頭剛好被一塊布蓋住了。',
                    gives: 'c5',
                    after: '19:40 的警衛室，沒有人。',
                },
                {
                    id: 'duty', name: '值班表', x: 470, y: 100, w: 190, h: 150,
                    look: '昨晚的夜間值班：林警衛，一個人。備註欄寫著「白老師 19:30 來借急救箱」。',
                },
                {
                    id: 'clipboard', name: '三個人的證詞', x: 266, y: 352, w: 76, h: 62,
                    look: '板夾上記著三個人昨晚 19:40 的說法，還夾著幾張物證照片。',
                    puzzle: {
                        type: 'logic',
                        title: '🧩 邏輯矩陣 · 19:40 各在哪裡？',
                        rows: ['林警衛', '白老師', '阿宥'],
                        cols: ['警衛室', '美術教室', '鐘塔'],
                        hints: [
                            '監視器畫面顯示：19:40 的警衛室裡，沒有警衛的身影。',
                            '阿宥的鞋底沾著還沒乾的紅色顏料 —— 今天只有美術教室打翻了顏料。',
                            '白老師怕高，從來不上鐘塔；她說那時候剛好在警衛室借東西。',
                        ],
                        solution: { 林警衛: '鐘塔', 白老師: '警衛室', 阿宥: '美術教室' },
                    },
                    solvedText: '推理成立！19:40 那一刻，只有林警衛在鐘塔上。',
                    gives: 'c6',
                    after: '19:40：林警衛在鐘塔、白老師在警衛室、阿宥在美術教室。',
                },
                {
                    id: 'keycab', name: '鑰匙櫃', x: 700, y: 100, w: 190, h: 210,
                    look: '整櫃鑰匙都在原位，只有一把掛歪了 —— 標籤寫著「鐘塔」。你把它取下來。',
                    needsClue: 'c4', lockedClue: '一整櫃鑰匙，你還不知道該找哪一把。',
                    givesItem: 'towerkey',
                    after: '其他鑰匙都好好地掛著。',
                },
                { id: 'toMusic2', name: '音樂教室', x: 0, y: 150, w: 70, h: 300, exit: true, dir: 'left', goto: 'music' },
                {
                    id: 'toTower', name: '鐘塔', x: 890, y: 150, w: 70, h: 300,
                    exit: true, dir: 'right', goto: 'tower',
                    requires: 'towerkey', locked: '通往鐘塔的門鎖著，需要鐘塔的鑰匙。',
                },
            ],
        },

        // ---------- 鐘塔 ----------
        tower: {
            name: '鐘塔',
            intro: '樓梯又陡又暗，但上面好像有東西。',
            props: [
                { t: 'rect', x: 0, y: 0, w: 960, h: 600, c: 0x6f6a63 },
                { t: 'rect', x: 0, y: 0, w: 960, h: 60, c: 0x5d5951 },
                { t: 'rect', x: 0, y: 430, w: 960, h: 170, c: 0x565049 },
                { t: 'line', pts: [0, 430, 960, 430], c: 0x474239, w: 4 },
                { t: 'poly', pts: [120, 60, 300, 60, 470, 430, 200, 430], c: 0x7c766d, a: 0.5 },
                // 大鐘
                { t: 'circle', x: 470, y: 220, rad: 152, c: 0x8a7458 },
                { t: 'circle', x: 470, y: 220, rad: 136, c: 0xe8e0cf },
                { t: 'circle', x: 470, y: 220, rad: 120, c: 0xf3ece0 },
                { t: 'text', s: '12', x: 470, y: 128, size: 20, c: 0x5f4b34, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'text', s: '3', x: 560, y: 220, size: 20, c: 0x5f4b34, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'text', s: '6', x: 470, y: 312, size: 20, c: 0x5f4b34, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'text', s: '9', x: 380, y: 220, size: 20, c: 0x5f4b34, weight: '700', ax: 0.5, ay: 0.5 },
                { t: 'line', pts: [470, 220, 470, 148], c: 0x4a3f35, w: 8 },
                { t: 'line', pts: [470, 220, 534, 244], c: 0x4a3f35, w: 6 },
                { t: 'circle', x: 470, y: 220, rad: 9, c: 0x4a3f35 },
                { t: 'emoji', s: '⚙️', x: 250, y: 250, size: 70, a: 0.9 },
                { t: 'emoji', s: '⚙️', x: 316, y: 316, size: 48, a: 0.9 },
                // 木箱
                { t: 'rect', x: 700, y: 372, w: 190, h: 128, c: 0x9c7748, r: 6 },
                { t: 'rect', x: 700, y: 372, w: 190, h: 18, c: 0x8a6238, r: 4 },
                { t: 'line', pts: [700, 430, 890, 430], c: 0x7f5f38, w: 4 },
                { t: 'line', pts: [795, 390, 795, 500], c: 0x7f5f38, w: 4 },
                { t: 'emoji', s: '🦉', x: 795, y: 344, size: 52 },
                { t: 'emoji', s: '🕸️', x: 100, y: 100, size: 60, a: 0.5 },
                { t: 'emoji', s: '🪜', x: 60, y: 380, size: 90 },
            ],
            hotspots: [
                {
                    id: 'crate', name: '木箱', x: 700, y: 330, w: 190, h: 170,
                    look: '木箱打開了 —— 黃金貓頭鷹雕像好好地躺在裡面，用毯子仔細包著！旁邊還放著一張很舊的照片：一位年輕的工友，抱著剛雕好的貓頭鷹站在校門口。',
                    gives: 'c7',
                    after: '雕像安然無恙，連一點灰塵都沒沾到 —— 有人很珍惜它。',
                },
                {
                    id: 'clock', name: '大鐘', x: 334, y: 84, w: 272, h: 272,
                    look: '鐘的背面用粉筆寫了一行小字：「對不起，我只是想再多陪它幾天。」',
                },
                { id: 'toGuard2', name: '警衛室', x: 0, y: 150, w: 70, h: 300, exit: true, dir: 'left', goto: 'guard' },
            ],
        },
    },
};

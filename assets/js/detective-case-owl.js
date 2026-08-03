// ============================================================
// 偵探事件簿 · 案件：黃金貓頭鷹雕像失竊事件（聖楓小學）
// 這個檔案只放「資料」，不含任何 Pixi 程式碼。
// 由 assets/js/detective.js（引擎）讀取 window.DETECTIVE_CASE。
//
// 資產編號對照（美術替換時照這張表找）：
//   BG01  校長室背景          scenes.principal.props（牆面、書櫃、辦公桌、大門）
//   SP01  密碼紙條            objects：可拖移，可收進物品欄
//   SP02  數字保險箱          objects：固定，點擊開謎題
//   SP03  空白貓頭鷹底座      objects：固定，點擊查看
//   SP04  掛畫框              objects：固定，點擊開透鏡謎題
//   ITEM01A 解密盤外圈底座    objects：固定在桌上，等內圈裝回來
//   ITEM01B 解密盤內圈轉輪    objects：可拖移，拖到底座上組裝
//   ITEM02/03/04 紅/藍/紫透鏡 items：出現在下方物品欄
//   HIDDEN01/02 鏡像符號/手套壓印  藏在 SP04 的透鏡謎題裡（paintings）
//   UI01  告示板              scenes.deduction.objects：固定，開邏輯矩陣
//   UI02  鑑識報告紙條        scenes.deduction.objects：可拖移
//   UI03A~D 嫌疑人檔案卡      scenes.deduction.objects：固定，點擊看證詞
//   UI_BT01 指認真兇按鈕      右上角 HUD「🕵️ 指認犯人」
//   UI_BT02 偵探小貓提示      對話框左側的喵喵頭像（點頭像給提示，不在場景中）
//   FX01  紫色迷霧            props 裡的半透明紫色橢圓（純裝飾）
//   FX02  碎玻璃              props 裡展示座旁的碎片（純裝飾）
//
// 流程：
//   校長室｜SP03 看現場 → 撿 ITEM01B 裝回 ITEM01A → 解 SP01 凱撒密碼
//         → SP02 保險箱 385 → SP04 紫光照畫（兩個特徵）
//   推理室｜UI02 鑑識報告 → UI01 邏輯矩陣 → 指認真兇
//
// ★ 換正式美術：objects 的 art 座標以「物件左上角」為原點，
//   整段換成 [{ t:'img', src:'.../SP01.png', x:0, y:0, w, h }] 即可。
//   props / hotspots 座標以 960 × 600 畫面為準。
//
// 圖形 props 寫法：
//   { t:'rect', x,y,w,h,c, r?,a?,s?外框色,sw? } { t:'circle', x,y,rad,c }
//   { t:'ellipse', x,y,rx,ry,c }  { t:'poly', pts:[...],c }
//   { t:'line', pts:[...],c,w }   { t:'emoji', s,x,y,size,rot?,a? }
//   { t:'text', s,x,y,size,c,weight?,ax?,ay? }   { t:'img', src,x,y,w,h }
//
// objects / hotspots 互動欄位（兩邊通用）：
//   look / after / gives / givesItem / requires / locked /
//   needsClue / lockedClue / puzzle / solvedText / goto / exit / dir
// objects 專屬：
//   draggable（可拖）、icon（收進物品欄時的圖示）、
//   dropTarget / dropSay / dropGivesItem（拖到某物件上組合）、
//   doneItem / lookDone / artDone（拿到某道具後換說法與外觀）
// ============================================================

// 喵喵的防卡關提示：兩個場景共用同一條提示鏈（挑第一條還沒達成的講）
const OWL_HINTS = [
    { unless: 'c1', text: '🐱「先看看那個空空的展示座吧！有沒有被撬開的痕跡？」' },
    { unlessItem: 'dial', text: '🐱「桌上解密盤的底座少了內圈轉輪……我看到有個圓圓的東西滾到桌腳邊了！把它撿起來，拖回底座上裝好吧。」' },
    { unless: 'c2', text: '🐱「解密盤裝好了！點桌上那張寫著 KHOOR 的紙條，把字母『往後飛 3 格』轉回來看看～」' },
    { unlessItem: 'lensRed', text: '🐱「HELLO！那牆上保險箱的三個數字呢？往後飛幾格是第一個數字，然後 H 和 E 各是字母表第幾個字母？」' },
    { unless: 'c3', text: '🐱「把紅光透鏡和藍光透鏡拖在一起，會變成紫色！用紫光去照牆上那兩幅畫。第一幅出現的字是反過來的，要翻一下才讀得懂～」' },
    { unless: 'c5', text: '🐱「兩個特徵都有了！走右邊那扇門去推理室，牆上釘著一份鑑識報告，先看看它。」' },
    { unless: 'c6', text: '🐱「點推理室的告示板！把四個人的證詞跟物證一格一格對照，符合就打 ✓，不符合就打 ✗。」' },
    { text: '🐱「四項全中的只有一個人！點右上角的『指認犯人』說出你的推理吧！」' },
];

window.DETECTIVE_CASE = {
    title: '黃金貓頭鷹雕像失竊事件',
    brief:
        '聖楓小學的鎮校之寶「黃金貓頭鷹雕像」在昨晚不翼而飛！\n' +
        '校長室被翻得亂七八糟，桌上留著一張寫著怪字母的紙條，還有一個缺了零件的雙層轉盤。\n\n' +
        '🐱 助手小貓喵喵：「大偵探，我們快調查看看吧！\n' +
        '撿到的東西可以拖到下面的物品欄收好，隨時點一下查看；\n' +
        '卡關的時候，點對話框左邊的我就給你提示！」',
    startScene: 'principal',

    // UI_BT02 偵探小貓提示：喵喵住在對話框左側的頭像裡，點頭像依進度給提示
    hints: OWL_HINTS,

    // ---- 線索 ----
    clues: [
        { id: 'c1', icon: '🔍', name: '現場的矛盾', desc: '抽屜被翻開，玻璃罩卻被輕輕放在旁邊，門鎖也完好 —— 犯人有鑰匙，而且很珍惜雕像。' },
        { id: 'c2', icon: '🔤', name: '怪盜的密碼', desc: '凱撒密碼往回移 3 格：KHOOR ＝ HELLO。' },
        { id: 'c3', icon: '🧐', name: '畫作一的符號', desc: '紫光下浮現鏡像文字，翻正後讀得出來：犯人「配戴單片眼鏡」。' },
        { id: 'c4', icon: '🧤', name: '畫作二的壓印', desc: '手套圖騰的施力痕跡集中在左邊 —— 犯人用左手。' },
        { id: 'c5', icon: '📋', name: '鑑識報告', desc: '身高 170cm 以上，案發時間落在 18:30～19:00。' },
        { id: 'c6', icon: '🧩', name: '交叉比對結果', desc: '四名嫌疑人裡，只有一個人四項物證全部符合。' },
    ],

    // ---- 道具（出現在下方物品欄）----
    items: [
        { id: 'dial', icon: '🧭', name: '雙層解密盤', desc: '內圈轉輪已經裝回底座，轉動就能對照字母。去和紙條比對吧！' },
        { id: 'lensRed', icon: '🔴', name: '紅光透鏡', desc: '保險箱裡的第一片透鏡。單獨看只能看到一團紅。' },
        { id: 'lensBlue', icon: '🔵', name: '藍光透鏡', desc: '保險箱裡的第二片透鏡。單獨看只能看到一團藍。' },
        { id: 'lensPurple', icon: '🟣', name: '紫光透鏡', desc: '紅光＋藍光疊起來合成的透鏡。隱藏的圖案只在紫光下現形。' },
    ],

    // ---- 嫌疑人 ----
    suspects: [
        {
            id: 'zhang', emoji: '🧹', name: '張工友', role: '校工',
            testimony: '175cm／右撇子／18:30 已離校／鞋底沾泥土',
            wrong: '張工友是右撇子，跟現場的左手壓印對不上。鞋底的泥土只是他傍晚修剪花圃留下的 —— 那是個煙霧彈。',
        },
        {
            id: 'li', emoji: '👔', name: '李主任', role: '教務主任',
            testimony: '168cm（穿 5cm 厚底鞋）／左撇子／戴單片眼鏡／全程開會',
            wrong: '李主任確實是左撇子、也戴單片眼鏡，加上厚底鞋剛好超過 170cm —— 但 18:30 到 19:00 他全程在會議室，整間人都能作證。',
        },
        {
            id: 'chen', emoji: '📚', name: '陳老師', role: '美術老師',
            testimony: '172cm／雙手通用／戴單片眼鏡／18:40 離開會議室 15 分鐘',
            wrong: '',
        },
        {
            id: 'lin', emoji: '📖', name: '林館長', role: '圖書館館長',
            testimony: '180cm／左撇子／未戴眼鏡／全程在圖書館',
            wrong: '林館長沒有戴單片眼鏡，而且 18:45 圖書館的借書系統還留著他的操作紀錄。',
        },
    ],
    culprit: 'chen',
    solution:
        '真兇是美術老師 —— 陳老師！\n\n' +
        '① 紫光透鏡下的兩幅畫指出：犯人「配戴單片眼鏡」而且「用左手施力」。\n' +
        '② 鑑識報告把範圍縮到身高 170cm 以上、時間 18:30～19:00。\n' +
        '③ 四張嫌疑人卡交叉比對，只有陳老師四項全中 —— 她雙手通用，作案時戴的是沾了油墨的左手手套，' +
        '而且 18:40 從會議室離開了整整 15 分鐘。\n\n' +
        '雕像被她用毯子包好，藏進美術教室最上層的顏料箱裡，一點灰塵都沒沾到。\n\n' +
        '三十年前親手雕出黃金貓頭鷹的老工友，就是陳老師的爺爺。學校決定把雕像送去外縣市長期展覽，' +
        '她捨不得，才趁爺爺忌日的前一晚把它藏了起來 —— 也故意留下密碼紙條和兩片透鏡，' +
        '希望有人能找到它，順便聽見這座雕像的故事。\n\n' +
        '黃金貓頭鷹回到聖楓小學了，案件偵破！',

    // ============================================================
    scenes: {

        // ---------- 校長室（案發現場）----------
        principal: {
            name: '校長室 · 案發現場',
            intro: '🐱「大偵探！你看，校長室裡亂七八糟的，黃金貓頭鷹不見了！我們快調查看看吧！」',
            props: [
                // ---- BG01 牆與地板 ----
                { t: 'rect', x: 0, y: 0, w: 960, h: 372, c: 0xeae2d2 },
                { t: 'rect', x: 0, y: 318, w: 960, h: 54, c: 0xd8c8ae },
                { t: 'line', pts: [0, 318, 960, 318], c: 0xc4b092, w: 4 },
                { t: 'rect', x: 0, y: 372, w: 960, h: 228, c: 0xa9784f },
                { t: 'rect', x: 380, y: 424, w: 460, h: 176, c: 0x94493f, r: 14 },
                { t: 'rect', x: 398, y: 440, w: 424, h: 160, c: 0xa5564a, r: 10 },

                // ---- BG01 書櫃（被翻過，書歪七扭八）----
                { t: 'rect', x: 24, y: 92, w: 180, h: 238, c: 0x7d5334, r: 6 },
                { t: 'rect', x: 36, y: 104, w: 156, h: 64, c: 0x5f3e27 },
                { t: 'rect', x: 36, y: 178, w: 156, h: 64, c: 0x5f3e27 },
                { t: 'rect', x: 36, y: 252, w: 156, h: 66, c: 0x5f3e27 },
                { t: 'rect', x: 44, y: 112, w: 14, h: 50, c: 0xd66b5a }, { t: 'rect', x: 62, y: 116, w: 12, h: 46, c: 0xe0a04b },
                { t: 'rect', x: 78, y: 110, w: 16, h: 52, c: 0x6f9fc4 }, { t: 'rect', x: 98, y: 118, w: 12, h: 44, c: 0x8bb87e },
                { t: 'rect', x: 44, y: 188, w: 12, h: 50, c: 0x8bb87e }, { t: 'rect', x: 60, y: 192, w: 16, h: 46, c: 0xd66b5a },
                { t: 'rect', x: 124, y: 190, w: 12, h: 48, c: 0xe0a04b },
                { t: 'rect', x: 44, y: 264, w: 16, h: 50, c: 0x6f9fc4 }, { t: 'rect', x: 64, y: 268, w: 12, h: 46, c: 0x8bb87e },
                { t: 'emoji', s: '📕', x: 150, y: 214, size: 26, rot: 0.5 },
                { t: 'emoji', s: '📗', x: 168, y: 292, size: 24, rot: -0.4 },

                // ---- 玻璃罩（被好好地放在展示座旁）----
                { t: 'rect', x: 552, y: 288, w: 70, h: 70, c: 0xd7eef6, a: 0.75, r: 8 },
                { t: 'rect', x: 548, y: 352, w: 78, h: 10, c: 0xc7b28c, r: 4 },

                // ---- FX02 碎玻璃特效（純裝飾，增添緊張感）----
                { t: 'poly', pts: [540, 392, 552, 378, 558, 396], c: 0xd7eef6, a: 0.7 },
                { t: 'poly', pts: [566, 400, 576, 386, 584, 402], c: 0xd7eef6, a: 0.6 },
                { t: 'poly', pts: [548, 408, 560, 404, 554, 418], c: 0xd7eef6, a: 0.5 },
                { t: 'emoji', s: '✨', x: 588, y: 390, size: 18, a: 0.6 },

                // ---- FX01 紫色迷霧特效（純裝飾）----
                { t: 'ellipse', x: 130, y: 120, rx: 90, ry: 24, c: 0x8e4fd0, a: 0.08 },
                { t: 'ellipse', x: 820, y: 438, rx: 120, ry: 26, c: 0x8e4fd0, a: 0.1 },

                // ---- BG01 校長桌 ----
                { t: 'rect', x: 60, y: 376, w: 320, h: 24, c: 0x8a5c33, r: 6 },
                { t: 'rect', x: 78, y: 400, w: 14, h: 60, c: 0x734b28 },
                { t: 'rect', x: 348, y: 400, w: 14, h: 60, c: 0x734b28 },

                // ---- BG01 大門（通往推理室）----
                { t: 'rect', x: 874, y: 164, w: 72, h: 196, c: 0x7a4a2a, r: 6 },
                { t: 'rect', x: 884, y: 176, w: 52, h: 172, c: 0x8a5a36, r: 4 },
                { t: 'circle', x: 892, y: 262, rad: 5, c: 0xd9c9a8 },
                { t: 'text', s: '推理室', x: 910, y: 152, size: 13, c: 0x8a7b6d, weight: '700', ax: 0.5, ay: 0.5 },

                // ---- 校長 ----
                { t: 'emoji', s: '🧑‍🏫', x: 750, y: 402, size: 72 },

                // ---- 現場的凌亂 ----
                { t: 'emoji', s: '📄', x: 520, y: 418, size: 24, rot: 0.5 },
                { t: 'emoji', s: '📄', x: 596, y: 432, size: 22, rot: -0.4 },
                { t: 'emoji', s: '🗄️', x: 690, y: 424, size: 30, rot: 0.15 },
            ],

            // ============================================================
            // 可拖移／可點擊物件（一個資產編號 = 一個實體）
            // ============================================================
            objects: [
                {
                    // SP03 空白貓頭鷹底座
                    id: 'SP03', name: '展示座', x: 386, y: 200, w: 160, h: 168,
                    art: [
                        { t: 'rect', x: 12, y: 130, w: 136, h: 38, c: 0x5f4b34, r: 6 },
                        { t: 'rect', x: 38, y: 46, w: 84, h: 86, c: 0x7d6244 },
                        { t: 'rect', x: 6, y: 26, w: 148, h: 22, c: 0xc7b28c, r: 6 },
                        { t: 'rect', x: 42, y: 144, w: 76, h: 16, c: 0xc7b28c, r: 4 },
                        { t: 'text', s: '黃金貓頭鷹', x: 80, y: 152, size: 12, c: 0x5f4b34, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'ellipse', x: 80, y: 20, rx: 38, ry: 9, c: 0x000000, a: 0.12 },
                        { t: 'text', s: '？', x: 80, y: -12, size: 42, c: 0xb9a88c, weight: '700', ax: 0.5, ay: 0.5 },
                    ],
                    look: '雕像不見了。抽屜被翻得亂七八糟，可是玻璃罩被「輕輕地」放在旁邊，底座連一道刮痕都沒有，門鎖也完好無缺 —— 犯人有鑰匙，而且非常珍惜這座雕像。',
                    gives: 'c1',
                    after: '沒有破壞、沒有慌張。凌亂是裝出來的。',
                },
                {
                    // SP01 密碼紙條（可拖移、可收進物品欄）
                    id: 'SP01', name: '密碼紙條', x: 88, y: 344, w: 88, h: 58,
                    draggable: true, icon: '📜',
                    art: [
                        { t: 'rect', x: 0, y: 0, w: 88, h: 58, c: 0xfdf8ee, r: 3, s: 0xd8cdbc, sw: 2 },
                        { t: 'text', s: 'KHOOR', x: 44, y: 22, size: 16, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'text', s: '— 影子', x: 44, y: 44, size: 10, c: 0x8a7b6d, ax: 0.5, ay: 0.5 },
                    ],
                    requires: 'dial',
                    locked: '紙條上只有五個大寫字母：「KHOOR」，署名「影子」，下面用小字寫著「貓頭鷹喜歡往後飛 3 格」。\n要是有能對照字母的工具就好了 —— 桌上那個解密盤底座，好像缺了內圈轉輪。',
                    look: '紙條上寫著「KHOOR」。解密盤已經組好了，來對照字母吧！',
                    puzzle: {
                        type: 'caesar',
                        title: '🔤 怪盜的紙條 · 凱撒位移密碼',
                        cipher: 'KHOOR',
                        answer: 'HELLO',
                        note: '「貓頭鷹喜歡往後飛 3 格」',
                        okLabel: '✅ 就是這個！ ＝ HELLO',
                        hint: '提示：紙條說貓頭鷹「往後飛 3 格」，就是把每個字母往回推 3 位。\nK→H、H→E、O→L、O→L、R→O。',
                    },
                    solvedText: '密碼解開了！KHOOR ＝ HELLO。\n翻到紙條背面，還有一行更小的字：「把往後飛的格數擺第一，再接上 H 和 E 各是字母表的第幾個。」',
                    gives: 'c2',
                    after: '紙條的密碼已經解開：KHOOR ＝ HELLO，背面還提示了保險箱的三個數字。',
                },
                {
                    // ITEM01-A 解密盤外圈底座（固定在桌上）
                    id: 'ITEM01A', name: '解密盤底座', x: 178, y: 344, w: 56, h: 56,
                    art: [
                        { t: 'circle', x: 28, y: 28, rad: 28, c: 0xd9c9a8 },
                        { t: 'text', s: 'A', x: 28, y: 6, size: 9, c: 0x8a7b6d, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'circle', x: 28, y: 28, rad: 5, c: 0x8a7b6d },
                        { t: 'text', s: '？', x: 28, y: 30, size: 14, c: 0xa8977d, weight: '700', ax: 0.5, ay: 0.5 },
                    ],
                    doneItem: 'dial',
                    artDone: [
                        { t: 'circle', x: 28, y: 28, rad: 28, c: 0xd9c9a8 },
                        { t: 'text', s: 'A', x: 28, y: 6, size: 9, c: 0x8a7b6d, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'circle', x: 28, y: 28, rad: 19, c: 0xefe4cc, s: 0xf0b429, sw: 2 },
                        { t: 'text', s: 'A', x: 28, y: 14, size: 9, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'circle', x: 28, y: 28, rad: 4, c: 0x8a7b6d },
                    ],
                    look: '雙層解密盤的外圈底座固定在桌上，可是中間的內圈轉輪不見了，只剩一根小軸心。轉輪滾去哪了？',
                    lookDone: '雙層解密盤完好如初。轉動內圈就能對照字母 —— 去和紙條比對吧！',
                },
                {
                    // ITEM01-B 解密盤內圈轉輪（可拖移 → 拖到底座上組裝）
                    // 注意：可拖物件的初始位置要避開對話框（y > 446 會被面板擋住點不到）
                    id: 'ITEM01B', name: '內圈轉輪', x: 296, y: 400, w: 44, h: 44,
                    draggable: true, icon: '⚙️',
                    dropTarget: 'ITEM01A',
                    dropSay: '咔！內圈轉輪裝回了底座 —— 雙層解密盤完好如初，轉動就能對照字母了。',
                    dropGivesItem: 'dial',
                    art: [
                        { t: 'circle', x: 22, y: 22, rad: 19, c: 0xefe4cc, s: 0xf0b429, sw: 2 },
                        { t: 'text', s: 'A', x: 22, y: 9, size: 9, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'circle', x: 22, y: 22, rad: 4, c: 0x8a7b6d },
                    ],
                    look: '一個薄薄的圓盤，邊緣刻著一圈字母 —— 這是解密盤的內圈轉輪，滾到桌腳邊了。\n（把它拖到桌上的解密盤底座上裝回去）',
                },
                {
                    // SP02 數字保險箱
                    id: 'SP02', name: '保險箱', x: 232, y: 150, w: 120, h: 120,
                    art: [
                        { t: 'rect', x: 0, y: 0, w: 120, h: 120, c: 0x4e555d, r: 8 },
                        { t: 'rect', x: 10, y: 10, w: 100, h: 100, c: 0x6b737c, r: 6 },
                        { t: 'circle', x: 54, y: 60, rad: 25, c: 0xcfd6dc },
                        { t: 'circle', x: 54, y: 60, rad: 17, c: 0x9aa3aa },
                        { t: 'line', pts: [54, 60, 54, 40], c: 0x434a51, w: 4 },
                        { t: 'circle', x: 54, y: 60, rad: 5, c: 0x434a51 },
                        { t: 'rect', x: 86, y: 28, w: 18, h: 64, c: 0x3d444b, r: 4 },
                        { t: 'circle', x: 95, y: 40, rad: 3, c: 0x9fe8c4 },
                        { t: 'circle', x: 95, y: 52, rad: 3, c: 0x8a939b },
                        { t: 'circle', x: 95, y: 64, rad: 3, c: 0x8a939b },
                        { t: 'circle', x: 95, y: 76, rad: 3, c: 0x8a939b },
                        { t: 'emoji', s: '🔒', x: 54, y: 100, size: 18 },
                    ],
                    look: '牆上嵌著一個小保險箱，鍵盤要輸入三個數字。',
                    needsClue: 'c2', lockedClue: '保險箱要三個數字，可是你現在連從哪裡找數字都不知道。先看看桌上那張紙條。',
                    puzzle: {
                        type: 'safe',
                        title: '🔐 保險箱 · 三位數密碼',
                        answer: '385',
                        hint: '紙條背面：「把往後飛的格數擺第一，再接上 H 和 E 各是字母表的第幾個。」\nA=1、B=2、C=3……數數看 H 和 E 排第幾。',
                    },
                    solvedText: '喀噠 —— 保險箱開了！裡面躺著兩片薄薄的透鏡：一片紅、一片藍，已經收進下方物品欄。',
                    givesItem: ['lensRed', 'lensBlue'],
                    after: '保險箱已經打開，裡面的兩片透鏡都在物品欄裡了。',
                },
                {
                    // SP04 掛畫框（兩幅一組）
                    id: 'SP04', name: '掛畫框', x: 586, y: 84, w: 256, h: 144,
                    art: [
                        { t: 'rect', x: 0, y: 0, w: 120, h: 144, c: 0x8a5c33, r: 6 },
                        { t: 'rect', x: 11, y: 11, w: 98, h: 122, c: 0xf7f1e4 },
                        { t: 'line', pts: [18, 20, 100, 54], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [24, 106, 104, 32], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [16, 64, 94, 124], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [54, 16, 34, 126], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [14, 38, 106, 82], c: 0x2f5bd0, w: 2 },
                        { t: 'line', pts: [20, 124, 102, 16], c: 0x2f5bd0, w: 2 },
                        { t: 'line', pts: [82, 14, 74, 128], c: 0x2f5bd0, w: 2 },
                        { t: 'line', pts: [14, 88, 104, 106], c: 0x2f5bd0, w: 2 },
                        { t: 'rect', x: 136, y: 0, w: 120, h: 144, c: 0x8a5c33, r: 6 },
                        { t: 'rect', x: 147, y: 11, w: 98, h: 122, c: 0xf7f1e4 },
                        { t: 'line', pts: [152, 24, 240, 66], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [156, 118, 238, 22], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [194, 14, 176, 128], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [150, 82, 242, 48], c: 0xe23b3b, w: 2 },
                        { t: 'line', pts: [150, 46, 240, 122], c: 0x2f5bd0, w: 2 },
                        { t: 'line', pts: [158, 126, 234, 16], c: 0x2f5bd0, w: 2 },
                        { t: 'line', pts: [220, 14, 210, 128], c: 0x2f5bd0, w: 2 },
                        { t: 'line', pts: [150, 102, 242, 92], c: 0x2f5bd0, w: 2 },
                    ],
                    look: '兩幅畫上滿是雜亂的紅藍幾何線條，什麼也看不出來。也許透鏡派得上用場？',
                    requires: 'lensRed', locked: '畫上的線條亂成一團。你需要某種能濾掉顏色的東西。',
                    puzzle: {
                        type: 'lens',
                        title: '🔴🔵 光學疊影 · 合成紫光透鏡',
                        paintings: [
                            {
                                // HIDDEN01 鏡像倒置符號
                                name: '畫作一', icon: '🧐', reveal: '單片眼鏡',
                                mirrored: true, caption: '特徵①：配戴單片眼鏡',
                            },
                            {
                                // HIDDEN02 手套壓印圖騰
                                name: '畫作二', icon: '🧤', reveal: '左手施力',
                                mirrored: false, caption: '特徵②：左手施力（左撇子）',
                            },
                        ],
                        hint: '把紅光透鏡和藍光透鏡拖到重疊，就會合成紫光透鏡。',
                    },
                    solvedText: '兩個特徵都讀出來了！犯人「配戴單片眼鏡」，而且「用左手施力」。',
                    givesItem: 'lensPurple',
                    gives: ['c3', 'c4'],
                    after: '紫光下的兩幅畫已經說完它們知道的事了。',
                },
            ],

            hotspots: [
                {
                    id: 'shelf', name: '書櫃', x: 24, y: 92, w: 180, h: 238,
                    look: '一整排校史紀錄，有幾本被抽出來又胡亂塞回去。其中一本翻開著，寫著：黃金貓頭鷹雕像是三十年前由學校的老工友親手雕成的。',
                },
                {
                    id: 'principalNpc', name: '校長', x: 714, y: 362, w: 72, h: 84,
                    look: '「小偵探，拜託你了！下週雕像就要送去外縣市展覽，偏偏昨晚出了這種事……我實在不敢懷疑任何人。」',
                },
                {
                    id: 'toDeduction', name: '推理室', x: 878, y: 150, w: 78, h: 300,
                    exit: true, dir: 'right', goto: 'deduction',
                },
            ],
        },

        // ---------- 推理室 ----------
        deduction: {
            name: '推理室',
            intro: '🐱「這裡是我們的推理室！把蒐集到的證據和四個嫌疑人的證詞好好比對一下吧。」',
            props: [
                // 牆與地板
                { t: 'rect', x: 0, y: 0, w: 960, h: 368, c: 0x565066 },
                { t: 'rect', x: 0, y: 340, w: 960, h: 28, c: 0x474257 },
                { t: 'rect', x: 0, y: 368, w: 960, h: 232, c: 0x6e5b4c },
                { t: 'rect', x: 220, y: 430, w: 520, h: 150, c: 0x5a4a63, r: 14 },

                // ---- FX01 紫色迷霧特效（純裝飾）----
                { t: 'ellipse', x: 480, y: 80, rx: 260, ry: 38, c: 0x8e4fd0, a: 0.14 },
                { t: 'ellipse', x: 150, y: 320, rx: 140, ry: 30, c: 0x8e4fd0, a: 0.12 },
                { t: 'ellipse', x: 830, y: 240, rx: 120, ry: 28, c: 0x8e4fd0, a: 0.12 },

                // 氛圍小物
                { t: 'emoji', s: '🕯️', x: 70, y: 330, size: 40 },
                { t: 'emoji', s: '🗄️', x: 74, y: 420, size: 44 },
                { t: 'emoji', s: '🔍', x: 900, y: 90, size: 34, rot: -0.3, a: 0.8 },

                // 大門（回校長室）
                { t: 'rect', x: 14, y: 168, w: 72, h: 196, c: 0x7a4a2a, r: 6 },
                { t: 'rect', x: 24, y: 180, w: 52, h: 172, c: 0x8a5a36, r: 4 },
                { t: 'circle', x: 76, y: 262, rad: 5, c: 0xd9c9a8 },
                { t: 'text', s: '校長室', x: 50, y: 156, size: 13, c: 0xb9aecb, weight: '700', ax: 0.5, ay: 0.5 },

            ],

            objects: [
                {
                    // UI01 告示板 Pinboard（固定，開邏輯矩陣）
                    id: 'UI01', name: '告示板', x: 140, y: 88, w: 430, h: 248,
                    art: [
                        { t: 'rect', x: 0, y: 0, w: 430, h: 248, c: 0x9c7748, r: 10 },
                        { t: 'rect', x: 14, y: 14, w: 402, h: 220, c: 0x6f7d5e, r: 6 },
                        { t: 'text', s: '嫌疑人告示板', x: 215, y: 34, size: 16, c: 0xf2ecdf, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'rect', x: 28, y: 52, w: 84, h: 64, c: 0xfdf6e6, r: 4 },
                        { t: 'rect', x: 128, y: 52, w: 84, h: 64, c: 0xfdf6e6, r: 4 },
                        { t: 'rect', x: 228, y: 52, w: 84, h: 64, c: 0xfdf6e6, r: 4 },
                        { t: 'rect', x: 328, y: 52, w: 84, h: 64, c: 0xfdf6e6, r: 4 },
                        { t: 'emoji', s: '🧹', x: 70, y: 84, size: 24 },
                        { t: 'emoji', s: '👔', x: 170, y: 84, size: 24 },
                        { t: 'emoji', s: '📚', x: 270, y: 84, size: 24 },
                        { t: 'emoji', s: '📖', x: 370, y: 84, size: 24 },
                        { t: 'circle', x: 70, y: 52, rad: 4, c: 0xc0392b },
                        { t: 'circle', x: 170, y: 52, rad: 4, c: 0xc0392b },
                        { t: 'circle', x: 270, y: 52, rad: 4, c: 0xc0392b },
                        { t: 'circle', x: 370, y: 52, rad: 4, c: 0xc0392b },
                        { t: 'line', pts: [70, 116, 215, 176], c: 0xc0392b, w: 2 },
                        { t: 'line', pts: [170, 116, 215, 176], c: 0xc0392b, w: 2 },
                        { t: 'line', pts: [270, 116, 215, 176], c: 0xc0392b, w: 2 },
                        { t: 'line', pts: [370, 116, 215, 176], c: 0xc0392b, w: 2 },
                        { t: 'rect', x: 163, y: 160, w: 104, h: 44, c: 0xfdf6e6, r: 4 },
                        { t: 'text', s: '真兇是誰？', x: 215, y: 182, size: 13, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                    ],
                    look: '告示板上釘著四張嫌疑人照片，紅線全都指向中間的問號。把物證和證詞一一對照吧。',
                    needsClue: 'c5', lockedClue: '板子還空著。先看看釘在旁邊的那份鑑識報告，知道要比對哪些物證。',
                    puzzle: {
                        type: 'deduce',
                        title: '🧩 邏輯矩陣 · 四名嫌疑人交叉驗證',
                        box: { x: 60, y: 40, w: 840, h: 520 },
                        lead: '現場物證：戴單片眼鏡 · 左手施力 · 身高 170cm 以上 · 案發時間 18:30～19:00',
                        evidence: ['戴單片\n眼鏡', '左手\n施力', '身高\n>170cm', '18:30–19:00\n無不在場證明'],
                        suspects: [
                            { name: '張工友', testimony: '身高 175cm／右撇子。18:30 已離校。鞋底沾有泥土。' },
                            { name: '李主任', testimony: '身高 168cm（穿 5cm 厚底鞋）／左撇子／戴單片眼鏡。全程開會。' },
                            { name: '陳老師', testimony: '身高 172cm／雙手通用／戴單片眼鏡。18:40 離開會議室 15 分鐘，左手套沾有油墨。' },
                            { name: '林館長', testimony: '身高 180cm／左撇子／未戴眼鏡。全程在圖書館，18:45 有借書系統紀錄。' },
                        ],
                        // 每格填 ✓（符合）或 ✗（不符合）
                        truth: [
                            [false, false, true, false],
                            [true, true, true, false],
                            [true, true, true, true],
                            [false, true, true, false],
                        ],
                        hint: '厚底鞋也算進身高；「雙手通用」表示他左手也能施力；有人證或系統紀錄就是有不在場證明。',
                    },
                    solvedText: '交叉比對完成！四個人裡，只有一個人四項物證全部符合 —— 現在可以指認真兇了。',
                    gives: 'c6',
                    after: '比對結果已經釘在告示板上了。',
                },
                {
                    // UI02 現場物證報告紙條（可拖移）
                    id: 'UI02', name: '鑑識報告', x: 610, y: 104, w: 110, h: 84,
                    draggable: true, icon: '📋',
                    art: [
                        { t: 'circle', x: 55, y: 6, rad: 5, c: 0xc0392b },
                        { t: 'rect', x: 0, y: 10, w: 110, h: 74, c: 0xfdf6e6, r: 3, s: 0xd8cdbc, sw: 2 },
                        { t: 'text', s: '鑑識報告', x: 55, y: 26, size: 13, c: 0x4a3f35, weight: '700', ax: 0.5, ay: 0.5 },
                        { t: 'line', pts: [14, 42, 96, 42], c: 0xc8bba9, w: 2 },
                        { t: 'line', pts: [14, 54, 88, 54], c: 0xc8bba9, w: 2 },
                        { t: 'line', pts: [14, 66, 80, 66], c: 0xc8bba9, w: 2 },
                    ],
                    look: '現場鑑識報告：地毯上的鞋印推算身高 170cm 以上（也可能穿了厚底鞋）；展示座上的溫度殘留把案發時間框在 18:30～19:00 之間。',
                    gives: 'c5',
                    after: '身高 170cm 以上、時間 18:30～19:00。',
                },
                {
                    // UI03-A 張工友檔案卡（固定，點擊看證詞）
                    id: 'UI03A', name: '張工友檔案卡', x: 90, y: 356, w: 150, h: 88,
                    art: [
                        { t: 'circle', x: 75, y: 4, rad: 4, c: 0xc0392b },
                        { t: 'rect', x: 0, y: 8, w: 150, h: 80, c: 0xfffdf9, r: 10, s: 0xe4d9cd, sw: 2 },
                        { t: 'emoji', s: '🧹', x: 26, y: 38, size: 26 },
                        { t: 'text', s: '張工友', x: 50, y: 20, size: 15, c: 0x4a3f35, weight: '700' },
                        { t: 'text', s: '校工', x: 50, y: 42, size: 12, c: 0x8a7b6d },
                        { t: 'text', s: '點我看證詞', x: 50, y: 64, size: 11, c: 0x8a7b6d },
                    ],
                    look: '【張工友 · 校工】身高 175cm／右撇子。18:30 已離校。鞋底沾有泥土。',
                },
                {
                    // UI03-B 李主任檔案卡
                    id: 'UI03B', name: '李主任檔案卡', x: 270, y: 356, w: 150, h: 88,
                    art: [
                        { t: 'circle', x: 75, y: 4, rad: 4, c: 0xc0392b },
                        { t: 'rect', x: 0, y: 8, w: 150, h: 80, c: 0xfffdf9, r: 10, s: 0xe4d9cd, sw: 2 },
                        { t: 'emoji', s: '👔', x: 26, y: 38, size: 26 },
                        { t: 'text', s: '李主任', x: 50, y: 20, size: 15, c: 0x4a3f35, weight: '700' },
                        { t: 'text', s: '教務主任', x: 50, y: 42, size: 12, c: 0x8a7b6d },
                        { t: 'text', s: '點我看證詞', x: 50, y: 64, size: 11, c: 0x8a7b6d },
                    ],
                    look: '【李主任 · 教務主任】身高 168cm，但常穿 5cm 厚底鞋／左撇子／戴單片眼鏡。案發時段全程在會議室開會。',
                },
                {
                    // UI03-C 陳老師檔案卡（真兇）
                    id: 'UI03C', name: '陳老師檔案卡', x: 450, y: 356, w: 150, h: 88,
                    art: [
                        { t: 'circle', x: 75, y: 4, rad: 4, c: 0xc0392b },
                        { t: 'rect', x: 0, y: 8, w: 150, h: 80, c: 0xfffdf9, r: 10, s: 0xe4d9cd, sw: 2 },
                        { t: 'emoji', s: '📚', x: 26, y: 38, size: 26 },
                        { t: 'text', s: '陳老師', x: 50, y: 20, size: 15, c: 0x4a3f35, weight: '700' },
                        { t: 'text', s: '美術老師', x: 50, y: 42, size: 12, c: 0x8a7b6d },
                        { t: 'text', s: '點我看證詞', x: 50, y: 64, size: 11, c: 0x8a7b6d },
                    ],
                    look: '【陳老師 · 美術老師】身高 172cm／雙手通用／戴單片眼鏡。18:40 離開會議室 15 分鐘，左手套沾有油墨。',
                },
                {
                    // UI03-D 林館長檔案卡
                    id: 'UI03D', name: '林館長檔案卡', x: 630, y: 356, w: 150, h: 88,
                    art: [
                        { t: 'circle', x: 75, y: 4, rad: 4, c: 0xc0392b },
                        { t: 'rect', x: 0, y: 8, w: 150, h: 80, c: 0xfffdf9, r: 10, s: 0xe4d9cd, sw: 2 },
                        { t: 'emoji', s: '📖', x: 26, y: 38, size: 26 },
                        { t: 'text', s: '林館長', x: 50, y: 20, size: 15, c: 0x4a3f35, weight: '700' },
                        { t: 'text', s: '圖書館館長', x: 50, y: 42, size: 12, c: 0x8a7b6d },
                        { t: 'text', s: '點我看證詞', x: 50, y: 64, size: 11, c: 0x8a7b6d },
                    ],
                    look: '【林館長 · 圖書館館長】身高 180cm／左撇子／未戴眼鏡。全程在圖書館，18:45 有借書系統的操作紀錄。',
                },
            ],

            hotspots: [
                {
                    id: 'toPrincipal', name: '校長室', x: 4, y: 150, w: 72, h: 300,
                    exit: true, dir: 'left', goto: 'principal',
                },
            ],
        },
    },
};

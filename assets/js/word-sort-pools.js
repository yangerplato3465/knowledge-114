/* 字尾大分流 · 題庫
   ------------------------------------------------------------------
   本檔只負責「內容」，不含任何遊戲邏輯 —— 要換單字只要改這裡。
   在 word-sort.js 之前載入，對外提供全域 WORD_SORT_POOLS。

   每一題的欄位：
     stem    字根（英文），例如 'hope'
     stemZh  字根的中文意思，出題時顯示在單字上方
     suffix  正解字尾，只能是 'ful' 或 'less'
     def     合成後那個字的中文意思 —— 學生就是靠這句話判斷要接哪個字尾
     note    （可選）答完之後補充的小提醒，用在容易搞錯的字

   完整的單字不寫在資料裡，遊戲執行時才用 stem + suffix 算出來。
   這是刻意的：字串結合本來就是這個遊戲要教的東西，不能先寫好答案。

   ------------------------------------------------------------------
   收字的三條原則
   ------------------------------------------------------------------
   1. 只收「字根原樣 + 字尾」就成立的字。
      beautiful（beauty → beauti）這種拼字會變形的一律不收，
      否則 stem + suffix 算出來會是 beautyful，跟遊戲的前提自相矛盾。
      同理排除 plentiful（plenty）與 awful（awe 掉了 e，而且意思是「糟透了」
      不是「充滿敬畏」，字面拆解會誤導）。

   2. **字根本身必須是該年級已經認得的字。** 這是分年級的真正理由 ——
      如果學生連 law、motion 是什麼都不知道，lawless 就變成一次要猜兩個
      生字，字尾規則反而被埋掉了。三四年級那組裡每一個字根都是課堂上
      出現過的基本字（color、help、tooth、sugar⋯）。

   3. 中文解釋也要照年級寫。三四年級那組不用「絕望」「無價」這種詞，
      改寫成「一點希望都沒有的」這種講得出口的白話。

   ------------------------------------------------------------------
   刻意排除的字
   ------------------------------------------------------------------
   pain、joy、fear、view、do、play 這幾個字根**全部不收**。
   它們是紙本學習單上已經教過的例子，遊戲要練的是同一條規則套到新的字，
   不是把學習單上的答案再背一次。
   ------------------------------------------------------------------ */


/* ============================================================
   三四年級：字根都是最基本的生活單字
   ============================================================ */

/* 同一個字根兩種字尾都能接，意思剛好相反 —— 對比最強烈，最好教。 */
var WS_G34_PAIRS = [
    { stem: 'color', stemZh: '顏色', suffix: 'ful',  def: '顏色很多、很鮮豔的' },
    { stem: 'color', stemZh: '顏色', suffix: 'less', def: '沒有顏色的' },

    { stem: 'care',  stemZh: '小心', suffix: 'ful',  def: '很小心、很仔細的' },
    { stem: 'care',  stemZh: '小心', suffix: 'less', def: '不小心、迷迷糊糊的' },

    { stem: 'help',  stemZh: '幫忙', suffix: 'ful',  def: '很會幫忙的' },
    { stem: 'help',  stemZh: '幫忙', suffix: 'less', def: '沒有人幫得上忙的' },

    { stem: 'use',   stemZh: '用處', suffix: 'ful',  def: '很好用、派得上用場的' },
    { stem: 'use',   stemZh: '用處', suffix: 'less', def: '一點用都沒有的' },

    { stem: 'power', stemZh: '力量', suffix: 'ful',  def: '力量很大的' },
    { stem: 'power', stemZh: '力量', suffix: 'less', def: '一點力氣都使不出來的' },

    { stem: 'hope',  stemZh: '希望', suffix: 'ful',  def: '覺得很有希望的' },
    { stem: 'hope',  stemZh: '希望', suffix: 'less', def: '一點希望都沒有的' },

    { stem: 'rest',  stemZh: '休息', suffix: 'ful',  def: '讓人很放鬆的' },
    { stem: 'rest',  stemZh: '休息', suffix: 'less', def: '靜不下來、坐不住的' }
];

/* 只接其中一種字尾的字。這裡最重要的觀念是「不是每個組合都存在」——
   cheerless 幾乎沒人在用，toothful 更是完全不成立。 */
var WS_G34_SINGLES = [
    /* 只接 -ful */
    { stem: 'thank',  stemZh: '謝謝',      suffix: 'ful', def: '心裡很感謝的' },
    { stem: 'cheer',  stemZh: '歡呼、加油', suffix: 'ful', def: '笑咪咪、很開朗的' },
    { stem: 'peace',  stemZh: '和平',      suffix: 'ful', def: '很安靜、很平靜的' },
    { stem: 'wonder', stemZh: '驚奇',      suffix: 'ful', def: '很棒、很了不起的' },

    /* 只接 -less */
    { stem: 'tooth', stemZh: '牙齒', suffix: 'less', def: '沒有牙齒的' },
    { stem: 'seed',  stemZh: '種子', suffix: 'less', def: '沒有籽的（像無籽西瓜）' },
    { stem: 'home',  stemZh: '家',   suffix: 'less', def: '沒有家可以回的' },
    { stem: 'sleep', stemZh: '睡覺', suffix: 'less', def: '睡不著的' },
    { stem: 'cloud', stemZh: '雲',   suffix: 'less', def: '一朵雲都沒有的' },
    { stem: 'hair',  stemZh: '毛髮', suffix: 'less', def: '身上沒有毛的' },
    { stem: 'end',   stemZh: '結束', suffix: 'less', def: '一直都不會結束的' },
    { stem: 'count', stemZh: '數數', suffix: 'less', def: '多到數不完的' },
    { stem: 'sugar', stemZh: '糖',   suffix: 'less', def: '沒有加糖的' },
    { stem: 'name',  stemZh: '名字', suffix: 'less', def: '沒有名字的' },
    { stem: 'wire',  stemZh: '電線', suffix: 'less', def: '不用接電線的' },
    { stem: 'sound', stemZh: '聲音', suffix: 'less', def: '一點聲音都沒有的' },
    { stem: 'taste', stemZh: '味道', suffix: 'less', def: '沒有味道的' }
];


/* ============================================================
   五六年級：字根本身開始需要一點程度
   ============================================================ */

var WS_G56_PAIRS = [
    { stem: 'harm',    stemZh: '傷害', suffix: 'ful',  def: '會造成傷害的' },
    { stem: 'harm',    stemZh: '傷害', suffix: 'less', def: '不會傷人的、無害的' },

    { stem: 'meaning', stemZh: '意義', suffix: 'ful',  def: '很有意義、很值得的' },
    { stem: 'meaning', stemZh: '意義', suffix: 'less', def: '沒有意義的' },

    { stem: 'thought', stemZh: '想法', suffix: 'ful',  def: '會替別人著想、很體貼的' },
    { stem: 'thought', stemZh: '想法', suffix: 'less', def: '不替別人想、不體貼的' },

    { stem: 'mind',    stemZh: '心思', suffix: 'ful',  def: '很專注、很留心的' },
    { stem: 'mind',    stemZh: '心思', suffix: 'less', def: '不經大腦、想都不想的' },

    { stem: 'law',     stemZh: '法律', suffix: 'ful',  def: '合法的、守規矩的' },
    { stem: 'law',     stemZh: '法律', suffix: 'less', def: '無法無天的' },

    { stem: 'shame',   stemZh: '羞恥', suffix: 'ful',  def: '很丟臉、很可恥的' },
    { stem: 'shame',   stemZh: '羞恥', suffix: 'less', def: '不知羞恥、臉皮很厚的' }
];

var WS_G56_SINGLES = [
    /* 只接 -ful */
    { stem: 'success', stemZh: '成功', suffix: 'ful', def: '成功的' },
    { stem: 'truth',   stemZh: '事實', suffix: 'ful', def: '誠實、說實話的' },
    { stem: 'forget',  stemZh: '忘記', suffix: 'ful', def: '很健忘、老是忘東忘西的' },
    { stem: 'respect', stemZh: '尊敬', suffix: 'ful', def: '很有禮貌、很尊重別人的' },
    { stem: 'delight', stemZh: '喜悅', suffix: 'ful', def: '令人很愉快的' },
    { stem: 'watch',   stemZh: '注視', suffix: 'ful', def: '很警覺、盯得很緊的' },
    { stem: 'skill',   stemZh: '技術', suffix: 'ful', def: '技術很好、很熟練的' },
    { stem: 'faith',   stemZh: '信任', suffix: 'ful', def: '忠實可靠的' },
    { stem: 'hurt',    stemZh: '傷害', suffix: 'ful', def: '話說得很傷人的' },
    { stem: 'doubt',   stemZh: '懷疑', suffix: 'ful', def: '不太確定、有點懷疑的' },

    /* 只接 -less */
    { stem: 'heart',  stemZh: '心',   suffix: 'less', def: '冷血無情的' },
    { stem: 'speech', stemZh: '說話', suffix: 'less', def: '驚訝到說不出話的' },
    { stem: 'breath', stemZh: '呼吸', suffix: 'less', def: '喘不過氣的' },
    { stem: 'spot',   stemZh: '污點', suffix: 'less', def: '一塵不染、非常乾淨的' },
    { stem: 'tire',   stemZh: '疲累', suffix: 'less', def: '不知疲倦、一直努力的' },
    { stem: 'worth',  stemZh: '價值', suffix: 'less', def: '一文不值的' },
    { stem: 'motion', stemZh: '動作', suffix: 'less', def: '一動也不動的' },
    { stem: 'stain',  stemZh: '污漬', suffix: 'less', def: '不會生鏽的（不鏽鋼就是這個字）' },
    { stem: 'cord',   stemZh: '電線', suffix: 'less', def: '不用插線的（無線耳機那種）' },
    { stem: 'limit',  stemZh: '限制', suffix: 'less', def: '沒有極限的' },
    { stem: 'thank',  stemZh: '謝謝', suffix: 'less', def: '做了也沒人感謝、吃力不討好的' },
    {
        stem: 'price', stemZh: '價格', suffix: 'less', def: '珍貴到買不到的',
        note: 'priceless 不是「沒價值」，剛好相反 —— 珍貴到沒辦法標價。' +
              '字面拆開來會誤會的字，要整個記起來。'
    }
];


/* ============================================================
   組出三個題庫。key 會直接變成開始畫面上的按鈕文字。
   ============================================================ */

var WS_G34 = WS_G34_PAIRS.concat(WS_G34_SINGLES);   /* 31 字 */
var WS_G56 = WS_G56_PAIRS.concat(WS_G56_SINGLES);   /* 34 字 */

window.WORD_SORT_POOLS = {
    '三四年級': WS_G34,
    '五六年級': WS_G56,
    '全部混合': WS_G34.concat(WS_G56)               /* 65 字 */
};

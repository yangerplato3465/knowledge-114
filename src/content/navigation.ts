export interface Activity { path: string; title: string; description: string }
export interface ActivityCategory { id: string; title: string; starName: string; description: string; items: Activity[] }

// 僅活動頁使用；首頁不載入清單或教材／遊戲模組。
export const categories: ActivityCategory[] = [
  { id: 'science', title: '科學小實驗', starName: '觀察座', description: '從生活中的小問題出發，一起觀察、動手找答案。', items: [
    { path: 'water-acid-base', title: '水與酸鹼的微觀奧秘', description: '觀察水中的離子，認識酸鹼性與 pH、pOH 的關係。' },
    { path: 'magic-ink', title: '神奇的墨水！原子筆的科學', description: '看看原子筆如何寫出字，再透過實驗探索墨水的變化。' },
  ] },
  { id: 'games', title: '互動學習', starName: '冒險座', description: '讓練習變成一場冒險。', items: [
    { path: 'math-rpg', title: '數學勇者', description: '與黎薇並肩作戰，完成五關數學挑戰，迎戰奪輝王赫恩。試玩版。' },
    { path: 'magic-workshop', title: '魔法工坊', description: '補滿、倒空、互倒，量出剛剛好的魔力液，完成居民的五份委託。' },
    { path: 'side-scroller', title: '魔法禁書庫', description: '陪米洛切換紅藍燈、穿越浮空小徑，尋找書頁深處的傳送出口。' },
  ] },
  { id: 'detective', title: '偵探事件簿', starName: '線索座', description: '和同學一起調查現場、比對線索，找出事情的真相。', items: [
    { path: 'detective-golden-owl', title: '黃金貓頭鷹雕像失竊事件', description: '解讀密碼、比對證詞，找回校園裡失蹤的雕像。請使用老師提供的驗證碼。' },
    { path: 'detective-new', title: '新偵探遊戲', description: '新的調查場景準備中，案件與謎題尚未開放。' },
  ] },
];

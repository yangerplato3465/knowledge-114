export interface Activity { path: string; title: string; description: string }
export interface ActivityCategory { id: string; title: string; description: string; items: Activity[] }

// 僅活動頁使用；首頁不載入清單或教材／遊戲模組。
export const categories: ActivityCategory[] = [
  { id: 'science', title: '科學小實驗', description: '從日常生活出發，一起找出背後的科學。', items: [
    { path: 'water-acid-base', title: '水與酸鹼的微觀奧秘', description: '探索離子行為，認識 pH 與 pOH。' },
    { path: 'magic-ink', title: '神奇的墨水！原子筆的科學', description: '觀察墨水的秘密，動手做變色實驗。' },
  ] },
  { id: 'games', title: '互動學習', description: '讓練習變成一場冒險。', items: [
    { path: 'math-rpg', title: '數學勇者', description: '五關冒險試玩版 · 答題出劍，三選一成長。' },
  ] },
  { id: 'detective', title: '偵探事件簿', description: '跟著老師進入案件，觀察線索、一起推理。', items: [
    { path: 'detective-golden-owl', title: '黃金貓頭鷹雕像失竊事件', description: '校園失竊案 · 密碼與邏輯推理' },
    { path: 'detective-ai-museum', title: 'AI 展覽館的消失記憶', description: '建置中 · 觀察比對與審訊推理' },
  ] },
];

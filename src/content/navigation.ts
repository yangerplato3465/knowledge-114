export interface Activity { path: string; title: string; description: string }
interface Category {
  id: string; title: string; description: string; items?: Activity[];
  groups?: { id: string; title: string; items: Activity[] }[];
}
// 與原首頁入口等價；只保存資料，不載入任何遊戲模組。
export const categories: Category[] = [
  { id: 'learning', title: '教學內容', description: '互動課程與闖關遊戲', groups: [
    { id: 'science', title: '科學小實驗', items: [
      { path: 'water-acid-base', title: '水與酸鹼的微觀奧秘', description: '探索離子行為與 pH / pOH 的平衡美學' },
      { path: 'magic-ink', title: '神奇的墨水！原子筆的科學', description: '消失墨水課後實驗' },
    ] },
    { id: 'games', title: '互動學習小遊戲', items: [
      { path: 'math-rpg', title: '數學勇者', description: 'RPG 闖關問答 · 答對攻擊怪獸，答錯就會受傷' },
      { path: 'turbo-museum', title: '極速博物館', description: '派學者修復古物搶時間 · 該加人？還是改流程？每局都不一樣' },
      { path: 'word-sort', title: '字尾大分流', description: '英文 -ful / -less · 看中文意思把單字甩到正確的那一邊，觸控大螢幕玩最順' },
      { path: 'quick-quiz', title: '快問快答', description: '是非題挑戰 · 可自訂每題秒數，時間到公布答案' },
    ] },
  ] },
  { id: 'detective', title: '偵探事件簿', description: '點擊尋找線索 · 推理破案', items: [
    { path: 'detective-golden-owl', title: '黃金貓頭鷹雕像失竊事件', description: '校園失竊案 · 密碼與邏輯推理' },
    { path: 'detective-ai-museum', title: 'AI 展覽館的消失記憶', description: '建置中 · 觀察比對與審訊推理' },
  ] },
  { id: 'materials', title: '素材', description: '遊戲素材的下載與上傳', items: [
    { path: 'downloads', title: '素材下載', description: '下載遊戲素材與教學檔案' },
    { path: 'upload', title: '上傳素材', description: '老師專用 · 需要 GitHub 權杖' },
  ] },
  { id: 'class', title: '班級 RPG', description: '班級角色養成 · 經驗值與金幣管理', items: [
    { path: 'class-rpg', title: '班級冒險者管理', description: '老師專用 · 建立班級、新增學生角色' },
  ] },
];

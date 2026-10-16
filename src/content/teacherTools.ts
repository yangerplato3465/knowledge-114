import type { Activity } from './navigation';

export const teacherTools: Activity[] = [
  { path: 'upload', title: '上傳素材', description: '上傳與管理公開下載的教材、素材。請備妥 GitHub 存取權杖。' },
  { path: 'class-rpg', title: '班級 RPG', description: '整理學生名冊、發放課堂獎勵，記錄角色成長。請使用老師帳號登入。' },
  { path: 'detective-admin', title: '偵探驗證碼管理', description: '為各組產生案件驗證碼，查看期限與遊玩進度。請使用管理者帳號登入。' },
];

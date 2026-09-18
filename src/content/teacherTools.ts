import type { Activity } from './navigation';

export const teacherTools: Activity[] = [
  { path: 'upload', title: '上傳素材', description: '新增與管理學生可下載的檔案。需要 GitHub 權杖。' },
  { path: 'class-rpg', title: '班級 RPG', description: '管理班級、學生角色與課堂獎勵。需要老師帳號。' },
  { path: 'detective-admin', title: '偵探驗證碼管理', description: '產生與管理課堂案件驗證碼。需要管理者帳號。' },
];

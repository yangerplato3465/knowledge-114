// Both the header and the ending screen use this exit path before navigation.
export async function leaveCase(navigate: () => void) {
  // 本機試玩明確不存檔，離開時不需要嘗試寫入或顯示存檔失敗確認。
  if (window.DETECTIVE_SESSION?.codeId === null) { navigate(); return; }
  let saved = !window.DETECTIVE_FLUSH;
  try {
    if (window.DETECTIVE_FLUSH) saved = await window.DETECTIVE_FLUSH(true);
  } catch { saved = false; }
  if (!saved && !window.confirm('目前的進度沒有存成功。現在離開可能會遺失這次的進度，仍要離開嗎？')) return;
  navigate();
}

declare global { interface Window {
  DETECTIVE_FLUSH?: (force?: boolean) => Promise<boolean>;
  DETECTIVE_SESSION?: { codeId?: string | null };
} }

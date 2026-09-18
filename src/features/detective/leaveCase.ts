// Both the header and the ending screen use this exit path before navigation.
export async function leaveCase(navigate: () => void) {
  let saved = !window.DETECTIVE_FLUSH;
  try {
    if (window.DETECTIVE_FLUSH) saved = await window.DETECTIVE_FLUSH(true);
  } catch { saved = false; }
  if (!saved && !window.confirm('目前的進度沒有存成功。現在離開可能會遺失這次的進度，仍要離開嗎？')) return;
  navigate();
}

declare global { interface Window { DETECTIVE_FLUSH?: (force?: boolean) => Promise<boolean> } }

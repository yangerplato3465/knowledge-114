# 數學勇者功能遷移收尾 · 2026-09-17

## 實作範圍

新版入口為 `/next/math-rpg.html`，由新版學習主頁導入；原 `/pages/math-rpg.html` 與根首頁保持不動。題庫、傷害、護甲／護盾、連擊／爆擊、流血／迷霧、魔王狂暴、加權強化與六關結果沿用已驗證純模型。沒有更改 Firebase、學生資料或其他遊戲。

React 管理題庫、設定、HUD、作答鎖、選卡、結果與對話框；BattleSession 管理可取消的回合排程；Pixi imperative renderer 管理兩個 canvas、角色分鏡、劍氣、命中／回復／流血提示及勝利彩花。音樂預設關閉且 preload=none；全螢幕不支援或被拒绝時提供文字提示。

說明和離場確認暫停剩餘答題／回合／選卡時間與角色時計。退出清理 session、倒數、音訊與 renderer。動態效果偏好會取消角色位移、劍氣與裝飾粒子，不影響必要 DOM 血量或答案。貼圖載入失敗或 `?nopixi` 可用 DOM 角色繼續遊玩。

## 驗證

- `pnpm test`：21 項 Node、92 項 Vitest，共 113 項通過。含既有新舊規則／逐拍模擬、六關 React StrictMode、敗北重玩、超時、暫停恢復、重複選卡、非同步 mount 取消、雙實例隔離、ticker 清理與 reduced motion。
- `/knowledge-114/` production build：TypeScript、資源引用與舊站逐檔 byte 檢查通過。數學勇者專用 JS 約 33.99 KB，gzip 約 12.75 KB；不含共享 React 及按需載入的 vendor／圖片。
- 實際本地瀏覽器：390px 寬的動態除法題庫完成六關、五次選卡、17 次手動計算後作答，顯示勝利；console error 0。期間不是注入遊戲狀態或跳過回合。
- 實際檢查勝利重玩、玩法對話框與暫停、音樂開關、全螢幕成功狀態、離場確認。離場後 canvas 數量為 0，開始按鈕重新取得焦點；暫時 viewport 已還原。
- Pixi sprite 在桌面及 390px 畫面可見，六張背景隨關卡更新。遊戲不依賴 canvas 點擊，鍵盤可操作 DOM 答案。

## 邊界與回退

這是功能完整的新 renderer，不是舊 CSS／濾鏡／粒子分佈的逐像素複製。桌面瀏覽器 viewport 檢查不等於真實手機或教室觸控硬體驗收；未做同條件 FPS、GPU 記憶體、Lighthouse、CWV 或正式 Pages smoke test。十三張貼圖由頁面級 Assets cache 共用，沒有宣稱卸載時清空全部 GPU 全域資源。

本次未 commit、push 或部署。若新版有設備相容問題，可使用頁內舊版連結，或將新版首頁 math-rpg 路徑退回 pages。不能因此標記其他遊戲或整站架構遷移完成。

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static educational website (學習主頁 / "Learning Hub") of interactive lessons for elementary students, authored in Traditional Chinese (`zh-Hant`) by "Anita 老師". No build system, no dependencies, no package manager — plain HTML/CSS/JS served as static files. External resources (Google Fonts, Font Awesome) load from CDNs.

## Running & Deploying

- **Run locally:** open `index.html` directly in a browser, or serve the root with any static server (e.g. `python -m http.server`). Use a server rather than `file://` when a page uses `fetch` — the hub loads `config.json` this way.
- **Deploy:** static hosting from the repo root (GitHub: `yangerplato3465/knowledge-114`). There is no CI, lint, or test suite; verification is manual in the browser.
- **Versioning:** bump `config.json` (`version` + `lastUpdated`) when releasing. The hub reads it at runtime and renders `v{version} · {lastUpdated}`; git tags/commits mirror the same version (e.g. `1.1.0`).

## Structure & Architecture

`index.html` is the hub: a self-contained page (inline `<style>`) whose `.page-btn` links point into `pages/`. Adding a lesson = create `pages/<name>.html` and add a matching `.page-btn` anchor in the hub. Each lesson page also links back to `../index.html`.

Each lesson is largely **independent** — there is no shared component framework, and the same helper name (e.g. `checkAnswer`) is re-implemented per page with different signatures. Do not assume logic is shared across pages unless it comes from a linked `assets/js` file. Asset conventions vary by page:

- **`pages/water-acid-base.html`** — the only page using the shared `assets/css/styles.css` and `assets/js/script.js`. A chemistry beaker simulation: global state (`naohCount`, `hasIndicator`, `temperature`) drives DOM/SVG ion animations. Animation restarts use the `void el.offsetWidth` reflow trick; visuals are re-derived in `updateBeakerVisuals()`.
- **`pages/math-rpg.html`** — an RPG battle quiz. Loads **`assets/js/math-rpg-pools.js` before `assets/js/math-rpg.js`** (order matters): pools defines the global `QUESTION_POOLS`, which the game reads. Flow: select grade → select pool → how-to → battle.

### math-rpg specifics

- `QUESTION_POOLS` is `{ 年級: { 題庫名稱: pool } }`. A pool is **either** a static array of `{ q, a: [...], correct }` **or** a generator function returning one such object (e.g. `generateDivideQuestion`). `loadQuestion()` branches on `typeof activePool === 'function'`. Add a topic by adding a key to `POOLS_G5`/`POOLS_G6`; the pool-select screen renders keys automatically.
- Game balance lives in tunable module-level constants in `math-rpg.js`: `ENEMY_HP_TABLE`, `HIT_TO_PLAYER_TABLE`, `HIT_TO_ENEMY`, `ROUND_TIME`, `PLAYER_MAX`, and the weighted `UPGRADES` list (`weight` controls draw odds; `apply()` mutates the run's stats). `beginBattle()` resets all upgradeable values to their initial state.

### class-rpg specifics

- **`pages/class-rpg.html`** — teacher-only class/student admin backed by Firebase (Auth + Firestore, ES-module CDN imports in `assets/js/class-rpg.js`). Its 進入遊戲 button opens **`pages/class-rpg-game.html`**, the actual game, rendered with **Pixi.js v8** (ESM from jsdelivr, pinned `8.6.6`) in `assets/js/class-rpg-game.js`. Scene layers: `world` (map/objects) and `hud` (fixed UI).
- **Character sprite sheet** (`assets/images/char/char1.webp`, Mana Seed Character Base): 512×512, an 8×8 grid of 64×64 cells. Direction row order within each block is **down, up, right, left**. Frame map (from the Mana Seed "animations, page 1" guide):
  - Top block, rows 0–3: `stand` = col 0 (cols 1–2 `push`, 3–4 `pull`, 5–7 `jump` — not yet used).
  - Bottom block, rows 4–7: `walk` = cols 0–5 (6-frame cycle); `run` reuses the walk cycle with frames 3 & 6 replaced by cols 6–7, i.e. column sequence `0, 1, 6, 3, 4, 7`.
  - Frames are sliced as `Texture` rectangles into the `ANIMS[direction][state]` lookup in `class-rpg-game.js`; one `AnimatedSprite` swaps its `textures` array on state/facing change. Keep `scaleMode = 'nearest'` for pixel art.

### detective specifics

**Writing a new case? Read `docs/detective-authoring.md` first.** It carries the design and layout traps that cost real debugging on the first case — information that must stay re-readable, the dialogue box's hard 70px ceiling, puzzle feedback that leaks answers, draggable hit-box and stacking pitfalls. The field-by-field reference lives in the header comment of `assets/js/detective-case-owl.js`; the bullets below are the architecture invariants.

- **`pages/detective.html` does not load the engine directly.** It loads `assets/js/detective-gate.js`, which only `import()`s `detective.js` after an unlock code checks out. Anything that assumes the engine boots on page load is wrong — set `localStorage['detective.dev.owl'] = '1'` to bypass the gate while developing (no code check, no progress read or write; the top bar marks it 開發模式 in the warning colour). **A stored session alone is not a bypass**: `readSession()` requires a `codeId`, because accepting a bare `{"exp":…}` meant any leftover localStorage entry let anyone play without a code.
- Unlock codes are generated in **`pages/detective-admin.html`** (Firebase Auth, owner-only) and verified against Firestore. `assets/js/detective-code.js` holds the derivation shared by both sides — the Firestore document ID is `PBKDF2(gameId + ':' + normalizedCode)`, so **changing `PEPPER`, the iteration count, or the normalizer invalidates every code already issued**.
- Enforcement lives in `pages/firestore.rules.txt`, not in the client: `allow list: if isOwner()` is what stops anyone from dumping the code collection, and expiry is compared against `request.time` (server clock). `isOwner()` is an email allowlist that must be edited before the rules are published.
- Adding a case = add an entry to `DETECTIVE_GAMES` in `detective-code.js` and set `window.DETECTIVE_GAME_ID` in the new page; the admin dropdown and code prefix follow automatically.
- **One unlock code = one group's save slot.** The code's `unlockCodes` doc carries a `progress` map written by the game itself; the teacher hands a different code to each group and reads their progress in the admin list. The gate stores `{exp, codeId, label}` in `localStorage`, fetches `progress` *before* importing the engine, and exposes it as `window.DETECTIVE_SESSION`. The dev bypass above still works but has no `codeId`, so nothing is saved or restored.
- Save/restore lives in the `進度存檔` block of `detective.js`. `snapshotState()` must cover **`visitedScenes`, `dropPlayed` and `objPositions` as well as `state`** — those three live outside `state` and drive intro text, drop animations and object placement. Restoring is cheap because `renderScene()` is a pure function of `CASE + state`: assign the fields, call it, done. `restoreProgress()` treats the save as untrusted (students can write it) and drops unknown ids rather than throwing; bump `SAVE_VERSION` when the shape changes.
- **If the progress fetch fails, `saveBlocked` turns writes off for that session.** Never remove this: booting a fresh game after a failed read would overwrite a good save with a blank one 1.2s later. The same reasoning is why both top-bar exit buttons await `window.DETECTIVE_FLUSH(true)` and refuse to leave on a failed write unless the teacher confirms. A failed fetch is only treated as "code is dead" (forget the group, bounce back to the gate) when the client is online — offline still boots, just without recording.
- One classroom TV runs several groups in turn, so verified codes are also appended to `localStorage['detective.groups.<gameId>']` (codeId + label + expiry, never the plaintext code). They appear both as one-click buttons on the gate and in the in-game `#groupSwitch` dropdown, so switching groups never requires retyping a code — only 新增組別 goes back to the gate. Anyone at that device can enter any group listed there until the codes expire; 清除這台記住的組別 on the gate is the escape hatch.
- **Every group switch goes through `location.reload()`**, never an in-place swap: the engine builds its state once at module-evaluation time, so re-pointing it at another save would mean resetting the whole game by hand.
- **The engine only preloads one scene's images before booting** (`preloadImages(CASE, bootScene)`), the rest stream in behind it. Anything that renders a scene outside `transitionTo()` — which guards with `ensureSceneLoaded()` — must await that itself, or it paints a scene with no background. The restore path picks `bootScene` from the save and still re-checks at the bottom of the file; both are load-bearing.
- The rules let unauthenticated clients write `progress`/`progressAt` only, capped at `progress.size() <= 28` top-level keys — adding save fields past that silently breaks saving.

## Conventions

- UI text, comments, and question content are in Traditional Chinese — match this when editing.
- Shared visual language: warm oat/pudding palette (`#f0e6df` background, `#fffdf9` cards, 32px radii), `Fredoka` + `Noto Sans TC` fonts, Font Awesome icons. Reuse these tokens for new pages.

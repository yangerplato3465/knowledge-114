# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React + Vite + TypeScript educational website. All HTML entries are React roots. The root index.html is the production homepage; pages/ contains React Vite entry documents. There is no next/ preview or legacy page fallback. See README.md and docs/TECH_ARCHITECTURE.md for current commands and boundaries.

## Design docs

`docs/` carries the design bible. Start at **[docs/GAME_BIBLE.md](docs/GAME_BIBLE.md)**, which indexes
GAMEPLAY / WORLD / CHARACTERS / COMBAT / SKILLS / ITEMS / ENEMIES / UI / ART_STYLE /
TECH_ARCHITECTURE / DECISIONS / TODO, plus the three deep-dive docs
(`detective-authoring.md`, `math-rpg-balance.md`, `math-rpg-pixi.md`).

Division of labour: **this file states the invariants** (what must not be changed and why it breaks);
**`docs/` explains what the thing currently is and how it got that way.** When a design decision is
reversed, update `docs/DECISIONS.md` rather than deleting the reasoning.

## Running & Deploying

Use pnpm dev, pnpm test, pnpm build and pnpm preview. Deploy dist only. Do not serve source HTML with a plain static server. pages/firestore.rules.txt is not deployed as Firebase rules by this workflow.

## Structure & Architecture

React owns page markup and lesson/material/math interactions. Class RPG and detective still use imperative runtime modules under assets/js with React shells. These are active dependencies, not unused legacy pages. Preserve their save/auth contracts below. Math rules and question pools are in src/games/math-rpg; new lessons belong in src/lessons and navigation in src/content/navigation.ts.

### class-rpg specifics

- **`pages/class-rpg.html`** — teacher-only class/student admin backed by Firebase (Auth + Firestore, ES-module CDN imports in `assets/js/class-rpg.js`). Its 進入遊戲 button opens **`pages/class-rpg-game.html`**, the actual game, rendered with **Pixi.js v8** in `assets/js/class-rpg-game.js`, imported from the local **`assets/vendor/pixi.esm.min.js`** (8.20.1 ESM build). Never point this back at a CDN — classrooms are not guaranteed to have internet, and a failed Pixi fetch is a blank page, not a cosmetic downgrade. The same rule covers all six `assets/js/detective/*.js` modules. Scene layers: `world` (map/objects) and `hud` (fixed UI).
- **Character sprite sheet** (`assets/images/char/char1.webp`, Mana Seed Character Base): 512×512, an 8×8 grid of 64×64 cells. Direction row order within each block is **down, up, right, left**. Frame map (from the Mana Seed "animations, page 1" guide):
  - Top block, rows 0–3: `stand` = col 0 (cols 1–2 `push`, 3–4 `pull`, 5–7 `jump` — not yet used).
  - Bottom block, rows 4–7: `walk` = cols 0–5 (6-frame cycle); `run` reuses the walk cycle with frames 3 & 6 replaced by cols 6–7, i.e. column sequence `0, 1, 6, 3, 4, 7`.
  - Frames are sliced as `Texture` rectangles into the `ANIMS[direction][state]` lookup in `class-rpg-game.js`; one `AnimatedSprite` swaps its `textures` array on state/facing change. Keep `scaleMode = 'nearest'` for pixel art.

### detective specifics

**Writing a new case? Read `docs/detective-authoring.md` first.** It carries the design and layout traps that cost real debugging on the first case — information that must stay re-readable, the dialogue box's hard 70px ceiling, puzzle feedback that leaks answers, draggable hit-box and stacking pitfalls. The field-by-field reference lives in the header comment of `assets/js/detective/cases/golden-owl.js`; the bullets below are the architecture invariants.

- **All detective code lives under `assets/js/detective/`.** The folder's top level is shared machinery (`engine.js`, `ui.js`, `puzzles.js`, `interrogation.js`, `gate.js`, `code.js`, `admin.js`); per-case data sits in `cases/<case>.js`. A case is three things that all carry its name — `pages/detective-<case>.html`, `assets/js/detective/cases/<case>.js`, `assets/images/detective/<case>/`. Note `cases/*.js` sits one folder deeper than the rest, so its `IMG` constant walks back three levels (`../../../images/detective/<case>/`). **Case art must live in its own `assets/images/detective/<case>/` folder**: the first case's files use generic names (`background1.webp`, `suspect1.webp`), so a second case dropped beside them would overwrite it. The engine hardcodes no image path — every image resolves from the case file's own `IMG` constant and `CASE.assistantImg` — so a case's art moves by editing one line.
- **The filename and the `DETECTIVE_GAME_ID` are deliberately allowed to differ.** The first case is filed under `golden-owl` but its id is still `'owl'`, and that mismatch must not be "tidied up": the id feeds `PBKDF2(id + ':' + code)` and the `detective.unlock.<id>` / `detective.groups.<id>` localStorage keys, so changing it invalidates every unlock code already issued and orphans every group's saved progress. **Filenames are free to rename at any time; ids are frozen the moment the first code goes out.**
- **`pages/detective-golden-owl.html` does not load the engine directly.** It loads `assets/js/detective/gate.js`, which only `import()`s `engine.js` after an unlock code checks out. Anything that assumes the engine boots on page load is wrong — set `localStorage['detective.dev.owl'] = '1'` to bypass the gate while developing (no code check, no progress read or write; the top bar marks it 開發模式 in the warning colour). **A stored session alone is not a bypass**: `readSession()` requires a `codeId`, because accepting a bare `{"exp":…}` meant any leftover localStorage entry let anyone play without a code.
- Unlock codes are generated in **`pages/detective-admin.html`** (Firebase Auth, owner-only) and verified against Firestore. `assets/js/detective/code.js` holds the derivation shared by both sides — the Firestore document ID is `PBKDF2(gameId + ':' + normalizedCode)`, so **changing `PEPPER`, the iteration count, or the normalizer invalidates every code already issued**.
- **Multiple endings are opt-in per case.** Declare `endings: [{ id, title, when(api), text }]` ordered strictest-first — the engine plays the first whose `when()` passes, and falls back to `CASE.solution` when a case declares none (that is why 黃金貓頭鷹 is unaffected). `api` carries `misjudge`, `caught`, and `flags` (whatever the puzzles wrote). `accuseMinClues` lowers the bar for opening the accuse panel — **it must stay in sync with the `accuseBtn.setLocked()` check in `refreshHud()`, or the button stays greyed out and the relaxed gate does nothing**. `misjudgeLimit` force-closes the case after N wrong accusations so nobody can retry forever.
- Enforcement lives in `pages/firestore.rules.txt`, not in the client: `allow list: if isOwner()` is what stops anyone from dumping the code collection, and expiry is compared against `request.time` (server clock). `isOwner()` is an email allowlist that must be edited before the rules are published.
- Adding a case = add an entry to `DETECTIVE_GAMES` in `code.js`, create `pages/detective-<case>.html` + `assets/js/detective/cases/<case>.js` + `assets/images/detective/<case>/`, and set `window.DETECTIVE_GAME_ID` in the new page; the admin dropdown and code prefix follow automatically. Pick the id carefully — see the frozen-id note above.
- **One unlock code = one group's save slot.** The code's `unlockCodes` doc carries a `progress` map written by the game itself; the teacher hands a different code to each group and reads their progress in the admin list. The gate stores `{exp, codeId, label}` in `localStorage`, fetches `progress` *before* importing the engine, and exposes it as `window.DETECTIVE_SESSION`. The dev bypass above still works but has no `codeId`, so nothing is saved or restored.
- Save/restore lives in the `進度存檔` block of `engine.js`. `snapshotState()` must cover **`visitedScenes`, `dropPlayed` and `objPositions` as well as `state`** — those three live outside `state` and drive intro text, drop animations and object placement. Restoring is cheap because `renderScene()` is a pure function of `CASE + state`: assign the fields, call it, done. `restoreProgress()` treats the save as untrusted (students can write it) and drops unknown ids rather than throwing; bump `SAVE_VERSION` when the shape changes (now 2 — multi-ending added `misjudge`, `closed` and `flags`). Puzzles persist their own progress by writing into `ctx.flags` and calling `ctx.save()`; the engine stores that blob verbatim and never inspects it.
- **If the progress fetch fails, `saveBlocked` turns writes off for that session.** Never remove this: booting a fresh game after a failed read would overwrite a good save with a blank one 1.2s later. The same reasoning is why both top-bar exit buttons await `window.DETECTIVE_FLUSH(true)` and refuse to leave on a failed write unless the teacher confirms. A failed fetch is only treated as "code is dead" (forget the group, bounce back to the gate) when the client is online — offline still boots, just without recording.
- One classroom TV runs several groups in turn, so verified codes are also appended to `localStorage['detective.groups.<gameId>']` (codeId + label + expiry, never the plaintext code). They appear both as one-click buttons on the gate and in the in-game `#groupSwitch` dropdown, so switching groups never requires retyping a code — only 新增組別 goes back to the gate. Anyone at that device can enter any group listed there until the codes expire; 清除這台記住的組別 on the gate is the escape hatch.
- **Every group switch goes through `location.reload()`**, never an in-place swap: the engine builds its state once at module-evaluation time, so re-pointing it at another save would mean resetting the whole game by hand.
- **The engine only preloads one scene's images before booting** (`preloadImages(CASE, bootScene)`), the rest stream in behind it. Anything that renders a scene outside `transitionTo()` — which guards with `ensureSceneLoaded()` — must await that itself, or it paints a scene with no background. The restore path picks `bootScene` from the save and still re-checks at the bottom of the file; both are load-bearing.
- The rules let unauthenticated clients write `progress`/`progressAt` only, capped at `progress.size() <= 28` top-level keys — adding save fields past that silently breaks saving.

## Conventions

- UI text, comments, and question content are in Traditional Chinese — match this when editing.
- Shared visual language: the **Japanese pale-blue palette defined in `assets/css/theme.css`** (`#eaf2ef` background, `#ffffff` cards, 32px radii), `Fredoka` + `Noto Sans TC` fonts, Font Awesome icons. `theme.css` is the only source of truth for colour — never hard-code hex in a page. Page-local CSS variables must declare their dark values **twice** (`[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`), mirroring theme.css.

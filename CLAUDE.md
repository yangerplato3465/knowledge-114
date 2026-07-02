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
- **`pages/anti-bullying.html`** — fully self-contained (inline styles + inline `<script>` with a local `questions` array). A quiz; touches no shared assets.
- **`pages/math-rpg.html`** — an RPG battle quiz. Loads **`assets/js/math-rpg-pools.js` before `assets/js/math-rpg.js`** (order matters): pools defines the global `QUESTION_POOLS`, which the game reads. Flow: select grade → select pool → how-to → battle.

### math-rpg specifics

- `QUESTION_POOLS` is `{ 年級: { 題庫名稱: pool } }`. A pool is **either** a static array of `{ q, a: [...], correct }` **or** a generator function returning one such object (e.g. `generateDivideQuestion`). `loadQuestion()` branches on `typeof activePool === 'function'`. Add a topic by adding a key to `POOLS_G5`/`POOLS_G6`; the pool-select screen renders keys automatically.
- Game balance lives in tunable module-level constants in `math-rpg.js`: `ENEMY_HP_TABLE`, `HIT_TO_PLAYER_TABLE`, `HIT_TO_ENEMY`, `ROUND_TIME`, `PLAYER_MAX`, and the weighted `UPGRADES` list (`weight` controls draw odds; `apply()` mutates the run's stats). `beginBattle()` resets all upgradeable values to their initial state.

## Conventions

- UI text, comments, and question content are in Traditional Chinese — match this when editing.
- Shared visual language: warm oat/pudding palette (`#f0e6df` background, `#fffdf9` cards, 32px radii), `Fredoka` + `Noto Sans TC` fonts, Font Awesome icons. Reuse these tokens for new pages.

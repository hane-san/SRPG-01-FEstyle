# FIELD COMMAND / 戦線指揮

## 1. This game and the other two

This is the canonical `hane-san/SRPG-01-FEstyle` repository (formerly `hane-san/SRPG`). The other independent games are `hane-san/ARPG-02-retrostyle` and `hane-san/ARPG-01-SkyrimStyle` (the Nagi island game); do not modify them.
Entry documents: current rules [docs/hp6-campaign-design.md](docs/hp6-campaign-design.md) (v0.8.0, read first) and [docs/p3-specialists-playtest.md](docs/p3-specialists-playtest.md); setup/handoff [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md); [docs/DESIGN.md](docs/DESIGN.md); [docs/DECISIONS.md](docs/DECISIONS.md) (dated history, including the original text of sections moved out of this file on 2026-11-14); [docs/ROADMAP.md](docs/ROADMAP.md); findings [docs/input-performance-0.7.0.md](docs/input-performance-0.7.0.md). Claude Code imports this file from `CLAUDE.md`; keep one rules contract.
**Current v0.8.0 rules supersede older examples.** P3 specialists and the all-reserve castle opening are in main; the old all-class P3 stance and initial two deployed allies are historical. HP6 branch changes intentionally replace earlier shooter/healer/attrition contracts. The finale narrative is documentation only, not implemented.

## 2. Current phase and development contract

### Autopilot phase (human instruction 2026-11-14)

This replaces the nonstop prototype phase of 2026-10-21 and the daily 15:00 afternoon run. Until the human declares a stabilization phase, this section overrides the merge wording elsewhere in this file, in `CLAUDE.md`, in `docs/DEVELOPMENT.md` and in the steward skill. How the parts work: [docs/AUTOPILOT.md](docs/AUTOPILOT.md).

- **Flow**: Issues from the owner account (filed from GPT/Claude chats or other AIs) are triaged automatically (labels only). `lane/auto` (low/medium risk) is implemented one at a time per repository by the Claude Code scheduled task 「自動操縦の見回り」 (twice a day, around 4:00 and 13:00 JST), which opens a ready PR containing `Closes #n` and arms auto-merge. `lane/claude` (high risk) is implemented when the human asks Claude Code directly. Every adopted PR merges through GitHub auto-merge.
- **Adopted work** = Issues and PRs created by the owner account (including GPT/Codex/Claude acting for the owner), unless the title starts with 「提案」, the body states that the change is 未採用/保留/マージ保留, or it carries a `hold`/`proposal` label. Proposals are never implemented on their own initiative.
- **Merge condition**: the required checks `rules`, `browser` and `gate` succeed on the head commit and the PR does not conflict with `main`. **GitHub's auto-merge feature is allowed** and is the normal way PRs merge (merge commit). No human approval, pre-merge audit or time window is required. A session may also merge a passing adopted PR itself with a normal merge commit.
- **Safety**: if `main` CI fails, the main guard opens a "main is red" Issue labelled `autopilot-stop`; while any `autopilot-stop` Issue is open the scheduled task implements nothing new and opens a revert PR instead. Closing the Issue resumes. Anything that must not merge gets `hold`.
- Human playtests, independent audit, physical iPhone and ear listening are batched to the evening play session. Record them as unverified; never call them done.
- Still prohibited: direct push to `main`, force-push or history rewrite, PR approvals, AI changes to repository Settings/Secrets/Variables/Rulesets, deleting or weakening tests, renaming the repository/display title/storage keys, touching other repositories, and changing `.github/workflows` except in a session the human starts to fix the autopilot wiring. Game invariants stay binding; a change that breaks them needs an explicit Issue from the human.
- **Large changes asked of Claude Code directly**: write a short technical design in the PR body first, then implement; leave merging to auto-merge and note the result in the 「自動操縦の日報」 Issue.
- **Supervision after merge** (when the human asks, and in the dawn patrol): audit merged PRs against the invariants, open a fix Issue or revert PR when needed, rescue `stuck` items and reconcile contradictory directions (the newest human statement wins). Procedure: `.claude/skills/steward/SKILL.md`.
- **Scenario and direction documents**: story/world direction lives in `docs/DIRECTION.md` (created by the first PR that needs it). Direction PRs may be docs-only; only the parts the human adopted are implemented. Unadopted brainstorms stay marked 「提案」.
- SRPG specifics during this phase: HP6 rules, the P1→P4 order, determinism and save compatibility (`save.js`) stay binding. Run `npm run simulate` when rules, numbers or maps change and record the result. A change to the save format needs a migration test in the same PR.

### Shared AI development contract
- Scope work to this repository and the approved issue. The human producer decides game specifications and playtest acceptance; integration into main follows the autopilot phase above.
- Read [docs/DESIGN.md](docs/DESIGN.md), [docs/DECISIONS.md](docs/DECISIONS.md) and the issue before editing. Distinguish approved, proposed, deferred, superseded and unverified items. Do not invent missing chat context; surface contradictions between approved specs, code and tests.
- Handoff: human adoption in Chat -> Issue with acceptance criteria -> Codex or Claude Code/Sonnet work branch -> PR -> CI -> risk-based independent audit -> human playtest/approval -> main. Choose the implementation line by availability and context; model names are roles, not fixed API dependencies.
- Never push directly to main or force-push; merging follows the autopilot phase above. Fetch current main, inspect open PRs and coordinate overlapping files; preserve other contributors' work.
- Record risk and evidence in the PR. Low-risk wording/docs changes may omit independent audit; medium-risk changes need an independent review of affected behavior; high-risk phase/save/state changes need prior technical design and deeper independent audit (Opus when available). Self-review is not independent audit. See DEVELOPMENT for routing and unavailable-review handling.
- PASS/WARN/BLOCK are audit report terms only. GitHub required status checks are actual Actions jobs selected in Settings; an AI PASS never satisfies CI or grants merge authority.
- Preserve save compatibility, mobile input, deployment paths and the game-specific invariants below. Record executed checks, unverified work and human playtest steps; never claim iPhone hardware evidence from browser emulation.
- Repository name, game display name and internal save IDs are separate. Renaming, display-name migration, repository Settings and routines are separate tasks unless explicitly requested.
- Leave an issue/PR, tested commit SHA and evidence for the next AI. Never commit credentials, private chat history or local tooling artifacts.

## 3. Game invariants (current values)

### Turn, combat and input rules

1. P1 ally action -> P2 enemy -> P3 ally support -> P4 announced events.
2. No enemy general-unit P3 skills, hit/miss RNG, hidden lethal events, squad attrition resources or asset reuse from Fire Emblem.
3. P3 requires no move; the only P3 specialist allies are shooter (single-target artillery) and mage/healer/medic (temporary mage-family single-target healing). No P2 counter from any ally specialist, even without ammo; no consumption if no valid target.
4. Public commands are attack/wait only. Normal ally classes (shield/sword/bow/horse) use P1 attack, P2 counter, no P3. Allied specialist units (shooter and mage family) cannot P1 normal attack or P2 counter; stationary wait arms finite P3 artillery/healing when charged. Moved wait never arms P3. Omitted units wait in place. H1/H0/H2 settings are legacy/unused in HP6.
5. All deployed and reserve combatants have maxHP6. Normal damage is deterministic and minimum1, basic attack2, advanced melee3, shield innate damage reduction1/2, shooter range3 deals1. P3 stationary support attacks one valid target, no counter, one supply on successful effect only. Rain map05 cycles clear/clear/light/heavy/light; movement reduction is foot2/horse3 for light, foot3/horse4 for heavy, minimum1 on both teams. All reach/routes/AI/threats must use engine.movement without altering base stats.
6. Mage-family P3 heal affects one wounded ally at Manhattan distance1 for +2 (no self/diagonal). Only P3 specialists carry up to two stance supplies, replenished by one at start of ally turn near its castle. Moving prevents P3. No emergency healing at zero supply. Full-HP units are unaffected.
7. Announce artillery at prior P4; spawned units first act at next P2.
8. Classic named death is permanent, but the same army slot gets a generic soldier of equal basic class/rank next chapter. Generic units lack named-only choice skills. There is no repair/penalty reward deduction for death. Retry restores chapter-start state; Casual returns named units next chapter.
9. After selecting an ally, tapping a legal empty destination with no attack targets immediately commits move + ordinary wait. An attack-capable destination press anchors that tile: slide onto an enemy, release to the forecast, then choose Attack once. Releasing without a target restores the pre-press draft. Tapping the selected unit or an invalid destination cancels. Dragging from the unit still opens Attack / Wait / Back and allows an explicit wait in an attack-capable tile. Choices are disabled while the route finger is still held; after release, choosing Attack or Wait commits immediately; do not add a separate command/confirm step. Back/cancel/multitouch never consumes an action. Save the complete resolved P1 command before its presentation, never an intermediate visual/playing phase; finished outcomes may persist at their final phase.
10. All tests/maps use one engine; keep settings independent (casual is not an enemy difficulty).

11. Battlefield geometry and scroll offsets must stay identical through selection, command/menu/details open-close, cancel, commit and warning appearance. Command controls live in a fixed-height dock outside the clipped map viewport; opening or hiding controls cannot change its reserved height. On landscape phones (height ≤500px, width ≥600px) the same dock is a fixed 300px column to the right of the map (Issue #21, adopted 2026-10-22); its size likewise never changes with state. Only explicit navigation, zoom and resize may adjust the camera. Holding a route near an edge is explicit navigation and may auto-scroll. Keep the 44px touch targets.

12. Route previews and movement events must use engine.routeTo, the weighted movement field shared with reachable. Pointerdown on an unselected ready ally selects it immediately and captures the gesture. Sliding into an enemy keeps the last legal firing position or finds a legal approach. Enemy contact may update the draft preview while still held, but command controls stay hidden throughout the drag; release shows the quick menu. Unit-origin drags only preview; the two-tap non-attacking move is the explicit commit exception. Empty/outside-range drags pan through game handlers. Set touch-action:none before pointerdown and suppress map contextmenu, selection and touch callouts. Cancellation/multitouch restore the entire pre-press draft.
13. Animate movement along adjacent route tiles, then first strike, then a legal counter as separate engine observations. Present enemies sequentially. Playback speed/reduced motion/sound must not change results or enable input mid-command. Sound starts only after a user gesture and has persistent mute.

### Classes and roster (Issue #68, limited trials #71/#72 via PR #75)

- Seven playable base professions: sword=軽装兵, shield=重装兵, spear=槍兵, bow=弓兵, horse=騎兵, mage=魔術師, shooter=砲兵. bandit=賊 is enemy-only and **not a rename of light infantry**. Internal IDs sword/shield/bow/horse/mage/shooter stay for saves.
- Legacy healer/medic types are collapsed into mage while all nine slots, two cavalry and **three P3 healer slots** remain. Teo (a8) stays a mage. Legacy saves keep healer supplies and battle progress.
- Spear deals +1 deterministic damage against horse. The only active placements of the new classes are: map01 enemy `e1` bandit, map04 allied reserve `aux-shield` spear, map06 enemy `extra-5-0-2` spear. The named nine-person roster, three mage healers and two cavalry are unchanged.
- Otherwise preserve the six maps, enemy IDs/positions/types/AI, numeric balance, HP6, sortie/cap/P1–P4, P3 static heal/artillery, progress and save key. Balance is carried forward and reevaluated later: do not opportunistically add bandits, rebalance maps, place further spears or exchange roster members. Further placements, roster exchanges and raid targeting are separate decisions; #70 remains a proposal. Spec: [docs/base-classes-68.md](docs/base-classes-68.md), audit: [docs/issues-pr-audit-20261026.md](docs/issues-pr-audit-20261026.md).

### Castle opening (Issue #29) and command flow (Issue #96)

- All allied characters begin in the castle reserve; zero on-board allies at map start. Players tap the castle, choose the glyph/name, and gesture from the castle to the destination. Turn 1 permits two voluntary sorties, later turns one; the board maximum stays five. No resource, state or save changes before command validation. Production `createGame` starts with no deployed ally; historical 2-ally placement tests may seed old positions explicitly.
- Only a committed `deployAndAct` emits a `deploy` observer (its provisional `line` field stays in the event data). Playback shows **no subtitle and adds no wait**: the short gate clank overlaps the first step and the sortie then moves/attacks like any other order. Preserve input lock and save atomicity.
- Allied specialists (healing mages, artillery) have no Attack button. End turn reads 「敵フェーズへ（未行動n）」, counting board units only, and its confirmation offers 「未行動の部隊へ戻る」. Trial A (menu toggle 「移動操作」, default off): releasing a unit slide on a legal empty tile moves+waits at once, and a still 0.2 s hold waits in place; the default keeps rule 9.

### Screen, report and performance contracts

Optional maps 04–06 are standalone only; retain the original three-chapter campaign. Map controls start collapsed. Command controls must never overlap the map viewport or movement/attack ranges. Keep the dock height stable during all draft and command states.

When a route is already drawn, an enemy flick must retain that endpoint and route. A secondary gesture may start at the endpoint, original selected unit or empty map. Intermediate empty cells do not edit the anchor before the final intent is known; releasing on an empty tile explicitly edits the route. Out-of-range targets disable attack and explain why; never silently choose another firing position or another target. Without an explicit route, a direct enemy selection may still suggest a legal approach. Command controls are outside the map, hidden during route editing, and show concise information with readable text (forecast/actions at least 14px); move long explanations to Details. Blue movement and the outer cyan normal-attack area must not overlap; P3 remains separately described.

Battle reports must show actual observer-driven attack/counter/heal HP changes outside the map, including offscreen actions. They persist without a dismissal and yield to the next unit selection. Commands never gain a confirmation step; end-turn confirmation is needed only for unacted units. Playback trims idle/movement delays while preserving visible ordered impacts. `npm run audit:balance` records all map policies plus campaign/difficulty examples; these are examples, not optimal play or proof of human enjoyment.

0.7 performance/input contracts: do not recompute movement/danger fields on presentation frames. Renderer owns at most two map-sized 32px-per-tile cached surfaces per live canvas, keyed by terrain/map, weather, relevant unit state and draft overlay data. Changes to positions, deaths, movement/range stats, weather, selection, warnings or terrain must invalidate the relevant layer. Clip range loops to the map even for very large future ranges. Map-editor tests must preserve valid rows, passable deployments, distinct IDs/positions and connected objectives. A later animation callback error must reject and clear scheduled work so app finalization can release its lock. Disable navigation/command controls and keyboard orders during a held routing gesture. Maintain the charcoal/plum, ivory and brass interface separately from blue/red teams and green terrain.

### Older contracts still binding where they do not conflict with HP6

Historical 0.6 audit contracts (superseded when in conflict with current HP6 design): keep surviving captains in their deployment slots after a loss; emergency recruits must not collide. At chapter-two start, an empty base duty passes to a living defender, with an adjacent healer when available; never revive a named lost captain. New enemy specs may explicitly set HP/DEF; default ally class stats and shooter fragility remain intact. Keep stable enemy IDs across map revisions.

### Product boundaries

- Static ES modules, no build step, no runtime dependencies or CDN. Pages: `https://hane-san.github.io/SRPG-01-FEstyle/` (case matters; the former `/SRPG/` URL returns 404). No service worker.
- Original assets and music only; no borrowed melodies, samples or Fire Emblem assets.

## 4. Commands and file map

- Static ES modules, no build step, no runtime dependencies or CDN.
- `npm run dev` serves repository root on port 4173.
- `npm run check` runs syntax and deterministic rules tests on Node.js 22+.
- `npm run simulate` reproduces the baseline policy comparison (not an optimal strategy solver).
- Optional browser QA: `npm install --no-save --package-lock=false playwright@1.57.0`, `npx playwright install chromium`, serve root, then `node tests/browser-check.mjs`, `node tests/interaction-check.mjs`, `node tests/overlay-check.mjs`, `node tests/usability-check.mjs` (or `npm run test:browser`).
- Production URL (Pages enabled): `https://hane-san.github.io/SRPG-01-FEstyle/` (case matters). The former `/SRPG/` Pages URL returns 404.

- `data.js`: maps, terrain, positions, wave caps, roster. Coordinates are zero based. UI coordinates are one based.
- `config.js`: combat numbers, classes, skill descriptions.
- `engine.js`: pure deterministic commands and phases, no DOM or storage.
- `render.js`: original procedural pixel art / range overlays.
- `app.js` and `style.css`: quick-action battle UI, campaign, keyboard; Attack/Wait are the final choice with no extra confirmation.
- `ui-model.js`: forecast/target/slide/next-ready helpers; delegate rule calculations to engine.
- `playback.js`: tile interpolation and ordered hit/counter/heal presentation; never resolve rules here.
- `audio.js`: original Web Audio cues, gesture unlock, persistent mute; audio failure cannot block play.
- `music.js`/`music-extra.js`: original 26 tracks preserved as No.01–26, plus sixteen newly composed sorrowful-heroic candidate tracks No.27–42. Per-map P1 and P2–P4 assignments use stable `MAP_TRACK_NUMBERS`; see `docs/music-catalogue.md`. Includes melody/harmony/bass, Web Audio lookahead scheduling and independent persistent music preference/volume. Initial music OFF, effects ON. P1 uses ally score; P2–P4 share a hostile score without restarting between those phases. No borrowed melodies or samples. Pause in background; require a gesture to unlock.
- `assets/`: temporary original knight app icon and exported PNGs; `npm run icons` uses optional sharp.
- `ui-input.js`: single pointer gesture tracking; a drag that returns to its origin is still a drag.
- `save.js`: optional local storage, validation, P1/finished-state restore.
- Read `docs/balance.md` before changing balance; preserve open hypotheses rather than calling them resolved.

## 5. Releases, records and handoff

- `node scripts/release.mjs 0.7.0` updates version tags on every ES module edge, CSS URL, package and version.json.
- v0.8.0 is not combat-save compatible with v0.7.0 or earlier; preserve new v0.8 saves and fail safely on older state. The P3 area-heal rule applies prospectively.
- Sync and inspect remote changes before publishing; never force-push or overwrite another tool’s changes.
- Commit and push the work branch, then open a PR. Merging follows the autopilot phase (required checks and auto-merge); Pages deploys from main / root. No service worker.
- Include playtest findings with actual observations; never claim iOS hardware testing from Chromium emulation.
- Do not commit test-results/, node_modules/, browser executables, credentials or personal chat context.

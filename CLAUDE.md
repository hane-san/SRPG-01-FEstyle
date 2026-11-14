# Claude Code entrypoint

@AGENTS.md
@docs/DEVELOPMENT.md

For PR supervision (reviews, CI fixes, conflicts, overnight rounds) follow `.claude/skills/steward/SKILL.md`.

The same project contract applies in ChatGPT/Codex and Claude Code. Treat the
checked-out repository and Git history as the source of truth. Read the current
release notes and roadmap before choosing further work; do not depend on a chat
transcript or another assistant's private memory.

Follow the approved issue for implementation and independent evidence for review.
Use the actual available model in Claude Code; this file does not select one.
Follow the autopilot phase in AGENTS.md (human instruction 2026-11-14): adopted PRs merge through the required checks `rules`, `browser` and `gate` and GitHub auto-merge, and the daily 15:00 run is retired. Never push directly to main or force-push. For a large change the human asks for directly, write a short technical design in the PR body first, then leave merging to auto-merge. Record unverified checks; how the parts work is in `docs/AUTOPILOT.md`.

# Iron Log

Single-file vanilla HTML/CSS/JS workout tracker. Everything lives in `index.html` — no build step, no dependencies, no bundler. Open it directly in a browser to test.

## Architecture

- **Storage**: `localStorage['ironlog_v1']` holds `{rawText: "..."}` — the entire log as one markdown-ish string. `localStorage['ironlog_settings']` holds display preferences (theme, accent, font, size, unit).
- **Log format**: `## Jun 27 2026` (date) → `Exercise Name` (line with no `#`/`-` prefix) → `- 70# 10` (set: weight, `#`, reps). Old day-only dates (`## 25`) still parse via numeric fallback in `compareDates()`.
- **Single source of truth**: `rawText` is the only persisted data. `parseSessions(text)` re-parses it on every change; there is no separate mutable data model. `recompute()` rebuilds `sessions`/`prs`/`volume` from `rawText` and must be called after any edit.
- **Two input modes**: PASTE (raw textarea) and BUILD (form-based, state in `builder` object) both ultimately append formatted text to `rawText`.
- **Theming**: CSS custom properties (`--accent`, `--accent-press`, `--accent-dim`, `--accent-faint`, `--font`) set via `document.documentElement.style.setProperty(...)` in `applySettings()`. Light mode overrides these back to a fixed green regardless of the user's accent choice — it does not use the custom accent.
- **Exercise name normalization**: `canon(name)` maps free-text input through the `ALIASES` lookup table so e.g. "pull ups" and "pullups" collapse to one canonical "Pullup" bucket for PRs/volume/progress.

## Working conventions for this repo

- **Branch**: development happens on `claude/workout-input-method-dw0oge`, then PR'd and squash-merged into `main`. The user views the app via `main`, so a change isn't "done" until it's merged — committing/pushing to the feature branch alone is not enough.
- **Rebase-before-merge is the norm, not the exception**: this branch has needed a rebase against `main` before nearly every merge because prior PRs were squash-merged (rewriting history) while the feature branch kept its original commits. Expect `git rebase origin/main` to hit conflicts in `index.html`; resolve by keeping this branch's (HEAD) version unless the diff shows the other side add something new. After resolving, `git push --force-with-lease` (never plain `--force`) since the branch is rewritten.
- **No test suite**: verification is manual — read the diff carefully, and if a UI change is involved, actually reason through the DOM/CSS rather than assuming. There's no CI gate here.

## UI/CSS gotchas learned the hard way

- **Scroll-jump on `innerHTML` replacement**: if a focused input is inside a block that gets replaced via `innerHTML`, the browser auto-scrolls to compensate for the destroyed element — even before repaint. Fix pattern used throughout `renderBuilder()`: synchronously `blur()` the active element and call `window.scrollTo(0, savedY)` *before and after* the `innerHTML` write, all in the same synchronous tick. `requestAnimationFrame`-deferred scroll restoration is too late and still visibly jumps.
- **Per-element font-size overrides don't read as a "size" setting**: bumping `font-size` on a dozen individual selectors was nearly imperceptible and the user correctly called it out as broken. `zoom` applied to the outer container(s) (`#tabs`, `#content`) scales everything uniformly and is what actually reads as a size change.
- **Contrast passes need multiple rounds**: dark-mode text color was brightened twice in one session (`#666→#888→#999` etc.) because a single step under-corrected. When asked to improve contrast, consider pushing further than feels necessary on the first pass, or expect a follow-up request.
- **Light mode is hand-maintained, not derived**: light mode is a full parallel set of `body.light <selector>{...}` overrides, not a CSS-variable flip. Any new component needs an explicit light-mode rule or it will silently inherit dark colors.

## Git/PR mechanics specific to this session

- Use the GitHub MCP tools (`mcp__github__create_pull_request`, `merge_pull_request`) rather than a `gh` CLI — it isn't available in this environment.
- `merge_pull_request` fails with a 405 "merge conflicts" error whenever `main` has moved since the branch was cut (very common here — see rebase note above). The recovery sequence that's worked every time: `git fetch origin main` → `git rebase origin/main` → resolve conflicts in `index.html` → `git push --force-with-lease -u origin <branch>` → retry the merge call.

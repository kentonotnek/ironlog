# Tests

The app is one file with no build step, so the tests run the real page in a
real browser: each suite is injected into a copy of `index.html`, loaded in
headless Chrome, and drives the app the way a user would.

## Running

```
tests/run.sh                  # every suite
tests/run.sh storage_backup   # one suite
```

Needs Chrome or Chromium and `python3`. If Chrome is not on the path, set
`CHROME=/path/to/chrome`. The script exits non-zero if any check fails.

## Suites

| Suite | Covers |
| --- | --- |
| `log_formats` | The log formats existing logs rely on, dates, records, volume |
| `compound_sets` | Back-to-back groups, bodyweight sets, the build form |
| `repeat_prefill` | Repeat last set, weight filled in from last time |
| `recent_modes` | Recent workouts list, Build / Import / Calendar modes |
| `notes_records` | Notes, the New PR pop-up |
| `refresh` | What survives a real page reload (two-phase test) |
| `tempo_timers` | Tempo, rep pacer, interval timer, stopwatch |
| `templates_calendar` | Templates, calendar, planning, Google link, calendar file |
| `storage_backup` | Storage layer, backup, restore, safety copies |

## Writing a suite

A suite is one self-contained script in `tests/suites/`. It runs after the app
has started, with every app function in scope. It must finish by writing its
results into `#test-out` between `@@START` and `@@END`, one `ok   name` or
`FAIL name` line per check, ending with `RESULT: ALL PASSED` or
`RESULT: n FAILED`. Copy an existing suite for the boilerplate.

Useful hooks:

- `clockNow = () => someTime` and `todayLocalISO = () => '2026-11-16'` fix the
  clock and the date. Timers, the calendar and backups all read time through these.
- `Store.use(backend)` swaps where data is saved, for example to one that
  refuses writes. `Store.use(null)` switches back.
- `window.confirm`, `window.alert` and `downloadText` can be replaced to capture
  dialogs and downloads.
- Each suite starts with a fresh browser profile, so nothing is saved from an
  earlier suite.

## Limits

Headless Chrome cannot tell you that a beep is audible, that the phone
vibrates, that the screen stays awake, or how the on-screen keyboard behaves.
Those need a real phone.

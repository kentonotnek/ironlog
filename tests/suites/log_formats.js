// The log formats that existing users' logs rely on. These must keep parsing the same way.
(function () {
  const out = [];
  let fails = 0;
  function eq(name, got, want) {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g === w) out.push('ok   ' + name);
    else { fails++; out.push('FAIL ' + name + '\n       got  ' + g + '\n       want ' + w); }
  }
  const brief = sets => sets.map(s => (s.bw ? 'bw' : (s.assisted ? '-' : '') + (s.dual ? s.v + '/' + s.v2 : s.v)) + 'x' + s.reps);
  function ex(text) {
    const ss = parseSessions(text);
    const o = {};
    for (const s of ss) for (const [k, v] of Object.entries(s.exercises)) o[`${s.date} ${k}`] = brief(v);
    o._skipped = ss.skippedLines;
    return o;
  }
  const Y = new Date().getFullYear();
  const M = String(new Date().getMonth() + 1).padStart(2, '0');

  try {
    eq('basic sets', ex('## 2026-06-27\nDips\n- 45# 10\n- 50# 8'), { '2026-06-27 Dips': ['45x10', '50x8'], _skipped: 0 });
    eq('aliases map to one exercise', ex('## 2026-06-27\npull ups\n- 45# 10\nPullups\n- 45# 8\nPull down\n- 65# 10'),
      { '2026-06-27 Pullup': ['45x10', '45x8'], '2026-06-27 Lat Pulldown': ['65x10'], _skipped: 0 });
    eq('heading with a trailing colon', ex('## 2026-06-27\nDips:\n- 45# 10'), { '2026-06-27 Dips': ['45x10'], _skipped: 0 });
    eq('words before or after the numbers', ex('## 2026-06-27\nPullups\n- wide 45# 10\n- 45# 10 reg'), { '2026-06-27 Pullup': ['45x10', '45x10'], _skipped: 0 });
    eq('two weights (40#/35#)', ex('## 2026-06-27\nAb bench\n- 40#/35# 12'), { '2026-06-27 Ab Bench': ['40/35x12'], _skipped: 0 });
    eq('assisted (negative) weight', ex('## 2026-06-27\nPullups\n- -45# 10'), { '2026-06-27 Pullup': ['-45x10'], _skipped: 0 });
    eq('decimal weight', ex('## 2026-06-27\nCurl\n- 22.5# 10'), { '2026-06-27 Curl': ['22.5x10'], _skipped: 0 });
    eq('rep range takes the first number', ex('## 2026-06-27\nDips\n- 45# 8-10'), { '2026-06-27 Dips': ['45x8'], _skipped: 0 });
    eq('a set with words but no # is counted as skipped', ex('## 2026-06-27\nDips\n- felt 10'), { _skipped: 1 });
    eq('a one-word line is ignored quietly', ex('## 2026-06-27\nDips\n- 45# 10\n- done'), { '2026-06-27 Dips': ['45x10'], _skipped: 0 });
    eq('sets before any exercise are ignored', ex('## 2026-06-27\n- 45# 10'), { _skipped: 0 });
    eq('text before any date is ignored', ex('Dips\n- 45# 10\n## 2026-06-27\nDips\n- 50# 5'), { '2026-06-27 Dips': ['50x5'], _skipped: 0 });
    eq('blank lines and spacing do not matter', ex('  ## 2026-06-27  \n\n  Dips  \n\n -  45#   10 \n'), { '2026-06-27 Dips': ['45x10'], _skipped: 0 });
    eq('the same date twice merges into one session', [parseSessions('## 2026-06-27\nDips\n- 45# 10\n\n## 2026-06-27\nDips\n- 50# 5').length, ex('## 2026-06-27\nDips\n- 45# 10\n\n## 2026-06-27\nDips\n- 50# 5')],
      [1, { '2026-06-27 Dips': ['45x10', '50x5'], _skipped: 0 }]);

    // Dates
    eq('display dates', ['Jun 27 2026', 'jun 7 2026', '2026-06-27', 'June 27, 2026', '6/27/2026'].map(normalizeDate), ['2026-06-27', '2026-06-07', '2026-06-27', '2026-06-27', '2026-06-27']);
    eq('slash dates are month first, and never read as a bare day', ['6/27/2026', '06/07/26', '6/27', '27 Jun 2026', '13/40/2026'].map(normalizeDate), ['2026-06-27', '2026-06-07', `${Y}-06-27`, '2026-06-27', '13/40/2026']);
    eq('month and day use this year', normalizeDate('Jun 27'), `${Y}-06-27`);
    eq('a bare day uses this month', normalizeDate('5'), `${Y}-${M}-05`);
    eq('a day past the month end is clamped, not rolled over', isoFromParts(2026, 2, 31), '2026-02-28');
    eq('unrecognised text is left alone', normalizeDate('sometime'), 'sometime');
    const norm = normalizeRawLogDates('## Jun 27 2026\nDips\n- 45# 10\n## 2026-06-28\nDips\n- 45# 10');
    eq('date headings are rewritten once to a fixed form', [norm.changed, norm.text.split('\n')[0], norm.text.split('\n')[3]], [true, '## 2026-06-27', '## 2026-06-28']);
    eq('sorting', [compareDates('2026-06-27', '2026-06-28') < 0, compareDates('2026-12-01', '2026-06-28') > 0], [true, true]);

    // Records, volume, progress
    const ss = parseSessions('## 2026-06-01\nDips\n- 45# 10\n- 50# 8\nPullups\n- -45# 10\n\n## 2026-06-08\nDips\n- 55# 5\nPullups\n- -30# 10\n\n## 2026-06-15\nPullups\n- 10# 3');
    const prs = computePRs(ss);
    eq('record is the heaviest set, with its date', [prs.Dips.v, prs.Dips.date], [55, '2026-06-08']);
    eq('a real lift replaces an assisted record', [prs.Pullup.v, prs.Pullup.assisted, prs.Pullup.date], [10, false, '2026-06-15']);
    eq('volume counts sets', computeVolume(ss), { Dips: 3, Pullup: 3 });
    eq('progress is the best weight per session, oldest first', computeProgress(ss, 'Dips'), [{ date: '2026-06-01', weight: 50 }, { date: '2026-06-08', weight: 55 }]);

    // The built-in sample log is internally consistent
    const sample = parseSessions(DEFAULT_LOG);
    eq('sample log: 5 sessions, 17 exercises, nothing skipped', [sample.length, Object.keys(computePRs(sample)).length, sample.skippedLines], [5, 17, 0]);
    eq('sample log: set counts', computeVolume(sample), { 'Dips': 3, 'Pullup': 11, 'MTS Chest Press': 6, 'Lat Pulldown': 4, 'Incline Press': 3, 'Hip Adductor': 6, 'Hip Abductor': 6, 'Seated Row': 3, 'Delt Fly': 2, 'Ab Bench': 6, 'Ab Crunch Machine': 6, 'Rotary Torso': 6, 'Tricep Extension': 3, 'MTS Row': 3, 'MTS Pulldown': 3, 'Bicep Curl (EZ Bar)': 3, 'Back Extension': 1 });
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

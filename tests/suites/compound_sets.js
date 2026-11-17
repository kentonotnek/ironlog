(function () {
  const out = [];
  let fails = 0;
  function eq(name, got, want) {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g === w) out.push('ok   ' + name);
    else { fails++; out.push('FAIL ' + name + '\n       got  ' + g + '\n       want ' + w); }
  }
  const brief = sets => sets.map(s => (s.bw ? 'bw' : (s.assisted ? '-' : '') + s.v) + 'x' + s.reps);
  function ex(text) {
    const ss = parseSessions(text);
    const o = {};
    for (const s of ss) for (const [k, v] of Object.entries(s.exercises)) o[k] = brief(v);
    o._skipped = ss.skippedLines;
    return o;
  }

  try {
    // ── Parser ──
    eq('compound rounds', ex('## 2026-11-01\nDips + Pullups\n- 45# 10 + 45# 8\n- 45# 10 + 45# 7'),
      { Dips: ['45x10', '45x10'], Pullup: ['45x8', '45x7'], _skipped: 0 });
    eq('repeat x3', ex('## 2026-11-01\nDips + Pullups\n- 45# 10 + 45# 8 x3'),
      { Dips: ['45x10', '45x10', '45x10'], Pullup: ['45x8', '45x8', '45x8'], _skipped: 0 });
    eq('three exercises', ex('## 2026-11-01\nDips + Pullups + Squat\n- 45# 10 + 45# 8 + 135# 5'),
      { Dips: ['45x10'], Pullup: ['45x8'], Squat: ['135x5'], _skipped: 0 });
    eq('bodyweight in a round', ex('## 2026-11-01\nDips + Pushups\n- 45# 10 + bw 20\n- 45# 10 + 15'),
      { Dips: ['45x10', '45x10'], Pushups: ['bwx20', 'bwx15'], _skipped: 0 });
    eq('short round keeps what it has', ex('## 2026-11-01\nDips + Pullups\n- 45# 10'),
      { Dips: ['45x10'], _skipped: 0 });
    eq('extra part is counted as skipped', ex('## 2026-11-01\nDips\n- 45# 10 + 45# 8'),
      { Dips: ['45x10'], _skipped: 1 });
    eq('single exercise repeat', ex('## 2026-11-01\nDips\n- 45# 10 x2'),
      { Dips: ['45x10', '45x10'], _skipped: 0 });
    eq('prefix words and assisted still parse', ex('## 2026-11-01\nPullups\n- wide 45# 10\n- -20# 8\n- 45# 10 reg'),
      { Pullup: ['45x10', '-20x8', '45x10'], _skipped: 0 });
    eq('no # and no bw is still skipped', ex('## 2026-11-01\nPullups\n- wide 10'),
      { _skipped: 1 });
    eq('same exercise alone and in a group', ex('## 2026-11-01\nDips\n- 50# 5\nDips + Pullups\n- 45# 10 + 45# 8'),
      { Dips: ['50x5', '45x10'], Pullup: ['45x8'], _skipped: 0 });

    // PRs: weighted beats bodyweight; bodyweight ranks by reps
    let prs = computePRs(parseSessions('## 2026-11-01\nPushups\n- bw 12\n- bw 20\n- bw 15'));
    eq('bw PR by reps', [prs.Pushups.bw, prs.Pushups.reps], [true, 20]);
    prs = computePRs(parseSessions('## 2026-11-01\nPushups\n- bw 20\n- 25# 8'));
    eq('weighted beats bw', [!!prs.Pushups.bw, prs.Pushups.v], [false, 25]);
    eq('bw PR text', prWeightText({ bw: true, reps: 20 }) + prUnitText({ bw: true, reps: 20 }), 'BW × 20');

    // ── Builder ──
    const $ = id => document.getElementById(id);
    const B = () => state.builder.exercises;
    function addEx(t) { $('build-ex-input').value = t; builderAddExercise(); }
    function addSet(w, r) { $('build-weight').value = w; $('build-reps').value = r; builderAddSet(); }
    const blockText = i => document.querySelector(`[data-ex-idx="${i}"]`).textContent.replace(/\s+/g, ' ').trim();

    builderClear();
    setRawText('## 2026-10-01\nDips\n- 40# 10');
    setLogMode('build');
    $('build-date').value = '2026-11-15';

    addEx('Dips + Pullups');
    eq('typed compound creates a group', B(), [{ names: ['Dips', 'Pullup'], rounds: [], cur: [] }]);
    eq('round label at start', document.querySelector('.build-round-label').textContent, 'ROUND 1 · Dips (1 of 2)');
    addSet('45', '10');
    eq('label moves to second exercise', document.querySelector('.build-round-label').textContent, 'ROUND 1 · Pullup (2 of 2)');
    eq('pending chip shown', document.querySelector('.build-set-chip.pending').textContent, '45 lbs × 10  +  …');
    eq('repeat hidden mid-round', document.querySelector('.build-repeat-btn').style.display, 'none');
    eq('inputs survive (same element, cleared)', [$('build-weight').value, $('build-reps').value], ['', '']);
    addSet('', '8');
    eq('round completes; empty weight = bodyweight', B()[0].rounds.length + ':' + B()[0].cur.length + ':' + B()[0].rounds[0][1].bw, '1:0:true');
    eq('label moves to round 2', document.querySelector('.build-round-label').textContent, 'ROUND 2 · Dips (1 of 2)');
    eq('repeat shown after a round', document.querySelector('.build-repeat-btn').style.display, 'block');
    eq('link hidden once data exists', document.querySelector('.build-linker-btn').style.display, 'none');
    document.querySelector('.build-repeat-btn').click();
    eq('repeat adds a round', B()[0].rounds.length, 2);
    addSet('50', '6');
    document.querySelector('.build-set-chip.pending').click();
    eq('tap pending chip undoes it', B()[0].cur.length, 0);
    document.querySelectorAll('[data-ex-idx="0"] .build-set-chip')[1].click();
    eq('tap round chip removes the round', B()[0].rounds.length, 1);
    document.querySelector('.build-repeat-btn').click();

    // Link flow on a plain exercise
    addEx('Squat');
    eq('plain exercise added', [B().length, B()[1].name, state.builder.activeIdx], [2, 'Squat', 1]);
    eq('first block went inactive', blockText(0).includes('+ ADD ROUNDS'), true);
    document.querySelector('[data-ex-idx="1"] .build-linker-btn').click();
    eq('link mode prompt', [$('build-ex-input').placeholder, $('build-ex-add-btn').textContent,
      document.querySelector('[data-ex-idx="1"] .build-linker-btn').textContent],
      ['exercise to link with Squat', '+ LINK', 'CANCEL']);
    addEx('Lunge');
    eq('link converts to group', [B()[1].names, B()[1].rounds, B()[1].cur], [['Squat', 'Lunge'], [], []]);
    eq('link mode ends', [$('build-ex-input').placeholder, $('build-ex-add-btn').textContent], ['e.g. Dips', '+ ADD']);
    eq('linked block is active with round footer', blockText(1).includes('ROUND 1 · Squat (1 of 2)'), true);
    addSet('135', '5');
    addSet('-20', '10');
    eq('one footer only', document.querySelectorAll('#build-weight').length, 1);

    // Plain exercise with the same name as a group member stays separate
    addEx('Dips');
    addSet('60', '5');
    eq('separate plain Dips', [B().length, B()[2].name, B()[2].sets.length], [3, 'Dips', 1]);

    // Rename rules
    builderStartEditEx(1);
    $('build-ex-edit').value = 'Front Squat + Lunge';
    builderSaveExName(1, true);
    eq('group rename same count', B()[1].names, ['Front Squat', 'Lunge']);
    builderStartEditEx(1);
    $('build-ex-edit').value = 'Only One';
    builderSaveExName(1, true);
    eq('group rename to fewer names refused once logged', B()[1].names, ['Front Squat', 'Lunge']);
    builderStartEditEx(2);
    $('build-ex-edit').value = 'Dips + Rows';
    builderSaveExName(2, true);
    eq('plain with sets cannot become a group', B()[2].name, 'Dips');

    // Persisted state reloads
    const saved = JSON.parse(localStorage.getItem('ironlog_builder'));
    eq('builder persisted', [saved.exercises.length, saved.exercises[0].rounds.length], [3, 2]);

    builderSave();
    const newest = state.rawText.split('\n\n')[0];
    eq('saved text', newest,
      '## 2026-11-15\nDips + Pullup\n- 45# 10 + bw 8\n- 45# 10 + bw 8\nFront Squat + Lunge\n- 135# 5 + -20# 10\nDips\n- 60# 5');
    const s0 = state.sessions.find(s => s.date === '2026-11-15');
    eq('saved text re-parses', { Dips: brief(s0.exercises.Dips), Pullup: brief(s0.exercises.Pullup), FS: brief(s0.exercises['Front Squat']), L: brief(s0.exercises.Lunge) },
      { Dips: ['45x10', '45x10', '60x5'], Pullup: ['bwx8', 'bwx8'], FS: ['135x5'], L: ['-20x10'] });
    eq('old session untouched', state.rawText.split('\n\n')[1], '## 2026-10-01\nDips\n- 40# 10');
    eq('builder cleared', [B().length, $('build-preview').children.length], [0, 0]);

    // Unfinished round is kept on save
    addEx('A + B');
    addSet('10', '5'); addSet('20', '5'); addSet('10', '4');
    builderSave();
    eq('unfinished round saved as short line', state.rawText.split('\n\n')[0], '## ' + todayLocalISO() + '\nA + B\n- 10# 5 + 20# 5\n- 10# 4');

    // Views render with the new data
    renderPRs(); renderVolume(); state.selectedEx = 'Pullup'; renderProgress();
    eq('progress chips show BW', document.getElementById('sets-list').textContent.includes('BW × 8'), true);
    eq('PR row shows BW', [...document.querySelectorAll('.pr-row')].find(r => r.dataset.ex === 'Pullup').querySelector('.pr-weight').textContent, 'BW × 8');
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

(function () {
  const out = [];
  let fails = 0;
  function eq(name, got, want) {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g === w) out.push('ok   ' + name);
    else { fails++; out.push('FAIL ' + name + '\n       got  ' + g + '\n       want ' + w); }
  }
  const $ = id => document.getElementById(id);
  const B = () => state.builder.exercises;
  const W = () => $('build-weight');
  function addEx(t) { $('build-ex-input').value = t; builderAddExercise(); }
  function typeWeight(v) { W().value = v; W().dispatchEvent(new Event('input')); }
  function addReps(r) { $('build-reps').value = r; builderAddSet(); }
  const hint = () => { const h = document.querySelector('.build-last-hint'); return h.style.display === 'none' ? null : h.textContent; };
  const repeatShown = () => document.querySelector('.build-repeat-btn').style.display;

  try {
    builderClear();
    setRawText('## 2026-11-10\nIncline press\n- 47# 10\n- 57# 10\n- 67# 8\nPushups\n- bw 20\nPullups\n- -20# 8\n\n## 2026-10-01\nIncline press\n- 30# 10\n- 30# 10\n- 30# 10\n- 30# 10\n- 30# 10');
    setLogMode('build');

    addEx('Incline Press');
    eq('prefill from most recent session, set 1', [W().value, W().dataset.prefilled], ['47', '1']);
    eq('last-time hint', hint(), 'LAST · Nov 10: 47×10 · 57×10 · 67×8 lbs');
    eq('repeat hidden with no sets', repeatShown(), 'none');
    addReps('10');
    eq('prefilled weight is used', B()[0].sets[0], { weight: 47, reps: 10, assisted: false });
    eq('prefill follows the ramp, set 2', W().value, '57');
    eq('repeat shown after a set', repeatShown(), 'block');

    typeWeight('60');
    builderRemoveSet(0, 0);
    eq('typed weight is not overwritten', [W().value, W().dataset.prefilled], ['60', undefined]);
    addReps('10');
    eq('typed weight is used', B()[0].sets[0].weight, 60);
    eq('back to guessing after the set', W().value, '57');
    addReps('10');
    eq('set 3 guess', W().value, '67');
    addReps('8');
    eq('past last time: falls back to the set just entered', W().value, '67');

    document.querySelector('.build-repeat-btn').click();
    eq('repeat last set', B()[0].sets.map(s => s.weight + 'x' + s.reps), ['60x10', '57x10', '67x8', '67x8']);
    eq('chips match', document.querySelectorAll('[data-ex-idx="0"] .build-set-chip').length, 4);
    document.querySelectorAll('[data-ex-idx="0"] .build-set-chip')[3].click();
    eq('repeated set can be removed', B()[0].sets.length, 3);

    addEx('Pushups');
    eq('bodyweight last time: weight left empty', [W().value, hint()], ['', 'LAST · Nov 10: BW×20']);
    addReps('15');
    eq('empty weight still logs bodyweight', B()[1].sets[0].bw, true);
    document.querySelector('.build-repeat-btn').click();
    eq('repeat a bodyweight set', B()[1].sets.map(s => (s.bw ? 'bw' : s.weight) + 'x' + s.reps), ['bwx15', 'bwx15']);

    addEx('Pullups');
    eq('assisted last time: negative prefill', W().value, '-20');
    addReps('8');
    eq('assisted prefill is used', B()[2].sets[0], { weight: 20, reps: 8, assisted: true });

    addEx('Newthing');
    eq('never logged: empty and no hint', [W().value, hint()], ['', null]);
    typeWeight('25'); addReps('5');
    eq('never logged: next set guesses the set just entered', W().value, '25');

    setUnit('kg');
    eq('kg prefill', [W().value, document.querySelector('.build-set-input-row .build-unit').textContent], ['11.3', 'kg']);
    addReps('5');
    eq('kg prefill converts back', Math.round(B()[3].sets[1].weight * 100) / 100, 24.91);
    setUnit('lbs');

    addEx('Incline Press + Pullups');
    eq('group: first exercise guess', [W().value, hint()], ['47', 'LAST · Nov 10: 47×10 · 57×10 · 67×8 lbs']);
    addReps('10');
    eq('group: second exercise guess and hint', [W().value, hint()], ['-20', 'LAST · Nov 10: -20×8 lbs']);
    addReps('8');
    eq('group: round 2 follows the ramp', W().value, '57');
    eq('group round logged', B()[4].rounds[0].map(s => (s.assisted ? '-' : '') + s.weight + 'x' + s.reps), ['47x10', '-20x8']);

    // Reload: saved builder state comes back with a guess in place
    buildPreviewFromScratch();
    eq('rebuild keeps one footer with a guess', [document.querySelectorAll('#build-weight').length, W().value], [1, '57']);
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  setTimeout(() => {
    eq('cursor lands on reps when weight is filled', document.activeElement && document.activeElement.id, 'build-reps');
    if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
    out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
    document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
  }, 600);
})();

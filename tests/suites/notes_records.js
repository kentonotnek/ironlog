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
  const txt = el => el.textContent.replace(/\s+/g, ' ').trim();
  function addEx(t) { $('build-ex-input').value = t; builderAddExercise(); }
  function addSet(w, r) { $('build-weight').value = w; $('build-weight').dispatchEvent(new Event('input')); $('build-reps').value = r; builderAddSet(); }
  const toast = () => $('toast').classList.contains('show') ? $('toast').textContent : null;
  const clearToast = () => $('toast').classList.remove('show');
  const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

  try {
    // ═══ #12 New PR pop-up ═══
    eq('beatsRecord: heavier wins', beatsRecord({ v: 50, reps: 5 }, { v: 45, reps: 10 }), true);
    eq('beatsRecord: equal does not', beatsRecord({ v: 45, reps: 12 }, { v: 45, reps: 10 }), false);
    eq('beatsRecord: real beats assisted', beatsRecord({ v: 5, reps: 1 }, { v: 20, assisted: true, reps: 8 }), true);
    eq('beatsRecord: less assistance wins', [beatsRecord({ v: 10, assisted: true }, { v: 20, assisted: true }), beatsRecord({ v: 30, assisted: true }, { v: 20, assisted: true })], [true, false]);
    eq('beatsRecord: assisted never beats real', beatsRecord({ v: 10, assisted: true }, { v: 5 }), false);
    eq('beatsRecord: bodyweight by reps', [beatsRecord({ v: 0, bw: true, reps: 21 }, { v: 0, bw: true, reps: 20 }), beatsRecord({ v: 0, bw: true, reps: 20 }, { v: 0, bw: true, reps: 20 })], [true, false]);

    builderClear();
    setRawText('## 2026-11-01\nDips\n- 45# 10\nPushups\n- bw 20\nPullups\n- -20# 8');
    setLogMode('build');
    $('build-date').value = '2026-11-15';
    eq('toast hidden at start', toast(), null);

    addEx('Dips');
    addSet('45', '10');
    eq('matching the record: no pop-up', toast(), null);
    addSet('50', '8');
    eq('beating the record: pop-up', toast(), '🏆 NEW PR! Dips · 50 lbs × 8');
    clearToast();
    addSet('50', '8');
    eq('matching today\'s best: no pop-up', toast(), null);
    document.querySelector('.build-repeat-btn').click();
    eq('repeat set: no pop-up', toast(), null);
    addSet('55', '5');
    eq('beating today\'s best: pop-up again', toast(), '🏆 NEW PR! Dips · 55 lbs × 5');
    clearToast();

    addEx('Brand New Lift');
    addSet('100', '5');
    eq('first time ever logged: no pop-up', toast(), null);
    addSet('110', '5');
    eq('still no record to beat until it is saved', toast(), null);

    addEx('Pushups + Pullups');
    addSet('', '25');
    eq('bodyweight reps record in a group', toast(), '🏆 NEW PR! Pushups · BW × 25');
    clearToast();
    addSet('-10', '8');
    eq('less assistance is a record', toast(), '🏆 NEW PR! Pullup · -10 lbs × 8');
    clearToast();
    addSet('', '25'); addSet('-10', '8');
    eq('same again in round 2: no pop-up', toast(), null);
    addSet('', '10'); addSet('5', '3');
    eq('first unassisted pullup is a record', toast(), '🏆 NEW PR! Pullup · 5 lbs × 3');
    clearToast();
    builderClear();

    // Import
    setLogMode('paste');
    $('log-input').value = '## 2026-11-16\nDips\n- 60# 5\nSomething Else\n- 10# 10\nPushups\n- bw 5';
    addSession();
    eq('import that beats a record: pop-up names it only', toast(), '🏆 NEW PR! Dips');
    clearToast();
    $('log-input').value = '## 2026-11-17\nDips\n- 60# 5';
    addSession();
    eq('import that beats nothing: no pop-up', toast(), null);
    setLogMode('build');

    // ═══ #11 Notes ═══
    const logText = '## 2026-11-10\n> felt strong today\n> slept badly though\nDips\n> elbows out\n- 45# 10\nSquat\n> skipped, sore knee\nPullups + Dips\n- -20# 8 + 45# 10\n> grip slipping\n\n## 2026-11-03\nDips\n- 40# 10';
    let ss = parseSessions(logText);
    eq('workout note (two lines joined)', ss[0].note, 'felt strong today slept badly though');
    eq('exercise notes, incl. one with no sets and one after its sets',
      ss[0].blocks.map(b => [b.names.join('+'), b.note, b.rows.length]),
      [['Dips', 'elbows out', 1], ['Squat', 'skipped, sore knee', 0], ['Pullup+Dips', 'grip slipping', 1]]);
    eq('notes do not become exercises', Object.keys(ss[0].exercises), ['Dips', 'Pullup']);
    eq('notes are not counted as skipped lines', ss.skippedLines, 0);
    eq('session without notes', [ss[1].note, ss[1].blocks[0].note], ['', '']);
    eq('line numbers recorded', [ss[0].line, ss[0].noteLines, ss[0].blocks[0].line, ss[0].blocks[0].noteLines], [0, [1, 2], 3, [4]]);

    setRawText(logText);
    if (!recentOpen) $('recent-toggle').click();
    const sess = () => [...document.querySelectorAll('.recent-session')];
    eq('recent: workout note shown', txt(sess()[0].querySelector(':scope > .recent-note')), 'felt strong today slept badly though');
    eq('recent: exercise rows', [...sess()[0].querySelectorAll('.recent-ex')].map(e => [txt(e.querySelector('.recent-name')), txt(e.querySelector('.recent-note'))]),
      [['Dips', 'elbows out'], ['Squat', 'skipped, sore knee'], ['Pullup + Dips', 'grip slipping']]);
    eq('recent: count includes the set-less exercise', txt(sess()[0].querySelector('summary')).includes('3 exercises'), true);
    eq('recent: session with no notes offers to add them', [...sess()[1].querySelectorAll('.recent-note')].map(txt), ['+ WORKOUT NOTE', '+ NOTE']);

    // Add a note to a past exercise
    sess()[1].open = true;
    sess()[1].querySelector('.recent-ex .recent-note').click();
    let inp = $('recent-list').querySelector('input.build-note-input');
    eq('tapping + NOTE opens a text box', [!!inp, document.activeElement === inp, inp.value], [true, true, '']);
    inp.value = '  seat on 4  ';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    eq('added after the fact, under its exercise', state.rawText.split('\n\n')[1], '## 2026-11-03\nDips\n> seat on 4\n- 40# 10');
    eq('list re-rendered with the note, fold state kept', [txt(sess()[1].querySelector('.recent-ex .recent-note')), sess().map(d => d.open), !!$('recent-list').querySelector('input')], ['seat on 4', [true, true], false]);

    // Add a workout note to a past session
    sess()[1].querySelector(':scope > .recent-note').click();
    inp = $('recent-list').querySelector('input.build-note-input');
    inp.value = 'short one';
    inp.blur();
    eq('workout note added after the fact', state.rawText.split('\n\n')[1], '## 2026-11-03\n> short one\nDips\n> seat on 4\n- 40# 10');

    // Edit: two note lines collapse into the edited one
    sess()[0].querySelector(':scope > .recent-note').click();
    inp = $('recent-list').querySelector('input.build-note-input');
    eq('edit box starts with the current note', inp.value, 'felt strong today slept badly though');
    inp.value = 'felt strong';
    inp.blur();
    eq('edited note replaces both old lines', state.rawText.split('\n').slice(0, 3), ['## 2026-11-10', '> felt strong', 'Dips']);

    // Escape cancels; empty removes
    sess()[0].querySelector('.recent-ex .recent-note').click();
    inp = $('recent-list').querySelector('input.build-note-input');
    inp.value = 'changed my mind';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    eq('escape cancels', [state.sessions[0].blocks[0].note, !!$('recent-list').querySelector('input')], ['elbows out', false]);
    sess()[0].querySelector('.recent-ex .recent-note').click();
    inp = $('recent-list').querySelector('input.build-note-input');
    inp.value = '';
    inp.blur();
    eq('emptying a note removes it', [state.sessions[0].blocks[0].note, state.rawText.includes('elbows out')], ['', false]);
    eq('sets untouched by note edits', [state.sessions[0].exercises.Dips.length, state.sessions[0].exercises.Pullup.length, state.sessions[1].exercises.Dips.length], [2, 1, 1]);

    // Builder notes
    builderClear();
    $('build-date').value = '2026-11-18';
    addEx('Dips');
    const blk = i => document.querySelector(`[data-ex-idx="${i}"]`);
    eq('note box hidden until asked for', [blk(0).querySelector('.build-note-input').style.display, blk(0).querySelector('.build-note-btn').style.display], ['none', '']);
    blk(0).querySelector('.build-note-btn').click();
    eq('+ NOTE shows the box', [blk(0).querySelector('.build-note-input').style.display, blk(0).querySelector('.build-note-btn').style.display], ['block', 'none']);
    type(blk(0).querySelector('.build-note-input'), 'went  deeper');
    addSet('45', '10');
    eq('note box survives adding a set', blk(0).querySelector('.build-note-input').value, 'went  deeper');
    eq('last-time hint carries the group note from last time', document.querySelector('.build-last-hint').textContent, 'LAST · Nov 10: 45×10 · 45×10 lbs\n“grip slipping”');
    addEx('Squat');
    blk(1).querySelector('.build-note-btn').click();
    type(blk(1).querySelector('.build-note-input'), 'skipped');
    addEx('Rows');
    blk(2).querySelector('.build-note-btn').click();
    type(blk(2).querySelector('.build-note-input'), 'link me');
    blk(2).querySelector('.build-linker-btn').click();
    addEx('Curls');
    eq('note kept when an exercise is linked into a group', [B()[2].names, B()[2].note, blk(2).querySelector('.build-note-input').value], [['Rows', 'Curls'], 'link me', 'link me']);
    addSet('30', '10'); addSet('20', '10');
    type($('build-note'), '  good session   really ');
    builderSave();
    eq('saved text with notes', state.rawText.split('\n\n')[0],
      '## 2026-11-18\n> good session really\nDips\n> went deeper\n- 45# 10\nSquat\n> skipped\nRows + Curls\n> link me\n- 30# 10 + 20# 10');
    eq('notes cleared after save', [$('build-note').value, state.builder.note, B().length], ['', '', 0]);
    const saved = state.sessions.find(s => s.date === '2026-11-18');
    eq('saved notes re-parse', [saved.note, saved.blocks.map(b => b.note)], ['good session really', ['went deeper', 'skipped', 'link me']]);

    addEx('Dips');
    eq('next time: hint shows the note', document.querySelector('.build-last-hint').textContent, 'LAST · Nov 18: 45×10 lbs\n“went deeper”');
    builderClear();

    state.selectedEx = 'Dips'; renderProgress();
    eq('progress tab shows exercise notes (a group note counts for each member)', [...document.querySelectorAll('#sets-list .set-note')].map(txt), ['seat on 4', 'grip slipping', 'went deeper']);

    // Escaping
    setRawText('## 2026-11-20\n> <b>bold</b> & "quotes"\nDips\n- 45# 10');
    eq('note text is escaped', [txt(sess()[0].querySelector(':scope > .recent-note')), !!$('recent-list').querySelector('b')], ['<b>bold</b> & "quotes"', false]);
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

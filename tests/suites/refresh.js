// Two-phase test: phase 1 builds a workout and reloads the page; phase 2 checks what survived.
(function () {
  const $ = id => document.getElementById(id);
  function setVal(id, v) { const el = $(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  if (!sessionStorage.getItem('phase2')) {
    sessionStorage.setItem('phase2', '1');
    setRawText('## 2026-11-01\nDips\n- 40# 10');
    // The first visit already kept a copy (of the sample log). Age it by two days,
    // so the next start-up is due its daily copy.
    Store.setJSON(SNAP_KEY, loadSnapshots().map(s => ({ ...s, at: s.at - 2 * 86400000 })));
    setVal('build-date', '2026-11-02');
    $('build-ex-input').value = 'Incline Press'; builderAddExercise();
    $('build-reps').value = '10'; builderAddSet();
    $('build-ex-input').value = 'Dips + Pullups'; builderAddExercise();
    setVal('build-weight', '45'); $('build-reps').value = '10'; builderAddSet();
    // typed but not yet added:
    setVal('build-weight', '33'); setVal('build-reps', '7');
    setVal('build-ex-input', 'Half typed');
    setVal('build-note', 'tired today');
    document.querySelector('[data-ex-idx="0"] .build-note-btn').click();
    const ni = document.querySelector('[data-ex-idx="0"] .build-note-input');
    ni.value = 'seat on 4'; ni.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => location.reload(), 50);
    return;
  }
  const out = [];
  let fails = 0;
  function eq(name, got, want) {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g === w) out.push('ok   ' + name);
    else { fails++; out.push('FAIL ' + name + '\n       got  ' + g + '\n       want ' + w); }
  }
  try {
    const B = state.builder.exercises;
    eq('build mode shown after refresh', $('build-mode').style.display, 'block');
    eq('entries survive', B.map(e => e.name || e.names.join(' + ')), ['Incline Press', 'Dips + Pullup']);
    eq('sets survive', B[0].sets.length, 1);
    eq('half-finished round survives', B[1].cur.length, 1);
    eq('active entry survives', state.builder.activeIdx, 1);
    eq('blocks drawn', document.querySelectorAll('.build-ex-block').length, 2);
    eq('date survives', $('build-date').value, '2026-11-02');
    eq('typed weight and reps survive', [$('build-weight').value, $('build-reps').value], ['33', '7']);
    eq('half-typed exercise name survives', $('build-ex-input').value, 'Half typed');
    eq('saved log survives', state.rawText, '## 2026-11-01\nDips\n- 40# 10');
    eq('start-up kept a daily safety copy of the current log', loadSnapshots().map(s => [s.why, JSON.parse(s.data).log === state.rawText]), [['daily copy', true], ['daily copy', false]]);
    eq('workout note survives', [$('build-note').value, state.builder.note], ['tired today', 'tired today']);
    const ni = document.querySelector('[data-ex-idx="0"] .build-note-input');
    eq('exercise note survives and is shown', [ni.value, ni.style.display], ['seat on 4', 'block']);
    // The restored typed weight must not be treated as a guess
    $('build-reps').value = '7'; builderAddSet();
    eq('restored typed values are used as typed', B[1].rounds[0].map(x => x.weight + 'x' + x.reps), ['45x10', '33x7']);
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

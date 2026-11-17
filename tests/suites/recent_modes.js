(function () {
  const out = [];
  let fails = 0;
  function eq(name, got, want) {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g === w) out.push('ok   ' + name);
    else { fails++; out.push('FAIL ' + name + '\n       got  ' + g + '\n       want ' + w); }
  }
  const $ = id => document.getElementById(id);
  const txt = el => el.textContent.replace(/\s+/g, ' ').trim();
  const sessionsShown = () => [...document.querySelectorAll('.recent-session')];

  try {
    // ── Fresh load (no saved data): Build is the default, Import is second ──
    const btns = [...document.querySelectorAll('#log-mode-toggle .mode-btn')];
    eq('toggle order and labels', btns.map(b => b.textContent), ['BUILD', 'IMPORT', 'CALENDAR']);
    eq('build is active on load', btns.map(b => b.classList.contains('active')), [true, false, false]);
    eq('build shown, import hidden on load', [$('build-mode').style.display, $('paste-mode').style.display], ['block', 'none']);
    eq('date filled with today on load', $('build-date').value, todayLocalISO());
    eq('exercise suggestions ready on load', $('build-ex-suggestions').children.length > 0, true);
    btns[1].click();
    eq('import shows the paste box and full log', [$('paste-mode').style.display, $('build-mode').style.display, !!$('log-input'), !!$('raw-log')], ['block', 'none', true, true]);
    eq('import is active after click', btns.map(b => b.classList.contains('active')), [false, true, false]);
    btns[0].click();

    // ── Recent workouts ──
    eq('recent box sits between exercise input and entries',
      [$('recent-box').previousElementSibling.querySelector('#build-ex-input') !== null, $('recent-box').nextElementSibling.id], [true, 'tpl-box']);
    eq('closed by default', [$('recent-list').style.display, $('recent-toggle').textContent, $('recent-toggle').getAttribute('aria-expanded')], ['none', '▸ RECENT WORKOUTS', 'false']);

    setRawText([
      '## 2026-11-10\nDips + Pullups\n- 45# 10 + bw 8\n- 45# 10 + bw 7\nIncline press\n- 47# 10\n- 57# 10 x2\nAb bench\n- 40#/35# 12',
      '## 2026-11-12\nSquat\n- 135# 5',
      '## 2026-11-03\nDips\n- -20# 8',
      '## 2026-10-30\nA\n- 1# 1', '## 2026-10-29\nA\n- 1# 1', '## 2026-10-28\nA\n- 1# 1', '## 2026-10-27\nA\n- 1# 1',
    ].join('\n\n'));

    $('recent-toggle').click();
    eq('opens', [$('recent-list').style.display, $('recent-toggle').textContent, $('recent-toggle').getAttribute('aria-expanded')], ['block', '▾ RECENT WORKOUTS', 'true']);
    eq('open state remembered', localStorage.getItem('ironlog_recent_open'), '1');
    eq('newest first, five at a time', sessionsShown().map(d => d.dataset.date), ['2026-11-12', '2026-11-10', '2026-11-03', '2026-10-30', '2026-10-29']);
    eq('only the newest starts unfolded', sessionsShown().map(d => d.open), [true, false, false, false, false]);
    eq('date line', txt(sessionsShown()[1].querySelector('summary')), 'Tue · Nov 10 2026 · 3 exercises · lbs');
    const ex = [...sessionsShown()[1].querySelectorAll('.recent-ex')].map(e => [txt(e.querySelector('.recent-name')), [...e.querySelectorAll('.set-chip')].map(txt)]);
    eq('session shown as written, pairing kept', ex, [
      ['Dips + Pullup', ['45×10 + BW×8', '45×10 + BW×7']],
      ['Incline Press', ['47×10', '57×10', '57×10']],
      ['Ab Bench', ['40/35×12']],
    ]);
    eq('assisted set', txt(sessionsShown()[2].querySelector('.set-chip')), '-20×8');
    eq('show older button', txt($('recent-list').querySelector('.build-switch-btn')), 'SHOW OLDER (2 more)');

    sessionsShown()[1].open = true;
    $('recent-list').querySelector('.build-switch-btn').click();
    eq('show older reveals the rest', [sessionsShown().length, $('recent-list').querySelector('.build-switch-btn')], [7, null]);
    eq('unfolded sessions stay unfolded', sessionsShown().slice(0, 3).map(d => d.open), [true, true, false]);

    // Stays in the builder: entry state untouched by using the list
    $('build-ex-input').value = 'Dips'; builderAddExercise();
    $('build-reps').value = '9'; builderAddSet();
    $('recent-toggle').click(); $('recent-toggle').click();
    eq('builder untouched by the recent list', [state.builder.exercises.length, state.builder.exercises[0].sets.length, $('build-mode').style.display], [1, 1, 'block']);

    // Saving a workout puts it at the top of the list
    $('build-date').value = '2026-11-14';
    builderSave();
    eq('saved workout appears first', [sessionsShown()[0].dataset.date, sessionsShown().length], ['2026-11-14', 5]);

    setUnit('kg');
    eq('unit change re-renders', txt(sessionsShown()[1].querySelector('summary')).endsWith('· kg'), true);
    setUnit('lbs');

    setRawText('');
    eq('empty log message', txt($('recent-list')), 'No workouts logged yet.');
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

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
  const blk = i => document.querySelector(`[data-ex-idx="${i}"]`);
  const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  function addEx(t) { $('build-ex-input').value = t; builderAddExercise(); }
  const toast = () => $('toast').classList.contains('show') ? $('toast').textContent : null;
  window.confirm = () => true;

  // Fix "today" so the calendar is the same whenever the test runs: Mon 16 Nov 2026
  const realToday = todayLocalISO;
  todayLocalISO = () => '2026-11-16';
  let T = new Date(2026, 10, 16, 9, 0, 0).getTime();
  clockNow = () => T;
  calInit(); // the calendar picked its month and day at start-up, from the real date

  try {
    builderClear();
    $('build-date').value = '2026-11-16';
    setRawText('## 2026-11-10\n> felt good\nDips + Pullups\n- 45# 10 + bw 8\nIncline press\n> seat on 4\n- 47# 10\n- 57# 10\nRows\n- 50# 6 @10-10\n\n## 2026-11-03\nSquat\n- 135# 5');
    setLogMode('build');

    // ═══ Templates ═══
    eq('templates bar closed and empty', [$('tpl-toggle').textContent, $('tpl-list').style.display], ['▸ TEMPLATES', 'none']);
    $('tpl-toggle').click();
    eq('opens with a hint and a save row', [$('tpl-toggle').textContent, txt($('tpl-list').querySelector('.recent-empty')), !!$('tpl-name')], ['▾ TEMPLATES', 'No templates yet. Build a workout, then save it here.', true]);
    type($('tpl-name'), 'Push day');
    saveBuilderAsTemplate();
    eq('cannot save an empty workout', [templates.length, toast()], [0, 'Add exercises first']);

    addEx('Dips + Pullups');
    addEx('Incline Press');
    addEx('Rows');
    blk(2).querySelector('.build-tempo-btn').click();
    type(blk(2).querySelector('.build-tempo-down'), '10'); type(blk(2).querySelector('.build-tempo-up'), '10');
    $('build-reps').value = '6'; builderAddSet();
    type($('tpl-name'), '   ');
    saveBuilderAsTemplate();
    eq('a name is required', [templates.length, toast()], [0, 'Give the template a name first']);
    type($('tpl-name'), '  Push   day ');
    saveBuilderAsTemplate();
    eq('saved from the builder: exercises, groups and tempo, no weights', templates,
      [{ name: 'Push day', entries: [{ names: ['Dips', 'Pullup'], tempo: '' }, { names: ['Incline Press'], tempo: '' }, { names: ['Rows'], tempo: '10-10' }] }]);
    eq('listed, counted and confirmed', [$('tpl-toggle').textContent, [...document.querySelectorAll('.tpl-row')].map(r => txt(r.querySelector('.recent-name')) + ' | ' + txt(r.querySelector('.tpl-sub'))), toast(), $('tpl-name').value],
      ['▾ TEMPLATES (1)', ['Push day | Dips + Pullup · Incline Press · Rows @10-10'], 'Saved template “Push day”', '']);
    eq('stored', JSON.parse(localStorage.getItem('ironlog_templates')).map(t => t.name), ['Push day']);
    eq('saving did not disturb the workout in progress', [B().length, B()[2].sets.length], [3, 1]);

    // Apply to a new workout
    builderClear();
    $('build-date').value = '2026-11-16';
    document.querySelector('.tpl-row .tpl-use').click();
    eq('applied to an empty workout', B().map(e => [entryTitle(e), e.tempo || '', entryHasData(e)]), [['Dips + Pullup', '', false], ['Incline Press', '', false], ['Rows', '10-10', false]]);
    eq('first exercise is ready to type, weight guessed from last time', [state.builder.activeIdx, $('build-weight').value, document.querySelector('.build-round-label').textContent], [0, '45', 'ROUND 1 · Dips (1 of 2)']);
    eq('tempo row shown on the tempo exercise', [blk(2).querySelector('.build-tempo-row').style.display, blk(2).querySelector('.build-tempo-down').value], ['flex', '10']);
    eq('save button available', $('build-actions').style.display, 'block');
    eq('toast', toast(), 'Loaded “Push day”');
    document.querySelector('.tpl-row .tpl-use').click();
    eq('applying twice adds nothing', [B().length, toast()], [3, '“Push day” is already in this workout']);

    // Apply on top of a workout already started
    builderClear();
    $('build-date').value = '2026-11-16';
    addEx('Squat');
    $('build-weight').value = '135'; $('build-reps').value = '5'; builderAddSet();
    addEx('Incline Press');
    document.querySelector('.tpl-row .tpl-use').click();
    eq('added to a workout in progress without duplicates or losing sets', B().map(e => [entryTitle(e), isGroup(e) ? 0 : e.sets.length]), [['Squat', 1], ['Incline Press', 0], ['Dips + Pullup', 0], ['Rows', 0]]);
    builderClear();

    // From a past workout
    if (!recentOpen) $('recent-toggle').click();
    const sess = () => [...document.querySelectorAll('.recent-session')];
    sess()[1].open = true;
    eq('past workouts offer save as template', sess().map(d => txt(d.querySelector('.recent-tpl'))), ['SAVE AS TEMPLATE', 'SAVE AS TEMPLATE']);
    sess()[1].querySelector('.recent-tpl').click();
    let inp = $('recent-list').querySelector('input.build-note-input');
    eq('name box opens', [!!inp, document.activeElement === inp], [true, true]);
    inp.value = 'Leg day';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    eq('saved from a past workout, sorted by name', templates.map(t => [t.name, templateSummary(t)]), [['Leg day', 'Squat'], ['Push day', 'Dips + Pullup · Incline Press · Rows @10-10']]);
    eq('recent list restored', [!!$('recent-list').querySelector('input'), sess().length], [false, 2]);
    sess()[0].querySelector('.recent-tpl').click();
    inp = $('recent-list').querySelector('input.build-note-input');
    inp.value = 'push DAY';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    eq('same name (any case) replaces, tempo read from the logged sets', [templates.length, templates[1].name, templateSummary(templates[1]), toast()], [2, 'push DAY', 'Dips + Pullup · Incline Press · Rows @10-10', 'Updated template “push DAY”']);
    sess()[0].querySelector('.recent-tpl').click();
    $('recent-list').querySelector('input.build-note-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    eq('escape cancels', [templates.length, !!$('recent-list').querySelector('input')], [2, false]);
    eq('notes still editable in the recent list', txt(sess()[0].querySelector(':scope > .recent-note')), 'felt good');

    // Delete
    [...document.querySelectorAll('.tpl-row')].find(r => r.dataset.name === 'Leg day').querySelector('.tpl-del').click();
    eq('deleted', [templates.map(t => t.name), JSON.parse(localStorage.getItem('ironlog_templates')).length, $('tpl-toggle').textContent], [['push DAY'], 1, '▾ TEMPLATES (1)']);

    // ═══ Calendar ═══
    const btns = [...document.querySelectorAll('#log-mode-toggle .mode-btn')];
    btns[2].click();
    eq('calendar mode shown', [$('cal-mode').style.display, $('build-mode').style.display, $('paste-mode').style.display, btns.map(b => b.classList.contains('active'))], ['block', 'none', 'none', [false, false, true]]);
    const cells = () => [...document.querySelectorAll('#cal-grid .cal-cell')];
    const day = iso => cells().find(c => c.dataset.date === iso);
    eq('month shown', $('cal-title-month').textContent, 'November 2026');
    eq('grid: November 2026 starts on a Sunday and has 30 days', [cells().filter(c => c.classList.contains('blank')).length, cells().filter(c => c.dataset.date).length, document.querySelectorAll('.cal-wd').length], [0, 30, 7]);
    eq('today marked and selected', [day('2026-11-16').classList.contains('today'), day('2026-11-16').classList.contains('selected')], [true, true]);
    eq('logged days carry a dot', cells().filter(c => c.querySelector('.dot.log')).map(c => c.dataset.date), ['2026-11-03', '2026-11-10']);
    eq('empty day', txt($('cal-detail').querySelector('.recent-empty')), 'Nothing logged or planned.');

    day('2026-11-10').click();
    eq('selecting a past day shows its workout, read-only', [txt($('cal-detail').querySelector('.cal-day-title')), txt($('cal-detail').querySelector('.recent-date')),
      [...$('cal-detail').querySelectorAll('.recent-ex')].map(e => txt(e.querySelector('.recent-name')) + ': ' + [...e.querySelectorAll('.set-chip')].map(txt).join(', ')), [...$('cal-detail').querySelectorAll('.recent-note-text')].map(txt), $('cal-detail').querySelectorAll('button.recent-note, .recent-tpl').length],
      ['Tue · Nov 10 2026', 'LOGGED WORKOUT · 3 exercises · lbs', ['Dips + Pullup: 45×10 + BW×8', 'Incline Press: 47×10, 57×10', 'Rows: 50×6 @10-10'], ['felt good', 'seat on 4'], 0]);
    const gl = $('cal-detail').querySelector('.cal-logged .cal-link');
    const q = new URL(gl.href).searchParams;
    eq('google link for a logged workout: all-day event with the details', [new URL(gl.href).origin + new URL(gl.href).pathname, q.get('action'), q.get('text'), q.get('dates'), q.get('details'), gl.target, gl.rel],
      ['https://calendar.google.com/calendar/render', 'TEMPLATE', 'Workout', '20261110/20261111', 'felt good\n\nDips + Pullup: 45x10 + BWx8 lbs\nIncline Press: 47x10, 57x10 lbs\n  (seat on 4)\nRows: 50x6 @10-10 lbs', '_blank', 'noopener']);

    // Month navigation
    document.querySelector('.cal-nav[aria-label="Next month"]').click();
    eq('next month: December 2026 starts on a Tuesday', [$('cal-title-month').textContent, cells().filter(c => c.classList.contains('blank')).length, cells().filter(c => c.dataset.date).length], ['December 2026', 2, 31]);
    document.querySelector('.cal-nav[aria-label="Next month"]').click();
    eq('year rolls over', $('cal-title-month').textContent, 'January 2027');
    document.querySelector('.cal-nav[aria-label="Previous month"]').click();
    document.querySelector('.cal-nav[aria-label="Previous month"]').click();
    document.querySelector('.cal-nav[aria-label="Previous month"]').click();
    eq('previous months', [$('cal-title-month').textContent, cells().filter(c => c.dataset.date).length], ['October 2026', 31]);
    document.querySelector('.cal-today').click();
    eq('today button returns', [$('cal-title-month').textContent, cal.sel], ['November 2026', '2026-11-16']);

    // Schedule
    $('cal-detail').querySelector('.build-switch-btn').click();
    eq('needs a template or a title', [plan.length, toast()], [0, 'Pick a template or type a title']);
    eq('template picker lists templates', [...$('cal-tpl').options].map(o => o.textContent), ['No template', 'push DAY']);
    $('cal-tpl').value = 'push DAY';
    $('cal-detail').querySelector('.build-switch-btn').click();
    eq('planned today from a template', plan.map(p => [p.date, p.time, p.title, p.template]), [['2026-11-16', '', 'push DAY', 'push DAY']]);
    eq('day shows a ring, not a dot', [!!day('2026-11-16').querySelector('.dot.plan'), !!day('2026-11-16').querySelector('.dot.log')], [true, false]);
    eq('plan card', [txt($('cal-detail').querySelector('.cal-plan-title')), txt($('cal-detail').querySelector('.cal-plan .tpl-sub'))], ['push DAY · planned', 'Dips + Pullup · Incline Press · Rows @10-10']);

    day('2026-11-20').click();
    $('cal-title').value = 'Long run'; $('cal-time').value = '18:30';
    $('cal-detail').querySelector('.build-switch-btn').click();
    eq('planned with a title and a time, no template', plan.map(p => [p.date, p.time, p.title, p.template]), [['2026-11-16', '', 'push DAY', 'push DAY'], ['2026-11-20', '18:30', 'Long run', '']]);
    const pl = new URL($('cal-detail').querySelector('.cal-plan .cal-link').href).searchParams;
    eq('google link for a timed plan: one hour, local time', [pl.get('text'), pl.get('dates'), pl.get('details')], ['Long run', '20261120T183000/20261120T193000', null]);
    eq('stored', JSON.parse(localStorage.getItem('ironlog_plan')).length, 2);
    eq('late-night event ends the next day', eventTimes('2026-12-31', '23:30'), { allDay: false, start: '20261231T233000', end: '20270101T003000' });

    // Calendar file
    const ics = buildIcs();
    const unfolded = ics.replace(/\r\n /g, '');
    eq('calendar file frame', [ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'), ics.endsWith('END:VCALENDAR\r\n'), (ics.match(/BEGIN:VEVENT/g) || []).length, ics.split('\r\n').every(l => l.length <= 61)], [true, true, 4, true]);
    eq('logged workout event', unfolded.split('\r\n').filter(l => /^(UID|DTSTART|DTEND|SUMMARY|DESCRIPTION).*/.test(l)).slice(0, 5),
      ['UID:log-2026-11-03@ironlog', 'DTSTART;VALUE=DATE:20261103', 'DTEND;VALUE=DATE:20261104', 'SUMMARY:Workout', 'DESCRIPTION:Squat: 135x5 lbs']);
    eq('planned events: all-day and timed', unfolded.split('\r\n').filter(l => /^(DTSTART|DTEND|SUMMARY)/.test(l)).slice(6),
      ['DTSTART;VALUE=DATE:20261116', 'DTEND;VALUE=DATE:20261117', 'SUMMARY:push DAY', 'DTSTART:20261120T183000', 'DTEND:20261120T193000', 'SUMMARY:Long run']);
    eq('text is escaped for the file', icsEscape('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne');

    // Planned today: banner in the builder, then START
    btns[0].click();
    eq('banner in the builder', [$('plan-banner').style.display, txt($('plan-banner').querySelector('span'))], ['block', 'PLANNED TODAY · push DAY']);
    $('plan-banner').querySelector('.cal-start').click();
    eq('start from the banner loads the template', [B().map(entryTitle), $('build-date').value, $('build-mode').style.display], [['Dips + Pullup', 'Incline Press', 'Rows'], '2026-11-16', 'block']);
    builderClear();

    // START from the calendar on another day sets the date
    btns[2].click();
    day('2026-11-20').click();
    $('cal-detail').querySelector('.cal-start').click();
    eq('start a titled plan: builder opens on that date', [$('build-mode').style.display, $('build-date').value, B().length, toast()], ['block', '2026-11-20', 0, 'Started “Long run”']);
    builderClear();

    // Logging today's workout marks the plan done and clears the banner
    $('build-date').value = '2026-11-16';
    addEx('Dips'); $('build-weight').value = '45'; $('build-reps').value = '10'; builderAddSet();
    builderSave();
    eq('banner gone once today is logged', $('plan-banner').style.display, 'none');
    btns[2].click();
    day('2026-11-16').click();
    eq('calendar: today now a dot, plan marked done', [!!day('2026-11-16').querySelector('.dot.log'), !!day('2026-11-16').querySelector('.dot.plan'), txt($('cal-detail').querySelector('.cal-plan-title'))], [true, false, '✓ push DAY · done']);
    eq('done plans are left out of the calendar file', (buildIcs().match(/BEGIN:VEVENT/g) || []).length, 4);

    // Remove a plan
    day('2026-11-20').click();
    $('cal-detail').querySelector('.cal-remove').click();
    eq('plan removed', [plan.map(p => p.title), !!day('2026-11-20').querySelector('.dot')], [['push DAY'], false]);

    // Deleting a template leaves its plans usable
    templates = []; store('ironlog_templates', templates);
    day('2026-11-16').click();
    eq('plan survives its template being deleted', [txt($('cal-detail').querySelector('.cal-plan-title')), $('cal-detail').querySelector('.cal-plan .tpl-sub')], ['✓ push DAY · done', null]);

    // Bad stored data is ignored
    localStorage.setItem('ironlog_templates', '{"oops":1}');
    localStorage.setItem('ironlog_plan', JSON.stringify([{ date: 'nope', title: 'x' }, { date: '2026-12-01', title: '' }, { date: '2026-12-02', title: 'ok', time: '25h' }]));
    loadTemplates(); loadPlan();
    eq('bad stored data ignored', [templates, plan.map(p => [p.date, p.title, p.time])], [[], [['2026-12-02', 'ok', '']]]);
    btns[0].click();
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  todayLocalISO = realToday;
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

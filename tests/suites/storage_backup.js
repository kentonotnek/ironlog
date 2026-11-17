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
  const toast = () => $('toast').classList.contains('show') ? $('toast').textContent : null;
  const clearToast = () => $('toast').classList.remove('show');

  // Fixed clock and date; dialogs and downloads are captured instead of shown
  todayLocalISO = () => '2026-11-16';
  let T = new Date(2026, 10, 16, 9, 2, 0).getTime();
  clockNow = () => T;
  let confirmAnswer = true;
  const confirms = [], alerts = [], downloads = [];
  window.confirm = m => { confirms.push(m); return confirmAnswer; };
  window.alert = m => { alerts.push(m); };
  downloadText = (name, text, type) => { downloads.push({ name, text, type }); };

  // A backend that holds data in memory and can be made to refuse writes
  function memoryBackend(limitChars) {
    const data = {};
    return {
      name: 'memory', data, refuse: false, writes: 0,
      read: k => (k in data ? data[k] : null),
      write(k, v) {
        const size = Object.entries(data).reduce((a, [kk, vv]) => a + (kk === k ? 0 : vv.length), 0) + v.length;
        if (this.refuse || (limitChars && size > limitChars)) throw new Error('QuotaExceededError');
        data[k] = v; this.writes++;
      },
      remove: k => { delete data[k]; },
      keys: () => Object.keys(data),
    };
  }

  let failCalls = 0;
  const LOG_A ='## 2026-11-10\n> felt good\nDips\n- 45# 10\n\n## 2026-11-03\nSquat\n- 135# 5';
  const LOG_B = '## 2026-11-12\nRows\n- 50# 8';

  try {
    // ═══ Store ═══
    eq('browser backend by default', Store.backendName(), 'browser');
    eq('set/get round trip, write-through to the browser', [Store.set('ironlog_test', 'a'), Store.get('ironlog_test'), localStorage.getItem('ironlog_test')], [true, 'a', 'a']);
    eq('JSON helpers and fallbacks', [Store.setJSON('ironlog_test', { n: 1 }), Store.getJSON('ironlog_test', null), Store.getJSON('ironlog_missing', 'dflt'), (Store.set('ironlog_test', '{bad'), Store.getJSON('ironlog_test', 'dflt'))], [true, { n: 1 }, 'dflt', 'dflt']);
    eq('keys lists only the app\'s own', [Store.keys().includes('ironlog_test'), Store.keys().every(k => k.startsWith('ironlog_'))], [true, true]);
    eq('remove', [Store.remove('ironlog_test'), Store.get('ironlog_test')], [true, null]);

    builderClear();
    setRawText(LOG_A);
    templates = []; plan = []; Store.remove('ironlog_templates'); Store.remove('ironlog_plan'); Store.remove('ironlog_snapshots'); Store.remove('ironlog_last_backup');
    eq('a good save says saved', [$('save-indicator').textContent, $('save-indicator').classList.contains('error'), JSON.parse(localStorage.getItem('ironlog_v1')).rawText === LOG_A], ['SAVED ✓', false, true]);

    // Writes failing: the app says so instead of claiming it saved
    const mem = memoryBackend();
    Store.use(mem);
    Store.onFail(() => { failCalls++; renderData(); });
    mem.refuse = true;
    setRawText(LOG_A + '\n\n' + LOG_B);
    eq('a failed save says not saved, and stays visible', [$('save-indicator').textContent, $('save-indicator').classList.contains('error'), $('save-indicator').classList.contains('show'), Store.failing()], ['NOT SAVED ✗', true, true, true]);
    eq('the change is still in memory to back up', state.sessions.length, 3);
    openSettings();
    eq('settings shows the warning', txt($('data-status').querySelector('.warn')), '⚠ Changes are NOT being saved: storage is full or blocked. Back up now.');
    closeSettings();
    mem.refuse = false;
    setRawText(LOG_A);
    eq('recovers when writes work again', [$('save-indicator').textContent, $('save-indicator').classList.contains('error'), Store.failing(), JSON.parse(mem.data.ironlog_v1).rawText === LOG_A], ['SAVED ✓', false, false, true]);

    // Out of room: safety copies are given up before the log is
    const small = memoryBackend(1200);
    Store.use(small);
    setRawText('## 2026-11-01\nDips\n- 45# 10');
    for (let i = 0; i < 4; i++) { T += 1000; setRawText(state.rawText + `\n- ${50 + i}# 10`); takeSnapshot('test ' + i); }
    const before = loadSnapshots().length;
    const bigLog = state.rawText + '\n' + Array.from({ length: 60 }, (_, i) => `- ${100 + i}# 5`).join('\n');
    setRawText(bigLog);
    eq('log saved by trimming safety copies when storage is full', [before > 1, loadSnapshots().length <= 1, JSON.parse(small.data.ironlog_v1).rawText === bigLog, $('save-indicator').textContent], [true, true, true, 'SAVED ✓']);
    Store.use(null);
    eq('back on the browser backend', Store.backendName(), 'browser');
    Store.remove('ironlog_snapshots');

    // ═══ Backup ═══
    setRawText(LOG_A);
    templates = [{ name: 'Push day', entries: [{ names: ['Dips', 'Pullup'], tempo: '' }, { names: ['Rows'], tempo: '10-10' }] }];
    store('ironlog_templates', templates);
    plan = [{ id: 'p1', date: '2026-11-20', time: '18:30', title: 'Push day', template: 'Push day' }];
    savePlan();
    setUnit('kg');
    const backup = buildBackup();
    eq('backup holds everything', [backup.app, backup.version, backup.exportedAt, backup.log, backup.templates.length, backup.plan.length, backup.settings.unit, Object.keys(backup).sort()],
      ['ironlog', 1, new Date(T).toISOString(), LOG_A, 1, 1, 'kg', ['app', 'exportedAt', 'log', 'plan', 'settings', 'templates', 'version']]);

    openSettings();
    eq('status before any backup', [...$('data-status').children].map(txt).slice(0, 2), ['2 workouts · 1 template · 1 planned', 'Last backup: never. A backup file is the only copy outside this device.']);
    [...document.querySelectorAll('#settings-drawer .settings-chip')].find(b => b.textContent === 'BACK UP').click();
    eq('back up downloads one file', downloads.map(d => [d.name, d.type, JSON.parse(d.text).log === LOG_A]), [['iron-log-backup-2026-11-16.json', 'application/json', true]]);
    eq('status after a backup', [[...$('data-status').children].map(txt)[1], toast()], ['Last backup: Nov 16 2026', 'Backup saved']);
    const backupText = downloads[0].text;
    downloads.length = 0;
    $('export-btn').click();
    eq('header button is the same backup', [$('export-btn').textContent, downloads.length, downloads[0] && downloads[0].name], ['BACKUP', 1, 'iron-log-backup-2026-11-16.json']);
    downloads.length = 0;
    [...document.querySelectorAll('#settings-drawer .settings-chip')].find(b => b.textContent === 'LOG AS TEXT').click();
    eq('log as text still available', downloads.map(d => [d.name, d.text]), [['workout-log.md', LOG_A]]);
    closeSettings();

    // ═══ Reading files ═══
    const pb = t => { const r = parseBackup(t); return r.ok ? [r.kind, parseSessions(r.data.log).length] : r.error; };
    eq('full backup recognised', pb(backupText), ['full', 2]);
    eq('plain log text recognised', pb(LOG_B), ['log', 1]);
    eq('stored log form recognised', pb(JSON.stringify({ rawText: LOG_B })), ['log', 1]);
    eq('newer backup refused', pb(JSON.stringify({ app: 'ironlog', version: 99, log: LOG_B })), 'This backup was made by a newer version of Iron Log. Update the app, then try again.');
    eq('damaged backup refused', pb(JSON.stringify({ app: 'ironlog', version: 1 })), 'This backup file is damaged: it has no workout log.');
    eq('unrelated files refused', [pb('hello world'), pb('{"some":"json"}'), pb('[1,2,3]'), pb(''), pb('42')], Array(5).fill('This file is not an Iron Log backup or workout log.'));

    // ═══ Restore ═══
    // Change everything, then restore the backup
    setRawText(LOG_B);
    templates = []; store('ironlog_templates', templates);
    plan = []; savePlan();
    setUnit('lbs');
    Store.remove('ironlog_snapshots');
    clearToast();

    confirmAnswer = false;
    eq('restore asks first and can be cancelled', [restoreFromText(backupText), state.rawText, loadSnapshots().length], [false, LOG_B, 0]);
    eq('the question says what is in the file and what is replaced', confirms.pop(),
      'Restore this backup from Nov 16 2026?\n\nIt has 2 workouts, 1 template and 1 planned workout.\n\nYour current data (1 workout) will be replaced. A safety copy is kept, so you can go back.');

    confirmAnswer = true;
    T += 60000;
    eq('restore succeeds', restoreFromText(backupText), true);
    eq('log, templates, plan and settings are back', [state.rawText, state.sessions.length, templates.map(t => t.name), plan.map(p => p.title), settings.unit], [LOG_A, 2, ['Push day'], ['Push day'], 'kg']);
    eq('and saved', [JSON.parse(localStorage.getItem('ironlog_v1')).rawText, JSON.parse(localStorage.getItem('ironlog_templates')).length, JSON.parse(localStorage.getItem('ironlog_plan')).length, JSON.parse(localStorage.getItem('ironlog_settings')).unit], [LOG_A, 1, 1, 'kg']);
    eq('screens follow', [$('subtitle').textContent.startsWith('2 sessions'), [...document.querySelectorAll('.pr-row')].map(r => r.dataset.ex), $('tpl-toggle').textContent.includes('(1)'), document.querySelector('.pr-weight-unit').textContent.trim(), toast()],
      [true, ['Dips', 'Squat'], true, 'kg', 'Restored 2 workouts']);
    const snap1 = loadSnapshots();
    eq('what was there before is kept as a safety copy', [snap1.length, snap1[0].why, JSON.parse(snap1[0].data).log], [1, 'before restore', LOG_B]);
    const again = buildBackup();
    eq('round trip is exact', [again.log, again.templates, again.plan, again.settings], [backup.log, backup.templates, backup.plan, backup.settings]);

    // A log-only file leaves templates and plans alone
    T += 60000;
    restoreFromText(LOG_B);
    eq('log-only restore', [state.rawText, templates.length, plan.length, confirms.pop().startsWith('Restore this workout log?\n\nIt has 1 workout. Your templates and planned workouts are not affected.')], [LOG_B, 1, 1, true]);

    // Bad file
    restoreFromText('not a backup');
    eq('bad file: a message, nothing changes', [alerts.pop(), state.rawText], ['This file is not an Iron Log backup or workout log.', LOG_B]);

    // Hostile or sloppy content in a backup is cleaned on the way in
    T += 60000;
    restoreFromText(JSON.stringify({ app: 'ironlog', version: 1, log: '## Nov 10 2026\nDips\n- 45# 10',
      templates: [{ name: 'ok', entries: [{ names: ['Dips'], tempo: 'junk' }] }, { name: '', entries: [] }, 'nope', null],
      plan: [{ date: 'bad', title: 'x' }, { id: 'k', date: '2026-12-01', title: 'Keep', time: '99' }],
      settings: { theme: 'neon', unit: 'lbs', accentColor: 'javascript:alert(1)' } }));
    eq('backup content is validated', [state.rawText, templates, plan.map(p => [p.date, p.title, p.time]), settings.theme, settings.unit, /^#[0-9a-f]{6}$/i.test(settings.accentColor)],
      ['## 2026-11-10\nDips\n- 45# 10', [{ name: 'ok', entries: [{ names: ['Dips'], tempo: '' }] }], [['2026-12-01', 'Keep', '']], 'dark', 'lbs', true]);

    // ═══ Safety copies ═══
    Store.remove('ironlog_snapshots');
    setRawText(LOG_A);
    eq('first copy', [takeSnapshot('manual'), loadSnapshots().length], [true, 1]);
    eq('no copy when nothing changed', [takeSnapshot('again'), loadSnapshots().length], [false, 1]);
    T += 5000;
    setLogMode('paste');
    $('log-input').value = LOG_B;
    addSession();
    eq('importing keeps a copy of how things were', [loadSnapshots().length, loadSnapshots()[0].why, JSON.parse(loadSnapshots()[0].data).log === LOG_A], [1, 'manual', true]);
    T += 5000;
    $('raw-log').dispatchEvent(new Event('focus'));
    eq('editing the full log keeps a copy first', [loadSnapshots().length, loadSnapshots()[0].why, parseSessions(JSON.parse(loadSnapshots()[0].data).log).length], [2, 'before editing the log', 3]);
    setLogMode('build');

    // Going back
    T += 5000;
    setRawText('## 2026-11-16\nOops\n- 1# 1');
    openSettings();
    const rows = () => [...document.querySelectorAll('#snap-list .snap-row')];
    eq('copies listed newest first', rows().map(r => [...r.querySelector('.snap-main').children].map(txt)), [['Nov 16, 9:05 AM', 'before editing the log · 3 workouts'], ['Nov 16, 9:05 AM', 'manual · 2 workouts']]);
    rows()[1].querySelector('.snap-restore').click();
    eq('go back restores that copy', [state.rawText, confirms.pop().includes('It has 2 workouts. Your current data is kept as a safety copy first.'), toast().startsWith('Went back to Nov 16')], [LOG_A, true, true]);
    eq('and the mistake itself is kept, in case going back was the mistake', [loadSnapshots().length, loadSnapshots()[0].why, JSON.parse(loadSnapshots()[0].data).log], [3, 'before going back', '## 2026-11-16\nOops\n- 1# 1']);
    closeSettings();

    // Limits
    for (let i = 0; i < 14; i++) { T += 1000; setRawText(LOG_A + `\n\n## 2026-10-${String(i + 1).padStart(2, '0')}\nDips\n- ${i + 1}# 1`); takeSnapshot('n' + i); }
    eq('at most ten copies, newest kept', [loadSnapshots().length, loadSnapshots()[0].why, loadSnapshots()[9].why], [10, 'n13', 'n4']);
    Store.remove('ironlog_snapshots');
    const huge = '## 2026-11-01\nDips\n' + '- 45# 10\n'.repeat(70000);
    for (let i = 0; i < 4; i++) { T += 1000; state.rawText = huge + `- ${i}# 1`; takeSnapshot('huge' + i); }
    eq('copies are also capped by size', [loadSnapshots().length, loadSnapshots()[0].why], [2, 'huge3']);
    Store.remove('ironlog_snapshots');
    setRawText(LOG_A);

    // Another tab
    localStorage.setItem('ironlog_v1', JSON.stringify({ rawText: LOG_B }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'ironlog_v1' }));
    eq('a change from another tab is taken up', [state.rawText, $('raw-log').value, state.sessions.length, toast()], [LOG_B, LOG_B, 1, 'Log updated from another tab']);
    localStorage.setItem('ironlog_templates', JSON.stringify([{ name: 'From tab 2', entries: [{ names: ['Squat'], tempo: '' }] }]));
    window.dispatchEvent(new StorageEvent('storage', { key: 'ironlog_templates' }));
    eq('templates from another tab too', templates.map(t => t.name), ['From tab 2']);
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  setTimeout(() => {
    eq('the failure alarm fired once: not for the quiet retry, nor when trimming copies made room', failCalls, 1);
    if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
    out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
    document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
  }, 50);
})();

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
  function addEx(t) { $('build-ex-input').value = t; builderAddExercise(); }
  const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  function addSet(w, r) { if (w !== null) type($('build-weight'), w); $('build-reps').value = r; builderAddSet(); }
  const toast = () => $('toast').classList.contains('show') ? $('toast').textContent : null;
  const brief = sets => sets.map(s => (s.bw ? 'bw' : s.v) + 'x' + s.reps + (s.tempo ? '@' + s.tempo : ''));

  // A clock the test moves by hand
  let T = 1000000;
  clockNow = () => T;
  const advance = (runner, secs) => { T += secs * 1000; runner.tick(); };

  try {
    // ═══ Tempo: format ═══
    eq('normTempo', ['10-10', '@10-10', '3-1-2-0', '10-0-10-0', '2.5-5', '10', '1-2-3', '0-0', 'abc', '8-10x'].map(normTempo),
      ['10-10', '10-10', '3-1-2-0', '10-10', '2.5-5', '', '', '', '', '']);
    eq('tempoPhases drops zero-length holds', [tempoPhases('10-10').map(p => p.label + p.secs), tempoPhases('3-1-2-0').map(p => p.label + p.secs)],
      [['DOWN10', 'UP10'], ['DOWN3', 'HOLD1', 'UP2']]);
    eq('statName / baseName round trip', [statName('Dips', '10-10'), statName('Dips', ''), baseName('Dips @10-10'), baseName('Dips @3-1-2-0'), baseName('Dips'), baseName('Bicep Curl (EZ Bar) @2.5-5')],
      ['Dips @10-10', 'Dips', 'Dips', 'Dips', 'Dips', 'Bicep Curl (EZ Bar)']);

    let ss = parseSessions('## 2026-11-01\nDips\n- 45# 10\n- 25# 6 @10-10\n- 25# 5 @10-10 x2\n- bw 4 @10-0-10-0\n- 8 @5-5\nRows + Curls\n- 50# 8 @4-2 + 20# 8');
    eq('tempo sets are tracked under their own name', Object.fromEntries(Object.entries(ss[0].exercises).map(([k, v]) => [k, brief(v)])), {
      'Dips': ['45x10'],
      'Dips @10-10': ['25x6@10-10', '25x5@10-10', '25x5@10-10', 'bwx4@10-10'],
      'Dips @5-5': ['bwx8@5-5'],
      'Rows @4-2': ['50x8@4-2'],
      'Curls': ['20x8'],
    });
    eq('blocks keep the plain names', ss[0].blocks.map(b => b.names.join('+')), ['Dips', 'Rows+Curls']);
    eq('nothing skipped', ss.skippedLines, 0);
    const prs = computePRs(ss);
    eq('separate records', [prs['Dips'].v, prs['Dips @10-10'].v], [45, 25]);
    eq('a rep range is not mistaken for a tempo', brief(parseSessions('## 2026-11-01\nDips\n- 45# 8-10').slice(0, 1)[0].exercises.Dips), ['45x8']);

    // ═══ Tempo: builder ═══
    builderClear();
    setRawText('## 2026-11-01\nDips\n- 45# 10\n- 50# 8\n- 25# 6 @10-10\n- 30# 5 @10-10\n> slow day');
    setLogMode('build');
    $('build-date').value = '2026-11-15';
    addEx('Dips');
    eq('no tempo: normal history and no pacer', [$('build-weight').value, document.querySelector('.build-pacer-btn').style.display, blk(0).querySelector('.build-tempo-row').style.display], ['45', 'none', 'none']);
    blk(0).querySelector('.build-tempo-btn').click();
    eq('TEMPO opens the row', [blk(0).querySelector('.build-tempo-row').style.display, blk(0).querySelector('.build-tempo-btn').style.display], ['flex', 'none']);
    type(blk(0).querySelector('.build-tempo-down'), '10');
    eq('half-filled tempo is not a tempo yet', B()[0].tempo, '');
    type(blk(0).querySelector('.build-tempo-up'), '10');
    eq('tempo set on the entry', B()[0].tempo, '10-10');
    eq('weight guess and hint switch to the slow-tempo history', [$('build-weight').value, document.querySelector('.build-last-hint').textContent],
      ['25', 'LAST · Nov 1: 25×6 @10-10 · 30×5 @10-10 lbs\n“slow day”']);
    eq('pacer offered', [document.querySelector('.build-pacer-btn').style.display, document.querySelector('.build-pacer-btn').textContent], ['block', '▶ START PACER · 10-10']);

    addSet(null, '6');
    eq('set carries the tempo', B()[0].sets[0], { weight: 25, reps: 6, assisted: false, tempo: '10-10' });
    eq('chip shows the tempo', txt(blk(0).querySelector('.build-set-chip')), '25 lbs × 6 @10-10');
    eq('matching the slow record: no pop-up, despite being under the normal record', toast(), null);
    addSet('35', '4');
    eq('beating the slow record: pop-up names the tempo', toast(), '🏆 NEW PR! Dips @10-10 · 35 lbs × 4 @10-10');
    $('toast').classList.remove('show');

    // Per-set override: clear the tempo for a normal set
    type(blk(0).querySelector('.build-tempo-up'), '');
    eq('clearing the tempo hides the pacer', [B()[0].tempo, document.querySelector('.build-pacer-btn').style.display], ['', 'none']);
    addSet('55', '5');
    eq('normal set compares against the normal record', toast(), '🏆 NEW PR! Dips · 55 lbs × 5');
    $('toast').classList.remove('show');
    type(blk(0).querySelector('.build-tempo-up'), '10');

    builderSave();
    eq('saved text', state.rawText.split('\n\n')[0], '## 2026-11-15\nDips\n- 25# 6 @10-10\n- 35# 4 @10-10\n- 55# 5');
    eq('suggestions list plain names only', [...$('build-ex-suggestions').children].map(o => o.value).filter(v => v.includes('@')), []);
    renderPRs();
    eq('PRs tab lists both', [...document.querySelectorAll('.pr-row')].map(r => r.dataset.ex), ['Dips', 'Dips @10-10']);
    state.selectedEx = 'Dips @10-10'; renderProgress();
    eq('progress shows time under tension', [...document.querySelectorAll('#sets-list .set-day')].map(d => [...d.querySelectorAll('.set-chip')].map(txt)),
      [['25 lbs × 6 · 2:00', '30 lbs × 5 · 1:40'], ['25 lbs × 6 · 2:00', '35 lbs × 4 · 1:20']]);
    eq('progress shows the exercise note for the tempo variant', [...document.querySelectorAll('#sets-list .set-note')].map(txt), ['slow day']);

    // ═══ Engine ═══
    const cfg = { phases: [{ label: 'A', secs: 10 }, { label: 'B', secs: 5 }], rounds: 2, lead: 3, trim: 5 };
    const at = ms => { const s = runnerState(cfg, ms); return s.done ? 'done' : s.lead ? 'lead ' + s.remaining : `r${s.round} p${s.phase} ${s.remaining}`; };
    eq('runnerState', [0, 2999, 3000, 12999, 13000, 17999, 18000, 27999, 28000, 99999].map(at),
      ['lead 3', 'lead 0.001', 'r0 p0 10', 'r0 p0 0.001', 'r0 p1 5', 'r0 p1 0.001', 'r1 p0 10', 'r1 p0 0.001', 'done', 'done']);

    // ═══ Pacer ═══
    addEx('Dips');
    blk(0).querySelector('.build-tempo-btn').click();
    type(blk(0).querySelector('.build-tempo-down'), '10');
    type(blk(0).querySelector('.build-tempo-up'), '10');
    cueLog.length = 0;
    document.querySelector('.build-pacer-btn').click();
    const P = () => [$('pacer-phase').textContent, $('pacer-count').textContent, $('pacer-reps').textContent];
    eq('pacer opens with a get-ready count', [$('pacer').classList.contains('open'), $('pacer-title').textContent, ...P()], [true, 'Dips @10-10', 'GET READY', '3', '0 reps done']);
    advance(pacer, 1);
    eq('get ready 2', P(), ['GET READY', '2', '0 reps done']);
    advance(pacer, 2);
    eq('down starts', P(), ['DOWN', '10', '0 reps done']);
    advance(pacer, 9.5);
    eq('down nearly over', P(), ['DOWN', '1', '0 reps done']);
    advance(pacer, 0.5);
    eq('up starts', P(), ['UP', '10', '0 reps done']);
    advance(pacer, 10);
    eq('rep 1 counted at the end of up', P(), ['DOWN', '10', '1 rep done']);
    advance(pacer, 45);
    eq('catches up after a long gap', P(), ['DOWN', '5', '3 reps done']);
    eq('done button offers the count', $('pacer-done').textContent, 'DONE · USE 3 REPS');
    // (the test steps the clock past "1", so only the "2" tick is seen; the long gap lands on one change)
    eq('cues: a tick in the lead-in, then one per change seen', cueLog, ['tick', 'phase:DOWN', 'phase:UP', 'phase:DOWN', 'phase:DOWN']);
    stopPacer(true);
    eq('done closes and fills reps', [$('pacer').classList.contains('open'), $('build-reps').value, pacer], [false, '3', null]);
    builderAddSet();
    eq('paced set logged', B()[0].sets[0], { weight: 25, reps: 3, assisted: false, tempo: '10-10' });
    document.querySelector('.build-pacer-btn').click();
    advance(pacer, 30);
    stopPacer(false);
    eq('cancel leaves reps alone', [$('pacer').classList.contains('open'), $('build-reps').value], [false, '']);
    builderClear();

    // ═══ Timer tab ═══
    const tabs = [...document.querySelectorAll('.tab-btn')];
    eq('timer tab is last', tabs.map(txt).map(t => t.replace(/^\S+\s/, '')), ['Log', 'PRs', 'Progress', 'Volume', 'Timer']);
    tabs[4].click();
    eq('timer panel shown', [$('panel-timer').classList.contains('active'), $('panel-log').classList.contains('active')], [true, false]);
    const IV = () => [$('iv-phase').textContent, $('iv-count').textContent, $('iv-round').textContent, $('iv-start').textContent];
    eq('idle summary with defaults', IV(), ['READY', '0:30', '8 rounds · 5:45 total', 'START']);
    type($('iv-work'), '20'); type($('iv-rest'), '10'); type($('iv-rounds'), '3');
    eq('idle summary follows the settings', IV(), ['READY', '0:20', '3 rounds · 1:20 total', 'START']);
    eq('settings remembered', JSON.parse(localStorage.getItem('ironlog_interval')), { work: 20, rest: 10, rounds: 3 });

    cueLog.length = 0;
    $('iv-start').click();
    eq('starts with get ready; settings locked', [...IV(), $('iv-work').disabled], ['GET READY', '0:03', 'Round 1 of 3', 'PAUSE', true]);
    advance(iv, 3);
    eq('work 1', IV(), ['WORK', '0:20', 'Round 1 of 3', 'PAUSE']);
    advance(iv, 20);
    eq('rest 1', IV(), ['REST', '0:10', 'Round 1 of 3', 'PAUSE']);
    advance(iv, 4);
    $('iv-start').click();
    eq('paused', IV(), ['REST', '0:06', 'Round 1 of 3', 'RESUME']);
    T += 60000;
    $('iv-start').click();
    eq('time does not pass while paused', IV(), ['REST', '0:06', 'Round 1 of 3', 'PAUSE']);
    advance(iv, 6);
    eq('work 2', IV(), ['WORK', '0:20', 'Round 2 of 3', 'PAUSE']);
    advance(iv, 30);
    eq('work 3', IV(), ['WORK', '0:20', 'Round 3 of 3', 'PAUSE']);
    advance(iv, 18);
    advance(iv, 1);
    eq('last seconds', IV(), ['WORK', '0:01', 'Round 3 of 3', 'PAUSE']);
    advance(iv, 1);
    eq('done straight after the last work, no trailing rest', IV(), ['DONE', '0:00', 'Round 3 of 3', 'START']);
    eq('cue order', cueLog, ['phase:WORK', 'phase:REST', 'phase:WORK', 'phase:WORK', 'tick', 'tick', 'done']);
    $('iv-start').click();
    eq('start after done begins again', [IV()[0], IV()[2]], ['GET READY', 'Round 1 of 3']);
    document.querySelector('#panel-timer .timer-btn:not(.primary)').click();
    eq('reset returns to idle and unlocks settings', [...IV(), $('iv-work').disabled, iv], ['READY', '0:20', '3 rounds · 1:20 total', 'START', false, null]);

    type($('iv-rest'), '0'); type($('iv-rounds'), '1');
    eq('plain countdown: no rest, one round', IV(), ['READY', '0:20', '1 round · 0:20 total', 'START']);
    $('iv-start').click(); advance(iv, 3); advance(iv, 20);
    eq('countdown finishes', IV()[0], 'DONE');
    ivReset();

    // Stopwatch
    const SW = () => [$('sw-count').textContent, $('sw-start').textContent];
    const swBtn = n => document.querySelectorAll('#panel-timer .timer-btns')[1].children[n];
    eq('stopwatch idle', SW(), ['0:00.0', 'START']);
    swBtn(0).click();
    T += 12340; renderSw();
    eq('running', SW(), ['0:12.3', 'STOP']);
    swBtn(1).click();
    T += 61000; renderSw();
    swBtn(1).click();
    eq('laps: newest first, split then total', [...document.querySelectorAll('.sw-lap')].map(l => [...l.children].map(txt).join(' ')), ['LAP 2 1:01.0 1:13.3', 'LAP 1 0:12.3 0:12.3']);
    swBtn(0).click();
    T += 5000;
    eq('stopped holds its time', SW(), ['1:13.3', 'RESUME']);
    swBtn(0).click(); T += 1000; renderSw();
    eq('resume continues', SW(), ['1:14.3', 'STOP']);
    swBtn(2).click();
    eq('reset clears time and laps', [...SW(), document.querySelectorAll('.sw-lap').length], ['0:00.0', 'START', 0]);

    // Sound toggle
    const boxes = [...document.querySelectorAll('.sound-toggle')];
    boxes[0].checked = false; boxes[0].dispatchEvent(new Event('change'));
    eq('beep toggle is shared and remembered', [soundOn, boxes.map(b => b.checked), localStorage.getItem('ironlog_sound')], [false, [false, false], '0']);
    setSound(true);

    tabs[0].click();
    eq('back to the log tab', $('panel-log').classList.contains('active'), true);
  } catch (e) {
    fails++;
    out.push('EXCEPTION ' + e.message + '\n' + e.stack);
  }
  if (window.__errs.length) { fails++; out.push('PAGE ERRORS ' + JSON.stringify(window.__errs)); }
  out.push(fails ? 'RESULT: ' + fails + ' FAILED' : 'RESULT: ALL PASSED');
  document.getElementById('test-out').textContent = '\n@@START\n' + out.join('\n') + '\n@@END\n';
})();

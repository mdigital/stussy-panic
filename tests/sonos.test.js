const { chromium } = require('playwright-core');
const path = require('path');

// Point CHROMIUM at a Chrome/Chromium binary, or leave it unset if playwright's
// own download is in place.
const EXE = process.env.CHROMIUM || undefined;
const PAGE = 'file://' + path.join(__dirname, '..', 'index.html');

let failures = 0;
const ok = (c, m) => { if (!c) failures++; console.log((c ? 'PASS  ' : 'FAIL  ') + m); };
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox','--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 840, height: 640 }, deviceScaleFactor: 2 });
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  p.on('console', m => {
    if (m.type() !== 'error') return;
    // assets/title.png is optional; the 404 when it is absent is expected
    const loc = m.location && m.location();
    if (loc && /assets\/title\.png/.test(loc.url || '')) return;
    errors.push('CONSOLE: ' + m.text());
  });
  await p.goto(PAGE);
  await p.waitForTimeout(300);

  // Skip the crack screen and the loading picture: those are covered by
  // boot.test.js, and sitting through ten seconds of them in every suite would
  // be a waste of everybody's time.
  await p.evaluate(() => { window.MushroomBother.state.state = 'title'; });
  await p.keyboard.press('Space');
  await p.waitForTimeout(2300);

  // 1. it turns up about half the time
  const rate = await p.evaluate(() => {
    let seen = 0, runs = 400;
    for (let i = 0; i < runs; i++) {
      window.MushroomBother.goToLevel(1 + (i % 6));
      if (window.MushroomBother.state.bonus) seen++;
    }
    return seen / runs;
  });
  ok(rate === 1, `the bonus item is out on every level (${(rate * 100).toFixed(0)}% of 400 loads)`);

  // 2. force it on, walk onto it, and see what happens
  const grabbed = await p.evaluate(async () => {
    window.MushroomBother.goToLevel(1);
    const g = window.MushroomBother.state;
    await new Promise(r => setTimeout(r, 2200));
    const before = { score: g.score, enemies: g.enemies.length, police: !!g.police };
    g.cat.x = g.bonus.x * 32 + 16; g.cat.y = g.bonus.y * 32 + 16;   // step onto it
    await new Promise(r => setTimeout(r, 200));
    return {
      before: before,
      taken: g.bonus.taken,
      gained: g.score - before.score,
      says: g.says ? g.says.join(' ') : null,
      enemies: g.enemies.length,
      police: g.police ? {
        lines: g.police.sayings[0].join(' '),
        caught: g.police.caughtText,
        crossesHedges: g.police.stepsOverHedges,
        x: Math.round(g.police.x), y: Math.round(g.police.y)
      } : null
    };
  });
  ok(grabbed.taken && grabbed.gained === 250, `picking it up scores ${grabbed.gained}`);
  ok(grabbed.says === 'GUYS LOOK WHAT I FOUND!', `Stussy announces it: "${grabbed.says}"`);
  ok(!grabbed.before.police && grabbed.police && grabbed.enemies === grabbed.before.enemies + 1,
     'a policeman joins as a third chaser');
  ok(grabbed.police && grabbed.police.crossesHedges, 'he steps over hedges like the other people');

  // 3. he actually chases — and he does not start on top of her
  const chase = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.grace = 60; g.cat.rolling = false;
    const start = Math.hypot(g.police.x - g.cat.x, g.police.y - g.cat.y);
    await new Promise(r => setTimeout(r, 2500));
    const end = Math.hypot(g.police.x - g.cat.x, g.police.y - g.cat.y);
    return { start: Math.round(start), end: Math.round(end) };
  });
  ok(chase.start > 100, `he turns up across the level, ${chase.start}px away`);
  ok(chase.end < chase.start, `and closes in (${chase.start}px -> ${chase.end}px)`);

  // 4. complaining works on him too
  const scared = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.cat.rolling = false; g.complaint = 100; g.exhausted = false;
    g.police.flee = 0; g.police.x = g.cat.x + 55; g.police.y = g.cat.y;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await new Promise(r => setTimeout(r, 300));
    const flee = g.police.flee;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    return flee;
  });
  ok(scared > 0, 'yelling sends the policeman running too');

  // 5. he is gone again next level
  const next = await p.evaluate(async () => {
    window.MushroomBother.goToLevel(4);
    await new Promise(r => setTimeout(r, 100));
    const g = window.MushroomBother.state;
    return { police: !!g.police, enemies: g.enemies.length };
  });
  ok(!next.police && next.enemies === 2, 'he is not there on the next level');

  await p.evaluate(async () => {
    window.MushroomBother.goToLevel(1);
    const g = window.MushroomBother.state;
    await new Promise(r => setTimeout(r, 2200));
    g.grace = 60;
    if (!g.bonus) g.bonus = { x: 3, y: 3, taken: false };
    g.cat.x = g.bonus.x * 32 + 16; g.cat.y = g.bonus.y * 32 + 16;
    await new Promise(r => setTimeout(r, 150));
    g.police.x = g.cat.x + 70; g.police.y = g.cat.y + 40;
    g.police.tauntTimer = 2;
  });
  await p.waitForTimeout(100);
  const el = await p.$('#screen');
  await el.screenshot({ path: path.join(__dirname, 'sonos.png') });

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

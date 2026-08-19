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
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await p.goto(PAGE);
  await p.waitForTimeout(300);
  await p.keyboard.press('Space');
  await p.waitForTimeout(2200);

  const info = await p.evaluate(async () => {
    window.MushroomBother.goToLevel(4);
    await new Promise(r => setTimeout(r, 2300));
    const g = window.MushroomBother.state;
    return { name: g.theme.name, left: g.remaining,
             rival: g.landlord.sayings.map(s => s.join(' ')), caught: g.landlord.caughtText,
             police: !!g.police };
  });
  ok(info.name === 'THE BEACH', 'level 4 is ' + info.name);
  ok(info.left === 9, 'nine life rings to collect');
  ok(info.caught === 'HELLO DARLING', `Willie's line when he catches her: "${info.caught}"`);
  const expected = ['LOVELY DAY FOR IT!', 'GETTING A BEARD TRIM TOMORROW', 'WINDY', "IT'S RAINING"];
  ok(expected.every(line => info.rival.indexOf(line) >= 0) && info.rival.length === expected.length,
     'and he has four things to say on the way over: ' + info.rival.map(l => `"${l}"`).join(', '));
  ok(!info.police, 'no policeman until the jar is picked up');

  // take the jar
  const jar = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.grace = 120; g.cat.rolling = false;
    if (!g.bonus) g.bonus = { x: Math.floor(g.cat.x / 32), y: Math.floor(g.cat.y / 32), taken: false };
    g.cat.x = g.bonus.x * 32 + 16; g.cat.y = g.bonus.y * 32 + 16;
    const before = g.score;
    await new Promise(r => setTimeout(r, 200));
    return {
      gained: g.score - before,
      says: g.says ? g.says.join(' ') : null,
      police: g.police ? {
        lines: g.police.sayings[0].join(' '),
        chasingWillie: g.police.chasing === g.landlord,
        harmless: !!g.police.harmless,
        slowerThanWillie: g.police.speed < g.landlord.speed
      } : null
    };
  });
  ok(jar.gained === 250, `the jar of Tumjal scores ${jar.gained}`);
  ok(jar.police && jar.police.chasingWillie, 'the policeman goes after Willie, not Stussy');
  ok(jar.police && jar.police.lines === 'PUT THAT AWAY!', `and tells him "${jar.police.lines}"`);
  ok(jar.police && jar.police.slowerThanWillie, 'he is slower than Willie');

  // he must never catch Willie, and never trouble Stussy
  const pursuit = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.grace = 120;
    const gaps = [];
    const lives = g.lives;
    for (let i = 0; i < 300; i++) {
      await new Promise(r => setTimeout(r, 20));
      gaps.push(Math.hypot(g.police.x - g.landlord.x, g.police.y - g.landlord.y));
    }
    const sorted = gaps.slice().sort((a, b) => a - b);
    const closest = Math.round(sorted[0]);
    const median = Math.round(sorted[Math.floor(sorted.length / 2)]);
    const keptAway = gaps.filter(v => v > 32).length / gaps.length;
    // Now park the law right on top of Stussy: he should walk on by. Send both
    // of the real chasers away first — otherwise one of them takes the life we
    // are trying to prove the policeman does not take.
    g.photographer.x = -500; g.photographer.y = -500;
    g.landlord.x = -500; g.landlord.y = -500;
    g.grace = 0;
    g.police.x = g.cat.x; g.police.y = g.cat.y; g.police.flee = 0;
    const before = g.lives;
    await new Promise(r => setTimeout(r, 400));
    return { closest, median, keptAway: +keptAway.toFixed(2), samples: gaps.length,
             willieStillIn: g.enemies.indexOf(g.landlord) >= 0,
             livesLost: before - g.lives };
  });
  // He backs off whenever he closes, so he trails a tile or two behind. Willie
  // is busy chasing Stussy and will occasionally walk straight through him —
  // the same pass-through the other two chasers already do with each other —
  // so this measures the trailing, not an impassable bubble.
  ok(pursuit.keptAway > 0.6 && pursuit.median > 32,
     `he trails Willie without closing: median gap ${pursuit.median}px, ` +
     `${Math.round(pursuit.keptAway * 100)}% of ${pursuit.samples} samples over a tile apart ` +
     `(closest pass ${pursuit.closest}px)`);
  ok(pursuit.willieStillIn,
     'and nothing ever comes of it — Willie is still going about his business');
  ok(pursuit.livesLost === 0, 'and standing on Stussy costs her nothing — he is not after her');

  // Willie can still catch her, and says his piece
  const willie = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    // wait out anything still in flight from the previous check
    for (let i = 0; i < 200 && g.state !== 'play'; i++) {
      await new Promise(r => setTimeout(r, 30));
    }
    g.photographer.x = -500; g.photographer.y = -500;   // only Willie should be able to catch her
    g.grace = 0; g.cat.rolling = false; g.landlord.flee = 0;
    g.landlord.x = g.cat.x; g.landlord.y = g.cat.y;
    const lives = g.lives;
    await new Promise(r => setTimeout(r, 250));
    return { state: g.state, lost: lives - g.lives, banner: g.caughtBy };
  });
  ok(willie.lost === 1 && willie.banner === 'HELLO DARLING',
     `Willie still catches her, and the banner reads "${willie.banner}"`);

  await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    window.MushroomBother.goToLevel(4);
    await new Promise(r => setTimeout(r, 2300));
    g.grace = 120; g.cat.rolling = false;
    g.cat.x = 6 * 32 + 16; g.cat.y = 5 * 32 + 16;
    g.bonus = { x: 9, y: 8, taken: false };
    g.landlord.x = 14 * 32; g.landlord.y = 4 * 32; g.landlord.tauntTimer = 2; g.landlord.flee = 0;
    g.photographer.x = 4 * 32; g.photographer.y = 12 * 32; g.photographer.tauntTimer = 0;
  });
  await p.waitForTimeout(150);
  const el = await p.$('#screen');
  await el.screenshot({ path: path.join(__dirname, 'beach.png') });

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

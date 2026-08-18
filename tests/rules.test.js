const { chromium } = require('playwright-core');
const path = require('path');

// Point CHROMIUM at a Chrome/Chromium binary, or leave it unset if playwright's
// own download is in place.
const EXE = process.env.CHROMIUM || undefined;
const PAGE = 'file://' + path.join(__dirname, '..', 'index.html');
let failures = 0;
const ok = (c, m) => { if (!c) failures++; console.log((c ? 'PASS  ' : 'FAIL  ') + m); };

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p.goto(PAGE);
  await p.waitForTimeout(300);
  await p.keyboard.press('Space');
  await p.waitForTimeout(2200);

  // ---- 1 & 2: who may cross what -------------------------------------------
  await p.evaluate(() => {
    window.__t = { catOnBlocked: 0, enemyOnHedge: 0, enemyOnTree: 0, samples: 0 };
    const T = 32;
    window.__probe = setInterval(() => {
      const g = window.MushroomBother.state;
      if (g.state !== 'play') return;
      const at = e => g.grid[Math.floor(e.y / T)][Math.floor(e.x / T)];
      window.__t.samples++;
      if (at(g.cat) !== Maze.FLOOR) window.__t.catOnBlocked++;
      for (const e of g.enemies) {
        if (at(e) === Maze.HEDGE) window.__t.enemyOnHedge++;
        if (at(e) === Maze.TREE) window.__t.enemyOnTree++;
      }
    }, 30);
  });
  // drive the cat around at random for a while so it bumps into scenery
  for (let i = 0; i < 40; i++) {
    const k = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'][i % 4];
    await p.keyboard.down(k); await p.waitForTimeout(220); await p.keyboard.up(k);
  }
  const t = await p.evaluate(() => { clearInterval(window.__probe); return window.__t; });
  console.log('   samples:', JSON.stringify(t));
  ok(t.catOnBlocked === 0, 'cat never stands on a hedge or a tree');
  ok(t.enemyOnHedge > 0, 'the humans do walk over hedges (' + t.enemyOnHedge + ' samples)');
  ok(t.enemyOnTree === 0, 'nobody walks through a tree');

  // ---- 3: complaint meter lifecycle ----------------------------------------
  await p.evaluate(() => { window.MushroomBother.state.complaint = 100; window.MushroomBother.state.exhausted = false; });
  await p.keyboard.down('Space');
  await p.waitForTimeout(600);
  const mid = await p.evaluate(() => ({ c: window.MushroomBother.state.complaint, complaining: window.MushroomBother.state.complaining }));
  ok(mid.c < 100 && mid.complaining, 'holding SPACE drains the meter while complaining (' + Math.round(mid.c) + ')');
  await p.waitForTimeout(3200);
  const dry = await p.evaluate(() => ({ c: window.MushroomBother.state.complaint, ex: window.MushroomBother.state.exhausted, complaining: window.MushroomBother.state.complaining }));
  ok(dry.c === 0 && dry.ex && !dry.complaining, 'meter empties and the cat loses its voice');
  await p.waitForTimeout(1200);
  const stillHeld = await p.evaluate(() => window.MushroomBother.state.complaining);
  ok(stillHeld === false, 'an empty meter cannot be used even with SPACE still held');
  await p.keyboard.up('Space');
  await p.waitForTimeout(2600);
  const back = await p.evaluate(() => ({ c: window.MushroomBother.state.complaint, ex: window.MushroomBother.state.exhausted }));
  ok(back.c > 20 && !back.ex, 'meter recharges and the voice comes back (' + Math.round(back.c) + ')');

  // ---- 4: complaining scares whoever is in earshot --------------------------
  const scared = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.complaint = 100; g.exhausted = false;
    g.photographer.flee = 0; g.landlord.flee = 0;
    g.photographer.x = g.cat.x + 60; g.photographer.y = g.cat.y;
    // park the landlord well out of earshot so only one scare can score
    g.landlord.x = (Maze.COLS - 2) * 32; g.landlord.y = (Maze.ROWS - 2) * 32;
    const before = g.score;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await new Promise(r => setTimeout(r, 300));
    const res = { flee: g.photographer.flee, maryFlee: g.landlord.flee, gained: g.score - before };
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    return res;
  });
  ok(scared.flee > 0 && scared.gained === 25, 'a nearby chaser turns and runs, and scores 25 ' + JSON.stringify(scared));
  ok(scared.maryFlee <= 0, 'someone out of earshot carries on regardless');

  // ---- 5: capture, life loss, respawn --------------------------------------
  const cap = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.grace = 0; g.photographer.flee = 0; g.landlord.flee = 0;
    const lives = g.lives;
    g.photographer.x = g.cat.x; g.photographer.y = g.cat.y;
    await new Promise(r => setTimeout(r, 200));
    const caught = { state: g.state, lives: g.lives, lost: lives - g.lives };
    await new Promise(r => setTimeout(r, 2200));
    caught.after = g.state;
    caught.home = Math.abs(g.cat.x - (g.cat.home.x * 32 + 16)) < 1;
    return caught;
  });
  ok(cap.state === 'caught' && cap.lost === 1, 'being caught costs a life');
  ok(cap.after === 'play' && cap.home, 'the cat respawns at its starting corner');

  // ---- 6: game over and restart --------------------------------------------
  const over = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    g.lives = 0; g.grace = 0; g.photographer.flee = 0;
    g.photographer.x = g.cat.x; g.photographer.y = g.cat.y;
    await new Promise(r => setTimeout(r, 300));
    const mid = g.lives;
    await new Promise(r => setTimeout(r, 2600));
    return { lives: mid, state: window.MushroomBother.state.state };
  });
  ok(over.state === 'over', 'losing the last cat ends the game');
  await p.waitForTimeout(1200);
  await p.keyboard.press('Space');
  await p.waitForTimeout(400);
  const restart = await p.evaluate(() => {
    const g = window.MushroomBother.state;
    return { level: g.level, lives: g.lives, score: g.score, left: g.remaining };
  });
  ok(restart.level === 1 && restart.lives === 3 && restart.score === 0 && restart.left === 9,
     'SPACE starts a fresh game at level 1 with 3 cats and 9 mushrooms');

  // ---- 7: every level really has nine reachable mushrooms -------------------
  const levels = await p.evaluate(() => {
    const out = [];
    for (let lvl = 1; lvl <= 12; lvl++) {
      const d = Maze.generate(lvl, lvl * 7919 + 104729);
      const reach = d.reachable;
      const allReachable = d.mushrooms.every(m => reach[m.x + m.y * Maze.COLS] >= 0);
      out.push({ lvl, count: d.mushrooms.length, allReachable });
    }
    return out;
  });
  const badLevels = levels.filter(l => l.count !== 9 || !l.allReachable);
  ok(badLevels.length === 0, 'levels 1-12 each hold 9 mushrooms the cat can walk to' +
     (badLevels.length ? ' — bad: ' + JSON.stringify(badLevels) : ''));

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

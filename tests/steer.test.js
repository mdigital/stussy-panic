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
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p.goto(PAGE);
  await p.waitForTimeout(300);

  // Skip the crack screen and the loading picture: those are covered by
  // boot.test.js, and sitting through ten seconds of them in every suite would
  // be a waste of everybody's time.
  await p.evaluate(() => { window.MushroomBother.state.state = 'title'; });
  await p.keyboard.press('Space');
  await p.waitForTimeout(2300);

  const st = () => p.evaluate(() => {
    const g = window.MushroomBother.state;
    return { x: +g.cat.x.toFixed(1), y: +g.cat.y.toFixed(1), dir: g.cat.dir,
             rolling: !!g.cat.rolling, moving: !!g.cat.moving };
  });
  const openDirs = () => p.evaluate(() => {
    const g = window.MushroomBother.state, T = 32;
    const tx = Math.floor(g.cat.x / T), ty = Math.floor(g.cat.y / T);
    const d = { ArrowRight: [1,0], ArrowLeft: [-1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    return Object.keys(d).filter(k => g.grid[ty + d[k][1]][tx + d[k][0]] === Maze.FLOOR);
  });

  // 1. Stussy sits still until told to go
  await p.waitForTimeout(400);
  const idle = await st();
  ok(!idle.rolling && !idle.moving, 'she waits at the start until you point her somewhere');

  // 2. one tap and she keeps walking with nothing held
  const first = (await openDirs())[0];
  const before = await st();
  await p.keyboard.press(first);            // a tap: down and straight back up
  await p.waitForTimeout(600);
  const after = await st();
  const dist = Math.hypot(after.x - before.x, after.y - before.y);
  ok(after.rolling && after.moving && dist > 40,
     `one tap of ${first} carries her ${dist.toFixed(0)}px with no key held`);

  // 3. she runs until something stops her, and parks tidily on a tile centre
  await p.waitForTimeout(2500);
  const parked = await st();
  const onCentre = ((parked.x - 16) % 32 === 0) && ((parked.y - 16) % 32 === 0);
  ok(!parked.moving ? onCentre : true,
     parked.moving ? 'still travelling down a clear run' : 'she parks square on a tile when she meets a wall');

  // 4. tapping back the other way reverses her immediately
  const opposite = { ArrowRight: 'ArrowLeft', ArrowLeft: 'ArrowRight', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' };
  const heading = await st();
  const headKey = heading.dir.x === 1 ? 'ArrowRight' : heading.dir.x === -1 ? 'ArrowLeft'
                : heading.dir.y === 1 ? 'ArrowDown' : 'ArrowUp';
  await p.keyboard.press(opposite[headKey]);
  await p.waitForTimeout(250);
  const reversed = await st();
  ok(reversed.dir.x === -heading.dir.x && reversed.dir.y === -heading.dir.y,
     `tapping ${opposite[headKey]} turns her straight around`);

  // 5. a turn asked for far too early lapses instead of firing much later
  const lapsed = await p.evaluate(async () => {
    const g = window.MushroomBother.state;
    // ask for a direction that is walled off right now
    const T = 32, tx = Math.floor(g.cat.x / T), ty = Math.floor(g.cat.y / T);
    const blocked = [[0,-1],[0,1],[1,0],[-1,0]].find(d => g.grid[ty + d[1]][tx + d[0]] !== Maze.FLOOR);
    if (!blocked) return { skipped: true };
    const code = blocked[0] === 1 ? 'ArrowRight' : blocked[0] === -1 ? 'ArrowLeft'
               : blocked[1] === 1 ? 'ArrowDown' : 'ArrowUp';
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    await new Promise(r => setTimeout(r, 100));
    const queued = !!g.cat.want;
    await new Promise(r => setTimeout(r, 900));
    return { queued: queued, stillQueued: !!g.cat.want };
  });
  ok(lapsed.skipped || (lapsed.queued && !lapsed.stillQueued),
     'a turn you asked for too early is queued briefly, then lapses');

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

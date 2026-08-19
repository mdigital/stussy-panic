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
  const p = await b.newPage({ viewport: { width: 780, height: 400 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
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
  await p.waitForTimeout(400);

  // Skip the crack screen and the loading picture: those are covered by
  // boot.test.js, and sitting through ten seconds of them in every suite would
  // be a waste of everybody's time.
  await p.evaluate(() => { window.StussyPanic.state.state = 'title'; });

  // helpers that fire real-looking touch pointer events at canvas coordinates
  await p.evaluate(() => {
    const cv = document.getElementById('screen');
    window.__pt = (gx, gy) => {
      const r = cv.getBoundingClientRect();
      return { x: r.left + gx * (r.width / cv.width), y: r.top + gy * (r.height / cv.height) };
    };
    window.__touch = (type, id, gx, gy) => {
      const q = window.__pt(gx, gy);
      cv.dispatchEvent(new PointerEvent(type, {
        pointerId: id, pointerType: 'touch', isPrimary: id === 1,
        clientX: q.x, clientY: q.y, bubbles: true, cancelable: true
      }));
    };
  });

  const st = () => p.evaluate(() => {
    const g = window.StussyPanic.state;
    return { state: g.state, x: +g.cat.x.toFixed(1), y: +g.cat.y.toFixed(1),
             dir: g.cat.dir, moving: !!g.cat.moving, rolling: !!g.cat.rolling,
             complaining: g.complaining,
             complaint: Math.round(g.complaint), lives: g.lives };
  });

  // 1. the canvas fits the phone screen
  const fit = await p.evaluate(() => {
    const r = document.getElementById('screen').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
  });
  ok(fit.w <= fit.vw && fit.h <= fit.vh, `canvas fits the viewport (${fit.w}x${fit.h} in ${fit.vw}x${fit.vh})`);

  // 2. a tap on the title screen starts the game, even down in the d-pad corner
  await p.evaluate(() => { window.__touch('pointerdown', 1, 116, 426); window.__touch('pointerup', 1, 116, 426); });
  await p.waitForTimeout(150);
  const started = await st();
  ok(started.state !== 'title', 'a tap where the d-pad sits still starts the game from the title screen');
  await p.waitForTimeout(2200);

  // 3. d-pad walks Stussy — press a direction that is actually open, since the
  //    spawn corner has walls on two sides.
  const PAD = { right: [60, 0], left: [-60, 0], up: [0, -60], down: [0, 60] };
  const VEC = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };

  const openFrom = () => p.evaluate(() => {
    const g = window.StussyPanic.state, T = 32;
    const tx = Math.floor(g.cat.x / T), ty = Math.floor(g.cat.y / T);
    const d = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
    return Object.keys(d).filter(k =>
      g.grid[ty + d[k][1]] && g.grid[ty + d[k][1]][tx + d[k][0]] === Maze.FLOOR);
  });

  const press = (name, ms) => p.evaluate(async ([dx, dy, ms]) => {
    window.__touch('pointerdown', 1, 116 + dx, 426 + dy);
    await new Promise(r => setTimeout(r, ms));
  }, [PAD[name][0], PAD[name][1], ms]);
  const release = (name) => p.evaluate(([dx, dy]) =>
    window.__touch('pointerup', 1, 116 + dx, 426 + dy), PAD[name]);

  const open1 = await openFrom();
  const dir1 = open1[0];
  const before = await st();
  await press(dir1, 700);
  const walking = await st();
  await release(dir1);
  const [vx, vy] = VEC[dir1];
  const moved = vx ? (walking.x - before.x) * vx : (walking.y - before.y) * vy;
  ok(walking.moving && walking.dir.x === vx && walking.dir.y === vy && moved > 0,
     `d-pad ${dir1} walks Stussy ${dir1} (moved ${moved.toFixed(1)}px)`);

  await p.waitForTimeout(200);
  const stopped = await st();
  ok(stopped.moving && stopped.rolling, 'she keeps walking after your thumb leaves the d-pad');

  // a tap too quick to span a frame still steers
  const tapped = await p.evaluate(async ([dx, dy]) => {
    const g = window.StussyPanic.state;
    window.__touch('pointerdown', 9, 116 + dx, 426 + dy);
    window.__touch('pointerup', 9, 116 + dx, 426 + dy);
    const from = { x: g.cat.x, y: g.cat.y };
    await new Promise(r => setTimeout(r, 500));
    return { moved: Math.hypot(g.cat.x - from.x, g.cat.y - from.y), rolling: !!g.cat.rolling };
  }, PAD[dir1]);
  ok(tapped.rolling && tapped.moved > 20,
     `a quick tap on the pad sends her ${tapped.moved.toFixed(0)}px on its own`);

  // 4. dragging the thumb across the pad changes direction — walk on until we
  //    are somewhere with a second way out, then slide the thumb to it.
  let open2 = await openFrom(), tries = 0;
  while (open2.length < 2 && tries++ < 8) {
    await press(dir1, 400); await release(dir1);
    open2 = await openFrom();
  }
  const dir2 = open2.find(d => d !== dir1) || open2[0];
  await press(dir1, 120);
  await p.evaluate(([dx, dy]) => window.__touch('pointermove', 1, 116 + dx, 426 + dy), PAD[dir2]);
  await p.waitForTimeout(450);
  const dragged = await st();
  await release(dir2);
  ok(dragged.dir.x === VEC[dir2][0] && dragged.dir.y === VEC[dir2][1],
     `dragging the thumb to ${dir2} turns Stussy ${dir2}`);

  // 5. complain button, and both controls at once on separate fingers
  await p.evaluate(() => {
    const g = window.StussyPanic.state;
    g.complaint = 100; g.exhausted = false;
    g.photographer.flee = 0;
    g.photographer.x = g.cat.x + 55; g.photographer.y = g.cat.y;
  });
  const scoreBefore = await p.evaluate(() => window.StussyPanic.state.score);
  const dir3 = (await openFrom())[0];
  const both = await p.evaluate(async ([dx, dy]) => {
    const g = window.StussyPanic.state;
    const from = { x: g.cat.x, y: g.cat.y };
    window.__touch('pointerdown', 1, 116 + dx, 426 + dy);  // finger 1: d-pad
    window.__touch('pointerdown', 2, 800 - 116, 426);      // finger 2: complain
    await new Promise(r => setTimeout(r, 600));
    return {
      complaining: g.complaining, complaint: Math.round(g.complaint),
      // measure how far she got during the window: she may legitimately reach a
      // wall and park before it ends, so "still moving" would be a flaky check
      travelled: Math.hypot(g.cat.x - from.x, g.cat.y - from.y),
      flee: +g.photographer.flee.toFixed(2)
    };
  }, PAD[dir3]);
  const gained = await p.evaluate(s => window.StussyPanic.state.score - s, scoreBefore);
  ok(both.complaining && both.complaint < 100, `complain button drains the meter (${both.complaint})`);
  ok(both.travelled > 10,
     `walking and complaining work on two fingers at once (${both.travelled.toFixed(0)}px while yowling)`);
  ok(both.flee > 0 && gained >= 25, 'the button scares off a nearby chaser');
  await p.screenshot({ path: path.join(__dirname, 'mobile-play.png') });

  await p.evaluate(([dx, dy]) => {
    window.__touch('pointerup', 1, 116 + dx, 426 + dy);
    window.__touch('pointerup', 2, 800 - 116, 426);
  }, PAD[dir3]);
  await p.waitForTimeout(200);
  const released = await st();
  ok(!released.complaining, 'lifting the complain button stops the yowling');

  // 6. tap to restart after game over
  await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    g.lives = 0; g.grace = 0; g.photographer.flee = 0;
    g.photographer.x = g.cat.x; g.photographer.y = g.cat.y;
  });
  await p.waitForTimeout(2600);
  const overState = await st();
  ok(overState.state === 'over', 'game over reached on mobile');
  // the game over screen holds taps off for a second so a panicked tap does not
  // skip the score straight away
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__touch('pointerdown', 3, 116, 426); window.__touch('pointerup', 3, 116, 426); });
  await p.waitForTimeout(300);
  const again = await st();
  ok(again.state !== 'over' && again.lives === 3, 'a tap in the d-pad corner restarts after game over');

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

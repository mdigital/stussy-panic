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
  const p = await b.newPage({ viewport: { width: 840, height: 660 } });
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
  await p.waitForTimeout(500);

  const state = () => p.evaluate(() => window.MushroomBother.state.state);

  // a small signature of what is on screen, for comparing frames
  const signature = () => p.evaluate(() => {
    const c = document.getElementById('screen').getContext('2d');
    const d = c.getImageData(0, 0, 800, 600).data;
    let sum = 0, lit = 0, colours = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) {
      sum += d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7;
      if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
      colours.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
    }
    return { sum, lit, colours: colours.size };
  });

  // ---- the crack screen ----------------------------------------------------
  ok(await state() === 'crack', 'the crack screen comes up first');

  const a = await signature();
  await p.waitForTimeout(260);
  const bSig = await signature();
  ok(a.sum !== bSig.sum, 'its colour bars are rolling — the picture changes between frames');
  ok(a.colours > 6, `and it is in colour, not a black screen (${a.colours} distinct tones)`);

  // it waits for you rather than timing out on its own
  await p.waitForTimeout(1500);
  ok(await state() === 'crack', 'it sits there until you dismiss it');

  await p.keyboard.press('KeyX');            // some other key will not do
  await p.waitForTimeout(150);
  ok(await state() === 'crack', 'and only space gets rid of it');

  // ---- the loading picture -------------------------------------------------
  await p.keyboard.press('Space');
  await p.waitForTimeout(200);
  ok(await state() === 'loading', 'space brings up the loading picture');

  const usingImage = await p.evaluate(() => window.Screens.usingImage());
  const load = await p.evaluate(() => {
    const c = document.getElementById('screen').getContext('2d');
    const near = (px, py, r, g, bb, tol) => {
      const d = c.getImageData(px, py, 1, 1).data;
      return Math.abs(d[0] - r) < tol && Math.abs(d[1] - g) < tol && Math.abs(d[2] - bb) < tol;
    };
    // count the greens along the ground and the warm tones up in the logo band
    const d = c.getImageData(0, 0, 800, 600).data;
    let ground = 0, warm = 0;
    for (let y = 440; y < 500; y++) {
      for (let x = 0; x < 800; x += 4) {
        const i = (y * 800 + x) * 4;
        if (d[i + 1] > d[i] && d[i + 1] > d[i + 2] && d[i + 1] > 60) ground++;
      }
    }
    for (let y = 60; y < 200; y++) {
      for (let x = 100; x < 700; x += 4) {
        const i = (y * 800 + x) * 4;
        if (d[i] > 180 && d[i + 1] > 90 && d[i + 2] < 120) warm++;
      }
    }
    return { ground, warm, black: near(400, 300, 0, 0, 0, 6) };
  });
  if (usingImage) {
    ok(!load.black, 'the supplied title image is painted rather than a black screen');
  } else {
    ok(load.ground > 500, `the picture is drawn: ${load.ground} green samples across the ground`);
  }

  // the synth wash runs under both screens and hands over to the game's own music
  const washing = await p.evaluate(() => ({
    on: window.Music.isWashing(),
    ctx: window.Sfx.context() ? window.Sfx.context().state : 'none'
  }));
  ok(washing.on, `the synth wash is playing under it (audio context ${washing.ctx})`);
  if (!usingImage) {
    ok(load.warm > 300, `and the logo and the fires are up there in warm tones (${load.warm} samples)`);
  }

  // ---- it really does hold for ten seconds ---------------------------------
  const started = Date.now();
  await p.waitForTimeout(8000);
  ok(await state() === 'loading', 'still loading after eight seconds');
  while (await state() === 'loading' && Date.now() - started < 20000) {
    await p.waitForTimeout(200);
  }
  const held = (Date.now() - started) / 1000;
  ok(await state() === 'title', 'then the title screen takes over');
  ok(!(await p.evaluate(() => window.Music.isWashing())), 'and the wash stops when it does');
  ok(held > 9 && held < 11.5, `the loading picture held for ${held.toFixed(1)}s`);

  // ---- and it is a boot sequence, not something you sit through twice ------
  await p.keyboard.press('Space');
  await p.waitForTimeout(300);
  await p.keyboard.press('KeyR');
  await p.waitForTimeout(300);
  const after = await state();
  ok(after !== 'crack' && after !== 'loading', `restarting goes straight back into the game (${after})`);

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

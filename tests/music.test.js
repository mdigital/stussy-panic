const { chromium } = require('playwright-core');
const path = require('path');

// Point CHROMIUM at a Chrome/Chromium binary, or leave it unset if playwright's
// own download is in place.
const EXE = process.env.CHROMIUM || undefined;
const PAGE = 'file://' + path.join(__dirname, '..', 'index.html');
const BPM = 136;

let failures = 0;
const ok = (c, m) => { if (!c) failures++; console.log((c ? 'PASS  ' : 'FAIL  ') + m); };

(async () => {
  const b = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
  });
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await p.goto(PAGE);
  await p.waitForTimeout(300);

  // Skip the crack screen and the loading picture: those are covered by
  // boot.test.js, and sitting through ten seconds of them in every suite would
  // be a waste of everybody's time.
  await p.evaluate(() => { window.MushroomBother.state.state = 'title'; });
  await p.keyboard.press('Space');          // start the game, which starts the track
  await p.waitForTimeout(500);

  const playing = await p.evaluate(() => Music.isPlaying());
  ok(playing, 'the track starts when the game does');

  // tap the music bus and record a loudness envelope
  const env = await p.evaluate(async () => {
    const ctx = Sfx.context();
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    Sfx.musicBus().connect(an);
    const buf = new Float32Array(an.fftSize);
    const out = [];
    const t0 = ctx.currentTime;
    await new Promise(done => {
      const id = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        out.push(Math.sqrt(sum / buf.length));
        if (out.length >= 500) { clearInterval(id); done(); }
      }, 10);
    });
    return { env: out, seconds: ctx.currentTime - t0 };
  });

  const dt = env.seconds / env.env.length;
  const peak = Math.max(...env.env);
  const mean = env.env.reduce((a, c) => a + c, 0) / env.env.length;
  ok(peak > 0.01, `the bus is making sound (peak ${peak.toFixed(3)}, mean ${mean.toFixed(3)})`);

  // autocorrelate the envelope: a four-on-the-floor track should correlate
  // strongly at one beat and weakly at a beat and a half
  const e = env.env.map(v => v - mean);
  const power = e.reduce((a, c) => a + c * c, 0);
  const corrAt = (sec) => {
    const lag = Math.round(sec / dt);
    let s = 0;
    for (let i = 0; i + lag < e.length; i++) s += e[i] * e[i + lag];
    return s / power;
  };
  const beat = 60 / BPM;
  const onBeat = corrAt(beat), offBeat = corrAt(beat * 1.5), twoBeat = corrAt(beat * 2);
  console.log(`   dt=${dt.toFixed(4)}s  corr: beat=${onBeat.toFixed(3)} 1.5beat=${offBeat.toFixed(3)} 2beat=${twoBeat.toFixed(3)}`);
  ok(onBeat > offBeat && onBeat > 0.2, `the pulse lands on the beat at ${BPM} BPM`);

  // the arrangement moves through its bars, and pausing stops it
  const bar1 = await p.evaluate(() => Music.position().bar);
  await p.waitForTimeout(2000);
  const bar2 = await p.evaluate(() => Music.position().bar);
  ok(bar2 !== bar1, `the arrangement advances (bar ${bar1} -> ${bar2})`);

  await p.keyboard.press('KeyP');
  await p.waitForTimeout(200);
  const paused = await p.evaluate(() => Music.isPlaying());
  await p.keyboard.press('KeyP');
  await p.waitForTimeout(200);
  const resumed = await p.evaluate(() => Music.isPlaying());
  ok(!paused && resumed, 'pausing the game stops the track, unpausing restarts it');

  // muting silences the music bus too
  const gains = await p.evaluate(() => {
    const before = Sfx.musicBus().gain.value;
    Sfx.toggleMute();
    const during = Sfx.musicBus().gain.value;
    Sfx.toggleMute();
    return { before, during, after: Sfx.musicBus().gain.value };
  });
  ok(gains.before > 0 && gains.during === 0 && gains.after > 0, 'M mutes the music as well as the effects');

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

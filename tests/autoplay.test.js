const { chromium } = require('playwright-core');
const path = require('path');

// Point CHROMIUM at a Chrome/Chromium binary, or leave it unset if playwright's
// own download is in place.
const EXE = process.env.CHROMIUM || undefined;
const PAGE = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await p.goto(PAGE);
  await p.waitForTimeout(400);
  await p.keyboard.press('Space');

  // In-page bot: BFS over cat-walkable tiles to the nearest mushroom, and yell
  // whenever an enemy gets close.
  await p.evaluate(() => {
    window.__log = [];
    const TILE = 32, COLS = Maze.COLS, ROWS = Maze.ROWS;
    let heldKey = null;
    function press(code) {
      if (heldKey === code) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); return; }
      if (heldKey) window.dispatchEvent(new KeyboardEvent('keyup', { code: heldKey }));
      heldKey = code;
      if (code) window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    }
    let yelling = false;
    function yell(on) {
      if (on === yelling) return;
      yelling = on;
      window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: 'Space' }));
    }

    window.__bot = setInterval(() => {
      const g = window.MushroomBother.state;
      if (!g || g.state !== 'play') { press(null); yell(false); return; }
      const grid = g.grid;
      const cx = Math.floor(g.cat.x / TILE), cy = Math.floor(g.cat.y / TILE);

      // scare anyone within ~3.5 tiles if we still have a voice
      const near = [g.photographer, g.landlord].some(e =>
        Math.hypot(e.x - g.cat.x, e.y - g.cat.y) < 3.5 * TILE && e.flee <= 0);
      yell(near && !g.exhausted && g.complaint > 25);

      // BFS out from the cat until we hit an uncollected mushroom
      const prev = new Int32Array(COLS * ROWS).fill(-1);
      const start = cx + cy * COLS;
      prev[start] = start;
      const q = [start];
      let goal = -1;
      for (let h = 0; h < q.length && goal < 0; h++) {
        const idx = q[h], x = idx % COLS, y = (idx / COLS) | 0;
        if (g.mushrooms.some(m => !m.taken && m.x === x && m.y === y)) { goal = idx; break; }
        for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const ni = nx + ny * COLS;
          if (prev[ni] !== -1 || grid[ny][nx] !== Maze.FLOOR) continue;
          prev[ni] = idx; q.push(ni);
        }
      }
      if (goal < 0) { press(null); return; }
      let cur = goal;
      while (prev[cur] !== start && prev[cur] !== cur) cur = prev[cur];
      const nx = cur % COLS, ny = (cur / COLS) | 0;
      if (nx > cx) press('ArrowRight');
      else if (nx < cx) press('ArrowLeft');
      else if (ny > cy) press('ArrowDown');
      else if (ny < cy) press('ArrowUp');
    }, 40);

    // record every level/life transition
    let last = '';
    window.__watch = setInterval(() => {
      const g = window.MushroomBother.state;
      const sig = [g.state, g.level, g.lives, g.remaining, g.score].join('|');
      if (sig !== last) { window.__log.push(sig); last = sig; }
    }, 60);
  });

  const seconds = Number(process.argv[2] || 90);
  for (let i = 0; i < seconds / 10; i++) {
    await p.waitForTimeout(10000);
    const s = await p.evaluate(() => {
      const g = window.MushroomBother.state;
      return `t state=${g.state} lvl=${g.level} lives=${g.lives} left=${g.remaining} score=${g.score} complaint=${Math.round(g.complaint)}`;
    });
    console.log(s);
  }

  await p.screenshot({ path: path.join(__dirname, 'shot-autoplay.png') });
  const log = await p.evaluate(() => window.__log);
  console.log('\ntransitions (state|level|lives|left|score):');
  console.log(log.slice(0, 60).join('\n'));
  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();

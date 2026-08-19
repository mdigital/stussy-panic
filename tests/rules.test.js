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

  // Skip the crack screen and the loading picture: those are covered by
  // boot.test.js, and sitting through ten seconds of them in every suite would
  // be a waste of everybody's time.
  await p.evaluate(() => { window.StussyPanic.state.state = 'title'; });
  await p.keyboard.press('Space');
  await p.waitForTimeout(2200);

  // ---- 1 & 2: who may cross what -------------------------------------------
  await p.evaluate(() => {
    window.__t = { catOnBlocked: 0, enemyOnHedge: 0, enemyOnTree: 0, samples: 0 };
    const T = 32;
    window.__probe = setInterval(() => {
      const g = window.StussyPanic.state;
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

  // These next sections stand Stussy still for seconds at a time. Left to
  // themselves the chasers catch her, and the game drops into its caught state
  // where complaining, taunting and capture are all inert — so wait for play and
  // keep her safe while the mechanic under test is exercised.
  const settle = (graceSeconds) => p.evaluate(async (grace) => {
    const g = window.StussyPanic.state;
    for (let i = 0; i < 300 && g.state !== 'play'; i++) {
      await new Promise(r => setTimeout(r, 30));
    }
    g.cat.rolling = false;
    if (grace) g.grace = grace;
  }, graceSeconds);

  // ---- 3: complaint meter lifecycle ----------------------------------------
  await settle(60);
  await p.evaluate(() => { window.StussyPanic.state.complaint = 100; window.StussyPanic.state.exhausted = false; });
  await p.keyboard.down('Space');
  await p.waitForTimeout(600);
  const mid = await p.evaluate(() => ({ c: window.StussyPanic.state.complaint, complaining: window.StussyPanic.state.complaining }));
  ok(mid.c < 100 && mid.complaining, 'holding SPACE drains the meter while complaining (' + Math.round(mid.c) + ')');
  // 600ms at 60 units a second should take roughly 36 off the meter
  ok(mid.c > 45 && mid.c < 80,
     'and it drains at the doubled rate — ' + Math.round(100 - mid.c) + ' units in 600ms');
  // poll for the moment it runs dry — at the doubled rate that is ~1.7s in,
  // and the recharge starts soon after, so a fixed wait would sample too late
  const dry = await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    for (let i = 0; i < 100 && !g.exhausted; i++) {
      await new Promise(r => setTimeout(r, 40));
    }
    return { c: g.complaint, ex: g.exhausted, complaining: g.complaining };
  });
  ok(dry.c === 0 && dry.ex && !dry.complaining, 'meter empties and the cat loses its voice');
  await p.waitForTimeout(1200);
  const stillHeld = await p.evaluate(() => window.StussyPanic.state.complaining);
  ok(stillHeld === false, 'an empty meter cannot be used even with SPACE still held');
  await p.keyboard.up('Space');
  await p.waitForTimeout(2600);
  const back = await p.evaluate(() => ({ c: window.StussyPanic.state.complaint, ex: window.StussyPanic.state.exhausted }));
  ok(back.c > 20 && !back.ex, 'meter recharges and the voice comes back (' + Math.round(back.c) + ')');

  // ---- 4: complaining scares whoever is in earshot --------------------------
  await settle(60);
  const scared = await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    g.cat.rolling = false;                 // park her: this is a scare test, not a walk test
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

  // ---- 4b: the two of them call out when they close in ---------------------
  await settle(60);
  const taunts = await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    g.cat.rolling = false;              // park her so they stay in earshot
    g.grace = 10;                       // keep Stussy safe while they crowd in
    g.photographer.flee = 0; g.landlord.flee = 0;
    g.photographer.tauntTimer = 0; g.landlord.tauntTimer = 0;
    g.photographer.tauntCooldown = 0; g.landlord.tauntCooldown = 0;
    g.photographer.x = g.cat.x + 70; g.photographer.y = g.cat.y;
    g.landlord.x = g.cat.x - 70; g.landlord.y = g.cat.y;
    await new Promise(r => setTimeout(r, 300));
    return {
      photoTimer: g.photographer.tauntTimer,
      maryTimer: g.landlord.tauntTimer,
      photoSayings: g.photographer.sayings.map(x => x.join(' ')),
      maryLines: g.landlord.sayings[0].join(' ')
    };
  });
  ok(taunts.photoTimer > 0 && taunts.maryTimer > 0, 'both start on Stussy once they are close');
  ok(taunts.maryLines === "WHERE'S YOUR RENT!?", 'Maryellen asks where the rent is — "' + taunts.maryLines + '"');
  var wantPhoto = ['BAD REVIEW ON TRADEME HEY!?!', 'CHECK YOUR WHITE BALANCE'];
  ok(wantPhoto.every(l => taunts.photoSayings.indexOf(l) >= 0) &&
     taunts.photoSayings.length === wantPhoto.length,
     'the photographer has two things to say: ' + taunts.photoSayings.map(l => '"' + l + '"').join(', '));

  const hushed = await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    g.photographer.tauntTimer = 2; g.photographer.flee = 2;
    await new Promise(r => setTimeout(r, 200));
    return g.photographer.tauntTimer;
  });
  ok(hushed <= 0, 'whoever is running away stops talking');

  // ---- 5: capture, life loss, respawn --------------------------------------
  await settle(0);
  const cap = await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    g.cat.rolling = false;              // stand still and be caught
    g.grace = 0; g.photographer.flee = 0; g.landlord.flee = 0;
    const lives = g.lives;
    g.photographer.x = g.cat.x; g.photographer.y = g.cat.y;
    await new Promise(r => setTimeout(r, 200));
    const caught = { state: g.state, lives: g.lives, lost: lives - g.lives,
                     catcherTaunt: g.photographer.tauntTimer };
    await new Promise(r => setTimeout(r, 2200));
    caught.after = g.state;
    caught.home = Math.abs(g.cat.x - (g.cat.home.x * 32 + 16)) < 1;
    return caught;
  });
  ok(cap.state === 'caught' && cap.lost === 1, 'being caught costs a life');
  ok(cap.catcherTaunt > 0, 'whoever catches Stussy gets the last word');
  ok(cap.after === 'play' && cap.home, 'the cat respawns at its starting corner');

  // ---- 6: game over and restart --------------------------------------------
  await settle(0);
  const over = await p.evaluate(async () => {
    const g = window.StussyPanic.state;
    g.cat.rolling = false;
    g.lives = 0; g.grace = 0; g.photographer.flee = 0;
    g.photographer.x = g.cat.x; g.photographer.y = g.cat.y;
    await new Promise(r => setTimeout(r, 300));
    const mid = g.lives;
    await new Promise(r => setTimeout(r, 2600));
    return { lives: mid, state: window.StussyPanic.state.state };
  });
  ok(over.state === 'over', 'losing the last cat ends the game');
  await p.waitForTimeout(1200);
  await p.keyboard.press('Space');
  await p.waitForTimeout(400);
  const restart = await p.evaluate(() => {
    const g = window.StussyPanic.state;
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

  // ---- 8: the two hand-drawn levels ----------------------------------------
  const themed = await p.evaluate(() => {
    const out = {};
    [1, 2, 3, 4, 5, 6, 7].forEach(lvl => {
      const d = Maze.generate(lvl, lvl * 7919 + 104729);
      let low = 0, solid = 0;
      d.grid.forEach(row => row.forEach(t => {
        if (t === Maze.HEDGE) low++;
        if (t === Maze.TREE) solid++;
      }));
      out[lvl] = { theme: Maze.themeFor(lvl), pickups: d.mushrooms.length, low: low, solid: solid };
    });
    return out;
  });
  ok(themed[2].theme === 'mansion' && themed[3].theme === 'strait' &&
     themed[4].theme === 'beach' && themed[5].theme === 'supermarket' &&
     themed[6].theme === 'miramar',
     'levels 2 to 6 are the mansion, the street, the beach, the supermarket and Miramar');
  ok(themed[1].theme === 'garden' && themed[7].theme === 'garden',
     'the other levels are still generated gardens');
  ok([2, 3, 4, 5, 6].every(l => themed[l].pickups === 9),
     'all five hand-drawn levels hold nine collectibles');
  ok([2, 3, 4, 5, 6].every(l => themed[l].low > 0 && themed[l].solid > 0),
     'each has low obstacles to step over and solid ones that stop everyone');

  // the two set pieces: a rowboat parked in the villa lounge, and the Majestic
  // Centre standing in a block on Victoria Street
  const decor = await p.evaluate(() => {
    const out = {};
    [2, 3, 5].forEach(lvl => {
      const d = Maze.generate(lvl, 0);
      out[lvl] = (d.decor || []).map(dec => ({
        kind: dec.kind,
        tile: d.grid[dec.y][dec.x],
        x: dec.x, y: dec.y
      }));
    });
    return out;
  });
  const boat = decor[2].find(d => d.kind === 'rowboat');
  const tower = decor[3].find(d => d.kind === 'majestic');
  ok(boat && boat.tile === 0,
     'a rowboat sits in the villa, decoration only — you walk straight past it');
  ok(decor[2].some(d => d.kind === 'stairs'), 'the staircase is still there too');
  ok(tower && tower.tile === 2,
     'the Majestic Centre stands in a solid block on the street level');
  // the photo studio in the corner of the street level
  const studio = {};
  decor[3].forEach(d => { studio[d.kind] = (studio[d.kind] || 0) + 1; });
  ok(studio.sign === 1 && studio.light === 2 && studio.tripod === 1 &&
     studio.plant >= 1 && studio.laptop === 1 && studio.cord >= 3 && studio.guy === 1,
     'the studio is furnished: sign, two lights, tripod, plant, the laptop, a cord ' +
     'and a young man standing much too close (' + JSON.stringify(studio) + ')');
  const bystander = await p.evaluate(() => {
    const d = Maze.generate(3, 0);
    const guy = d.decor.find(x => x.kind === 'guy');
    const lap = d.decor.find(x => x.kind === 'laptop');
    return {
      beside: Math.abs(guy.x - lap.x) + Math.abs(guy.y - lap.y) === 1,
      solid: d.grid[guy.y][guy.x] === Maze.TREE
    };
  });
  ok(bystander.beside && bystander.solid, 'he stands right beside the stool, and in the way');
  const studioTiles = await p.evaluate(() => {
    const d = Maze.generate(3, 0);
    const cords = d.decor.filter(x => x.kind === 'cord');
    const gear = d.decor.filter(x => ['light', 'tripod', 'plant', 'laptop'].indexOf(x.kind) >= 0);
    return {
      cordsWalkable: cords.every(c => d.grid[c.y][c.x] === Maze.FLOOR),
      gearSolid: gear.every(g => d.grid[g.y][g.x] === Maze.TREE),
      inside: d.mushrooms.filter(m => m.x < 9 && m.y < 8).length
    };
  });
  ok(studioTiles.cordsWalkable, 'the cord lies on walkable floor — you can step on it, which is the point');
  ok(studioTiles.gearSolid, 'the lights, tripod, plant and stool all block the way');
  ok(studioTiles.inside === 2, 'two collectables are in the room (' + studioTiles.inside + ')');

  const fascia = decor[5].find(d => d.kind === 'fascia');
  ok(fascia && fascia.tile === 2 && fascia.y === 0,
     'the shop fascia runs along the top of the supermarket');

  // the tripwire itself: step on the cord, lose the laptop and 4500 points
  const trap = await p.evaluate(async () => {
    window.StussyPanic.goToLevel(3);
    const g = window.StussyPanic.state, T = 32;
    // the intro banner holds the game out of play for a couple of seconds,
    // and the trap is only armed during play
    for (let i = 0; i < 200 && g.state !== 'play'; i++) {
      await new Promise(r => setTimeout(r, 30));
    }
    g.grace = 60; g.cat.rolling = false;
    g.photographer.x = -500; g.landlord.x = -500;
    const before = g.score;
    const cord = g.trap.cords[0];
    g.cat.x = cord.x * T + T / 2; g.cat.y = cord.y * T + T / 2;
    await new Promise(r => setTimeout(r, 150));
    const first = { lost: before - g.score, triggered: g.trap.triggered, boom: !!g.explosion,
                    yelling: g.guyYell > 0,
                    plugged: g.trap.cords.some(c => c.kind === 'cordPlug') };
    // step off and back on: it only goes off once
    g.cat.x = (cord.x - 1) * T + T / 2;
    await new Promise(r => setTimeout(r, 80));
    g.cat.x = cord.x * T + T / 2;
    await new Promise(r => setTimeout(r, 150));
    return { first, second: before - g.score, score: g.score };
  });
  ok(trap.first.lost === 4500 && trap.first.triggered,
     'stepping on the cord drops the laptop and costs 4500 (score now ' + trap.score + ')');
  ok(trap.first.boom, 'and the laptop goes up — the explosion effect fires');
  ok(trap.first.plugged, 'the cord that trips it is the one plugged into the laptop');
  ok(trap.first.yelling, 'and the young man lets out his FUCK NOOOOO!');
  ok(trap.second === 4500, 'the trap only goes off once');

  // what each level looks like and who is chasing on it
  const look = await p.evaluate(async () => {
    const out = {};
    for (const lvl of [2, 3, 5, 6]) {
      window.StussyPanic.goToLevel(lvl);
      await new Promise(r => setTimeout(r, 60));
      const g = window.StussyPanic.state;
      out[lvl] = { name: g.theme.name, caught: g.theme.rival.caught,
                   rival: g.landlord.sayings[0].join(' '),
                   sayings: g.landlord.sayings.map(x => x.join(' ')),
                   photogSayings: g.photographer.sayings.map(x => x.join(' ')),
                   photogCaught: g.photographer.caughtText };
    }
    return out;
  });
  ok(look[2].name === 'HAWKER ST MANSION', 'level 2 announces itself as ' + look[2].name);
  ok(look[2].rival === 'FUCK OFF STUSSY',
     'Charteris Bay Man greets Stussy with "' + look[2].rival + '"');
  ok(/CHARTERIS BAY MAN/.test(look[2].caught), 'he replaces Maryellen on that level');
  ok(look[3].name === 'STRAIT OF STUSSY', 'level 3 announces itself as ' + look[3].name);
  ok(look[3].rival === "WHERE'S YOUR RENT!?" && /MARYELLEN/.test(look[3].caught),
     'Maryellen and the photographer are the pair on the street level');
  ok(look[5].name === 'THE SUPERMARKET', 'level 5 announces itself as ' + look[5].name);
  ok(look[6].name === 'MIRAMAR', 'level 6 announces itself as ' + look[6].name);
  const wantPJ = ['YOU SHALL NOT PASS!', 'FRAN AND I WELCOME YOU TO OUR KINGDOM'];
  ok(wantPJ.every(l => look[6].sayings.indexOf(l) >= 0) && look[6].sayings.length === wantPJ.length,
     'Peter Jackson says: ' + look[6].sayings.map(l => '"' + l + '"').join(' and '));
  ok(/ALIEN/.test(look[6].photogCaught) && look[6].photogSayings.length > 0,
     'and an alien has taken the photographer\'s place — caught banner "' + look[6].photogCaught + '"');
  ok(look[5].photogCaught === 'SNAPPED BY THE PHOTOGRAPHER!',
     'while on every other level the photographer is still himself');
  const wantStaff = ['CLUB+ CARD?', 'SECURITY TO AISLE 3'];
  ok(wantStaff.every(l => look[5].sayings.indexOf(l) >= 0) &&
     look[5].sayings.length === wantStaff.length,
     'on shift she says: ' + look[5].sayings.map(l => '"' + l + '"').join(' and '));

  // the hedge rule still bites indoors: Stussy cannot cross the furniture
  await p.evaluate(() => {
    window.StussyPanic.goToLevel(2);
    window.__t2 = { catOnBlocked: 0, peopleOnLow: 0, samples: 0 };
    const T = 32;
    window.__probe2 = setInterval(() => {
      const g = window.StussyPanic.state;
      if (g.state !== 'play') return;
      const at = e => g.grid[Math.floor(e.y / T)][Math.floor(e.x / T)];
      window.__t2.samples++;
      if (at(g.cat) !== Maze.FLOOR) window.__t2.catOnBlocked++;
      g.enemies.forEach(e => { if (at(e) === Maze.HEDGE) window.__t2.peopleOnLow++; });
    }, 30);
  });
  await p.waitForTimeout(2400);
  for (let i = 0; i < 24; i++) {
    const k = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][i % 4];
    await p.keyboard.down(k); await p.waitForTimeout(200); await p.keyboard.up(k);
  }
  const t2 = await p.evaluate(() => { clearInterval(window.__probe2); return window.__t2; });
  console.log('   mansion samples:', JSON.stringify(t2));
  ok(t2.catOnBlocked === 0, 'in the villa Stussy never walks through furniture or a wall');
  console.log('   (roaming samples caught them on furniture ' + t2.peopleOnLow + ' times — the villa\'s' +
              ' furniture is mostly off their shortest routes, so put it to them directly:)');

  // Deterministic version: stand Stussy the far side of a sofa and see whether
  // the chaser walks over it rather than around.
  const stepped = await p.evaluate(async () => {
    const g = window.StussyPanic.state, T = 32;
    // find a piece of furniture with clear floor above and below it
    let spot = null;
    for (let y = 1; y < Maze.ROWS - 1 && !spot; y++) {
      for (let x = 1; x < Maze.COLS - 1 && !spot; x++) {
        if (g.grid[y][x] === Maze.HEDGE &&
            g.grid[y - 1][x] === Maze.FLOOR && g.grid[y + 1][x] === Maze.FLOOR) {
          spot = { x: x, y: y };
        }
      }
    }
    if (!spot) return { spot: null };

    g.grace = 60;
    g.cat.x = spot.x * T + T / 2; g.cat.y = (spot.y + 1) * T + T / 2;
    const e = g.landlord;
    e.flee = 0; e.tauntTimer = 0;
    e.x = spot.x * T + T / 2; e.y = (spot.y - 1) * T + T / 2;
    e.tx = spot.x; e.ty = spot.y - 1; e.prev = { x: spot.x, y: spot.y - 2 };

    let crossed = false;
    for (let i = 0; i < 90; i++) {
      await new Promise(r => setTimeout(r, 20));
      if (Math.floor(e.x / T) === spot.x && Math.floor(e.y / T) === spot.y) crossed = true;
    }
    return { spot: spot, crossed: crossed };
  });
  ok(stepped.spot && stepped.crossed,
     'a chaser walks straight over a sofa at ' + JSON.stringify(stepped.spot) + ' to reach Stussy');

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  if (failures || errors.length) {
    console.log(failures + ' check(s) failed');
    process.exit(1);
  }
  console.log('all checks passed');
})();

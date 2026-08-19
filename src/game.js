/* game.js — Mushroom Bother.
 *
 * Stussy the cat is collecting nine mushrooms out of a hedge maze. A photographer
 * wants the shot and Maryellen the landlord wants a word. Both of them stride
 * straight over the hedges; Stussy has to go the long way round. Stussy's only
 * defence is to complain, loudly, for as long as the complaint meter holds out.
 */
(function (global) {
  'use strict';

  var M = global.Maze, S = global.Sprites, Sfx = global.Sfx;
  var Music = global.Music, Screens = global.Screens;
  var FLOOR = M.FLOOR, HEDGE = M.HEDGE, TREE = M.TREE;

  var TILE = 32;
  var COLS = M.COLS, ROWS = M.ROWS;
  var PLAY_W = COLS * TILE, PLAY_H = ROWS * TILE;
  var HUD_H = 56;

  var TURN_TOL = 7;          // how close to a tile centre the cat may turn
  var TURN_BUFFER = 0.6;     // seconds a turn you asked for early stays queued
  var CATCH_DIST = 19;       // pixels between centres that counts as a capture
  var SCARE_RADIUS = 4.6 * TILE;
  var FLEE_TIME = 2.3;       // seconds an enemy keeps running after being yelled at

  var COMPLAINT_MAX = 100;
  var COMPLAINT_DRAIN = 30;      // units per second while held
  var COMPLAINT_RECHARGE = 13;   // units per second once it has settled
  var RECHARGE_DELAY = 0.85;     // quiet seconds before it starts refilling
  var RECOVER_THRESHOLD = 22;    // after running dry, needs this much to be usable again

  var BONUS_CHANCE = 1;      // how often the bonus item turns up: 1 = every level
  var BONUS_SCORE = 250;
  var NEVER_CATCH = 1.4 * TILE;   // how close a hopeless pursuit ever gets

  var STARTING_LIVES = 3;
  var EXTRA_LIFE_EVERY = 5000;

  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // What Stussy yells to drive them off. Entries with two lines are split here
  // rather than wrapped, so each one breaks where it reads best.
  // Each level wears a theme: what the ground, the low obstacles, the solid
  // obstacles and the collectible look like, and who the second chaser is.
  var THEMES = {
    garden: {
      name: null,
      subtitle: 'nine mushrooms — mind the hedges',
      cleared: 'GARDEN CLEARED!',
      floor: S.grass, low: S.hedge, solid: S.tree,
      solidOverhead: true,          // tree canopies overhang, so draw them last
      pickup: S.mushroom,
      bonus: { draw: S.sonos, chases: 'cat' },
      rival: {
        draw: S.landlord,
        sayings: [["WHERE'S YOUR RENT!?"]],
        caught: 'CAUGHT BY MARYELLEN!'
      }
    },
    mansion: {
      name: 'HAWKER ST MANSION',
      subtitle: 'nine cheese and crackers — mind the furniture',
      cleared: 'MANSION CLEARED!',
      floor: S.floor, low: S.furniture, solid: S.wall,
      solidOverhead: false,
      pickup: S.cheese,
      bonus: { draw: S.sonos, chases: 'cat' },
      decor: { stairs: S.stairs, rowboat: S.rowboat },
      rival: {
        draw: S.rocker,
        sayings: [['FUCK OFF STUSSY']],
        caught: 'SEEN OFF BY CHARTERIS BAY MAN!'
      }
    },
    beach: {
      name: 'THE BEACH',
      subtitle: 'nine life rings — mind the driftwood',
      cleared: 'BEACH CLEARED!',
      floor: S.sand, low: S.driftwood, solid: S.rock,
      solidOverhead: false,
      pickup: S.lifering,
      decor: { sea: S.sea },
      rival: {
        draw: S.willie,
        sayings: [
          ['LOVELY DAY FOR IT!'],
          ['GETTING A BEARD', 'TRIM TOMORROW'],
          ['WINDY'],
          ["IT'S RAINING"]
        ],
        caught: 'HELLO DARLING'
      },
      // Down here the law has other priorities than a cat with a jar.
      bonus: { draw: S.tumjal, chases: 'rival' }
    },
    strait: {
      name: 'STRAIT OF STUSSY',
      subtitle: 'nine sugared doughnuts — mind the planters',
      cleared: 'STREET CLEARED!',
      floor: S.street, low: S.planter, solid: S.building,
      solidOverhead: false,
      pickup: S.doughnut,
      bonus: { draw: S.sonos, chases: 'cat' },
      decor: { majestic: S.majestic },
      rival: {
        draw: S.landlord,
        sayings: [["WHERE'S YOUR RENT!?"]],
        caught: 'CAUGHT BY MARYELLEN!'
      }
    }
  };

  var COMPLAINTS = [
    ["THAT'S NOT PALEO!"],
    ['THE LIFT IS', 'BROKEN AGAIN!'],
    ['THIS CAMERA IS', 'WORTH HALF THAT!'],
    ['MEOW!'],
    ['MRRRAOW!'],
    ['NOT NOW!'],
    ['MY MUSHROOMS!'],
    ['GO AWAY!']
  ];

  // What they shout when they close in on Stussy. Each character has a list of
  // sayings and picks one at a time; a saying is split into lines here so a long
  // one does not sprawl across half the garden.
  var TAUNTS = {
    photographer: [
      ['BAD REVIEW ON', 'TRADEME HEY!?!'],
      ['CHECK YOUR', 'WHITE BALANCE']
    ],
    landlord: [["WHERE'S YOUR RENT!?"]]
  };

  TAUNTS.police = [["THAT'S NOT YOURS!"]];
  TAUNTS.policeRival = [['PUT THAT AWAY!']];

  var TAUNT_RADIUS = 7 * TILE;   // how close they get before they start on you
  var TAUNT_SHOW = 2.2;          // seconds a line stays up
  var TAUNT_GAP = 3.4;           // quiet seconds before the same one pipes up again

  /* ------------------------------------------------------------------ input */

  var keys = Object.create(null);
  var pressed = Object.create(null);   // edge-triggered, cleared each frame

  var KEY_ALIASES = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  global.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) !== -1) e.preventDefault();
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
    Sfx.unlock();
  });
  global.addEventListener('keyup', function (e) { keys[e.code] = false; });
  global.addEventListener('blur', function () { keys = Object.create(null); Sfx.complaintStop(); });

  // True if the key is down now, or was tapped since the last frame. A quick
  // tap can begin and end between two frames, and it still has to steer.
  function held(name) {
    for (var code in KEY_ALIASES) {
      if (KEY_ALIASES[code] !== name) continue;
      if (keys[code] || pressed[code]) return true;
    }
    return false;
  }

  /* ------------------------------------------------------- touch controls */

  // An on-screen d-pad bottom left and a complain button bottom right, drawn
  // over the garden. They only appear on touch devices, so a desktop player
  // never sees them.
  var DPAD = { cx: 116, cy: PLAY_H - 118, r: 92, dead: 20 };
  var YELL = { cx: PLAY_W - 116, cy: PLAY_H - 118, r: 66 };

  var touch = {
    enabled: false,
    dir: null,          // {x, y} while a direction is being pressed
    latch: null,        // a tap too quick to span a frame, consumed next frame
    complain: false,
    padPointer: null,
    yellPointer: null
  };

  function coarsePointer() {
    return (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) ||
           ('ontouchstart' in global) || (global.navigator && global.navigator.maxTouchPoints > 0);
  }
  touch.enabled = coarsePointer();

  function canvasPoint(ev) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function within(p, c) {
    var dx = p.x - c.cx, dy = p.y - c.cy;
    return dx * dx + dy * dy <= c.r * c.r;
  }

  // Which way the thumb is pushing: whichever axis is furthest from centre.
  function padDirection(p) {
    var dx = p.x - DPAD.cx, dy = p.y - DPAD.cy;
    if (dx * dx + dy * dy < DPAD.dead * DPAD.dead) return null;
    if (Math.abs(dx) > Math.abs(dy)) return { x: dx > 0 ? 1 : -1, y: 0 };
    return { x: 0, y: dy > 0 ? 1 : -1 };
  }

  // The controls are live during a round only — on the title and game over
  // screens a tap anywhere should start the game instead.
  function controlsLive() {
    return touch.enabled && game &&
           game.state !== STATE.CRACK && game.state !== STATE.LOADING &&
           game.state !== STATE.TITLE && game.state !== STATE.OVER;
  }

  function onPointerDown(ev) {
    Sfx.unlock();
    if (ev.pointerType === 'touch' || ev.pointerType === 'pen') touch.enabled = true;
    var p = canvasPoint(ev);

    if (controlsLive()) {
      if (within(p, YELL)) {
        touch.yellPointer = ev.pointerId;
        touch.complain = true;
        ev.preventDefault();
        return;
      }
      // a generous catch area around the pad, so a stray thumb still steers
      if (within(p, { cx: DPAD.cx, cy: DPAD.cy, r: DPAD.r * 1.2 })) {
        touch.padPointer = ev.pointerId;
        touch.dir = padDirection(p);
        if (touch.dir) touch.latch = touch.dir;
        ev.preventDefault();
        return;
      }
    }

    // A tap anywhere else works like SPACE, for the title and game over screens.
    pressed.Space = true;
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (ev.pointerId !== touch.padPointer) return;
    touch.dir = padDirection(canvasPoint(ev));
    if (touch.dir) touch.latch = touch.dir;
    ev.preventDefault();
  }

  function onPointerUp(ev) {
    if (ev.pointerId === touch.padPointer) { touch.padPointer = null; touch.dir = null; }
    if (ev.pointerId === touch.yellPointer) { touch.yellPointer = null; touch.complain = false; }
  }

  function releaseTouch() {
    touch.padPointer = null; touch.yellPointer = null;
    touch.dir = null; touch.complain = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  global.addEventListener('blur', releaseTouch);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { releaseTouch(); Sfx.complaintStop(); }
  });

  /* ------------------------------------------------------------- game state */

  var STATE = {
    CRACK: 'crack', LOADING: 'loading',
    TITLE: 'title', INTRO: 'intro', PLAY: 'play',
    CAUGHT: 'caught', CLEAR: 'clear', OVER: 'over'
  };

  var LOADING_TIME = 10;     // seconds the loading picture stays up

  var game = null;

  function makeEntity(tile, speed, stepsOverHedges) {
    return {
      x: tile.x * TILE + TILE / 2,
      y: tile.y * TILE + TILE / 2,
      tx: tile.x, ty: tile.y,
      home: { x: tile.x, y: tile.y },
      dir: { x: 1, y: 0 },
      want: null,
      speed: speed,
      stepsOverHedges: !!stepsOverHedges,
      flee: 0,
      prev: { x: tile.x, y: tile.y },
      anim: 0,
      sayings: null,
      saying: null,        // the one currently in the bubble
      tauntTimer: 0,
      tauntCooldown: 1.5,
      rolling: false,      // Stussy: under way, as opposed to parked
      wantTimer: 0
    };
  }

  function newGame() {
    game = {
      state: STATE.TITLE,
      timer: 0,
      level: 1,
      score: 0,
      lives: STARTING_LIVES,
      nextExtraLife: EXTRA_LIFE_EVERY,
      best: Number(global.localStorage && global.localStorage.getItem('mb_best') || 0),
      paused: false,
      shake: 0,
      floaters: [],
      complaint: COMPLAINT_MAX,
      exhausted: false,
      quietFor: 0,
      complaining: false,
      says: null,          // something Stussy comes out with, unprompted
      saysTimer: 0,
      phrase: COMPLAINTS[0],
      phraseTimer: 0,
      grace: 0
    };
    loadLevel(1);
  }

  function loadLevel(level) {
    var data = M.generate(level, level * 7919 + 104729);
    game.level = level;
    game.theme = THEMES[M.themeFor(level)] || THEMES.garden;
    game.grid = data.grid;
    game.mushrooms = data.mushrooms.map(function (m) { return { x: m.x, y: m.y, taken: false }; });
    game.decor = data.decor || [];
    game.remaining = game.mushrooms.length;

    game.cat = makeEntity(data.catSpawn, 132, false);
    game.cat.dir = { x: 1, y: 0 };

    var photoSpeed = Math.min(150, 112 + (level - 1) * 6);
    var marySpeed = Math.min(140, 96 + (level - 1) * 5);
    game.photographer = makeEntity(data.spawns.photographer, photoSpeed, true);
    game.landlord = makeEntity(data.spawns.landlord, marySpeed, true);
    game.photographer.sayings = TAUNTS.photographer;
    game.photographer.draw = S.photographer;
    game.photographer.caughtText = 'SNAPPED BY THE PHOTOGRAPHER!';
    game.landlord.sayings = game.theme.rival.sayings;
    game.landlord.draw = game.theme.rival.draw;
    game.landlord.caughtText = game.theme.rival.caught;
    game.enemies = [game.photographer, game.landlord];
    game.police = null;

    placeBonus(data);

    game.complaint = COMPLAINT_MAX;
    game.exhausted = false;
    game.says = null;
    game.saysTimer = 0;
    game.grace = 1.5;
    game.state = STATE.INTRO;
    game.timer = 2.0;
  }

  // The bonus item is out on every level, dropped somewhere Stussy can reach
  // but nowhere near where she starts. What it is depends on where you are: a
  // speaker in town, a jar of Tumjal relish at the beach.
  function placeBonus(data) {
    game.bonus = null;
    if (Math.random() >= BONUS_CHANCE) return;

    var taken = {};
    game.mushrooms.forEach(function (m) { taken[m.x + ',' + m.y] = true; });

    var options = [];
    for (var y = 1; y < ROWS - 1; y++) {
      for (var x = 1; x < COLS - 1; x++) {
        var d = data.reachable[x + y * COLS];
        if (d > 6 && !taken[x + ',' + y]) options.push({ x: x, y: y });
      }
    }
    if (!options.length) return;
    var spot = options[(Math.random() * options.length) | 0];
    game.bonus = { x: spot.x, y: spot.y, taken: false };
  }

  // Taking it brings a policeman out. Usually he wants a word with Stussy;
  // at the beach he has taken one look at Willie and lost interest in her.
  function callPolice() {
    var afterRival = game.theme.bonus.chases === 'rival';
    var corner = { x: COLS - 2, y: ROWS - 2 };
    var best = null, bestDist = -1;
    for (var y = 1; y < ROWS - 1; y++) {
      for (var x = 1; x < COLS - 1; x++) {
        if (tileAt(x, y) !== FLOOR) continue;
        var d = Math.abs(x - Math.floor(game.cat.x / TILE)) + Math.abs(y - Math.floor(game.cat.y / TILE));
        if (d > bestDist) { bestDist = d; best = { x: x, y: y }; }
      }
    }
    var spawn = best || corner;
    var police = makeEntity(spawn, Math.min(146, 108 + (game.level - 1) * 6), true);
    police.draw = S.police;
    police.caughtText = 'COLLARED BY THE POLICEMAN!';
    police.tauntCooldown = 0.6;

    if (afterRival) {
      // He follows Willie about telling him to put it away, and never quite
      // gets there: he is slower, and he backs off if he ever closes right up.
      police.chasing = game.landlord;
      police.tauntTarget = game.landlord;
      police.harmless = true;
      police.sayings = TAUNTS.policeRival;
      police.speed = Math.min(police.speed, game.landlord.speed - 10);
      // start him a few paces behind Willie, snapped to a tile he can stand on
      police.tx = Math.floor(game.landlord.x / TILE) - 3;
      police.ty = Math.floor(game.landlord.y / TILE);
      if (tileAt(police.tx, police.ty) !== FLOOR) {
        police.tx = spawn.x; police.ty = spawn.y;
      }
      police.x = police.tx * TILE + TILE / 2;
      police.y = police.ty * TILE + TILE / 2;
      police.home = { x: police.tx, y: police.ty };
    } else {
      police.chasing = game.cat;
      police.sayings = TAUNTS.police;
    }

    game.police = police;
    game.enemies.push(police);
  }

  function resetPositions() {
    var all = [game.cat].concat(game.enemies);
    all.forEach(function (e) {
      e.x = e.home.x * TILE + TILE / 2;
      e.y = e.home.y * TILE + TILE / 2;
      e.tx = e.home.x; e.ty = e.home.y;
      e.prev = { x: e.home.x, y: e.home.y };
      e.dir = { x: 1, y: 0 };
      e.want = null;
      e.rolling = false;
      e.wantTimer = 0;
      e.flee = 0;
      e.tauntTimer = 0;
      e.tauntCooldown = 1.5;
    });
    game.grace = 2.0;
    game.complaint = Math.max(game.complaint, COMPLAINT_MAX * 0.5);
    game.exhausted = false;
  }

  /* ------------------------------------------------------------- collision */

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return TREE;
    return game.grid[y][x];
  }

  function canWalk(entity, x, y) {
    var t = tileAt(x, y);
    if (t === FLOOR) return true;
    if (t === HEDGE) return entity.stepsOverHedges;
    return false;                       // trees stop everybody
  }

  function tileOf(e) {
    return { x: Math.floor(e.x / TILE), y: Math.floor(e.y / TILE) };
  }

  /* ---------------------------------------------------------- cat movement */

  function readWantedDirection() {
    if (held('up')) return { x: 0, y: -1 };
    if (held('down')) return { x: 0, y: 1 };
    if (held('left')) return { x: -1, y: 0 };
    if (held('right')) return { x: 1, y: 0 };
    return touch.dir || touch.latch;
  }

  function updateCat(dt) {
    var cat = game.cat;

    // Pac-Man steering: a tap is an instruction, not a throttle. Stussy keeps
    // going in the last direction until she is turned or runs into something.
    var want = readWantedDirection();
    if (want) {
      cat.want = want;
      cat.wantTimer = TURN_BUFFER;
      cat.rolling = true;
    } else if (cat.wantTimer > 0) {
      cat.wantTimer -= dt;
      if (cat.wantTimer <= 0) cat.want = null;   // a turn asked for too early lapses
    }

    var t = tileOf(cat);
    var cxc = t.x * TILE + TILE / 2, cyc = t.y * TILE + TILE / 2;

    if (cat.want) {
      var w = cat.want;
      if (w.x === -cat.dir.x && w.y === -cat.dir.y) {
        cat.dir = w; cat.want = null;
      } else if (w.x !== 0 && Math.abs(cat.y - cyc) <= TURN_TOL && canWalk(cat, t.x + w.x, t.y)) {
        cat.y = cyc; cat.dir = w; cat.want = null;
      } else if (w.y !== 0 && Math.abs(cat.x - cxc) <= TURN_TOL && canWalk(cat, t.x, t.y + w.y)) {
        cat.x = cxc; cat.dir = w; cat.want = null;
      }
    }

    if (!cat.rolling) { cat.moving = false; return; }

    var step = cat.speed * dt;
    var nx = cat.x + cat.dir.x * step;
    var ny = cat.y + cat.dir.y * step;
    if (!canWalk(cat, t.x + cat.dir.x, t.y + cat.dir.y)) {
      if (cat.dir.x > 0) nx = Math.min(nx, cxc);
      if (cat.dir.x < 0) nx = Math.max(nx, cxc);
      if (cat.dir.y > 0) ny = Math.min(ny, cyc);
      if (cat.dir.y < 0) ny = Math.max(ny, cyc);
    }

    var advanced = Math.abs(nx - cat.x) + Math.abs(ny - cat.y);
    cat.x = nx; cat.y = ny;
    cat.moving = advanced > 0.001;
    if (cat.moving) cat.anim += step;
    // parked against a wall: wait here until she is pointed somewhere else
    else cat.rolling = false;
  }

  /* -------------------------------------------------------------- enemy AI */

  // Distance field over everything the humans can cross (grass *and* hedges).
  function humanField(sx, sy) {
    var dist = new Int16Array(COLS * ROWS);
    dist.fill(-1);
    if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return dist;
    var start = sx + sy * COLS;
    dist[start] = 0;
    var q = [start], head = 0;
    while (head < q.length) {
      var idx = q[head++];
      var x = idx % COLS, y = (idx / COLS) | 0, d = dist[idx];
      var nb = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
      for (var i = 0; i < 4; i++) {
        var nx = nb[i][0], ny = nb[i][1];
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        var ni = nx + ny * COLS;
        if (dist[ni] !== -1) continue;
        if (tileAt(nx, ny) === TREE) continue;
        dist[ni] = d + 1;
        q.push(ni);
      }
    }
    return dist;
  }

  function chooseNextTile(e, chaseField, fleeField) {
    // fleeing from a yell, or backing off from a pursuit that is never meant
    // to end — either way, walk away from the field rather than down it
    var away = e.flee > 0 || e.retreat;
    var options = [];
    var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (var i = 0; i < 4; i++) {
      var nx = e.tx + dirs[i][0], ny = e.ty + dirs[i][1];
      if (!canWalk(e, nx, ny)) continue;
      // a hopeless pursuer will not even step onto the man he is pursuing
      if (e.avoidTile && nx === e.avoidTile.x && ny === e.avoidTile.y) continue;
      var f = (away ? fleeField : chaseField)[nx + ny * COLS];
      if (f < 0) f = away ? -1 : 9999;            // unreachable
      options.push({ x: nx, y: ny, score: f, back: (nx === e.prev.x && ny === e.prev.y) });
    }
    if (!options.length) return;

    var forward = options.filter(function (o) { return !o.back; });
    var pool = (away || !forward.length) ? options : forward;

    var best = pool[0];
    for (var k = 1; k < pool.length; k++) {
      var better = away ? pool[k].score > best.score : pool[k].score < best.score;
      // A coin flip on ties keeps the two of them from walking in lockstep.
      if (better || (pool[k].score === best.score && Math.random() < 0.5)) best = pool[k];
    }

    e.prev = { x: e.tx, y: e.ty };
    e.tx = best.x; e.ty = best.y;
    e.dir = { x: Math.sign(best.x - e.prev.x), y: Math.sign(best.y - e.prev.y) };
  }

  function updateEnemy(e, dt, chaseField, fleeField) {
    if (e.flee > 0) e.flee -= dt;
    // backing off has to outpace the man you are backing off from
    var speed = e.speed * (e.flee > 0 ? 1.12 : (e.retreat ? 1.3 : 1));
    var remaining = speed * dt;
    var guard = 0;

    while (remaining > 0 && guard++ < 8) {
      var gx = e.tx * TILE + TILE / 2, gy = e.ty * TILE + TILE / 2;
      var dx = gx - e.x, dy = gy - e.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= remaining) {
        e.x = gx; e.y = gy;
        remaining -= d;
        var before = e.tx + ',' + e.ty;
        chooseNextTile(e, chaseField, fleeField);
        if (before === e.tx + ',' + e.ty) break;   // boxed in
      } else {
        e.x += (dx / d) * remaining;
        e.y += (dy / d) * remaining;
        remaining = 0;
      }
    }
    e.anim += speed * dt;
  }

  function updateEnemies(dt) {
    var catTile = tileOf(game.cat);
    var fleeField = humanField(catTile.x, catTile.y);

    // The photographer goes straight for the cat.
    updateEnemy(game.photographer, dt, fleeField, fleeField);

    // Maryellen tries to cut Stussy off, aiming a few tiles down the path.
    var ax = catTile.x + game.cat.dir.x * 4;
    var ay = catTile.y + game.cat.dir.y * 4;
    ax = Math.max(0, Math.min(COLS - 1, ax));
    ay = Math.max(0, Math.min(ROWS - 1, ay));
    if (tileAt(ax, ay) === TREE) { ax = catTile.x; ay = catTile.y; }
    var ambushField = humanField(ax, ay);
    updateEnemy(game.landlord, dt, ambushField, fleeField);

    // the policeman goes after whoever he is interested in
    if (game.police) {
      var law = game.police;
      var mark = law.chasing || game.cat;
      var field = (mark === game.cat)
        ? fleeField
        : humanField(Math.floor(mark.x / TILE), Math.floor(mark.y / TILE));
      // A pursuit that is never meant to end: once he closes to within a
      // couple of tiles he backs off again, so he follows Willie around the
      // beach for ever without once laying a hand on him.
      var gap = Math.hypot(law.x - mark.x, law.y - mark.y);
      law.retreat = !!(law.harmless && gap < NEVER_CATCH);
      law.avoidTile = law.harmless
        ? { x: Math.floor(mark.x / TILE), y: Math.floor(mark.y / TILE) }
        : null;
      var awayField = law.flee > 0 ? fleeField : field;
      updateEnemy(law, dt, field, awayField);
    }
  }

  // The chasers call out whenever they get near Stussy — and again at the
  // moment they catch her. Someone running away has nothing to say.
  function updateTaunts(dt) {
    game.enemies.forEach(function (e) {
      if (e.tauntTimer > 0) e.tauntTimer -= dt;
      if (e.tauntCooldown > 0) e.tauntCooldown -= dt;
      if (e.flee > 0) { e.tauntTimer = 0; return; }

      var mark = e.tauntTarget || game.cat;
      var dx = e.x - mark.x, dy = e.y - mark.y;
      if (dx * dx + dy * dy < TAUNT_RADIUS * TAUNT_RADIUS && e.tauntCooldown <= 0) {
        // pick something to say — most of them only have the one thing
        if (e.sayings && e.sayings.length) {
          e.saying = e.sayings[(Math.random() * e.sayings.length) | 0];
        }
        e.tauntTimer = TAUNT_SHOW;
        e.tauntCooldown = TAUNT_SHOW + TAUNT_GAP + Math.random() * 2;
        Sfx.taunt(e === game.photographer);
      }
    });
  }

  /* ------------------------------------------------------------- complaint */

  function updateComplaint(dt) {
    var wantsToComplain = (!!keys.Space || touch.complain) && game.state === STATE.PLAY;
    var canComplain = game.complaint > 0 && !game.exhausted;

    if (wantsToComplain && canComplain) {
      game.complaining = true;
      game.complaint -= COMPLAINT_DRAIN * dt;
      game.quietFor = 0;
      Sfx.complaintStart();

      if (game.complaint <= 0) {
        game.complaint = 0;
        game.exhausted = true;
        game.complaining = false;
        Sfx.complaintStop();
        Sfx.empty();
        addFloater(game.cat.x, game.cat.y - 26, 'OUT OF PUFF', '#ff8f6e');
      }

      game.phraseTimer -= dt;
      if (game.phraseTimer <= 0) {
        game.phraseTimer = 0.7;
        game.phrase = COMPLAINTS[(Math.random() * COMPLAINTS.length) | 0];
      }

      // Anyone within earshot turns tail.
      game.enemies.forEach(function (e) {
        var dx = e.x - game.cat.x, dy = e.y - game.cat.y;
        if (dx * dx + dy * dy <= SCARE_RADIUS * SCARE_RADIUS) {
          if (e.flee <= 0) {
            game.score += 25;
            addFloater(e.x, e.y - 24, '+25', '#ffe27a');
            Sfx.scare();
          }
          e.flee = FLEE_TIME;
        }
      });
    } else {
      if (game.complaining) Sfx.complaintStop();
      game.complaining = false;
      game.quietFor += dt;
      if (game.quietFor >= RECHARGE_DELAY) {
        game.complaint = Math.min(COMPLAINT_MAX, game.complaint + COMPLAINT_RECHARGE * dt);
        if (game.exhausted && game.complaint >= RECOVER_THRESHOLD) game.exhausted = false;
      }
    }
  }

  /* ------------------------------------------------------------- mushrooms */

  function checkPickups() {
    var cat = game.cat;
    for (var i = 0; i < game.mushrooms.length; i++) {
      var m = game.mushrooms[i];
      if (m.taken) continue;
      var mx = m.x * TILE + TILE / 2, my = m.y * TILE + TILE / 2;
      if (Math.abs(cat.x - mx) < 18 && Math.abs(cat.y - my) < 18) {
        m.taken = true;
        game.remaining--;
        game.score += 100;
        addFloater(mx, my - 16, '+100', '#9ef07a');
        Sfx.pickup();
        awardExtraLives();
        if (game.remaining === 0) {
          game.score += 500 + game.level * 100;
          game.state = STATE.CLEAR;
          game.timer = 2.6;
          Sfx.complaintStop();
          Sfx.levelClear();
        }
      }
    }
  }

  function checkBonus() {
    if (game.state !== STATE.PLAY) return;
    var s = game.bonus;
    if (!s || s.taken) return;
    var sx = s.x * TILE + TILE / 2, sy = s.y * TILE + TILE / 2;
    if (Math.abs(game.cat.x - sx) > 18 || Math.abs(game.cat.y - sy) > 18) return;

    s.taken = true;
    game.score += BONUS_SCORE;
    addFloater(sx, sy - 16, '+' + BONUS_SCORE, '#7ad4ff');
    game.says = ['GUYS LOOK WHAT', 'I FOUND!'];
    game.saysTimer = 2.8;
    Sfx.pickup();
    Sfx.siren();
    callPolice();
    awardExtraLives();
  }

  function awardExtraLives() {
    while (game.score >= game.nextExtraLife) {
      game.lives++;
      game.nextExtraLife += EXTRA_LIFE_EVERY;
      addFloater(game.cat.x, game.cat.y - 34, 'EXTRA STUSSY!', '#7ad4ff');
    }
  }

  function checkCapture() {
    if (game.grace > 0) return;
    for (var i = 0; i < game.enemies.length; i++) {
      var e = game.enemies[i];
      if (e.harmless) continue;                    // not interested in Stussy
      if (e.flee > 0) continue;                    // too busy fleeing to grab anyone
      var dx = e.x - game.cat.x, dy = e.y - game.cat.y;
      if (dx * dx + dy * dy < CATCH_DIST * CATCH_DIST) {
        game.caughtBy = e.caughtText;
        if (e.sayings && e.sayings.length) e.saying = e.sayings[0];
        e.tauntTimer = 1.6;
        game.lives--;
        game.state = STATE.CAUGHT;
        game.timer = 1.6;
        game.shake = 0.4;
        game.complaining = false;
        Sfx.complaintStop();
        Sfx.caught();
        return;
      }
    }
  }

  /* --------------------------------------------------------------- effects */

  function addFloater(x, y, text, color) {
    game.floaters.push({ x: x, y: y, text: text, color: color, life: 1.1 });
  }

  function updateFloaters(dt) {
    if (game.saysTimer > 0) {
      game.saysTimer -= dt;
      if (game.saysTimer <= 0) game.says = null;
    }
    for (var i = game.floaters.length - 1; i >= 0; i--) {
      var f = game.floaters[i];
      f.life -= dt;
      f.y -= 22 * dt;
      if (f.life <= 0) game.floaters.splice(i, 1);
    }
  }

  /* ---------------------------------------------------------------- update */

  function update(dt) {
    // The crack screen and the loading picture come first, once, at boot.
    if (game.state === STATE.CRACK) {
      Music.washStart();                     // once the audio has been unlocked
      if (pressed.Space || pressed.Enter || pressed.NumpadEnter) {
        game.state = STATE.LOADING;
        // a wall-clock deadline, not a count of frames: ten seconds means ten
        // seconds even if the machine is dropping them
        game.loadingUntil = performance.now() + LOADING_TIME * 1000;
      }
      if (pressed.KeyM) Sfx.toggleMute();
      return;
    }
    if (game.state === STATE.LOADING) {
      Music.washStart();
      if (performance.now() >= game.loadingUntil) {
        Music.washStop();
        game.state = STATE.TITLE;
      }
      if (pressed.KeyM) Sfx.toggleMute();
      return;
    }

    if (pressed.KeyM) Sfx.toggleMute();
    if (pressed.KeyR) {
      Sfx.complaintStop();
      Music.reset();
      newGame();
      game.state = STATE.INTRO;
      Music.start();
    }

    if (game.state === STATE.TITLE) {
      if (Music.isWashing()) Music.washStop();
      if (pressed.Space || pressed.Enter || pressed.NumpadEnter) {
        game.state = STATE.INTRO;
        game.timer = 2.0;
        Music.washStop();
        Music.start();
      }
      return;
    }

    if (pressed.KeyP && (game.state === STATE.PLAY || game.paused)) {
      game.paused = !game.paused;
      if (game.paused) { Sfx.complaintStop(); Music.stop(); }
      else Music.start();
    }
    if (game.paused) return;

    game.shake = Math.max(0, game.shake - dt);
    updateFloaters(dt);

    switch (game.state) {
      case STATE.INTRO:
        game.timer -= dt;
        if (game.timer <= 0) game.state = STATE.PLAY;
        break;

      case STATE.PLAY:
        if (game.grace > 0) game.grace -= dt;
        updateCat(dt);
        updateComplaint(dt);
        updateEnemies(dt);
        updateTaunts(dt);
        checkPickups();
        checkBonus();
        if (game.state === STATE.PLAY) checkCapture();
        break;

      case STATE.CAUGHT:
        game.timer -= dt;
        if (game.timer <= 0) {
          if (game.lives < 0) {
            game.state = STATE.OVER;
            game.timer = 1.0;
            if (game.score > game.best) {
              game.best = game.score;
              if (global.localStorage) global.localStorage.setItem('mb_best', String(game.best));
            }
            Music.reset();
            Sfx.gameOver();
          } else {
            resetPositions();
            game.state = STATE.PLAY;
          }
        }
        break;

      case STATE.CLEAR:
        game.timer -= dt;
        if (game.timer <= 0) loadLevel(game.level + 1);
        break;

      case STATE.OVER:
        game.timer -= dt;
        if (game.timer <= 0 && (pressed.Space || pressed.Enter)) {
          newGame();
          Music.start();
        }
        break;
    }
  }

  /* ------------------------------------------------------------------ draw */

  function drawField() {
    // Ground and low obstacles first. Solid obstacles come after the sprites
    // only where they overhang (tree canopies); walls and buildings are drawn
    // here so characters are never hidden behind them.
    var theme = game.theme;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var t = game.grid[y][x];
        var px = x * TILE, py = y * TILE;
        if (t === HEDGE) theme.low(ctx, px, py, TILE, x, y);
        else if (t === TREE && !theme.solidOverhead) theme.solid(ctx, px, py, TILE, x, y);
        else if (t === TREE) theme.floor(ctx, px, py, TILE, x, y);
        else theme.floor(ctx, px, py, TILE, x, y);
      }
    }

    // fixtures that sit on the ground, like the villa's staircase
    if (theme.decor) {
      game.decor.forEach(function (d) {
        var paint = theme.decor[d.kind];
        if (paint) paint(ctx, d.x * TILE, d.y * TILE, TILE, d.x, d.y);
      });
    }
  }

  function drawSolidsOverhead() {
    if (!game.theme.solidOverhead) return;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (game.grid[y][x] === TREE) game.theme.solid(ctx, x * TILE, y * TILE, TILE, x, y);
      }
    }
  }

  function drawMushrooms(t) {
    var s = game.bonus;
    if (s && !s.taken) {
      var bobbing = ((t * 2) % 2) < 1;
      S.stamp(ctx, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2, TILE, false, function (c) {
        game.theme.bonus.draw(c, bobbing);
      });
    }
    game.mushrooms.forEach(function (m, i) {
      if (m.taken) return;
      var bob = ((t * 2 + i * 0.6) % 2) < 1;
      S.stamp(ctx, m.x * TILE + TILE / 2, m.y * TILE + TILE / 2, TILE, false, function (c) {
        game.theme.pickup(c, bob);
      });
    });
  }

  function drawCharacters() {
    var cat = game.cat;
    var frame = (Math.floor(cat.anim / 9) % 2);
    var blink = game.grace > 0 && (Math.floor(game.grace * 10) % 2 === 0);

    // scare ripples
    if (game.complaining) {
      var pulse = (performance.now() / 1000) % 0.6 / 0.6;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,240,150,' + (0.55 * (1 - pulse)).toFixed(3) + ')';
      ctx.lineWidth = 3;
      for (var ring = 0; ring < 3; ring++) {
        var rad = (pulse + ring / 3) % 1 * SCARE_RADIUS;
        ctx.beginPath();
        ctx.arc(cat.x, cat.y, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function shadow(x, y, w) {
      ctx.fillStyle = 'rgba(10,26,12,0.28)';
      ctx.fillRect(x - w / 2, y + 12, w, 5);
    }

    game.enemies.forEach(function (e) {
      var ef = Math.floor(e.anim / 9) % 2;
      var wobble = e.flee > 0 ? Math.sin(e.anim / 3) * 2 : 0;
      shadow(e.x, e.y + wobble, 20);
      S.stamp(ctx, e.x, e.y + wobble, TILE + 4, e.dir.x < 0, function (c) {
        e.draw(c, ef, e.flee > 0);
      });
    });

    if (!blink) {
      shadow(cat.x, cat.y, 22);
      S.stamp(ctx, cat.x, cat.y, TILE + 2, cat.dir.x < 0, function (c) {
        S.cat(c, cat.moving ? frame : 0, game.complaining);
      });
    }
  }

  // Anything that must stay readable on top of the tree canopies.
  function drawOverlays() {
    game.enemies.forEach(function (e) {
      if (e.flee <= 0) return;
      ctx.fillStyle = '#fff36b';
      ctx.strokeStyle = '#2b2540';
      ctx.lineWidth = 3;
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.strokeText('!', e.x, e.y - 20);
      ctx.fillText('!', e.x, e.y - 20);
    });
    game.enemies.forEach(function (e) {
      if (e.tauntTimer > 0 && e.flee <= 0 && e.saying) {
        drawSpeechBubble(e.x, e.y - 26, e.saying);
      }
    });
    if (game.complaining) drawSpeechBubble(game.cat.x, game.cat.y - 26, game.phrase);
    else if (game.says) drawSpeechBubble(game.cat.x, game.cat.y - 26, game.says);
  }

  // A speech bubble above (x, y), one or more lines, with the tail pointing
  // back down at whoever is talking.
  function drawSpeechBubble(x, y, text) {
    var lines = (typeof text === 'string') ? [text] : text;
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';

    var w = 0;
    for (var i = 0; i < lines.length; i++) {
      w = Math.max(w, ctx.measureText(lines[i]).width);
    }
    w += 14;
    var lineH = 15;
    var h = 6 + lines.length * lineH;
    var bx = Math.max(4, Math.min(PLAY_W - w - 4, x - w / 2));
    var by = Math.max(4, y - h);

    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(bx, by, w, h);
    // tail, kept inside the bubble's own width even when it has been nudged
    // away from the screen edge
    var tail = Math.max(bx + 4, Math.min(bx + w - 10, x - 3));
    ctx.fillStyle = '#2b2540';
    ctx.fillRect(tail, by + h, 6, 5);
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(tail + 1, by + h, 4, 3);

    ctx.fillStyle = '#2b2540';
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], bx + w / 2, by + 14 + j * lineH);
    }
  }

  function drawFloaters() {
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Courier New", monospace';
    game.floaters.forEach(function (f) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = '#20182e';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    var top = PLAY_H;
    ctx.fillStyle = '#2b2560';
    ctx.fillRect(0, top, PLAY_W, HUD_H);
    ctx.fillStyle = '#584bb0';
    ctx.fillRect(0, top, PLAY_W, 2);

    ctx.textAlign = 'left';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#b8b0ff';
    ctx.fillText('SCORE ' + String(game.score).padStart(6, '0'), 12, top + 22);
    ctx.fillText('LEVEL ' + game.level, 12, top + 42);

    ctx.fillText('BEST ' + String(game.best).padStart(6, '0'), 150, top + 22);

    // lives, as little cat heads
    ctx.fillText('STUSSY', 150, top + 42);
    for (var i = 0; i < Math.min(game.lives, 6); i++) {
      S.stamp(ctx, 236 + i * 20, top + 37, 20, false, function (c) {
        S.cat(c, 0, false);
      });
    }

    // the speaker, once it is in the basket and the law is involved
    if (game.police) {
      S.stamp(ctx, 330, top + 28, 22, false, function (c) { game.theme.bonus.draw(c, false); });
    }

    // mushrooms still out there
    ctx.fillText('LEFT', 350, top + 22);
    for (var m = 0; m < game.remaining; m++) {
      S.stamp(ctx, 404 + m * 16, top + 17, 18, false, function (c) { game.theme.pickup(c, false); });
    }

    // complaint meter
    var mx = 350, my = top + 32, mw = 260, mh = 14;
    ctx.fillStyle = '#b8b0ff';
    ctx.fillText('COMPLAINT', mx, my + 12);
    var bx = mx + 100;
    ctx.fillStyle = '#171340';
    ctx.fillRect(bx, my, mw, mh);
    var pct = game.complaint / COMPLAINT_MAX;
    var col = game.exhausted ? '#c0392b' : (pct > 0.4 ? '#57d356' : '#e2c141');
    ctx.fillStyle = col;
    ctx.fillRect(bx + 1, my + 1, Math.max(0, (mw - 2) * pct), mh - 2);
    ctx.strokeStyle = '#584bb0';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, my + 0.5, mw - 1, mh - 1);
    if (game.exhausted) {
      ctx.fillStyle = '#ff9c85';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText('LOST YOUR VOICE', bx + mw + 8, my + 11);
    }

    ctx.textAlign = 'right';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#7d74d0';
    ctx.fillText(Sfx.isMuted() ? 'M: SOUND OFF' : 'M: SOUND ON', PLAY_W - 10, top + 48);
  }

  function drawTouchControls() {
    if (!controlsLive()) return;
    // with your thumb down the pad shows what you are asking for; with it off it
    // shows the direction Stussy is still travelling in
    var active = touch.dir || touch.latch || (game.cat.rolling ? game.cat.dir : null);

    // d-pad, bottom left
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#171340';
    ctx.beginPath(); ctx.arc(DPAD.cx, DPAD.cy, DPAD.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#8d84e0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(DPAD.cx, DPAD.cy, DPAD.r, 0, Math.PI * 2); ctx.stroke();

    var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (var i = 0; i < dirs.length; i++) {
      var dx = dirs[i][0], dy = dirs[i][1];
      var on = active && active.x === dx && active.y === dy;
      var ax = DPAD.cx + dx * DPAD.r * 0.55, ay = DPAD.cy + dy * DPAD.r * 0.55;
      var sz = 19;
      ctx.globalAlpha = on ? 0.95 : 0.62;
      ctx.fillStyle = on ? '#ffe27a' : '#c9c2ff';
      ctx.beginPath();
      ctx.moveTo(ax + dx * sz, ay + dy * sz);
      ctx.lineTo(ax - dx * sz * 0.6 + dy * sz * 0.9, ay - dy * sz * 0.6 + dx * sz * 0.9);
      ctx.lineTo(ax - dx * sz * 0.6 - dy * sz * 0.9, ay - dy * sz * 0.6 - dx * sz * 0.9);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#8d84e0';
    ctx.beginPath(); ctx.arc(DPAD.cx, DPAD.cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // complain button, bottom right, ringed by the complaint meter
    ctx.save();
    var pct = game.complaint / COMPLAINT_MAX;
    var down = touch.complain && !game.exhausted && game.complaint > 0;
    ctx.globalAlpha = down ? 0.72 : 0.5;
    ctx.fillStyle = game.exhausted ? '#3d1a22' : (down ? '#574718' : '#171340');
    ctx.beginPath(); ctx.arc(YELL.cx, YELL.cy, YELL.r, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(20,16,52,0.85)';
    ctx.beginPath(); ctx.arc(YELL.cx, YELL.cy, YELL.r - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = game.exhausted ? '#c0392b' : (pct > 0.4 ? '#57d356' : '#e2c141');
    ctx.beginPath();
    ctx.arc(YELL.cx, YELL.cy, YELL.r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, pct));
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = game.exhausted ? '#ff9c85' : (down ? '#fff3b0' : '#e6e1ff');
    ctx.font = 'bold 19px "Courier New", monospace';
    ctx.fillText(game.exhausted ? 'NO' : 'YOWL', YELL.cx, YELL.cy - 1);
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(game.exhausted ? 'VOICE' : 'COMPLAIN', YELL.cx, YELL.cy + 17);
    ctx.restore();
  }

  function banner(lines, subtitle) {
    ctx.fillStyle = 'rgba(20,16,40,0.78)';
    ctx.fillRect(0, PLAY_H / 2 - 70, PLAY_W, 140);
    ctx.fillStyle = '#6c5eb5';
    ctx.fillRect(0, PLAY_H / 2 - 70, PLAY_W, 3);
    ctx.fillRect(0, PLAY_H / 2 + 67, PLAY_W, 3);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.fillText(lines, PLAY_W / 2, PLAY_H / 2 - 10);
    if (subtitle) {
      ctx.fillStyle = '#b8b0ff';
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillText(subtitle, PLAY_W / 2, PLAY_H / 2 + 26);
    }
  }

  function drawTitle() {
    ctx.fillStyle = '#40318d';
    ctx.fillRect(0, 0, PLAY_W, PLAY_H + HUD_H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 46px "Courier New", monospace';
    ctx.fillText('MUSHROOM BOTHER', PLAY_W / 2, 92);

    ctx.fillStyle = '#8de08d';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('Stussy the cat, nine mushrooms, and two people who want a word', PLAY_W / 2, 124);

    var t = performance.now() / 400;
    S.stamp(ctx, 190, 210, 92, false, function (c) { S.cat(c, Math.floor(t) % 2, false); });
    S.stamp(ctx, 400, 210, 92, false, function (c) { S.photographer(c, Math.floor(t) % 2, false); });
    S.stamp(ctx, 610, 210, 92, false, function (c) { S.landlord(c, Math.floor(t) % 2, false); });

    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#b8b0ff';
    ctx.fillText('STUSSY', 190, 268);
    ctx.fillText('THE PHOTOGRAPHER', 400, 268);
    ctx.fillText('MARYELLEN, YOUR LANDLORD', 610, 268);

    var lines = touch.enabled ? [
      'D-PAD, BOTTOM LEFT  ..... tap a way — she keeps going',
      'HOLD COMPLAIN, RIGHT .... yowl and send them running',
      '',
      'Stussy cannot cross hedges or trees.',
      'They step over the hedges, so they take the short way.',
      'Complaining drains the meter; let go and it slowly refills.',
      'Run it dry and Stussy loses their voice until it recovers.'
    ] : [
      'ARROWS or WASD  ..... tap a way — she keeps going',
      'HOLD SPACE  ......... complain loudly and send them running',
      '',
      'Stussy cannot cross hedges or trees.',
      'They step over the hedges, so they take the short way.',
      'Complaining drains the meter; let go and it slowly refills.',
      'Run it dry and Stussy loses their voice until it recovers.'
    ];
    ctx.font = 'bold 14px "Courier New", monospace';
    for (var i = 0; i < lines.length; i++) {
      ctx.fillStyle = i < 2 ? '#ffe27a' : '#c9c2ff';
      ctx.fillText(lines[i], PLAY_W / 2, 320 + i * 24);
    }

    ctx.fillStyle = (Math.floor(performance.now() / 400) % 2) ? '#ffffff' : '#8de08d';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(touch.enabled ? 'TAP TO START' : 'PRESS SPACE TO START', PLAY_W / 2, PLAY_H + 30);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var now = performance.now() / 1000;
    if (game.state === STATE.CRACK) { Screens.crack(ctx, now, PLAY_W, PLAY_H + HUD_H); return; }
    if (game.state === STATE.LOADING) { Screens.loading(ctx, now, PLAY_W, PLAY_H + HUD_H); return; }
    if (game.state === STATE.TITLE) { drawTitle(); return; }

    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8 * game.shake, (Math.random() - 0.5) * 8 * game.shake);
    }

    var t = performance.now() / 1000;
    drawField();
    drawMushrooms(t);
    drawCharacters();
    drawSolidsOverhead();
    drawOverlays();
    drawFloaters();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHud();
    drawTouchControls();

    if (game.state === STATE.INTRO) {
      banner(game.theme.name || ('LEVEL ' + game.level), game.theme.subtitle);
    } else if (game.state === STATE.CAUGHT) {
      banner(game.caughtBy, game.lives >= 0 ? (game.lives === 1 ? '1 Stussy left' : game.lives + ' Stussys left') : '');
    } else if (game.state === STATE.CLEAR) {
      banner(game.theme.cleared, 'bonus ' + (500 + game.level * 100) + ' — on to level ' + (game.level + 1));
    } else if (game.state === STATE.OVER) {
      banner('GAME OVER', 'score ' + game.score + (touch.enabled ? '  ·  tap to play again' : '  ·  press SPACE to play again'));
    } else if (game.paused) {
      banner('PAUSED', 'press P to carry on');
    }
  }

  /* ------------------------------------------------------------- main loop */

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    for (var k in pressed) delete pressed[k];
    touch.latch = null;
    global.requestAnimationFrame(frame);
  }

  newGame();
  game.state = STATE.CRACK;
  global.requestAnimationFrame(frame);

  // exposed for debugging in the console
  global.MushroomBother = {
    get state() { return game; },
    goToLevel: function (n) { loadLevel(n); }
  };
})(window);

/* maze.js — level layout generation.
 *
 * A level is a grid of tiles. Two kinds of obstacle exist:
 *   HEDGE — low. The cat cannot get through it, but the humans step over it.
 *   TREE  — tall. Nobody gets through it.
 *
 * That asymmetry is the whole game: the cat has to walk the maze while the
 * photographer and the landlord march over the hedges in a straight line.
 */
(function (global) {
  'use strict';

  var FLOOR = 0, HEDGE = 1, TREE = 2;

  var COLS = 25;   // must be odd
  var ROWS = 17;   // must be odd
  var MUSHROOMS_PER_LEVEL = 9;

  // Small deterministic PRNG (xorshift32) so a level can be replayed from a seed.
  function makeRng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  function makeGrid(fill) {
    var g = new Array(ROWS);
    for (var y = 0; y < ROWS; y++) {
      g[y] = new Array(COLS);
      for (var x = 0; x < COLS; x++) g[y][x] = fill;
    }
    return g;
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
  }

  // Recursive-backtracker maze over the odd-coordinate cells.
  function carveMaze(grid, rng) {
    var stack = [[1, 1]];
    grid[1][1] = FLOOR;
    var dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];

    while (stack.length) {
      var cur = stack[stack.length - 1];
      var cx = cur[0], cy = cur[1];
      var options = [];
      for (var i = 0; i < dirs.length; i++) {
        var nx = cx + dirs[i][0], ny = cy + dirs[i][1];
        if (nx > 0 && ny > 0 && nx < COLS - 1 && ny < ROWS - 1 && grid[ny][nx] !== FLOOR) {
          options.push([nx, ny]);
        }
      }
      if (!options.length) { stack.pop(); continue; }
      var pick = options[(rng() * options.length) | 0];
      grid[(cy + pick[1]) / 2][(cx + pick[0]) / 2] = FLOOR;  // knock out the wall between
      grid[pick[1]][pick[0]] = FLOOR;
      stack.push(pick);
    }
  }

  // Knock a few extra holes so the maze has loops instead of one long dead-end crawl.
  function openLoops(grid, rng, chance) {
    for (var y = 1; y < ROWS - 1; y++) {
      for (var x = 1; x < COLS - 1; x++) {
        if (grid[y][x] === FLOOR) continue;
        var horiz = grid[y][x - 1] === FLOOR && grid[y][x + 1] === FLOOR;
        var vert  = grid[y - 1][x] === FLOOR && grid[y + 1][x] === FLOOR;
        if ((horiz || vert) && rng() < chance) grid[y][x] = FLOOR;
      }
    }
  }

  // Decide which surviving walls are steppable hedges and which are solid trees.
  function dressWalls(grid, rng, hedgeChance) {
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (grid[y][x] === FLOOR) continue;
        var border = (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1);
        grid[y][x] = border ? TREE : (rng() < hedgeChance ? HEDGE : TREE);
      }
    }
  }

  // Breadth-first distance field over tiles the cat can walk on.
  function catDistanceField(grid, sx, sy) {
    var dist = new Int16Array(COLS * ROWS);
    dist.fill(-1);
    var q = [sx + sy * COLS];
    dist[sx + sy * COLS] = 0;
    var head = 0;
    while (head < q.length) {
      var idx = q[head++];
      var x = idx % COLS, y = (idx / COLS) | 0;
      var d = dist[idx];
      var n = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
      for (var i = 0; i < 4; i++) {
        var nx = n[i][0], ny = n[i][1];
        if (!inBounds(nx, ny)) continue;
        var ni = nx + ny * COLS;
        if (dist[ni] !== -1) continue;
        if (grid[ny][nx] !== FLOOR) continue;   // cat is stopped by hedge and tree alike
        dist[ni] = d + 1;
        q.push(ni);
      }
    }
    return dist;
  }

  // Scatter the mushrooms over floor the cat can actually reach, spread out a bit.
  function placeMushrooms(grid, dist, rng) {
    var candidates = [];
    for (var y = 1; y < ROWS - 1; y++) {
      for (var x = 1; x < COLS - 1; x++) {
        var d = dist[x + y * COLS];
        if (d > 3) candidates.push({ x: x, y: y, d: d });
      }
    }
    // Shuffle.
    for (var i = candidates.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = candidates[i]; candidates[i] = candidates[j]; candidates[j] = t;
    }

    var chosen = [];
    for (var spacing = 5; spacing >= 0 && chosen.length < MUSHROOMS_PER_LEVEL; spacing--) {
      for (var c = 0; c < candidates.length && chosen.length < MUSHROOMS_PER_LEVEL; c++) {
        var cand = candidates[c];
        if (cand.taken) continue;
        var ok = true;
        for (var k = 0; k < chosen.length; k++) {
          if (Math.abs(chosen[k].x - cand.x) + Math.abs(chosen[k].y - cand.y) < spacing) { ok = false; break; }
        }
        if (ok) { cand.taken = true; chosen.push({ x: cand.x, y: cand.y }); }
      }
    }
    return chosen;
  }

  function firstFloorNear(grid, x, y) {
    for (var r = 0; r < Math.max(COLS, ROWS); r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          var nx = x + dx, ny = y + dy;
          if (inBounds(nx, ny) && grid[ny][nx] === FLOOR) return { x: nx, y: ny };
        }
      }
    }
    return { x: 1, y: 1 };
  }

  /* --------------------------------------------------- hand-drawn levels ----
   * Two levels are drawn by hand rather than generated.
   *
   *   #  solid (nobody through it)     n  low enough for a person to step over
   *   .  open ground                   c  the thing you are collecting
   *   S  Stussy   P  photographer      R  the rival chaser
   *
   * HAWKER ST MANSION — a two-storey Wellington villa of the Mt Victoria sort:
   * bedrooms off an upstairs hallway, a staircase down the middle, lounge and
   * kitchen either side of the downstairs hall. The furniture is what the
   * people step over.
   */
  var MANSION = [
    '#########################',
    '#..c..#.....#..c..#....P#',
    '#.nn..#.nn..#.nn..#.nn..#',
    '####.#####.#####.#####.##',
    '#...........R...........#',
    '##.#####.#####.#####.####',
    '#..nn.#..c..#..nn.#..c..#',
    '#.......................#',
    '############T############',
    '#..........#.#..........#',
    '#.nn....c.......c....nn.#',
    '#..........#.#..........#',
    '#....nn....#.#....nn....#',
    '#..c.......#.#.......c..#',
    '#...nn.............nn...#',
    '#S....c....#.#..........#',
    '#########################'
  ];

  /* STRAIT OF STUSSY — the Victoria Street block: long straight streets, a
   * lane grid, and the angled corner where Victoria meets Bond. Planter boxes
   * and low walls line the footpaths, and the people stride straight over them.
   */
  var STRAIT = [
    '#########################',
    '#..c................c..P#',
    '#.######.#######.######.#',
    '#.######n#######n######.#',
    '#.######.#######.######n#',
    '#...........n...........#',
    '#c######.#######.######c#',
    '#.#####...######.######.#',
    '#...nc......n......cn...#',
    '#.#####....#####.######.#',
    '#n######..######n######.#',
    '#.######c#######.######.#',
    '#....n.............n....#',
    '#.######n#######c######.#',
    '#.######.#######.######.#',
    '#S.........c...........R#',
    '#########################'
  ];

  var HAND_DRAWN = { 2: MANSION, 3: STRAIT };
  var THEMES = { 2: 'mansion', 3: 'strait' };

  // Which look a level wears — the generated ones are all gardens.
  function themeFor(level) {
    return THEMES[level] || 'garden';
  }

  function fromMap(map) {
    var grid = makeGrid(TREE);
    var catSpawn = { x: 1, y: 1 };
    var photo = { x: COLS - 2, y: 1 };
    var rival = { x: COLS - 2, y: ROWS - 2 };
    var pickups = [];
    var decor = [];

    for (var y = 0; y < ROWS; y++) {
      var row = map[y] || '';
      for (var x = 0; x < COLS; x++) {
        var ch = row.charAt(x) || '#';
        switch (ch) {
          case '#': grid[y][x] = TREE; break;
          case 'n': grid[y][x] = HEDGE; break;
          case 'c': grid[y][x] = FLOOR; pickups.push({ x: x, y: y }); break;
          case 'S': grid[y][x] = FLOOR; catSpawn = { x: x, y: y }; break;
          case 'P': grid[y][x] = FLOOR; photo = { x: x, y: y }; break;
          case 'R': grid[y][x] = FLOOR; rival = { x: x, y: y }; break;
          case 'T': grid[y][x] = FLOOR; decor.push({ x: x, y: y, kind: 'stairs' }); break;
          default:  grid[y][x] = FLOOR;
        }
      }
    }

    return {
      grid: grid,
      cols: COLS,
      rows: ROWS,
      catSpawn: catSpawn,
      spawns: { photographer: photo, landlord: rival },
      mushrooms: pickups,
      decor: decor,
      reachable: catDistanceField(grid, catSpawn.x, catSpawn.y)
    };
  }

  /**
   * Build a playable level.
   * @param {number} level  1-based level number; higher levels grow more hedges.
   * @param {number} seed   PRNG seed.
   */
  function generate(level, seed) {
    if (HAND_DRAWN[level]) return fromMap(HAND_DRAWN[level]);

    var rng = makeRng(seed);
    var attempt = 0;

    while (true) {
      attempt++;
      var grid = makeGrid(TREE);
      carveMaze(grid, rng);
      openLoops(grid, rng, 0.20 + Math.min(0.10, level * 0.01));
      dressWalls(grid, rng, Math.min(0.62, 0.40 + level * 0.02));

      var catSpawn = { x: 1, y: 1 };
      var dist = catDistanceField(grid, catSpawn.x, catSpawn.y);
      var mushrooms = placeMushrooms(grid, dist, rng);

      if (mushrooms.length === MUSHROOMS_PER_LEVEL || attempt > 12) {
        var farCorner = firstFloorNear(grid, COLS - 2, ROWS - 2);
        var topCorner = firstFloorNear(grid, COLS - 2, 1);
        return {
          grid: grid,
          cols: COLS,
          rows: ROWS,
          catSpawn: catSpawn,
          spawns: { photographer: farCorner, landlord: topCorner },
          mushrooms: mushrooms,
          reachable: dist
        };
      }
    }
  }

  global.Maze = {
    FLOOR: FLOOR,
    HEDGE: HEDGE,
    TREE: TREE,
    COLS: COLS,
    ROWS: ROWS,
    MUSHROOMS_PER_LEVEL: MUSHROOMS_PER_LEVEL,
    themeFor: themeFor,
    generate: generate,
    makeRng: makeRng
  };
})(window);

/* sprites.js — every character and tile is drawn from scratch with rectangles
 * on a 16x16 "pixel" grid, so the whole game ships with no image assets.
 */
(function (global) {
  'use strict';

  var UNIT = 16;   // logical sprite resolution

  var C = {
    furLight:  '#e8a24a',
    fur:       '#cf7c2c',
    furDark:   '#96521a',
    belly:     '#f6ead4',
    pink:      '#ec9aa8',
    black:     '#141018',
    white:     '#ffffff',
    coat:      '#3b5dc9',
    coatDark:  '#26408c',
    skin:      '#f0b183',
    skinDark:  '#c98a5e',
    camera:    '#20202a',
    lens:      '#8ea0b8',
    flash:     '#fff6a8',
    dress:     '#8d3fa8',
    dressDark: '#61286f',
    apron:     '#efe6dc',
    hair:      '#b9b2c9',
    hairDark:  '#8a8298',
    broom:     '#8a5a2b',
    straw:     '#d8a955',
    hedge:     '#2f7d3a',
    hedgeLit:  '#54a851',
    hedgeDark: '#1b4a22',
    trunk:     '#5b3a1c',
    trunkDark: '#3d2612',
    tree:      '#15401f',
    treeLit:   '#22622c',
    treeDark:  '#0a2412',
    grass:     '#6aa84f',
    grass2:    '#5c9944',
    grassTuft: '#7ab85c',
    shadow:    'rgba(10,26,12,0.30)',
    capRed:    '#c8392f',
    capDark:   '#8f231c',
    stem:      '#f0e2c0',
    stemDark:  '#c9b48d',

    // The Mansion — a Wellington villa
    plank:     '#b98a52',
    plankAlt:  '#ae7f47',
    plankDark: '#9a6c39',
    wallTop:   '#e7dcc4',
    wallLit:   '#f4ecdb',
    dado:      '#7b4a24',
    dadoDark:  '#5b3418',
    skirting:  '#efe7d6',
    sofa:      '#8c4a3f',
    sofaLit:   '#a85e50',
    sofaDark:  '#5e2e27',
    cheese:    '#f2c33c',
    cheeseDk:  '#c9971f',
    cracker:   '#d8a55f',
    crackerDk: '#a97b3d',

    // Strait of Stussy — the Victoria Street block
    road:      '#9195a0',
    roadAlt:   '#888c97',
    roadLine:  '#efe9d2',
    kerb:      '#b6bac4',
    concrete:  '#3b4150',
    concreteD: '#242936',
    concreteL: '#535a6c',
    window:    '#6f8db3',
    windowLit: '#e8c979',
    planter:   '#7a5a3c',
    planterDk: '#553d27',
    shrub:     '#3f7a43',
    shrubLit:  '#5aa055',
    dough:     '#d9a05c',
    doughLit:  '#e8bf7e',
    doughDk:   '#a97540',
    sugar:     '#fdf6e8',

    // Charteris Bay Man
    denim:     '#4a6f9c',
    denimDk:   '#33507a',
    denimLit:  '#6a8fbc',
    jeans:     '#23232a',
    jeansDk:   '#141419',
    chuck:     '#f2efe6',
    rockHair:  '#8d8a93',
    rockHairD: '#3b3740',
    specs:     '#20202a'
  };

  // Rectangle helper in sprite units.
  function r(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  /**
   * Draw a 16x16-unit sprite centred on (cx, cy) in canvas pixels.
   * @param {boolean} flip  mirror horizontally (character walking left)
   */
  function stamp(ctx, cx, cy, size, flip, drawFn) {
    var scale = size / UNIT;
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-1, 1);
    ctx.scale(scale, scale);
    ctx.translate(-UNIT / 2, -UNIT / 2);
    drawFn(ctx);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- the cat */

  function drawCat(ctx, frame, complaining) {
    // tail, swishing with the walk cycle
    if (frame === 0) {
      r(ctx, 0, 6, 2, 1, C.fur); r(ctx, 0, 5, 1, 2, C.fur);
    } else {
      r(ctx, 0, 8, 2, 1, C.fur); r(ctx, 0, 7, 1, 2, C.fur);
    }

    // body
    r(ctx, 2, 7, 9, 5, C.fur);
    r(ctx, 2, 6, 8, 1, C.furLight);
    r(ctx, 3, 11, 7, 1, C.furDark);
    // tabby stripes
    r(ctx, 4, 6, 1, 4, C.furDark);
    r(ctx, 6, 6, 1, 4, C.furDark);
    r(ctx, 8, 6, 1, 3, C.furDark);
    // belly
    r(ctx, 3, 10, 6, 1, C.belly);

    // collecting basket strapped to the back
    r(ctx, 3, 4, 4, 3, C.broom);
    r(ctx, 3, 4, 4, 1, C.straw);
    r(ctx, 4, 5, 1, 2, C.straw);
    r(ctx, 6, 5, 1, 2, C.straw);

    // head
    r(ctx, 9, 3, 6, 6, C.fur);
    r(ctx, 10, 3, 4, 1, C.furLight);
    // ears
    r(ctx, 9, 1, 2, 2, C.fur);  r(ctx, 10, 2, 1, 1, C.pink);
    r(ctx, 13, 1, 2, 2, C.fur); r(ctx, 13, 2, 1, 1, C.pink);
    // face
    r(ctx, 10, 5, 1, 1, C.black);
    r(ctx, 13, 5, 1, 1, C.black);
    r(ctx, 11, 6, 4, 3, C.belly);
    r(ctx, 12, 6, 1, 1, C.pink);
    if (complaining) {
      // yowling mouth
      r(ctx, 12, 7, 3, 2, C.black);
      r(ctx, 13, 8, 1, 1, C.pink);
    } else {
      r(ctx, 12, 8, 2, 1, C.furDark);
    }
    // whiskers
    r(ctx, 15, 6, 1, 1, C.belly);
    r(ctx, 15, 8, 1, 1, C.belly);

    // legs
    if (frame === 0) {
      r(ctx, 3, 12, 2, 3, C.fur); r(ctx, 8, 12, 2, 3, C.fur);
    } else {
      r(ctx, 2, 12, 2, 3, C.fur); r(ctx, 9, 12, 2, 3, C.fur);
    }
    r(ctx, 3, 14, 2, 1, C.furDark);
    r(ctx, 8, 14, 2, 1, C.furDark);
  }

  /* ------------------------------------------------------ the photographer */

  function drawPhotographer(ctx, frame, scared) {
    // legs
    if (frame === 0) {
      r(ctx, 5, 12, 2, 4, C.coatDark); r(ctx, 8, 12, 2, 4, C.coatDark);
    } else {
      r(ctx, 4, 12, 2, 4, C.coatDark); r(ctx, 9, 12, 2, 4, C.coatDark);
    }
    // coat
    r(ctx, 4, 6, 7, 6, C.coat);
    r(ctx, 4, 6, 7, 1, C.coatDark);
    r(ctx, 7, 7, 1, 5, C.coatDark);
    // head + press cap
    r(ctx, 5, 2, 5, 4, C.skin);
    r(ctx, 5, 5, 5, 1, C.skinDark);
    r(ctx, 4, 1, 7, 2, C.coatDark);
    r(ctx, 10, 2, 3, 1, C.coatDark);   // brim
    r(ctx, 6, 1, 2, 1, C.white);       // press card
    // eyes
    r(ctx, 7, 3, 1, 1, C.black);
    r(ctx, 9, 3, 1, 1, C.black);
    if (scared) r(ctx, 8, 4, 2, 2, C.black);   // gasping

    // camera held out front
    r(ctx, 10, 6, 2, 2, C.skin);       // arm
    r(ctx, 11, 5, 4, 4, C.camera);
    r(ctx, 12, 4, 2, 1, C.camera);
    r(ctx, 14, 6, 2, 2, C.lens);
    r(ctx, 12, 6, 1, 1, C.white);
    if (!scared && frame === 0) r(ctx, 12, 3, 2, 1, C.flash);   // flashbulb pop
  }

  /* -------------------------------------------------- Maryellen, the landlord */

  function drawLandlord(ctx, frame, scared) {
    // shoes
    if (frame === 0) {
      r(ctx, 5, 14, 2, 2, C.black); r(ctx, 8, 14, 2, 2, C.black);
    } else {
      r(ctx, 4, 14, 2, 2, C.black); r(ctx, 9, 14, 2, 2, C.black);
    }
    // long dress, flaring out towards the hem
    r(ctx, 5, 6, 6, 3, C.dress);
    r(ctx, 4, 9, 8, 3, C.dress);
    r(ctx, 3, 12, 10, 2, C.dress);
    r(ctx, 3, 13, 10, 1, C.dressDark);
    // apron
    r(ctx, 6, 7, 4, 6, C.apron);
    r(ctx, 6, 7, 4, 1, C.dressDark);
    // head, hair and bun
    r(ctx, 5, 2, 5, 4, C.skin);
    r(ctx, 5, 5, 5, 1, C.skinDark);
    r(ctx, 4, 1, 7, 2, C.hair);
    r(ctx, 3, 2, 2, 2, C.hairDark);    // bun
    r(ctx, 7, 3, 1, 1, C.black);
    r(ctx, 9, 3, 1, 1, C.black);
    if (scared) { r(ctx, 8, 4, 2, 2, C.black); }
    else        { r(ctx, 8, 4, 2, 1, C.dressDark); }

    // broom, brandished
    r(ctx, 11, 4, 1, 8, C.broom);
    r(ctx, 10, 6, 2, 1, C.skin);       // hand
    r(ctx, 10, 12, 3, 3, C.straw);
    r(ctx, 10, 14, 3, 1, C.broom);
  }

  /* ----------------------------------------------------------- the mushroom */

  function drawMushroom(ctx, bob) {
    var y = 2 + (bob ? 1 : 0);
    r(ctx, 4, y + 2, 8, 3, C.capRed);
    r(ctx, 3, y + 4, 10, 2, C.capRed);
    r(ctx, 5, y + 1, 6, 1, C.capRed);
    r(ctx, 3, y + 5, 10, 1, C.capDark);
    // spots
    r(ctx, 5, y + 3, 2, 1, C.white);
    r(ctx, 9, y + 2, 2, 2, C.white);
    r(ctx, 4, y + 5, 1, 1, C.white);
    // stem
    r(ctx, 6, y + 6, 4, 4, C.stem);
    r(ctx, 9, y + 6, 1, 4, C.stemDark);
    r(ctx, 5, y + 9, 6, 1, C.stemDark);
  }

  /* ----------------------------------------------------------------- tiles */

  // Deterministic per-tile jitter so the scenery is varied but never flickers.
  function tileNoise(x, y) {
    var n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  }

  // Mown lawn: broad horizontal mower stripes, with the odd tuft of longer grass.
  function drawGrass(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    ctx.fillStyle = (((ty >> 1) & 1) === 0) ? C.grass : C.grass2;
    ctx.fillRect(px, py, size, size);
    var n = tileNoise(tx, ty);
    if (n > 0.62) {
      ctx.fillStyle = C.grassTuft;
      var gx = Math.floor(n * 11) * u;
      var gy = Math.floor((n * 97) % 12) * u;
      ctx.fillRect(px + gx, py + gy + u, u, 2 * u);
      ctx.fillRect(px + gx + 2 * u, py + gy, u, 2 * u);
    }
  }

  // A hedge is LOW: a clipped, flat-topped block that leaves lawn showing above
  // it, so you can read at a glance that a person could step over the thing.
  function drawHedge(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    drawGrass(ctx, px, py, size, tx, ty);

    ctx.fillStyle = C.shadow;
    ctx.fillRect(px, py + 14 * u, size, 2 * u);

    ctx.fillStyle = C.hedgeDark;
    ctx.fillRect(px, py + 3 * u, size, 12 * u);
    ctx.fillStyle = C.hedge;
    ctx.fillRect(px, py + 4 * u, size, 10 * u);
    ctx.fillStyle = C.hedgeLit;
    ctx.fillRect(px, py + 3 * u, size, 2 * u);      // clipped flat top catching the light

    // vertical seams + a little leaf speckle
    ctx.fillStyle = C.hedgeDark;
    ctx.fillRect(px + 5 * u, py + 5 * u, u, 9 * u);
    ctx.fillRect(px + 11 * u, py + 6 * u, u, 8 * u);
    var n = tileNoise(tx, ty);
    for (var i = 0; i < 4; i++) {
      var fx = Math.floor((n * (i + 3) * 37) % 15) * u;
      var fy = (6 + Math.floor((n * (i + 7) * 53) % 7)) * u;
      ctx.fillRect(px + fx, py + fy, u, u);
    }
  }

  // A tree is TALL and solid: trunk, round canopy that overhangs the tile, and a
  // shadow on the grass. Nobody gets past one of these.
  function drawTree(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    drawGrass(ctx, px, py, size, tx, ty);

    ctx.fillStyle = C.shadow;
    ctx.fillRect(px + 2 * u, py + 13 * u, 12 * u, 3 * u);

    // trunk
    ctx.fillStyle = C.trunkDark;
    ctx.fillRect(px + 6 * u, py + 9 * u, 4 * u, 7 * u);
    ctx.fillStyle = C.trunk;
    ctx.fillRect(px + 6 * u, py + 9 * u, 2 * u, 7 * u);

    // canopy, built as a rounded silhouette
    var rows = [
      [4, 8], [3, 10], [2, 12], [1, 14], [1, 14],
      [1, 14], [1, 14], [1, 14], [2, 12], [2, 12], [3, 10], [4, 8]
    ];
    ctx.fillStyle = C.treeDark;
    for (var i = 0; i < rows.length; i++) {
      ctx.fillRect(px + rows[i][0] * u, py + (i - 2) * u, rows[i][1] * u, u);
    }
    ctx.fillStyle = C.tree;
    for (var j = 0; j < rows.length - 2; j++) {
      ctx.fillRect(px + (rows[j][0] + 1) * u, py + (j - 2) * u, (rows[j][1] - 2) * u, u);
    }
    ctx.fillStyle = C.treeLit;
    ctx.fillRect(px + 4 * u, py - u, 6 * u, 2 * u);
    ctx.fillRect(px + 3 * u, py + 1 * u, 3 * u, u);

    var n = tileNoise(tx, ty);
    ctx.fillStyle = C.treeDark;
    for (var k = 0; k < 5; k++) {
      var fx = (3 + Math.floor((n * (k + 2) * 41) % 10)) * u;
      var fy = (Math.floor((n * (k + 5) * 61) % 9)) * u;
      ctx.fillRect(px + fx, py + fy, 2 * u, u);
    }
  }

  /* ------------------------------------------------- The Mansion: tiles */

  // Kauri floorboards running across the room.
  function drawFloor(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    ctx.fillStyle = (ty & 1) ? C.plank : C.plankAlt;
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = C.plankDark;
    ctx.fillRect(px, py + 8 * u, size, u);        // one board seam per tile
    var n = tileNoise(tx, ty);
    if (n > 0.62) {                               // the odd board join
      ctx.fillStyle = 'rgba(120,80,40,0.35)';
      ctx.fillRect(px + Math.floor(n * 12) * u, py, u, 8 * u);
    }
  }

  // Sofas, beds and dressers: low enough that a person just steps over.
  function drawFurniture(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    drawFloor(ctx, px, py, size, tx, ty);
    ctx.fillStyle = C.shadow;
    ctx.fillRect(px, py + 14 * u, size, 2 * u);
    ctx.fillStyle = C.sofaDark;
    ctx.fillRect(px, py + 3 * u, size, 12 * u);
    ctx.fillStyle = C.sofa;
    ctx.fillRect(px, py + 4 * u, size, 10 * u);
    ctx.fillStyle = C.sofaLit;
    ctx.fillRect(px, py + 3 * u, size, 2 * u);          // flat, steppable top
    ctx.fillStyle = C.sofaDark;
    ctx.fillRect(px + 5 * u, py + 5 * u, u, 9 * u);     // cushion seams
    ctx.fillRect(px + 11 * u, py + 5 * u, u, 9 * u);
    ctx.fillStyle = C.plankDark;
    ctx.fillRect(px + u, py + 14 * u, 2 * u, 2 * u);    // little feet
    ctx.fillRect(px + 13 * u, py + 14 * u, 2 * u, 2 * u);
  }

  // Villa wall: papered above, timber dado below, skirting at the floor.
  function drawWall(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    ctx.fillStyle = C.wallTop;
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = C.wallLit;
    ctx.fillRect(px, py + u, size, 3 * u);
    ctx.fillStyle = C.dadoDark;
    ctx.fillRect(px, py, size, u);                // picture rail, a hard top edge
    ctx.fillStyle = C.dado;
    ctx.fillRect(px, py + 12 * u, size, 4 * u);   // slim dado at the bottom
    ctx.fillStyle = C.dadoDark;
    ctx.fillRect(px, py + 12 * u, size, u);
    ctx.fillStyle = C.skirting;
    ctx.fillRect(px, py + 15 * u, size, u);
    var n = tileNoise(tx, ty);
    if (n > 0.66) {                               // a picture hung on the wall
      ctx.fillStyle = C.dadoDark;
      ctx.fillRect(px + 4 * u, py + 3 * u, 8 * u, 6 * u);
      ctx.fillStyle = C.sofa;
      ctx.fillRect(px + 5 * u, py + 4 * u, 6 * u, 4 * u);
    } else if (n > 0.4) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(px + 3 * u, py + 4 * u, 10 * u, 6 * u);
    }
  }

  // The staircase between the two storeys.
  function drawStairs(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    drawFloor(ctx, px, py, size, tx, ty);
    for (var i = 0; i < 4; i++) {
      var y = py + i * 4 * u;
      ctx.fillStyle = C.plankDark;
      ctx.fillRect(px, y, size, 4 * u);
      ctx.fillStyle = C.plank;
      ctx.fillRect(px + u, y + u, size - 2 * u, 2 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(px, y + 3 * u, size, u);        // the shadow under each tread
    }
    ctx.fillStyle = C.dadoDark;                     // banister posts either side
    ctx.fillRect(px, py, u, size);
    ctx.fillRect(px + 15 * u, py, u, size);
  }

  // Cheese and crackers.
  function drawCheese(ctx, bob) {
    var y = 3 + (bob ? 1 : 0);
    r(ctx, 3, y + 6, 11, 3, C.cracker);      // the cracker
    r(ctx, 3, y + 8, 11, 1, C.crackerDk);
    r(ctx, 5, y + 7, 1, 1, C.crackerDk);     // docking holes
    r(ctx, 8, y + 7, 1, 1, C.crackerDk);
    r(ctx, 11, y + 7, 1, 1, C.crackerDk);
    r(ctx, 5, y + 2, 7, 4, C.cheese);        // the wedge on top
    r(ctx, 6, y + 1, 5, 1, C.cheese);
    r(ctx, 5, y + 5, 7, 1, C.cheeseDk);
    r(ctx, 7, y + 3, 1, 1, C.cheeseDk);      // holes
    r(ctx, 9, y + 2, 1, 1, C.cheeseDk);
  }

  /* --------------------------------------------- Strait of Stussy: tiles */

  function drawStreet(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    ctx.fillStyle = (((tx + ty) >> 1) & 1) ? C.road : C.roadAlt;
    ctx.fillRect(px, py, size, size);
    var n = tileNoise(tx, ty);
    if (n > 0.74) {                                   // centre line
      ctx.fillStyle = C.roadLine;
      ctx.fillRect(px + 7 * u, py + 3 * u, 2 * u, 10 * u);
    } else if (n > 0.64) {                            // manhole
      ctx.fillStyle = C.kerb;
      ctx.fillRect(px + 5 * u, py + 6 * u, 6 * u, 5 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px + 6 * u, py + 7 * u, 4 * u, 3 * u);
    } else if (n > 0.52) {                            // patched seal
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(px + 2 * u, py + 3 * u, 9 * u, 7 * u);
    }
  }

  // Street planters and low walls — a person steps straight over them.
  function drawPlanter(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    drawStreet(ctx, px, py, size, tx, ty);
    ctx.fillStyle = C.shadow;
    ctx.fillRect(px, py + 14 * u, size, 2 * u);
    ctx.fillStyle = C.shrub;
    ctx.fillRect(px + u, py + 2 * u, 14 * u, 6 * u);
    ctx.fillStyle = C.shrubLit;
    ctx.fillRect(px + 2 * u, py + 2 * u, 12 * u, 2 * u);
    ctx.fillStyle = C.planter;
    ctx.fillRect(px, py + 8 * u, size, 7 * u);
    ctx.fillStyle = C.planterDk;
    ctx.fillRect(px, py + 8 * u, size, u);
    ctx.fillRect(px + 5 * u, py + 9 * u, u, 6 * u);
    ctx.fillRect(px + 11 * u, py + 9 * u, u, 6 * u);
  }

  // A block of the street wall: concrete facade, windows lit at random.
  function drawBuilding(ctx, px, py, size, tx, ty) {
    var u = size / UNIT;
    ctx.fillStyle = C.concrete;
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = C.concreteD;
    ctx.fillRect(px, py, size, u);            // hard edges top and bottom, so a
    ctx.fillRect(px, py + 15 * u, size, u);   // block reads as one solid mass
    ctx.fillStyle = C.concreteL;
    ctx.fillRect(px, py + u, size, u);
    var n = tileNoise(tx, ty);
    for (var wy = 0; wy < 2; wy++) {
      for (var wx = 0; wx < 2; wx++) {
        var lit = ((n * (wx + 3) * (wy + 2) * 97) % 1) > 0.7;
        ctx.fillStyle = lit ? C.windowLit : C.window;
        ctx.fillRect(px + (3 + wx * 6) * u, py + (4 + wy * 6) * u, 4 * u, 4 * u);
        ctx.fillStyle = C.concreteD;
        ctx.fillRect(px + (3 + wx * 6) * u, py + (7 + wy * 6) * u, 4 * u, u);
      }
    }
  }

  // A sugared doughnut.
  function drawDoughnut(ctx, bob) {
    var y = 3 + (bob ? 1 : 0);
    r(ctx, 4, y + 1, 8, 2, C.dough);
    r(ctx, 3, y + 3, 10, 6, C.dough);
    r(ctx, 4, y + 9, 8, 2, C.dough);
    r(ctx, 4, y + 2, 8, 1, C.doughLit);      // top catch-light
    r(ctx, 3, y + 8, 10, 2, C.doughDk);      // underside
    r(ctx, 6, y + 4, 4, 4, C.doughDk);       // the hole
    r(ctx, 7, y + 5, 2, 2, C.road);
    // sugar crystals
    r(ctx, 5, y + 3, 1, 1, C.sugar);
    r(ctx, 10, y + 4, 1, 1, C.sugar);
    r(ctx, 4, y + 6, 1, 1, C.sugar);
    r(ctx, 11, y + 7, 1, 1, C.sugar);
    r(ctx, 8, y + 2, 1, 1, C.sugar);
    r(ctx, 7, y + 9, 1, 1, C.sugar);
  }

  /* ------------------------------------------- Charteris Bay Man, the rival */

  function drawRocker(ctx, frame, scared) {
    var lx = frame === 0 ? 5 : 4, rx = frame === 0 ? 8 : 9;
    // black jeans and chuck taylors
    r(ctx, lx, 11, 2, 4, C.jeans);
    r(ctx, rx, 11, 2, 4, C.jeans);
    r(ctx, lx - 1, 14, 4, 1, C.jeansDk);
    r(ctx, rx, 14, 4, 1, C.jeansDk);
    r(ctx, lx - 1, 15, 4, 1, C.chuck);        // white soles
    r(ctx, rx, 15, 4, 1, C.chuck);
    r(ctx, lx + 1, 14, 1, 1, C.chuck);        // toe caps
    r(ctx, rx + 2, 14, 1, 1, C.chuck);

    // denim jacket
    r(ctx, 4, 6, 8, 6, C.denim);
    r(ctx, 4, 6, 8, 1, C.denimLit);
    r(ctx, 7, 6, 1, 6, C.denimDk);            // button placket
    r(ctx, 4, 8, 8, 1, C.denimDk);            // yoke seam
    r(ctx, 4, 6, 1, 6, C.denimDk);
    r(ctx, 11, 6, 1, 6, C.denimDk);
    r(ctx, 5, 11, 6, 1, C.denimDk);           // hem
    r(ctx, 12, 7, 2, 3, C.denim);             // sleeve

    // head, tidy greying hair
    r(ctx, 5, 2, 6, 5, C.skin);
    r(ctx, 5, 6, 6, 1, C.skinDark);
    r(ctx, 4, 1, 8, 2, C.rockHair);
    r(ctx, 4, 1, 4, 1, C.rockHairD);          // still dark on top, mostly
    r(ctx, 4, 2, 1, 3, C.rockHair);           // sideburn
    r(ctx, 11, 2, 1, 2, C.rockHair);

    // glasses
    r(ctx, 5, 3, 7, 1, C.specs);
    r(ctx, 5, 3, 2, 2, C.specs);
    r(ctx, 9, 3, 2, 2, C.specs);
    r(ctx, 6, 4, 1, 1, C.lens);
    r(ctx, 10, 4, 1, 1, C.lens);
    if (scared) { r(ctx, 7, 5, 2, 2, C.black); }
    else        { r(ctx, 7, 5, 3, 1, C.skinDark); }
  }

  global.Sprites = {
    colors: C,
    stamp: stamp,
    cat: drawCat,
    photographer: drawPhotographer,
    landlord: drawLandlord,
    mushroom: drawMushroom,
    grass: drawGrass,
    hedge: drawHedge,
    tree: drawTree,

    floor: drawFloor,
    furniture: drawFurniture,
    wall: drawWall,
    cheese: drawCheese,
    stairs: drawStairs,

    street: drawStreet,
    planter: drawPlanter,
    building: drawBuilding,
    doughnut: drawDoughnut,

    rocker: drawRocker
  };
})(window);

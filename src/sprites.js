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
    stemDark:  '#c9b48d'
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

  global.Sprites = {
    colors: C,
    stamp: stamp,
    cat: drawCat,
    photographer: drawPhotographer,
    landlord: drawLandlord,
    mushroom: drawMushroom,
    grass: drawGrass,
    hedge: drawHedge,
    tree: drawTree
  };
})(window);

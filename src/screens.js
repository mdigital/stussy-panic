/* screens.js — the two screens that come up before the game does: a crack
 * intro, and a loading picture. Both are drawn from scratch like everything
 * else here; there are no image files.
 */
(function (global) {
  'use strict';

  var S = global.Sprites;

  // Raster bar colours, in the spirit of the sixteen the machine actually had.
  var BARS = ['#ffe27a', '#ff9c3a', '#e2582c', '#c33ec0', '#6c5eb5', '#4fa8d8', '#57d356', '#b8c76f'];

  var SCROLL_TEXT =
    '    GET FUCKED INDUSTRIES PROUDLY PRESENTS ... STUSSY PANIC ... ' +
    'CRACKED, TRAINED AND SPREAD IN ONE NIGHT ... NINE MUSHROOMS, ONE CAT, ' +
    'AND TWO PEOPLE WHO WANT A WORD ... GREETINGS TO EVERYONE STILL AWAKE ... ' +
    'PRESS SPACE TO CONTINUE ...    ';

  /* ------------------------------------------------------------- helpers */

  // Two colours in a chunky checkerboard: how the machine faked a gradient.
  function dither(ctx, x, y, w, h, a, b, cell) {
    cell = cell || 2;
    ctx.fillStyle = a;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = b;
    for (var yy = 0; yy < h; yy += cell) {
      for (var xx = ((yy / cell) & 1) * cell; xx < w; xx += cell * 2) {
        ctx.fillRect(x + xx, y + yy, cell, Math.min(cell, h - yy));
      }
    }
  }

  function outlinedText(ctx, text, x, y, font, fill, outline, width) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width || 6;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  /* -------------------------------------------------------- crack intro */

  function crack(ctx, t, W, H) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // rolling bars, top and bottom borders first
    var barH = 10;
    for (var y = 0; y < H; y += barH) {
      var inBand = (y > 150 && y < 340);
      if (!inBand && y > 60 && y < H - 70) continue;
      var idx = Math.floor(y / barH + t * 9) % BARS.length;
      ctx.fillStyle = BARS[(idx + BARS.length) % BARS.length];
      ctx.globalAlpha = inBand ? 1 : 0.5;
      ctx.fillRect(0, y, W, barH - 1);
    }
    ctx.globalAlpha = 1;

    // a black plate so the lettering reads against the bars
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 168, W, 152);

    // the letters themselves are filled with bars rolling the other way
    var grad = ctx.createLinearGradient(0, 150, 0, 340);
    for (var i = 0; i <= 8; i++) {
      var c = BARS[(Math.floor(i - t * 7) % BARS.length + BARS.length) % BARS.length];
      grad.addColorStop(Math.min(1, i / 8), c);
    }
    outlinedText(ctx, 'CRACKED BY', W / 2, 214, 'bold 40px "Courier New", monospace', grad, '#000000', 8);
    outlinedText(ctx, 'GET FUCKED', W / 2, 268, 'bold 54px "Courier New", monospace', grad, '#000000', 9);
    outlinedText(ctx, 'INDUSTRIES', W / 2, 316, 'bold 54px "Courier New", monospace', grad, '#000000', 9);

    // the prompt, blinking as it should
    if (Math.floor(t * 2) % 2 === 0) {
      outlinedText(ctx, 'PRESS SPACE', W / 2, 404, 'bold 24px "Courier New", monospace', '#ffffff', '#000000', 6);
    }

    // and a scroller along the bottom, wobbling on a sine
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'left';
    var charW = ctx.measureText('M').width;
    var total = SCROLL_TEXT.length * charW;
    var x = W - ((t * 150) % (total + W));
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 470, W, 60);
    for (var c = 0; c < SCROLL_TEXT.length; c++) {
      var cx = x + c * charW;
      if (cx < -charW || cx > W) continue;
      var cy = 508 + Math.sin(t * 4 + c * 0.35) * 12;
      ctx.fillStyle = BARS[(c + Math.floor(t * 6)) % BARS.length];
      ctx.fillText(SCROLL_TEXT.charAt(c), cx, cy);
    }
    ctx.textAlign = 'center';
  }

  /* ------------------------------------------------------ loading screen */

  function skyline(ctx, x, y, w, h, t) {
    var seed = 7;
    var bx = x;
    while (bx < x + w) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      var bw = 26 + (seed >> 7) % 34;
      var bh = 40 + (seed >> 13) % (h - 30);
      var top = y + h - bh;
      ctx.fillStyle = '#0d0d18';
      ctx.fillRect(bx, top, bw, bh);
      ctx.fillStyle = '#1b1b2c';
      ctx.fillRect(bx, top, bw, 3);
      for (var wy = top + 8; wy < y + h - 6; wy += 12) {
        for (var wx = bx + 5; wx < bx + bw - 6; wx += 11) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          if ((seed >> 9) % 3 === 0) continue;
          ctx.fillStyle = ((seed >> 11) % 4 === 0) ? '#ff9c3a' : '#b8c76f';
          ctx.fillRect(wx, wy, 5, 6);
        }
      }
      bx += bw + 4;
    }
  }

  // A plume of fire: rows of dithered orange narrowing as they rise, with the
  // width wobbling so it has a flame's silhouette rather than a rectangle's.
  function fire(ctx, cx, baseY, topY, halfWidth, seed) {
    var span = baseY - topY;
    for (var y = baseY; y > topY; y -= 4) {
      var f = (baseY - y) / span;                       // 0 at the base, 1 at the tip
      var wobble = 0.78 + 0.34 * Math.sin((y + seed * 37) * 0.09) +
                   0.16 * Math.sin((y * 0.23) + seed) + 0.1 * Math.sin(y * 0.53 + seed * 2);
      var w = halfWidth * (1 - f * 0.82) * wobble;
      if (w < 2) continue;
      var hot = f < 0.35, warm = f < 0.68;
      dither(ctx, cx - w, y - 4, w * 2, 4,
             hot ? '#ffe27a' : (warm ? '#ff9c3a' : '#e2582c'),
             hot ? '#ff9c3a' : (warm ? '#e2582c' : '#8f2318'), 2);
    }
  }

  function ufo(ctx, cx, cy, t) {
    // beams first, so the saucer sits on top of them
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.08;
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy + 12); ctx.lineTo(cx - 96, cy + 250); ctx.lineTo(cx - 4, cy + 250);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy + 12); ctx.lineTo(cx + 12, cy + 250); ctx.lineTo(cx + 104, cy + 250);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#6c6c6c';
    ctx.fillRect(cx - 74, cy - 2, 148, 12);
    ctx.fillStyle = '#959595';
    ctx.fillRect(cx - 74, cy - 2, 148, 4);
    ctx.fillStyle = '#444444';
    ctx.fillRect(cx - 54, cy + 10, 108, 8);
    ctx.fillStyle = '#70a4b2';                       // dome
    ctx.fillRect(cx - 26, cy - 20, 52, 18);
    ctx.fillStyle = '#b6e2ee';
    ctx.fillRect(cx - 20, cy - 18, 20, 8);
    for (var i = -3; i <= 3; i++) {                  // running lights
      ctx.fillStyle = (Math.floor(t * 6) + i) % 2 ? '#e2582c' : '#ffe27a';
      ctx.fillRect(cx + i * 20 - 4, cy + 10, 8, 8);
    }
  }

  function logo(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.08);
    var g = ctx.createLinearGradient(0, -60, 0, 60);
    g.addColorStop(0, '#ffe27a');
    g.addColorStop(0.45, '#ff9c3a');
    g.addColorStop(0.75, '#e2582c');
    g.addColorStop(1, '#8f2318');
    outlinedText(ctx, 'STUSSY', 0, 0, 'bold 74px "Courier New", monospace', g, '#1a0d08', 10);
    ctx.rotate(0.16);
    outlinedText(ctx, 'PANIC', 26, 66, 'bold 74px "Courier New", monospace', g, '#1a0d08', 10);
    ctx.restore();
  }

  function loading(ctx, t, W, H) {
    var GROUND = 430;

    // night sky, dithered the way the machine would have had to
    dither(ctx, 0, 0, W, GROUND, '#1b1b3a', '#352879', 2);
    dither(ctx, 0, 0, W, 150, '#0b0b1c', '#1b1b3a', 2);

    // stars
    for (var i = 0; i < 90; i++) {
      var sx = (i * 137) % W, sy = (i * 71) % (GROUND - 40);
      ctx.fillStyle = (i % 7 === 0) ? '#ffffff' : '#9a9ad0';
      ctx.fillRect(sx, sy, 2, 2);
    }

    // the city burning away to the left, and one more alight behind the towers
    fire(ctx, 70, GROUND, 120, 78, 1);
    fire(ctx, 190, GROUND, 190, 62, 5);
    fire(ctx, 285, GROUND, 250, 44, 9);
    fire(ctx, 690, GROUND, 210, 58, 3);

    skyline(ctx, 330, 180, W - 330, 250, t);
    ufo(ctx, 620, 150, t);

    // the ground: hedge rows running back towards the fire
    dither(ctx, 0, GROUND, W, H - GROUND, '#123a1a', '#1f5c2a', 2);
    for (var row = 0; row < 5; row++) {
      var ry = GROUND + 12 + row * 30;
      for (var hx = -((row * 37) % 90); hx < W; hx += 90) {
        ctx.fillStyle = '#1f5c2a';
        ctx.fillRect(hx, ry, 58, 14);
        ctx.fillStyle = '#2f8038';
        ctx.fillRect(hx, ry, 58, 4);
      }
    }

    // Stussy, enormous, front and centre
    S.stamp(ctx, 286, 434, 230, false, function (c) { S.cat(c, 0, false); });

    // and the two of them coming over the hedges after her
    S.stamp(ctx, 596, 392, 128, true, function (c) { S.landlord(c, 0, false); });
    S.stamp(ctx, 706, 410, 146, true, function (c) { S.police(c, 0, false); });

    // mushrooms, scattered about
    var spots = [[86, 482, 86], [178, 508, 72], [418, 486, 64], [470, 508, 54],
                 [770, 480, 78], [648, 506, 62], [536, 466, 50]];
    for (var m = 0; m < spots.length; m++) {
      S.stamp(ctx, spots[m][0], spots[m][1], spots[m][2], false, function (c) {
        S.mushroom(c, false);
      });
    }

    logo(ctx, 250, 110);

    // the loader's own border stripes, flickering as the tape goes by
    for (var b = 0; b < H; b += 6) {
      if (b > 26 && b < H - 34) continue;
      ctx.fillStyle = BARS[(b / 6 + Math.floor(t * 30)) % BARS.length];
      ctx.fillRect(0, b, W, 3);
    }

    // the credit line and the wait
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, H - 78, W, 46);
    outlinedText(ctx, '© 1987 GET FUCKED INDUSTRIES', W / 2, H - 56,
                 'bold 22px "Courier New", monospace', '#6c5eb5', '#000000', 4);
    var dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
    outlinedText(ctx, 'LOADING' + dots, W / 2, H - 34,
                 'bold 22px "Courier New", monospace', '#ffffff', '#000000', 4);
  }

  global.Screens = { crack: crack, loading: loading };
})(window);

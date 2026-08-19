/* music.js — the garden's soundtrack: an original chiptune trance loop.
 *
 * Written in the late-90s festival-trance idiom you would recognise from a
 * hands-in-the-air dance floor: 136 BPM, four-on-the-floor kick, offbeat bass,
 * a driving sixteenth-note arpeggio, a detuned supersaw hook over the top, and
 * a breakdown that builds back in on a snare roll. The riff, chords and melody
 * are all written for this game rather than lifted from any record.
 *
 * Everything is synthesised live — oscillators, a noise buffer and a delay —
 * scheduled a fraction of a second ahead of the clock so the timing does not
 * depend on the browser's frame rate.
 */
(function (global) {
  'use strict';

  var Sfx = global.Sfx;

  var BPM = 136;
  var STEP = 60 / BPM / 4;      // one sixteenth note, in seconds
  var BAR = 16;                 // sixteenths per bar
  var BARS = 32;                // length of the whole arrangement
  var TOTAL = BAR * BARS;

  var LOOKAHEAD = 0.14;         // schedule this far ahead of the audio clock
  var TICK_MS = 25;

  // A minor: i - VI - III - VII, a bar each.
  var CHORDS = [
    { root: 57, third: 3 },     // Am
    { root: 53, third: 4 },     // F
    { root: 60, third: 4 },     // C
    { root: 55, third: 4 }      // G
  ];

  // The hook, one long supersaw note a bar, over eight bars.
  var HOOK = [76, 72, 77, 81, 79, 76, 74, 71];

  // Which chord tone the arpeggio lands on for each sixteenth of a bar.
  var ARP = [0, 1, 2, 3, 2, 3, 2, 1, 0, 1, 2, 3, 3, 2, 1, 2];

  function hz(note) { return 440 * Math.pow(2, (note - 69) / 12); }

  /* ------------------------------------------------------- arrangement */

  // What is playing in a given bar of the 32-bar loop.
  function section(bar) {
    if (bar < 4)  return { kick: 1, bass: 1, hat: 1, clap: 0, arp: 0, hook: 0, roll: 0 };
    if (bar < 12) return { kick: 1, bass: 1, hat: 1, clap: 1, arp: 1, hook: 0, roll: 0 };
    if (bar < 16) return { kick: 1, bass: 1, hat: 1, clap: 1, arp: 1, hook: 1, roll: 0 };
    if (bar < 20) return { kick: 0, bass: 0, hat: 1, clap: 0, arp: 0, hook: 1, roll: 0 };  // breakdown
    if (bar < 24) return { kick: 0, bass: 1, hat: 1, clap: 0, arp: 1, hook: 1, roll: bar === 23 ? 1 : 0 };
    return { kick: 1, bass: 1, hat: 1, clap: 1, arp: 1, hook: 1, roll: 0 };                 // the drop
  }

  /* ------------------------------------------------------------ voices */

  var ctx = null, bus = null, comp = null, delay = null, noiseBuf = null;

  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function noise(t, dur, type, freq, vol) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(comp);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function kick(t) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    osc.connect(g); g.connect(comp);
    osc.start(t); osc.stop(t + 0.22);
    noise(t, 0.03, 'highpass', 1200, 0.25);     // beater click
  }

  function clap(t) {
    for (var i = 0; i < 3; i++) noise(t + i * 0.012, 0.09, 'bandpass', 1700, 0.3);
    noise(t + 0.03, 0.16, 'bandpass', 1300, 0.22);
  }

  function hat(t, open) {
    noise(t, open ? 0.11 : 0.035, 'highpass', 8000, open ? 0.16 : 0.13);
  }

  // Short, filtered offbeat stab — the engine room of the genre.
  function bass(t, note) {
    var osc = ctx.createOscillator();
    var sub = ctx.createOscillator();
    var f = ctx.createBiquadFilter();
    var g = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = hz(note);
    sub.type = 'square';   sub.frequency.value = hz(note - 12);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(420, t + 0.1);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    osc.connect(f); sub.connect(f); f.connect(g); g.connect(comp);
    osc.start(t); sub.start(t);
    osc.stop(t + 0.16); sub.stop(t + 0.16);
  }

  // Plucked square arpeggio, sent through the delay for the trance shimmer.
  function arp(t, note) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    [0, 7].forEach(function (cents) {
      var osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = hz(note);
      osc.detune.value = cents;
      osc.connect(g);
      osc.start(t); osc.stop(t + 0.14);
    });
    g.connect(comp);
    g.connect(delay);
  }

  // Three detuned saws with a filter sweep: the hands-in-the-air line.
  function hook(t, note, dur) {
    var f = ctx.createBiquadFilter();
    var g = ctx.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(3200, t + dur * 0.6);
    f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.17, t + 0.06);
    g.gain.setValueAtTime(0.17, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [-9, 0, 9].forEach(function (cents) {
      var osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = hz(note);
      osc.detune.value = cents;
      osc.connect(f);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
    f.connect(g); g.connect(comp); g.connect(delay);
  }

  /* --------------------------------------------------------- scheduler */

  var timer = null, step = 0, nextTime = 0, running = false;

  function scheduleStep(i, t) {
    var bar = (i / BAR) | 0;
    var beat = i % BAR;
    var s = section(bar);
    var chord = CHORDS[bar % CHORDS.length];
    var tones = [chord.root, chord.root + chord.third, chord.root + 7, chord.root + 12];

    if (s.kick && beat % 4 === 0) kick(t);
    if (s.clap && (beat === 4 || beat === 12)) clap(t);
    if (s.hat && beat % 2 === 0) hat(t, beat % 8 === 6);
    if (s.bass && beat % 4 === 2) bass(t, chord.root - 12);

    if (s.arp) {
      var note = tones[ARP[beat]];
      if (bar >= 24 && beat >= 8) note += 12;      // lift an octave in the drop
      arp(t, note);
    }

    // one sustained hook note a bar
    if (s.hook && beat === 0) hook(t, HOOK[bar % HOOK.length], STEP * BAR * 0.95);

    // snare roll that doubles up through the last bar before the drop
    if (s.roll) {
      var rate = beat < 8 ? 2 : 1;
      if (beat % rate === 0) noise(t, 0.05, 'bandpass', 1900, 0.12 + beat * 0.012);
    }
  }

  function tick() {
    if (!running) return;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % TOTAL;
    }
  }

  /* --------------------------------------------------------------- API */

  var wash = null;

  var Music = {
    bpm: BPM,

    // A held synth wash for the crack screen: detuned saws on an A minor
    // ninth, a slow filter sweep and a touch of vibrato. No rhythm, just the
    // sound of a machine warming up.
    washStart: function () {
      if (wash) return;
      var c = Sfx.context();
      // wait for the audio to be unlocked by a real gesture, or the envelope
      // would run its course while the context is still suspended
      if (!c || c.state !== 'running') return;
      var out = Sfx.musicBus();
      if (!out) return;
      var t = c.currentTime;

      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 7;
      filter.frequency.setValueAtTime(260, t);
      filter.frequency.linearRampToValueAtTime(2100, t + 6);
      filter.frequency.linearRampToValueAtTime(700, t + 14);

      var gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 1.6);

      var lfo = c.createOscillator();
      var lfoGain = c.createGain();
      lfo.frequency.value = 0.18;
      lfoGain.gain.value = 380;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(t);

      var oscs = [];
      [33, 45, 52, 57, 64, 71].forEach(function (note, i) {
        [-7, 7].forEach(function (cents) {
          var osc = c.createOscillator();
          osc.type = i < 2 ? 'sawtooth' : 'square';
          osc.frequency.value = hz(note);
          osc.detune.value = cents + (i % 2 ? 4 : -4);
          osc.connect(filter);
          osc.start(t);
          oscs.push(osc);
        });
      });

      filter.connect(gain);
      gain.connect(out);
      wash = { ctx: c, gain: gain, oscs: oscs, lfo: lfo };
    },

    washStop: function () {
      if (!wash) return;
      var t = wash.ctx.currentTime;
      try {
        wash.gain.gain.cancelScheduledValues(t);
        wash.gain.gain.setValueAtTime(wash.gain.gain.value || 0.0001, t);
        wash.gain.gain.linearRampToValueAtTime(0.0001, t + 0.5);
        wash.oscs.forEach(function (o) { o.stop(t + 0.6); });
        wash.lfo.stop(t + 0.6);
      } catch (e) { /* already stopped */ }
      wash = null;
    },

    isWashing: function () { return !!wash; },

    start: function () {
      if (running) return;
      ctx = Sfx.context();
      if (!ctx) return;
      bus = Sfx.musicBus();
      if (!bus) return;

      if (!comp) {
        // a little glue so the kick and the saws share the headroom
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        comp.connect(bus);

        delay = ctx.createDelay(1.0);
        delay.delayTime.value = STEP * 3;         // dotted eighth, the trance staple
        var fb = ctx.createGain(); fb.gain.value = 0.32;
        var send = ctx.createGain(); send.gain.value = 0.3;
        delay.connect(fb); fb.connect(delay);
        delay.connect(send); send.connect(bus);
      }

      running = true;
      nextTime = ctx.currentTime + 0.06;
      timer = global.setInterval(tick, TICK_MS);
      tick();
    },

    stop: function () {
      running = false;
      if (timer) { global.clearInterval(timer); timer = null; }
    },

    // Stop and rewind, so the next round starts from the top of the loop.
    reset: function () {
      Music.stop();
      step = 0;
    },

    isPlaying: function () { return running; },

    // Where we are in the 32-bar arrangement, handy for debugging.
    position: function () {
      return { step: step, bar: (step / BAR) | 0 };
    }
  };

  global.Music = Music;
})(window);

/* audio.js — tiny WebAudio bleeper. Everything is synthesised on the fly:
 * no samples, no music files, just short original tones in a SID-ish spirit.
 */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;
  var muted = false;
  var complaintOsc = null, complaintGain = null, complaintLfo = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    return ctx;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol == null ? 0.5 : vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function sequence(notes, step, type) {
    if (muted || !ensure()) return;
    notes.forEach(function (f, i) {
      global.setTimeout(function () { blip(f, step * 0.9, type || 'square', 0.45); }, i * step * 1000);
    });
  }

  var API = {
    unlock: function () { ensure(); },

    toggleMute: function () {
      muted = !muted;
      if (muted) API.complaintStop();
      if (master) master.gain.value = muted ? 0 : 0.22;
      return muted;
    },

    isMuted: function () { return muted; },

    pickup: function () { sequence([660, 880, 1180], 0.055, 'square'); },

    step: function () { blip(180, 0.03, 'triangle', 0.12); },

    caught: function () { blip(320, 0.5, 'sawtooth', 0.5, 60); },

    scare: function () { blip(240, 0.18, 'square', 0.4, 900); },

    levelClear: function () { sequence([523, 659, 784, 1046, 784, 1046], 0.11, 'square'); },

    gameOver: function () { sequence([392, 330, 262, 196], 0.22, 'triangle'); },

    empty: function () { blip(140, 0.12, 'square', 0.25, 90); },

    // A held, warbling yowl for as long as the cat keeps complaining.
    complaintStart: function () {
      if (muted || complaintOsc || !ensure()) return;
      var t = ctx.currentTime;
      complaintOsc = ctx.createOscillator();
      complaintGain = ctx.createGain();
      complaintLfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();

      complaintOsc.type = 'sawtooth';
      complaintOsc.frequency.setValueAtTime(430, t);
      complaintLfo.frequency.setValueAtTime(9, t);
      lfoGain.gain.setValueAtTime(90, t);
      complaintLfo.connect(lfoGain);
      lfoGain.connect(complaintOsc.frequency);

      complaintGain.gain.setValueAtTime(0.0001, t);
      complaintGain.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
      complaintOsc.connect(complaintGain);
      complaintGain.connect(master);
      complaintOsc.start(t);
      complaintLfo.start(t);
    },

    complaintStop: function () {
      if (!complaintOsc) return;
      var t = ctx.currentTime;
      try {
        complaintGain.gain.cancelScheduledValues(t);
        complaintGain.gain.setValueAtTime(complaintGain.gain.value || 0.0001, t);
        complaintGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        complaintOsc.stop(t + 0.08);
        complaintLfo.stop(t + 0.08);
      } catch (e) { /* already stopped */ }
      complaintOsc = null; complaintGain = null; complaintLfo = null;
    }
  };

  global.Sfx = API;
})(window);

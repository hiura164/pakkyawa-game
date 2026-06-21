// PAKKYAWA Adventure Ver1.0 procedural audio helper
// 外部音源なしで、Web Audio APIだけでBGMと効果音を鳴らします。
'use strict';
(() => {
  let ctx = null;
  let master = null;
  let bgmTimer = null;
  let step = 0;

  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.00, 698.46];
  const bass = [130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 196.00, 196.00];

  function ensure() {
    if (ctx) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.20;
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, dur = 0.12, type = 'sine', gain = 0.12, when = 0, slideTo = null) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  function noise(dur = 0.12, gain = 0.08, when = 0) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buffer;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur);
  }

  function startBgm() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (bgmTimer) return;
    bgmTimer = setInterval(() => {
      const m = melody[step % melody.length];
      const b = bass[Math.floor(step / 2) % bass.length];
      tone(m, 0.16, 'triangle', 0.050, 0);
      tone(m * 1.5, 0.08, 'sine', 0.020, 0.08);
      tone(b, 0.22, 'square', 0.022, 0);
      step++;
    }, 260);
  }

  function se(name) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (name === 'start') { tone(523, .08, 'triangle', .12, 0); tone(784, .12, 'triangle', .12, .08); return; }
    if (name === 'select') { tone(880, .07, 'sine', .08, 0); return; }
    if (name === 'jump') { tone(330, .10, 'square', .07, 0, 660); tone(990, .05, 'triangle', .035, .05); return; }
    if (name === 'coin') { tone(1046, .06, 'sine', .07, 0); tone(1568, .08, 'sine', .06, .055); return; }
    if (name === 'stomp') { tone(220, .07, 'square', .10, 0, 120); tone(660, .11, 'triangle', .07, .035); noise(.055, .04, 0); return; }
    if (name === 'boss') { tone(160, .12, 'sawtooth', .12, 0, 90); tone(440, .10, 'square', .07, .04); noise(.12, .08, 0); return; }
    if (name === 'hurt') { tone(140, .18, 'sawtooth', .11, 0, 70); noise(.15, .08, 0); return; }
    if (name === 'clear') { tone(523, .08, 'triangle', .10, 0); tone(659, .08, 'triangle', .10, .09); tone(784, .08, 'triangle', .10, .18); tone(1046, .16, 'triangle', .12, .28); return; }
    tone(660, .08, 'triangle', .07, 0);
  }

  function unlockAudio() {
    startBgm();
    se('start');
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('touchstart', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
  }

  window.PAKKYAWA_SOUND = { startBgm, se };
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);

  document.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'BUTTON') se(e.target.id === 'btnJump' ? 'jump' : 'select');
  }, true);
})();

// PAKKYAWA Adventure Ver1.0 procedural audio helper
// 外部音源なしで、Web Audio APIだけでBGMと簡易SEを鳴らします。
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
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, dur = 0.12, type = 'sine', gain = 0.12, when = 0) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function startBgm() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (bgmTimer) return;
    bgmTimer = setInterval(() => {
      const m = melody[step % melody.length];
      const b = bass[Math.floor(step / 2) % bass.length];
      tone(m, 0.16, 'triangle', 0.055, 0);
      tone(m * 1.5, 0.08, 'sine', 0.025, 0.08);
      tone(b, 0.22, 'square', 0.025, 0);
      step++;
    }, 260);
  }

  function se(name) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (name === 'start') { tone(523, .08, 'triangle', .12, 0); tone(784, .12, 'triangle', .12, .08); return; }
    if (name === 'jump') { tone(440, .06, 'square', .08, 0); tone(660, .09, 'triangle', .08, .05); return; }
    if (name === 'select') { tone(880, .07, 'sine', .08, 0); return; }
    if (name === 'hit') { tone(120, .16, 'sawtooth', .09, 0); return; }
    tone(660, .08, 'triangle', .07, 0);
  }

  function unlockAudio(e) {
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
    if (e.target && e.target.tagName === 'BUTTON') {
      se(e.target.id === 'btnJump' ? 'jump' : 'select');
    }
  }, true);
})();

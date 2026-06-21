// PAKKYAWA Adventure procedural audio helper
// 外部音源なしで、Web Audio APIだけでBGMと効果音を鳴らします。
'use strict';
(() => {
  let ctx = null;
  let master = null;
  let bgmTimer = null;
  let step = 0;
  let currentStage = 0;
  let bossMode = false;
  let lastSignature = '';

  const STAGE_BGM = [
    { tempo: 260, wave: 'triangle', vol: .050, mel: [523,659,784,659,587,698,880,698], bass: [131,131,147,147,165,165,196,196] },
    { tempo: 300, wave: 'sine',     vol: .048, mel: [659,784,988,880,784,659,740,880], bass: [165,196,220,196,175,196,220,247] },
    { tempo: 240, wave: 'square',   vol: .040, mel: [392,523,659,784,659,523,587,698], bass: [98,131,147,165,147,131,117,147] },
    { tempo: 285, wave: 'sawtooth', vol: .035, mel: [440,523,587,659,587,523,494,587], bass: [110,110,147,147,131,131,165,165] },
    { tempo: 215, wave: 'square',   vol: .035, mel: [523,622,740,831,740,622,554,698], bass: [131,156,185,208,185,156,139,175] },
    { tempo: 230, wave: 'triangle', vol: .052, mel: [523,587,659,784,880,988,880,784], bass: [131,147,165,196,220,247,220,196] }
  ];

  const BOSS_BGM = {
    tempo: 170,
    wave: 'sawtooth',
    vol: .060,
    mel: [196,233,262,294,311,294,262,233],
    bass: [65,65,82,82,73,73,98,98]
  };

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
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
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

  function pattern() {
    return bossMode ? BOSS_BGM : STAGE_BGM[currentStage % STAGE_BGM.length];
  }

  function playStep() {
    const p = pattern();
    const m = p.mel[step % p.mel.length];
    const b = p.bass[Math.floor(step / 2) % p.bass.length];
    const accent = step % 4 === 0;
    tone(m, bossMode ? .12 : .16, p.wave, p.vol + (accent ? .012 : 0), 0);
    tone(m * (bossMode ? 1.25 : 1.5), .07, bossMode ? 'square' : 'sine', p.vol * .42, .075);
    tone(b, bossMode ? .18 : .22, bossMode ? 'sawtooth' : 'square', bossMode ? .040 : .024, 0);
    if (bossMode && step % 4 === 0) noise(.035, .018, .02);
    step++;
  }

  function restartTimer() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = setInterval(playStep, pattern().tempo);
  }

  function startBgm() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (bgmTimer) return;
    restartTimer();
  }

  function setBgm(stage = 0, isBoss = false) {
    currentStage = Math.max(0, Number(stage) || 0);
    bossMode = !!isBoss;
    const sig = currentStage + ':' + bossMode;
    if (sig === lastSignature) return;
    lastSignature = sig;
    step = 0;
    if (bgmTimer) restartTimer();
    if (bossMode) se('bossStart');
  }

  function se(name) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (name === 'start') { tone(523, .08, 'triangle', .12, 0); tone(784, .12, 'triangle', .12, .08); return; }
    if (name === 'select') { tone(880, .07, 'sine', .08, 0); return; }
    if (name === 'jump') { tone(330, .10, 'square', .07, 0, 660); tone(990, .05, 'triangle', .035, .05); return; }
    if (name === 'coin') { tone(1046, .06, 'sine', .07, 0); tone(1568, .08, 'sine', .06, .055); return; }
    if (name === 'stomp') { tone(220, .07, 'square', .10, 0, 120); tone(660, .11, 'triangle', .07, .035); noise(.055, .04, 0); return; }
    if (name === 'bossStart') { tone(98, .20, 'sawtooth', .10, 0, 55); tone(196, .16, 'square', .08, .05); noise(.10, .05, .02); return; }
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

  window.PAKKYAWA_SOUND = { startBgm, setBgm, se };
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);

  document.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'BUTTON') se(e.target.id === 'btnJump' ? 'jump' : 'select');
  }, true);
})();

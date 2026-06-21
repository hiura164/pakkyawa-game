'use strict';
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GROUND_Y = H - 112;
  const SAVE_KEY = 'pakkyawa-adventure-v1';

  const STAGES = [
    { id: 1, name: 'はじまりの草原', world: 3600, theme: ['#8ad8ff', '#62b95a'], coins: 18, enemySpeed: 75, bossHp: 2 },
    { id: 2, name: 'ふわふわ雲の谷', world: 4300, theme: ['#95e0ff', '#49ad60'], coins: 24, enemySpeed: 92, bossHp: 3 },
    { id: 3, name: '王冠キャッスル', world: 5000, theme: ['#7fc8ff', '#3b8d5a'], coins: 30, enemySpeed: 108, bossHp: 4 }
  ];

  let save = loadSave();
  let scene = 'loading';
  let stageIndex = 0;
  let loading = 0;
  let blink = 0;
  let last = performance.now();
  let cam = 0;
  let score = 0;
  let lives = 3;
  let messageTimer = 0;
  let particles = [];
  let flashes = [];

  const input = { left: false, right: false, jump: false, justJump: false };
  const player = { x: 120, y: 0, w: 70, h: 92, vx: 0, vy: 0, face: 1, ground: false, inv: 0 };
  let worldW = 3600;
  let platforms = [], coins = [], enemies = [], boss = null, goal = null;

  function S(name) { if (window.PAKKYAWA_SOUND) window.PAKKYAWA_SOUND.se(name); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function addParticles(x, y, color, count, power = 170, life = .48) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), s = rand(power * .35, power);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rand(20, 90), r: rand(3, 8), life: rand(life * .55, life), max: life, color });
    }
  }
  function addRing(x, y, color, maxR = 54) { flashes.push({ x, y, r: 6, maxR, life: .28, max: .28, color }); }

  function loadSave() {
    try { return Object.assign({ unlocked: 1, best: {}, coins: 0 }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
    catch (_) { return { unlocked: 1, best: {}, coins: 0 }; }
  }
  function writeSave() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

  function boot() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    resetStage(0, true);
    requestAnimationFrame(loop);
  }

  function resetStage(index, full) {
    stageIndex = index;
    const s = STAGES[index];
    worldW = s.world;
    cam = 0;
    particles = [];
    flashes = [];
    player.x = 120; player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0; player.face = 1; player.ground = false; player.inv = 0;
    if (full) { score = 0; lives = 3; }

    platforms = [];
    for (let x = 430, i = 0; x < worldW - 820; x += 390 + (i % 2) * 60, i++) {
      platforms.push({ x, y: GROUND_Y - (80 + (i % 4) * 34), w: 165 + (i % 3) * 25, h: 22 });
    }

    coins = [];
    const n = s.coins;
    for (let i = 0; i < n; i++) {
      const base = 360 + i * ((worldW - 900) / n);
      coins.push({ x: base, y: GROUND_Y - 155 - (i % 4) * 32, r: 17, got: false });
    }

    enemies = [];
    for (let i = 0; i < 5 + index; i++) {
      const x = 700 + i * ((worldW - 1500) / (5 + index));
      const onPlatform = i % 2 === 1 && platforms[i + 1];
      const y = onPlatform ? platforms[i + 1].y - 58 : GROUND_Y - 58;
      enemies.push({ x, y, w: 52, h: 58, vx: s.enemySpeed + i * 5, l: x - 90, r: x + 160, dead: false });
    }

    boss = { x: worldW - 650, y: GROUND_Y - 142, w: 122, h: 142, vx: 92 + index * 18, dir: 1, hp: s.bossHp, max: s.bossHp, active: false, dead: false, inv: 0, wake: worldW - 1000 };
    goal = { x: worldW - 255, y: GROUND_Y - 260, w: 142, h: 88 };
  }

  function completeStage() {
    const s = STAGES[stageIndex];
    save.best[s.id] = Math.max(save.best[s.id] || 0, score);
    save.coins += score;
    save.unlocked = Math.max(save.unlocked, Math.min(STAGES.length, s.id + 1));
    writeSave();
    S('clear');
    addRing(player.x + player.w / 2, player.y + 20, '#ffe21c', 110);
    addParticles(player.x + player.w / 2, player.y + 30, '#ffe21c', 42, 240, .8);
    scene = 'clear';
  }

  function startStage(index) {
    if (index + 1 > save.unlocked) return;
    S('start');
    resetStage(index, true);
    scene = 'play';
  }

  function nextStage() {
    if (stageIndex + 1 < STAGES.length && stageIndex + 2 <= save.unlocked) startStage(stageIndex + 1);
    else scene = 'select';
  }

  function loseLife() {
    if (player.inv > 0 || scene !== 'play') return;
    S('hurt');
    addRing(player.x + player.w / 2, player.y + player.h / 2, '#ff5252', 72);
    addParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff7043', 26, 220, .55);
    lives--;
    if (lives <= 0) { scene = 'gameover'; return; }
    player.x = Math.max(80, player.x - 180); player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0; player.inv = 1.2; messageTimer = .8;
  }

  function rect(a, b) { return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h); }

  function pressMenu() {
    if (scene === 'loading') return;
    S('select');
    if (scene === 'title') scene = 'select';
    else if (scene === 'clear') nextStage();
    else if (scene === 'gameover') scene = 'select';
  }

  function handleKeys(down, e) {
    if (['ArrowLeft','ArrowRight','ArrowUp','Space','Enter','Digit1','Digit2','Digit3'].includes(e.code)) e.preventDefault();
    if (down && (e.code === 'Enter' || (e.code === 'Space' && scene !== 'play'))) pressMenu();
    if (down && scene === 'select') {
      if (e.code === 'Digit1') startStage(0);
      if (e.code === 'Digit2') startStage(1);
      if (e.code === 'Digit3') startStage(2);
    }
    if (e.code === 'ArrowLeft') input.left = down;
    if (e.code === 'ArrowRight') input.right = down;
    if (e.code === 'ArrowUp' || e.code === 'Space') { if (down && !input.jump) input.justJump = true; input.jump = down; }
  }
  addEventListener('keydown', e => handleKeys(true, e), { passive: false });
  addEventListener('keyup', e => handleKeys(false, e), { passive: false });

  function bindButton(id, key) {
    const el = document.getElementById(id);
    const down = e => { e.preventDefault(); if (scene !== 'play') { pressMenu(); return; } if (key === 'jump' && !input.jump) input.justJump = true; input[key] = true; };
    const up = e => { e.preventDefault(); input[key] = false; };
    ['pointerdown','touchstart','mousedown'].forEach(ev => el.addEventListener(ev, down, { passive: false }));
    ['pointerup','pointercancel','pointerleave','touchend','touchcancel','mouseup','mouseleave'].forEach(ev => el.addEventListener(ev, up, { passive: false }));
  }
  bindButton('btnLeft', 'left'); bindButton('btnRight', 'right'); bindButton('btnJump', 'jump');

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (scene === 'select') {
      const p = pointer(e);
      for (let i = 0; i < STAGES.length; i++) if (p.x > 250 && p.x < 710 && p.y > 190 + i * 78 && p.y < 250 + i * 78) startStage(i);
      return;
    }
    if (scene !== 'play') pressMenu();
  }, { passive: false });

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function updateFX(dt) {
    for (const p of particles) { p.life -= dt; p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; }
    particles = particles.filter(p => p.life > 0);
    for (const f of flashes) { f.life -= dt; f.r += (f.maxR - f.r) * Math.min(1, dt * 10); }
    flashes = flashes.filter(f => f.life > 0);
  }

  function update(dt) {
    blink += dt;
    updateFX(dt);
    if (scene === 'loading') { loading += dt * 0.75; if (loading >= 1) scene = 'title'; return; }
    if (scene !== 'play') return;

    const prevBottom = player.y + player.h;
    player.inv = Math.max(0, player.inv - dt); boss.inv = Math.max(0, boss.inv - dt); messageTimer = Math.max(0, messageTimer - dt);
    player.vx = 0;
    if (input.left) { player.vx = -285; player.face = -1; }
    if (input.right) { player.vx = 285; player.face = 1; }
    if (input.justJump && player.ground) { player.vy = -690; player.ground = false; S('jump'); addParticles(player.x + player.w / 2, player.y + player.h, '#ffffff', 10, 90, .28); }
    input.justJump = false;

    player.vy += 1850 * dt; player.x += player.vx * dt; player.y += player.vy * dt; player.ground = false;
    if (player.y + player.h >= GROUND_Y) { player.y = GROUND_Y - player.h; player.vy = 0; player.ground = true; }
    for (const p of platforms) if (player.x + player.w > p.x && player.x < p.x + p.w && prevBottom <= p.y && player.y + player.h >= p.y && player.y + player.h <= p.y + 44 && player.vy >= 0) { player.y = p.y - player.h; player.vy = 0; player.ground = true; }
    player.x = Math.max(0, Math.min(worldW - player.w, player.x));
    if (player.y > H + 260) loseLife();

    for (const e of enemies) if (!e.dead) { e.x += e.vx * dt; if (e.x < e.l) { e.x = e.l; e.vx *= -1; } if (e.x + e.w > e.r) { e.x = e.r - e.w; e.vx *= -1; } }
    if (!boss.dead && player.x > boss.wake) boss.active = true;
    if (boss.active && !boss.dead) { boss.x += boss.vx * boss.dir * dt; if (boss.x < boss.wake) { boss.x = boss.wake; boss.dir = 1; } if (boss.x + boss.w > worldW - 120) { boss.x = worldW - 120 - boss.w; boss.dir = -1; } }

    for (const c of coins) if (!c.got && Math.hypot(player.x + player.w / 2 - c.x, player.y + player.h / 2 - c.y) < c.r + 28) { c.got = true; score++; S('coin'); addParticles(c.x, c.y, '#ffe21c', 12, 150, .36); addRing(c.x, c.y, '#fff59d', 34); }
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (const e of enemies) if (!e.dead && rect(pr, e)) { const stomp = prevBottom <= e.y + 12 && player.y + player.h >= e.y && player.vy >= 0; if (stomp) { e.dead = true; score += 5; player.vy = -500; S('stomp'); addParticles(e.x + e.w / 2, e.y + 10, '#ffb74d', 24, 210, .48); addRing(e.x + e.w / 2, e.y + 20, '#ffffff', 58); } else loseLife(); }
    if (boss.active && !boss.dead && rect(pr, boss)) { const stomp = prevBottom <= boss.y + 15 && player.y + player.h >= boss.y && player.vy >= 0; if (stomp && boss.inv <= 0) { boss.hp--; boss.inv = .45; score += 10; player.vy = -540; S('boss'); addParticles(boss.x + boss.w / 2, boss.y + 18, '#ff5252', 38, 260, .62); addRing(boss.x + boss.w / 2, boss.y + 34, '#ffeb3b', 82); if (boss.hp <= 0) { boss.dead = true; addParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffe21c', 70, 310, .95); addRing(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffffff', 130); } } else if (!stomp && boss.inv <= 0) loseLife(); }
    if (boss.dead && player.x + player.w / 2 > goal.x && player.x + player.w / 2 < goal.x + goal.w && player.y + player.h > goal.y) completeStage();
    cam = Math.max(0, Math.min(worldW - W, player.x - W * .35));
  }

  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill)ctx.fill();if(stroke)ctx.stroke();}
  function logo(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 54px system-ui';ctx.lineWidth=8;ctx.strokeStyle='#5b341d';ctx.strokeText('PAKKYAWA',0,0);ctx.fillStyle='#ffe21c';ctx.fillText('PAKKYAWA',0,0);crown(-36,-88,72,48);ctx.restore();}
  function crown(x,y,w,h){ctx.fillStyle='#ffe21c';ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w,y+h*.42);ctx.lineTo(x+w*.78,y+3);ctx.lineTo(x+w*.5,y+h*.32);ctx.lineTo(x+w*.22,y+3);ctx.lineTo(x,y+h*.42);ctx.closePath();ctx.fill();ctx.strokeStyle='#c98f00';ctx.lineWidth=3;ctx.stroke();}

  function background(){const s=STAGES[stageIndex];ctx.fillStyle=s.theme[0];ctx.fillRect(0,0,worldW,H);ctx.fillStyle='#77b7e3';for(let x=-80;x<worldW;x+=700){ctx.beginPath();ctx.moveTo(x,H-170);ctx.lineTo(x+310,H-275);ctx.lineTo(x+650,H-170);ctx.closePath();ctx.fill();}ctx.fillStyle=s.theme[1];for(let x=-100;x<worldW;x+=620){ctx.beginPath();ctx.moveTo(x,H-110);ctx.quadraticCurveTo(x+280,H-230,x+590,H-110);ctx.lineTo(x+590,H);ctx.lineTo(x,H);ctx.closePath();ctx.fill();}for(let x=150;x<worldW;x+=520) cloud(x,75+(x%4)*10,1+(x%2)*.12);}
  function cloud(x,y,s){ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(x,y,22*s,0,7);ctx.arc(x+32*s,y-10*s,31*s,0,7);ctx.arc(x+68*s,y,24*s,0,7);ctx.fill();}
  function terrain(){ctx.fillStyle='#55b83e';ctx.fillRect(0,GROUND_Y,worldW,42);ctx.fillStyle='#8b572b';ctx.fillRect(0,GROUND_Y+42,worldW,H-GROUND_Y-42);for(const p of platforms){ctx.fillStyle='#55b83e';rr(p.x,p.y,p.w,p.h,8,true,false);ctx.fillStyle='#714420';ctx.fillRect(p.x,p.y+p.h-6,p.w,6);}for(let x=250;x<worldW;x+=560){ctx.fillStyle='#f56545';ctx.beginPath();ctx.arc(x,GROUND_Y-8,18,Math.PI,0);ctx.fill();ctx.fillStyle='#f7d9a8';ctx.fillRect(x-6,GROUND_Y-8,12,22);}}
  function drawCoins(){for(const c of coins)if(!c.got){const g=ctx.createRadialGradient(c.x-4,c.y-4,3,c.x,c.y,c.r);g.addColorStop(0,'#fff6a5');g.addColorStop(1,'#f6bf23');ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,7);ctx.fill();ctx.strokeStyle='#d99d00';ctx.lineWidth=3;ctx.stroke();}}
  function human(x,y,w,h,type='p',face=1){ctx.save();if(face<0){ctx.translate(x+w/2,0);ctx.scale(-1,1);ctx.translate(-x-w/2,0);}if(type==='p'){ctx.fillStyle='#e53935';ctx.beginPath();ctx.moveTo(x+12,y+44);ctx.lineTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w-14,y+44);ctx.closePath();ctx.fill();}ctx.fillStyle=type==='boss'?'#ff8a65':type==='enemy'?'#ffb74d':'#1e88e5';rr(x+10,y+42,w-20,h-42,10,true,false);if(type==='p'){ctx.fillStyle='#4fc3f7';ctx.fillRect(x+14,y+78,20,28);ctx.fillRect(x+w-34,y+78,20,28);ctx.fillStyle='#8d6e63';ctx.fillRect(x+9,y+101,28,12);ctx.fillRect(x+w-37,y+101,28,12);}const cx=x+w/2,cy=y+24;ctx.fillStyle='#ffd9b3';ctx.beginPath();ctx.arc(cx,cy,type==='boss'?32:26,0,7);ctx.fill();ctx.fillStyle='#1c1c1c';ctx.beginPath();ctx.arc(cx,cy-7,type==='boss'?33:27,Math.PI,0);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(cx-9,cy,4.5,0,7);ctx.arc(cx+9,cy,4.5,0,7);ctx.fill();ctx.strokeStyle='#222';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(cx,cy+8,8,.12*Math.PI,.88*Math.PI);ctx.stroke();if(type==='enemy'){ctx.fillStyle='#ff7043';ctx.beginPath();ctx.moveTo(cx-18,y-2);ctx.lineTo(cx-6,y-18);ctx.lineTo(cx+2,y-4);ctx.lineTo(cx+15,y-19);ctx.lineTo(cx+19,y-2);ctx.closePath();ctx.fill();}else crown(cx-(type==='boss'?38:22),y-(type==='boss'?12:22),type==='boss'?76:44,type==='boss'?36:28);ctx.restore();}
  function drawGoal(){if(!boss.dead)return;crown(goal.x,goal.y,goal.w,goal.h);ctx.fillStyle='#fff';rr(goal.x+18,goal.y+goal.h+13,goal.w-36,38,8,true,true);ctx.fillStyle='#423';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText('GOAL',goal.x+goal.w/2,goal.y+goal.h+39);}
  function drawActors(){for(const e of enemies)if(!e.dead)human(e.x,e.y,e.w,e.h,'enemy',e.vx>0?1:-1);if(!boss.dead&&(boss.active||cam>boss.wake-500)){human(boss.x,boss.y,boss.w,boss.h,'boss',boss.dir);ctx.fillStyle='rgba(0,0,0,.36)';ctx.fillRect(boss.x+8,boss.y-34,boss.w-16,12);ctx.fillStyle='#ff3d3d';ctx.fillRect(boss.x+8,boss.y-34,(boss.w-16)*(boss.hp/boss.max),12);}if(!(player.inv>0&&Math.floor(player.inv*12)%2===0))human(player.x,player.y,player.w,player.h,'p',player.face);}
  function drawFX(){for(const f of flashes){ctx.save();ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.stroke();ctx.restore();}for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();ctx.restore();}}

  function hud(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(0,0,0,.30)';rr(16,14,360,42,14,true,false);ctx.fillStyle='#fff';ctx.font='bold 19px system-ui';ctx.textAlign='left';ctx.fillText('STAGE '+STAGES[stageIndex].id+'  COINS '+score+'  LIVES '+lives,32,42);if(messageTimer>0){ctx.textAlign='center';ctx.font='bold 24px system-ui';ctx.fillText('まだまだ！',W/2,92);} }
  function overlay(){ctx.setTransform(1,0,0,1,0,0);if(scene==='loading'){ctx.fillStyle='#111827';ctx.fillRect(0,0,W,H);logo(W/2,H/2-54,.9);ctx.fillStyle='rgba(255,255,255,.25)';rr(260,H/2+30,440,20,12,true,false);ctx.fillStyle='#ffe21c';rr(260,H/2+30,440*Math.min(1,loading),20,12,true,false);ctx.fillStyle='#fff';ctx.font='18px system-ui';ctx.textAlign='center';ctx.fillText('Loading Ver1.3...',W/2,H/2+82);return;}if(scene==='title'){shade();logo(W/2,170,1.05);ctx.fillStyle='#fff';ctx.font='bold 24px system-ui';ctx.textAlign='center';ctx.fillText('横スクロール王冠アクション',W/2,260);ctx.font='18px system-ui';ctx.fillText('スマホ：左右ボタン＋JUMP　PC：← → / Space',W/2,300);if(Math.floor(blink*2)%2===0)ctx.fillText('TAP / ENTER でスタート',W/2,360);return;}if(scene==='select'){shade();logo(W/2,105,.75);ctx.fillStyle='#fff';ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.fillText('ステージ選択',W/2,155);for(let i=0;i<STAGES.length;i++){const y=190+i*78,open=i+1<=save.unlocked;ctx.fillStyle=open?'rgba(255,255,255,.92)':'rgba(255,255,255,.35)';rr(250,y,460,60,18,true,false);ctx.fillStyle=open?'#263238':'#666';ctx.textAlign='left';ctx.font='bold 22px system-ui';ctx.fillText((i+1)+'. '+STAGES[i].name,280,y+37);ctx.textAlign='right';ctx.font='16px system-ui';ctx.fillText(open?'BEST '+(save.best[i+1]||0):'LOCK',680,y+37);}ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='16px system-ui';ctx.fillText('タップまたは数字キーで選択 / 累計COINS '+save.coins,W/2,465);return;}if(scene==='gameover'){shade();ctx.fillStyle='#ff6666';ctx.font='900 52px system-ui';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,H/2-30);ctx.fillStyle='#fff';ctx.font='20px system-ui';ctx.fillText('TAP / ENTER でステージ選択へ',W/2,H/2+26);return;}if(scene==='clear'){shade();ctx.fillStyle='#ffe21c';ctx.font='900 50px system-ui';ctx.textAlign='center';ctx.fillText('STAGE CLEAR!!',W/2,H/2-54);ctx.fillStyle='#fff';ctx.font='22px system-ui';ctx.fillText(STAGES[stageIndex].name+'　SCORE '+score,W/2,H/2-8);ctx.font='18px system-ui';ctx.fillText(stageIndex+1<STAGES.length?'TAP / ENTER で次へ':'全ステージクリア！ TAP / ENTER で選択へ',W/2,H/2+40);}}
  function shade(){ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,W,H);}

  function render(){ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(-cam,0);background();terrain();drawCoins();drawGoal();drawActors();drawFX();ctx.restore();hud();overlay();}
  function loop(now){const dt=Math.min((now-last)/1000,.033);last=now;update(dt);render();requestAnimationFrame(loop);}
  boot();
})();

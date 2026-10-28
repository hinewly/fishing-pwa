/* fishing-pwa 核心 —— 湖面垂钓 Demo
 * 状态机：lake(选位/抛竿/等口/刺鱼) → fight(张力博弈) → net(抄网) → 结算
 */
'use strict';

/* ================= 音效（WebAudio 合成，零素材） ================= */
const AudioSys = (() => {
  let ac = null;
  function ctx(){ if(!ac) ac = new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume(); return ac; }
  function tone(freq, dur, type='sine', vol=0.15, slide=0){
    try{
      const a = ctx(), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = freq;
      if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), a.currentTime+dur);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+dur);
      o.connect(g).connect(a.destination);
      o.start(); o.stop(a.currentTime+dur);
    }catch(e){}
  }
  function noise(dur, vol=0.2, hp=800){
    try{
      const a = ctx(), len = a.sampleRate*dur, buf = a.createBuffer(1,len,a.sampleRate), d = buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*(1-i/len);
      const s = a.createBufferSource(); s.buffer = buf;
      const f = a.createBiquadFilter(); f.type='highpass'; f.frequency.value = hp;
      const g = a.createGain(); g.gain.value = vol;
      s.connect(f).connect(g).connect(a.destination); s.start();
    }catch(e){}
  }
  return {
    unlock: ctx,
    tick:   () => tone(1400, .05, 'square', .05),
    dip:    () => tone(500, .12, 'sine', .12, -200),
    bite:   () => { tone(700,.1,'square',.14); setTimeout(()=>tone(420,.18,'square',.16),90); },
    reel:   () => tone(900+Math.random()*300, .03, 'square', .04),
    creak:  () => tone(160, .3, 'sawtooth', .12, -60),
    splash: () => noise(.35, .3, 500),
    dash:   () => { noise(.2,.22,900); tone(300,.25,'sawtooth',.1,-150); },
    snap:   () => { tone(180,.08,'square',.2); noise(.15,.3,1200); },
    win:    () => { [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.22,'triangle',.14),i*110)); },
    lose:   () => { tone(300,.4,'sawtooth',.12,-180); },
  };
})();

/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
const rand = (a,b) => a + Math.random()*(b-a);
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
function toast(msg, ms=1800){
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.add('hidden'), ms);
}
function showPopup(id){ $(id).classList.remove('hidden'); }
function hidePopup(id){ $(id).classList.add('hidden'); }

/* ================= 渔获存档 ================= */
const Store = {
  key:'fishing_catch_v1',
  load(){ try{ return JSON.parse(localStorage.getItem(this.key)) || {counts:{},firsts:[]}; }catch(e){ return {counts:{},firsts:[]}; } },
  save(d){ localStorage.setItem(this.key, JSON.stringify(d)); },
  add(fish){
    const d = this.load();
    const isNew = !d.counts[fish.species.id];
    d.counts[fish.species.id] = (d.counts[fish.species.id]||0) + 1;
    if(isNew) d.firsts.push(fish.species.id);
    this.save(d);
    return isNew;
  },
};


/* ================= 钓鱼人（半写实坐姿，侧脸朝右） =================
 * 以脚底为原点 y=0，身高约 78 单位；s 为缩放
 * mode: idle 等口 / bite 刺鱼瞬间竿被下拉 / fight 搏鱼（剪影由调用方换色）
 */
function drawAngler(c, x, y, s, t, mode, silhouette, mirror){
  c.save(); c.translate(x, y); c.scale(mirror?-s:s, s);
  const C = silhouette
    ? { hat:'rgba(18,28,36,0.9)', shirt:'rgba(18,28,36,0.9)', vest:'rgba(18,28,36,0.9)', pants:'rgba(18,28,36,0.9)', boot:'rgba(18,28,36,0.9)', skin:'rgba(18,28,36,0.9)', rod:'#8a9aa4' }
    : { hat:'#d9b36c', hatDark:'#c39f55', shirt:'#75855a', vest:'#57653f', pants:'#3d4d5e', boot:'#2e3136', skin:'#d8a07a', rod:'#8a6b46' };
  const lean = mode==='bite' ? 0.10 : 0.05 + Math.sin(t*1.2)*0.015;

  // 凳子
  c.fillStyle = silhouette ? C.boot : '#6e5638';
  c.fillRect(-14, -24, 26, 4);
  c.fillRect(-12, -20, 3, 20); c.fillRect(7, -20, 3, 20);

  // 后腿（远侧，先画）
  c.strokeStyle = C.pants; c.lineWidth = 8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(2, -26); c.quadraticCurveTo(16, -22, 18, -10); c.stroke();
  c.fillStyle = C.boot;
  c.beginPath(); c.ellipse(19, -4, 8, 3.5, 0, 0, Math.PI*2); c.fill();

  // 躯干（前倾）
  c.save(); c.translate(2, -26); c.rotate(lean);
  c.fillStyle = C.shirt;
  c.beginPath();
  c.moveTo(-6, 0); c.quadraticCurveTo(-8, -22, -3, -32);
  c.lineTo(7, -32); c.quadraticCurveTo(8, -12, 7, 0);
  c.closePath(); c.fill();
  // 马甲
  c.fillStyle = C.vest;
  c.beginPath();
  c.moveTo(-6, -2); c.quadraticCurveTo(-8, -20, -3, -30);
  c.lineTo(4, -30); c.quadraticCurveTo(1, -14, 2, -2);
  c.closePath(); c.fill();
  // 头（侧脸微低，看漂）
  c.fillStyle = C.skin;
  c.beginPath(); c.arc(7, -40, 8, 0, Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(14.5, -38, 3, 2.2, 0.3, 0, Math.PI*2); c.fill(); // 鼻尖
  // 草帽
  c.fillStyle = C.hat;
  c.beginPath(); c.ellipse(6, -46, 15, 3.4, -0.06, 0, Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(5, -48.5, 8, 5, 0, Math.PI, 0); c.fill();
  c.fillStyle = C.hatDark;
  c.fillRect(-9, -47.2, 30, 1.6);
  // 后臂（扶竿尾）
  c.strokeStyle = C.shirt; c.lineWidth = 6;
  c.beginPath(); c.moveTo(2, -26); c.quadraticCurveTo(14, -18, 26, -16); c.stroke();
  c.restore();

  // 前腿
  c.strokeStyle = C.pants; c.lineWidth = 8.5;
  c.beginPath(); c.moveTo(4, -26); c.quadraticCurveTo(22, -26, 30, -12); c.stroke();
  c.fillStyle = C.boot;
  c.beginPath(); c.ellipse(33, -4, 9, 3.8, 0, 0, Math.PI*2); c.fill();

  // 前臂（握竿中部）
  const shY = -52 + lean*26;
  c.strokeStyle = C.skin; c.lineWidth = 5.5;
  c.beginPath(); c.moveTo(10, shY+4); c.quadraticCurveTo(22, shY+10, 30, -18); c.stroke();

  // 鱼竿：以握点为轴，bite 时下拉
  const rodDrop = mode==='bite' ? 0.35 + Math.sin(t*18)*0.03 : (mode==='fight' ? (drawAngler.fightDrop ?? 0.20) : 0.02 + Math.sin(t*1.5)*0.012);
  c.save(); c.translate(27, -17); c.rotate(rodDrop);
  c.strokeStyle = C.rod; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-12, 2);
  if(mode==='fight'){ c.quadraticCurveTo(55, 18, 105, -52); }  // 搏鱼：竿身向后弯
  else { c.lineTo(105, -52); }
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-12, 3.5); c.lineTo(105, -50.5); c.stroke();
  // 导环
  c.fillStyle = 'rgba(0,0,0,0.3)';
  for(let i=1;i<=4;i++){ const gx=-6+i*24, gy=1.5-i*9.5; c.beginPath(); c.arc(gx, gy, 1.4, 0, Math.PI*2); c.fill(); }
  c.restore();

  // 手
  c.fillStyle = C.skin;
  c.beginPath(); c.arc(27, -17, 3.4, 0, Math.PI*2); c.fill();
  c.beginPath(); c.arc(42, -22, 3.2, 0, Math.PI*2); c.fill();
  c.restore();
}

/* 湖面场景的岸坡 + 钓鱼人 + 竿线（返回竿稍世界坐标） */
function drawShoreAngler(c, W, H, t, lake){
  // 前景岸坡
  c.beginPath();
  c.moveTo(0, H*0.66);
  c.quadraticCurveTo(W*0.10, H*0.72, W*0.24, H*0.86);
  c.quadraticCurveTo(W*0.30, H*0.94, W*0.30, H);
  c.lineTo(0, H); c.closePath();
  const bank = c.createLinearGradient(0, H*0.66, 0, H);
  bank.addColorStop(0, '#5d7050'); bank.addColorStop(0.4, '#4c5d40'); bank.addColorStop(1, '#3a4a33');
  c.fillStyle = bank; c.fill();
  // 草丛
  c.strokeStyle = '#6d8356'; c.lineWidth = 2; c.lineCap='round';
  for(let i=0;i<16;i++){
    const gx = (i/16)*W*0.30 + Math.sin(i*3.7)*8, gy = H*0.70 + (i/16)*H*0.26;
    const sway = Math.sin(t*1.4+i)*2;
    c.beginPath(); c.moveTo(gx, gy);
    c.quadraticCurveTo(gx+sway, gy-9, gx+sway*1.6, gy-15); c.stroke();
  }
  // 芦苇
  c.strokeStyle = '#8ba06a'; c.lineWidth = 2.5;
  for(let i=0;i<5;i++){
    const rx = W*0.045+i*14, base = H*0.70 - i*3;
    const sway = Math.sin(t*0.9+i*1.3)*5;
    c.beginPath(); c.moveTo(rx, base+40);
    c.quadraticCurveTo(rx+sway*0.5, base, rx+sway, base-34-i*5); c.stroke();
    c.fillStyle = '#7d6a44';
    c.beginPath(); c.ellipse(rx+sway, base-40-i*5, 2.4, 7, sway*0.02, 0, Math.PI*2); c.fill();
  }
  // 钓鱼人
  const ax = W*0.115, ay = H*0.905;
  const mode = lake.state==='biting' ? 'bite' : 'idle';
  drawAngler(c, ax, ay, Math.min(W,H)/430*1.15, t, mode, false);
  // 竿稍坐标（与 drawAngler 内部几何一致：握点(27,-17) rotate(rodDrop) 竿尖(105,-52)）
  const s = Math.min(W,H)/430*1.15;
  const rodDrop = mode==='bite' ? 0.35 : 0.02;
  const hx = ax + 27*s, hy = ay - 17*s;
  const dx = 105*Math.cos(rodDrop) + 52*Math.sin(rodDrop);
  const dy = -(105*Math.sin(rodDrop)) + (-52)*Math.cos(rodDrop) + 2*Math.cos(rodDrop);
  return { tipX: hx + dx*s, tipY: hy + dy*s };
}

/* ================= 湖面场景 ================= */
const SPOTS = [
  { id:'shallow', name:'浅滩',   x:.22, y:.52, tip:'小鱼多，偶尔来草鱼' },
  { id:'deep',    name:'深水区', x:.52, y:.42, tip:'大物出没，考验耐心' },
  { id:'weed',    name:'水草区', x:.80, y:.58, tip:'黑鱼藏身，动作要快' },
];

const Lake = {
  canvas:null, ctx:null, spot:null, state:'idle', // idle | waiting | biting
  bobber:null, waitTimer:0, biteAt:0, fakes:[], biteT:0, biteWin:1.2, hookedFish:null,
  init(){
    this.canvas = $('#lake-canvas'); this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('pointerdown', e => this.onTap(e));
    this.resize(); window.addEventListener('resize', ()=>this.resize());
  },
  resize(){
    const dpr = window.devicePixelRatio||1;
    this.canvas.width = innerWidth*dpr; this.canvas.height = innerHeight*dpr;
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  },
  onTap(e){
    const r = this.canvas.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    for(const s of SPOTS){
      if(Math.hypot((x-s.x)*r.width,(y-s.y)*r.height) < 56){
        this.select(s); return;
      }
    }
  },
  select(s){
    this.spot = s; this.state='idle';
    $('#lake-tip').textContent = `钓位：${s.name} —— ${s.tip}`;
    const b = $('#btn-cast'); b.disabled = false; b.textContent = '🎣 抛竿';
  },
  cast(){
    AudioSys.unlock(); AudioSys.splash();
    this.state = 'waiting'; this.waitTimer = 0;
    this.bobber = { t:0 };
    this.biteAt = rand(4,11);
    this.fakes = [];
    const n = 1+Math.floor(Math.random()*2);
    for(let i=0;i<n;i++) this.fakes.push(rand(1.5, Math.max(2, this.biteAt-1)));
    this.fakes.sort((a,b)=>a-b);
    $('#btn-cast').textContent = '刺鱼！';
    $('#lake-tip').textContent = '等口……浮漂动不一定真咬，猛沉再刺！';
  },
  strike(){
    if(this.state!=='waiting') return;
    const t = this.waitTimer;
    if(this.fakes.length && Math.abs(t - this.fakes[0]) < 0.5){
      AudioSys.lose();
      this.biteAt += rand(4,9);
      this.fakes = this.fakes.slice(1);
      toast('空竿惊窝了！鱼群散开，多等一会儿……');
      return;
    }
    toast('没有口……收竿重抛');
    this.reset();
  },
  reset(){
    this.state='idle'; this.bobber=null;
    const b=$('#btn-cast'); b.textContent='🎣 抛竿'; b.disabled=false;
    $('#lake-tip').textContent = this.spot ? `钓位：${this.spot.name} —— 点击湖面可换位` : '点击湖面选择钓位，然后抛竿';
  },
  update(dt){
    if(this.state!=='waiting') return;
    this.waitTimer += dt;
    if(this.fakes.length && this.waitTimer >= this.fakes[0]){
      this.fakes.shift(); AudioSys.dip();
      toast('漂动了一下……可能是假口', 900);
    }
    if(this.waitTimer >= this.biteAt){
      this.state='biting'; this.biteT = 0;
      this.hookedFish = rollFish(this.spot.id);
      this.biteWin = clamp(1.5 - this.hookedFish.strength*0.45, 0.8, 1.5);
      AudioSys.bite();
      $('#lake-tip').textContent = '❗ 浮漂猛沉——快刺鱼！';
    }
  },
  updateBiting(dt){
    this.biteT += dt;
    if(this.biteT > this.biteWin){
      AudioSys.lose();
      Game.showLost('吐钩跑了', this.hookedFish.strength>0.6 ? '大鱼试探了两口，你慢了半拍，它吐钩而去。' : '刺慢了，鱼把饵吐了。');
      this.reset();
    }
  },
  draw(t){
    const c = this.ctx, W = innerWidth, H = innerHeight;
    const sky = c.createLinearGradient(0,0,0,H*0.35);
    sky.addColorStop(0,'#ffd9a0'); sky.addColorStop(1,'#ffb27a');
    c.fillStyle = sky; c.fillRect(0,0,W,H*0.35);
    c.beginPath(); c.arc(W*0.78, H*0.13, 36, 0, Math.PI*2);
    c.fillStyle = 'rgba(255,240,200,0.9)'; c.fill();
    // 云
    for(let i=0;i<3;i++){
      const cx = ((i*0.33+0.08)*W + t*6*(i+1)*0.3) % (W+160) - 80;
      const cy = H*(0.08+i*0.05);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.beginPath();
      c.ellipse(cx, cy, 34, 10, 0, 0, Math.PI*2);
      c.ellipse(cx+22, cy-5, 22, 9, 0, 0, Math.PI*2);
      c.ellipse(cx-20, cy-3, 18, 8, 0, 0, Math.PI*2);
      c.fill();
    }
    // 飞鸟
    c.strokeStyle = 'rgba(60,60,60,0.6)'; c.lineWidth = 1.6; c.lineCap='round';
    for(let i=0;i<3;i++){
      const bx2 = ((i*0.4+0.15)*W - t*22*(i%2+1)*0.4) % (W+100);
      const by2 = H*(0.10+i*0.04) + Math.sin(t*2+i)*4;
      const flap = Math.sin(t*7+i*2)*3;
      c.beginPath();
      c.moveTo(bx2-6, by2-flap); c.quadraticCurveTo(bx2, by2+2, bx2+6, by2-flap);
      c.stroke();
    }
    c.beginPath(); c.moveTo(0,H*0.35);
    c.quadraticCurveTo(W*0.25,H*0.22,W*0.5,H*0.35);
    c.quadraticCurveTo(W*0.75,H*0.26,W,H*0.35);
    c.lineTo(W,H*0.42); c.lineTo(0,H*0.42); c.closePath();
    c.fillStyle = '#5a7d6b'; c.fill();
    const wa = c.createLinearGradient(0,H*0.35,0,H);
    wa.addColorStop(0,'#3f7d8c'); wa.addColorStop(0.4,'#2a5d74'); wa.addColorStop(1,'#173a4d');
    c.fillStyle = wa; c.fillRect(0,H*0.35,W,H*0.65);
    for(let i=0;i<14;i++){
      const yy = H*0.42 + (i/14)*H*0.55 + Math.sin(t*0.9+i)*3;
      c.beginPath(); c.ellipse((Math.sin(t*0.4+i*1.7)*0.3+0.5)*W, yy, 40+i*6, 2.5, 0, 0, Math.PI*2);
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill();
    }
    for(const s of SPOTS){
      const sel = this.spot && this.spot.id===s.id;
      const sx = s.x*W, sy = s.y*H;
      c.beginPath(); c.ellipse(sx, sy, 52, 22, 0, 0, Math.PI*2);
      c.fillStyle = sel ? 'rgba(255,210,80,0.18)' : 'rgba(255,255,255,0.08)';
      c.fill();
      c.strokeStyle = sel ? 'rgba(255,210,80,0.9)' : 'rgba(255,255,255,0.35)';
      c.lineWidth = sel?2.5:1.5; c.setLineDash(sel?[]:[6,6]); c.stroke(); c.setLineDash([]);
      c.fillStyle = sel?'#ffd250':'rgba(255,255,255,0.75)';
      c.font = '600 14px sans-serif'; c.textAlign='center';
      c.fillText(s.name, sx, sy-30);
      if(sel){
        for(let i=0;i<3;i++){
          const fx = sx + Math.sin(t*0.7+i*2.1)*46;
          c.beginPath(); c.ellipse(fx, sy+26+i*10, 14-i*2, 5, Math.sin(t+i)*0.2, 0, Math.PI*2);
          c.fillStyle = 'rgba(20,30,36,0.35)'; c.fill();
        }
      }
    }
    if(this.bobber){
      const s = this.spot; let by = s.y*H, dip = 0;
      if(this.state==='waiting'){
        const nearFake = this.fakes.length && (this.fakes[0]-this.waitTimer)<0.5;
        if(nearFake) dip = Math.sin(t*14)*3+3;
      } else if(this.state==='biting'){
        dip = Math.min(18, this.biteT*40);
      }
      const bx = s.x*W + Math.sin(t*0.8)*6;
      c.beginPath(); c.ellipse(bx, by, 26, 8, 0, 0, Math.PI*2); c.strokeStyle='rgba(255,255,255,0.35)'; c.stroke();
      c.beginPath(); c.ellipse(bx, by-dip, 5.5, 9, 0, 0, Math.PI*2);
      c.fillStyle = '#ff5252'; c.fill();
      c.fillStyle='#fff'; c.fillRect(bx-1, by-dip-16, 2, 8);
    }
    // 岸坡 + 钓鱼人 + 竿线连到浮漂
    const tip = drawShoreAngler(c, W, H, t, this);
    if(this.bobber && this.spot){
      const s2 = this.spot;
      const bxx = s2.x*W + Math.sin(t*0.8)*6;
      let byy = s2.y*H;
      if(this.state==='biting') byy -= Math.min(18, this.biteT*40);
      const sag = this.state==='biting' ? 10 : 26 + Math.sin(t*1.1)*3;
      c.beginPath();
      c.moveTo(tip.tipX, tip.tipY);
      c.quadraticCurveTo((tip.tipX+bxx)/2, Math.min(tip.tipY,byy)+sag, bxx, byy-8);
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2; c.stroke();
    }
  },
};

/* ================= 搏鱼 ================= */
const Fight = {
  canvas:null, ctx:null, F:null, phase:'idle', holding:false,
  init(){
    this.canvas = $('#fight-canvas'); this.ctx = this.canvas.getContext('2d');
    const btn = $('#btn-reel');
    const down = e => { e.preventDefault(); this.press(true); };
    const up   = e => { e.preventDefault(); this.press(false); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    $('#btn-steady').addEventListener('pointerdown', e=>{ e.preventDefault(); this.onSteady(); });
    $('#btn-net').addEventListener('pointerdown', e=>{ e.preventDefault(); this.onNet(); });
    this.resize(); window.addEventListener('resize', ()=>this.resize());
  },
  resize(){
    const dpr = window.devicePixelRatio||1;
    this.canvas.width = innerWidth*dpr; this.canvas.height = innerHeight*dpr;
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  },
  start(fish){
    this.F = {
      fish,
      tension: 20, progress: 0.12, stamina: 1, t: 0,
      dash:null, nextDash: rand(3,7), snag:null, snagHold:0, wash:null,
      redTime:0, slack:0, fightSec:0, netT:0, _reelT:0, _creakT:0,
    };
    this.phase = 'fight'; this.holding = false;
    $('#screen-lake').classList.remove('active');
    $('#screen-fight').classList.add('active');
    $('#btn-reel').classList.remove('hidden');
    $('#btn-steady').classList.add('hidden');
    $('#btn-net').classList.add('hidden');
    $('#fight-title').textContent = `中鱼了！${fish.species.name}`;
    $('#fight-msg').textContent = '';
    $('#fight-msg').style.color = '';
    AudioSys.splash();
  },
  press(v){
    if(this.phase!=='fight') return;
    if(v) AudioSys.unlock();
    this.holding = v;
  },
  onSteady(){
    if(this.phase!=='fight' || !this.F || !this.F.wash) return;
    this.F.wash = null;
    this.F.stamina = Math.max(0, this.F.stamina-0.12);
    this.F.tension = Math.max(10, this.F.tension-25);
    $('#btn-steady').classList.add('hidden');
    $('#fight-msg').textContent = '稳住了！鱼呛了一口水';
    AudioSys.splash();
  },
  netPhase(){ return (this.F.netT * this.netSpeed()) % (2*Math.PI); },
  netSpeed(){ return 3 + this.F.fish.strength*2.4; },
  inGreen(){
    let d = Math.abs(this.netPhase() - Math.PI);
    if(d > Math.PI) d = 2*Math.PI - d;
    return d < 0.55;
  },
  onNet(){
    if(this.phase!=='net') return;
    if(this.inGreen()){
      this.finish(true, null);
    } else {
      this.finish(false, '抄网撞上鱼头！', '鱼一个摆尾脱钩跑了。挣扎这么凶不能急，看准它喘气的间隙再抄。');
    }
  },
  finish(win, title, desc){
    this.phase='idle';
    $('#screen-fight').classList.remove('active');
    $('#screen-lake').classList.add('active');
    if(win) Game.onCaught(this.F.fish);
    else Game.showLost(title, desc);
    Lake.reset();
    if(navigator.vibrate) navigator.vibrate(win?[60,40,60]:120);
  },
  update(dt){
    const f = this.F;
    if(!f || this.phase==='idle') return;
    f.t += dt; f.fightSec += dt;
    const sp = f.fish.species, S = f.fish.strength;
    const tired = f.stamina <= 0;

    if(this.phase==='net'){
      f.netT += dt;
      if(f.netT > 7){
        this.finish(false, '最后一秒跑了…', '鱼在岸边挣扎太久，挣脱了钩子。都搏到岸边了，就差那一下。');
        return;
      }
      this.render(); return;
    }

    // —— 鱼行为调度 ——
    if(!f.dash && !f.snag && !f.wash && !tired){
      f.nextDash -= dt;
      if(f.nextDash <= 0){
        if(sp.behaviors.includes('deep') && Math.random()<0.4 && f.progress>0.3){
          f.snag = { left: rand(2,4) };
          $('#fight-msg').textContent = '⚠ 鱼钻底了！松线别硬拉！';
        } else if(sp.behaviors.includes('wash') && Math.random()<0.45 && f.progress>0.45){
          f.wash = { left: 0.7 };
          $('#btn-steady').classList.remove('hidden');
          $('#fight-msg').textContent = '⚡ 鱼要洗鳃——快点「稳住」！';
          AudioSys.splash();
        } else {
          f.dash = { left: rand(1.4,2.6) * (0.6+S*0.4) };
          $('#fight-msg').textContent = '💥 大鱼冲刺！快松手放线！';
          AudioSys.dash();
          GamepadFx.buzz(0.9, 400);
        }
        f.nextDash = rand(3.5, 8) * (1.3-S*0.4);
      }
    }
    if(f.dash){ f.dash.left -= dt; if(f.dash.left<=0){ f.dash=null; if(!f.snag&&!f.wash) $('#fight-msg').textContent=''; } }
    if(f.snag){
      f.snag.left -= dt;
      f.snagHold = this.holding ? f.snagHold+dt : 0;
      if(f.snag.left<=0){ f.snag=null; f.snagHold=0; $('#fight-msg').textContent='鱼出底了！'; }
    }

    // —— 洗鳃 QTE ——
    if(f.wash){
      f.wash.left -= dt;
      if(f.wash.left<=0){
        $('#btn-steady').classList.add('hidden');
        this.finish(false, '洗鳃脱钩！', '鱼跃出水面一个甩头，钩子直接弹飞了。' + (sp.behaviors.includes('teeth')?'（黑鱼牙口好，普通线更容易被磨断）':''));
        return;
      }
    }

    // —— 张力 / 体力 / 收线进度 ——
    let mult = 1 + S*0.75;
    if(f.dash) mult *= 2.1;
    if(f.snag) mult *= 1.55;
    if(tired) mult *= 0.45;

    if(this.holding){
      let dT = 24 + mult*8;
      if(f.snag) dT += 30;
      f.tension += dT*dt;
      f.stamina -= dt*(0.05+0.06*S)*(tired?0.3:1);
      f.progress += dt*0.14*(0.55+0.45*f.stamina)*(1.25-S*0.75)*(tired?1.7:1);
      f._reelT += dt;
      if(f._reelT > 0.09){ f._reelT=0; AudioSys.reel(); }
    } else {
      f.tension -= (40 + (100-f.tension)*0.2)*dt;
      f.stamina -= dt*(0.02+0.022*S);
      f.progress -= dt*(0.012*S)*(f.dash?3:1);
    }
    f.tension = clamp(f.tension, 0, 100);
    f.stamina = clamp(f.stamina, 0, 1);
    f.progress = clamp(f.progress, 0, 1);

    // —— 失败判定 ——
    if(f.tension > 90){
      f.redTime += dt;
      f._creakT += dt;
      if(f._creakT > 0.35){ f._creakT=0; AudioSys.creak(); $('#fight-msg').textContent='⚠ 线在响！快松手！'; }
      if(f.redTime > 1.5){
        AudioSys.snap();
        this.finish(false, '啪——断线了！',
          (f.dash?'大鱼冲刺时你还贪线，':'张力拉满没松手，')+'鱼线崩断，鱼和线组一起没了。张力到红线要立刻松手遛鱼！');
        return;
      }
    } else { f.redTime = Math.max(0, f.redTime - dt*0.6); }

    if(f.tension < 14 && !f.wash){
      f.slack += dt;
      if(f.slack > 4.5){
        this.finish(false, '脱钩跑了', '收线太松，鱼钩在鱼嘴里晃荡太久，松脱了。张力要保持在中区，别一直放着不管。');
        return;
      }
    } else { f.slack = Math.max(0, f.slack - dt*0.8); }

    if(f.snag && f.snagHold > 1.3){
      AudioSys.snap();
      this.finish(false, '挂底断线！', '鱼钻进水底障碍物，你硬拉硬拽，线挂在树根上崩断了。钻底时必须松线，遛它自己出来。');
      return;
    }

    if(f.progress >= 1 && this.phase==='fight'){
      this.phase = 'net'; f.netT = 0;
      $('#btn-reel').classList.add('hidden');
      $('#btn-net').classList.remove('hidden');
      $('#fight-title').textContent = '抄网！';
      $('#fight-msg').textContent = '';
    }
    this.render();
  },
  render(){
    const c = this.ctx, W = innerWidth, H = innerHeight, f = this.F;
    if(!f) return;
    const g = c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#1b4a5e'); g.addColorStop(1,'#081e2c');
    c.fillStyle = g; c.fillRect(0,0,W,H);
    for(let i=0;i<3;i++){
      c.save(); c.translate(W*(0.25+i*0.25),0); c.rotate(0.18);
      c.fillStyle = 'rgba(180,220,230,0.045)';
      c.fillRect(-40,0,80,H); c.restore();
    }
    const fishY = H*0.52 + Math.sin(f.t*2.2)*30 + (f.dash?Math.sin(f.t*9)*14:0);
    const fishX = W*(0.78 - f.progress*0.6) + Math.sin(f.t*3.1)*26*(1+f.fish.strength);
    const yy = f.snag ? Math.min(H*0.86, fishY*1.25) : fishY;
    const size = 60 + f.fish.weight*7 + f.fish.strength*50;
    c.save();
    c.translate(fishX, yy);
    c.rotate(Math.sin(f.t*2.6)*0.14*(1+f.fish.strength*0.6) + (f.dash?-0.2:0));
    c.scale(-1,1);
    drawFishArt(c, f.fish.species.id, size, f.t, {silhouette:true});
    c.restore();
    // 持竿人剪影（右下角，面朝左侧水面，张力越大竿压得越低）
    const fs = Math.min(W,H)/430*1.9;
    const fax = W, fay = H + 6;
    drawAngler.fightDrop = -(0.10 + f.tension/500);
    drawAngler(c, fax, fay, fs, f.t, 'fight', true, true);
    // 竿尖世界坐标（镜像：local x 取反；fight 时 rodDrop≈0.55 随张力增加）
    const rodDrop = drawAngler.fightDrop || 0.20;
    const cs = Math.cos(rodDrop), sn = Math.sin(rodDrop);
    const tipLx = 27 + 105*cs + 52*sn;   // 旋转后的竿尖 local x
    const tipLy = -17 + 105*sn - 52*cs;  // 旋转后的竿尖 local y
    const tipX = fax - tipLx*fs, tipY = fay + tipLy*fs;
    c.beginPath();
    c.moveTo(tipX, tipY);
    const sag = 8 + f.tension*0.9 + Math.sin(f.t*7)*f.tension*0.12;
    c.quadraticCurveTo((tipX+fishX)/2, Math.min(tipY,yy)+sag*0.4, fishX, yy);
    c.strokeStyle = `rgba(255,255,255,${0.35+f.tension/300})`;
    c.lineWidth = 1.5; c.stroke();
    $('#tension-fill').style.width = f.tension+'%';
    $('#tension-fill').style.background = f.tension>90 ? '#ff4040' : f.tension>65 ? '#ff9f40' : 'linear-gradient(90deg,#3ecf72,#e7d84a)';
    $('#stamina-fill').style.width = (f.stamina*100)+'%';
    if(this.phase==='net'){
      const ok = this.inGreen();
      const bar = $('#fight-msg');
      bar.textContent = ok ? '✅ 就是现在！点抄网！' : '它在挣扎……等它缓一下';
      bar.style.color = ok ? '#3ecf72' : '';
    }
  },
};

/* ================= 手柄 ================= */
const GamepadFx = {
  buzz(strength, ms){
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for(const gp of gps){
      if(gp && gp.connected){
        try{ gp.vibrationActuator?.playEffect('dual-rumble',{duration:ms,strongMagnitude:strength,weakMagnitude:strength*0.6}); }catch(e){}
        break;
      }
    }
  },
  padHold:false, padX:false, active:false,
  poll(){
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for(const g of gps){ if(g && g.connected){ gp = g; break; } }
    if(!gp){ this.active=false; return; }
    if(!this.active){
      if(gp.buttons.some(b=>b.pressed)){ this.active=true; toast('🎮 手柄已连接：A 收线·刺鱼 / X 稳住·抄网'); }
      else return;
    }
    const a = gp.buttons[0] && gp.buttons[0].pressed;
    const x = gp.buttons[2] && gp.buttons[2].pressed;
    if(Game.screen==='fight'){
      if(a !== this.padHold){ this.padHold=a; Fight.press(a); }
      if(x && !this.padX){
        this.padX = true;
        if(Fight.phase==='fight' && Fight.F && Fight.F.wash) Fight.onSteady();
        else if(Fight.phase==='net') Fight.onNet();
      }
      if(!x) this.padX = false;
      if(Fight.F && Fight.F.dash) this.buzz(0.8, 80);
    } else {
      if(a && !this.padHold){ this.padHold=true; Game.mainAction(); }
      if(!a) this.padHold=false;
    }
  },
};

/* ================= 渔获清单 ================= */
function renderLog(){
  const d = Store.load(), list = $('#log-list');
  list.innerHTML = '';
  const rows = FISH_SPECIES.map(sp => ({ sp, n:d.counts[sp.id]||0 })).sort((a,b)=>b.n-a.n);
  let total = 0;
  for(const {sp,n} of rows){
    total += n;
    const row = document.createElement('div');
    if(n>0){
      row.className = 'log-row r'+sp.rarity;
      row.innerHTML = '<span class="name">'+sp.name+' '+'★'.repeat(sp.rarity)+'</span><span class="cnt">× '+n+'</span>';
    } else {
      row.className = 'log-row unknown';
      row.innerHTML = '<span class="name">？？？</span><span class="cnt">—</span>';
    }
    list.appendChild(row);
  }
  if(total===0) list.innerHTML = '<div class="log-row unknown"><span>还没有渔获，去湖边抛一竿吧</span></div>';
}

/* ================= 主控 ================= */
const FLAVOR = {
  jiyu:'垂钓入门第一鱼', luofei:'力道不小，别看个头', huangsang:'背上三根刺，抓时小心',
  caoyu:'草食巨物，冲劲十足', lianyu:'滤食性，成群活动', yongyu:'大头胖墩，压秤担当',
  liyu:'鲤鱼打挺，出了名的能蹦', qiaozui:'路亚玩家的心头好', nianyu:'夜行底栖，须子灵敏',
  heiyu:'伏击猎手，牙口锋利', guiyu:'桃花流水鳜鱼肥', qingyu:'湖中巨物，钓到能吹一年',
};

const Game = {
  screen:'lake',
  last:0, animT:0, catchRaf:null,
  init(){
    Lake.init(); Fight.init();
    $('#btn-cast').addEventListener('click', ()=>this.mainAction());
    $('#btn-catch-ok').addEventListener('click', ()=>{ hidePopup('#popup-catch'); cancelAnimationFrame(this.catchRaf); });
    $('#btn-lost-ok').addEventListener('click', ()=>hidePopup('#popup-lost'));
    $('#btn-log').addEventListener('click', ()=>{ renderLog(); showPopup('#panel-log'); });
    $('#btn-log-close').addEventListener('click', ()=>hidePopup('#panel-log'));
    $('#btn-help').addEventListener('click', ()=>showPopup('#panel-help'));
    $('#btn-help-close').addEventListener('click', ()=>hidePopup('#panel-help'));
    if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
    requestAnimationFrame(t=>this.loop(t));
  },
  mainAction(){
    AudioSys.unlock();
    if(this.screen==='lake'){
      if(Lake.state==='idle' && Lake.spot){ Lake.cast(); }
      else if(Lake.state==='waiting'){ Lake.strike(); }
      else if(Lake.state==='biting'){ this.hookup(); }
    }
  },
  hookup(){
    const fish = Lake.hookedFish;
    Lake.state='idle'; Lake.bobber=null;
    this.screen='fight';
    Fight.start(fish);
  },
  onCaught(fish){
    this.screen='lake';
    const isNew = Store.add(fish);
    AudioSys.win();
    $('#catch-new').classList.toggle('hidden', !isNew);
    $('#catch-name').innerHTML = fish.species.name+' <span class="stars">'+RARITY_INFO[fish.species.rarity].stars+'</span>';
    $('#catch-name').style.color = RARITY_INFO[fish.species.rarity].color;
    $('#catch-weight').textContent = fish.weight+' kg'+(fish.weight>=8?' 🏆 巨物！':fish.weight>=3?' 大鱼！':'');
    $('#catch-flavor').textContent = FLAVOR[fish.species.id]||'';
    showPopup('#popup-catch');
    const cv = $('#catch-canvas');
    const anim = ()=>{
      if($('#popup-catch').classList.contains('hidden')) return;
      renderCatchCanvas(cv, fish.species.id, performance.now()/1000);
      this.catchRaf = requestAnimationFrame(anim);
    };
    cancelAnimationFrame(this.catchRaf);
    anim();
  },
  showLost(title, desc){
    this.screen='lake';
    AudioSys.lose();
    $('#lost-title').textContent = title;
    $('#lost-desc').textContent = desc||'';
    showPopup('#popup-lost');
  },
  loop(t){
    const dt = Math.min(0.05, (t-this.last)/1000 || 0.016);
    this.last = t; this.animT = t/1000;
    GamepadFx.poll();
    if(this.screen==='lake'){
      Lake.draw(this.animT);
      if(Lake.state==='waiting') Lake.update(dt);
      if(Lake.state==='biting') Lake.updateBiting(dt);
    } else {
      Fight.update(dt);
    }
    requestAnimationFrame(tt=>this.loop(tt));
  },
};

Game.init();

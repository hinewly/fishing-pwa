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

/* ================= 背景轻音乐（3种风格可选·WebAudio合成·零素材） ================= */
const AmbientMusic = (() => {
  let ac=null, master=null, playing=false, loopTimer=null;
  let trackIdx = parseInt(localStorage.getItem('fishing_music_track')||'0')||0;

  // —— 音符频率表 ——
  const F = {
    // C大调（八音盒）
    C3:130.81, F3:174.61, G3:196.00, A3:220.00,
    C4:261.63, D4:293.66, E4:329.63, G4:392.00, A4:440.00,
    C5:523.25, D5:587.33, E5:659.25, G5:784.00,
    // D大调（古筝）
    D4g:293.66, E4g:329.63, Fs4:369.99, A4g:440.00, B4g:493.88,
    D5g:587.33, E5g:659.25, Fs5:739.99, A5g:880.00, B5g:987.77,
    D3g:146.83, B3g:246.94, G3g:196.00,
    // G大调（口哨）
    G4w:392.00, A4w:440.00, B4w:493.88, D5w:587.33, E5w:659.25, G5w:784.00, A5w:880.00, B5w:987.77, D6w:1174.7,
    G3w:196.00, C4w:261.63, E4w:329.63, D4w:293.66,
  };

  // —— 三种曲目的完整编曲 ——
  const TRACKS = [
  {
    name:'🎵 八音盒', icon:'🎵', bpm:72, total:32,
    // [拍位, 频率, 时值拍, 音量]
    melody: [
      [0,  F.E4, 1, .12], [1, F.G4, 1, .12], [2, F.A4, 1.5, .13], [3.5, F.G4, .5, .10],
      [4,  F.E4, 1, .11], [5, F.D4, 1, .11], [6, F.C4, 2, .12],
      [8,  F.D4, 1, .10], [9, F.E4, 1, .11], [10, F.G4, 1.5, .13], [11.5, F.E4, .5, .10],
      [12, F.D4, 1, .10], [13, F.C4, 1, .11], [14, F.A3, 2, .12],
      [16, F.E4, 1, .11], [17, F.G4, 1, .12], [18, F.A4, 1, .12], [19, F.C5, 1, .14],
      [20, F.A4, 1, .12], [21, F.G4, 1, .12], [22, F.E4, 2, .11],
      [24, F.G4, 1, .11], [25, F.E4, 1, .10], [26, F.D4, 1, .10], [27, F.C4, 1, .11],
      [28, F.C5, .5, .09], [28.5, F.A4, .5, .09], [29, F.G4, .5, .09], [29.5, F.E4, .5, .08],
      [30, F.C4, 2, .12],
    ],
    bass: [
      [0,F.C3],[4,F.A3],[8,F.F3],[12,F.G3],
      [16,F.C3],[20,F.A3],[24,F.F3],[28,F.G3],
    ],
    arp: [
      [.5,F.G4],[1.5,F.E4],[2.5,F.G4],[3.5,F.E4],
      [4.5,F.G4],[5.5,F.E4],[6.5,F.G4],[7.5,F.E4],
      [8.5,F.A4],[9.5,F.E4],[10.5,F.A4],[11.5,F.E4],
      [12.5,F.A4],[13.5,F.C4],[14.5,F.A4],[15.5,F.C4],
      [16.5,F.G4],[17.5,F.E4],[18.5,F.G4],[19.5,F.C5],
      [20.5,F.G4],[21.5,F.E4],[22.5,F.G4],[23.5,F.E4],
      [24.5,F.A4],[25.5,F.E4],[26.5,F.D4],[27.5,F.E4],
      [28.5,F.G4],[29.5,F.E4],[30.5,F.G4],[31.5,F.E4],
    ],
  },
  {
    name:'🍃 古筝', icon:'🍃', bpm:60, total:32,
    // D大调五声（D E F# A B），慢速优雅
    melody: [
      [0,  F.D5g, 1, .10], [1, F.E5g, 1, .10], [2, F.Fs5, 2, .12],
      [4,  F.A5g, 1, .11], [5, F.Fs5, 1, .10], [6, F.E5g, 2, .11],
      [8,  F.Fs5, 1, .10], [9, F.E5g, 1, .10], [10, F.D5g, 1, .11], [11, F.E5g, 1, .10],
      [12, F.Fs5, 1, .11], [13, F.A5g, 1, .12], [14, F.B5g, 2, .13],
      [16, F.B5g, 1, .11], [17, F.A5g, 1, .11], [18, F.Fs5, 1, .10], [19, F.E5g, 1, .10],
      [20, F.D5g, 2, .12],
      [24, F.E5g, 1, .10], [25, F.Fs5, 1, .11], [26, F.E5g, 1, .10], [27, F.D5g, 1, .10],
      [28, F.B4g, 1, .09], [29, F.A4g, 1, .10], [30, F.D5g, 2, .12],
    ],
    bass: [
      [0,F.D3g],[4,F.B3g],[8,F.G3g],[12,F.A4g],
      [16,F.D3g],[20,F.B3g],[24,F.G3g],[28,F.A4g],
    ],
    arp: [
      [.5,F.A4g],[1.5,F.Fs5],[2.5,F.A4g],[3.5,F.Fs5],
      [4.5,F.A4g],[5.5,F.D5g],[6.5,F.A4g],[7.5,F.Fs5],
      [8.5,F.B4g],[9.5,F.Fs5],[10.5,F.B4g],[11.5,F.Fs5],
      [12.5,F.B4g],[13.5,F.E5g],[14.5,F.B4g],[15.5,F.E5g],
      [16.5,F.A4g],[17.5,F.Fs5],[18.5,F.A4g],[19.5,F.D5g],
      [20.5,F.A4g],[21.5,F.Fs5],[22.5,F.A4g],[23.5,F.Fs5],
      [24.5,F.B4g],[25.5,F.E5g],[26.5,F.B4g],[27.5,F.E5g],
      [28.5,F.A4g],[29.5,F.D5g],[30.5,F.A4g],[31.5,F.D5g],
    ],
  },
  {
    name:'🌊 口哨', icon:'🌊', bpm:84, total:32,
    // G大调五声（G A B D E），轻快活泼
    melody: [
      [0,  F.G4w, .5, .10], [.5, F.A4w, .5, .10], [1, F.B4w, 1, .12], [2, F.D5w, 1.5, .13],
      [3.5, F.B4w, .5, .10], [4, F.G4w, 1, .11], [5, F.A4w, 1, .10], [6, F.B4w, 2, .11],
      [8,  F.D5w, 1, .12], [9, F.E5w, 1, .11], [10, F.G5w, 1.5, .13], [11.5, F.E5w, .5, .10],
      [12, F.D5w, 1, .11], [13, F.B4w, 1, .10], [14, F.A4w, 2, .11],
      [16, F.G5w, .5, .12], [16.5, F.E5w, .5, .11], [17, F.D5w, 1, .12], [18, F.B4w, 1, .11],
      [19, F.D5w, 1, .11], [20, F.E5w, 1, .12], [21, F.G5w, 2, .13],
      [24, F.A5w, .5, .11], [24.5, F.G5w, .5, .10], [25, F.E5w, .5, .10], [25.5, F.D5w, .5, .10],
      [26, F.B4w, .5, .10], [26.5, F.A4w, .5, .09], [27, F.G4w, 1, .11],
      [28, F.D5w, .5, .09], [28.5, F.E5w, .5, .09], [29, F.G5w, 1, .10], [30, F.G4w, 2, .11],
    ],
    bass: [
      [0,F.G3w],[4,F.E4w],[8,F.C4w],[12,F.D4w],
      [16,F.G3w],[20,F.E4w],[24,F.C4w],[28,F.D4w],
    ],
    arp: [
      [.5,F.B4w],[1.5,F.D5w],[2.5,F.B4w],[3.5,F.D5w],
      [4.5,F.G5w],[5.5,F.D5w],[6.5,F.B4w],[7.5,F.D5w],
      [8.5,F.C5w||523.25],[9.5,F.G5w],[10.5,F.C5w||523.25],[11.5,F.G5w],
      [12.5,F.D5w],[13.5,F.B4w],[14.5,F.D5w],[15.5,F.B4w],
      [16.5,F.B4w],[17.5,F.D5w],[18.5,F.G5w],[19.5,F.D5w],
      [20.5,F.E5w],[21.5,F.G5w],[22.5,F.E5w],[23.5,F.G5w],
      [24.5,F.C5w||523.25],[25.5,F.G5w],[26.5,F.E5w],[27.5,F.G5w],
      [28.5,F.D5w],[29.5,F.B4w],[30.5,F.D5w],[31.5,F.G4w],
    ],
  },
  ];

  function ensureCtx(){
    if(!ac){
      ac = new (window.AudioContext||window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
    }
    if(ac.state==='suspended') ac.resume();
  }
  // 音色：音乐盒（正弦+2倍频泛音）
  function pluckMusicbox(freq, dur, vol, t0){
    const o = ac.createOscillator(), g = ac.createGain();
    o.type='sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0+dur+0.05);
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type='sine'; o2.frequency.value=freq*2;
    g2.gain.setValueAtTime(vol*0.3,t0); g2.gain.exponentialRampToValueAtTime(0.001,t0+dur*0.5);
    o2.connect(g2).connect(master); o2.start(t0); o2.stop(t0+dur*0.5+0.05);
  }
  // 音色：古筝（锯齿+低通滤波，衰减稍长）
  function pluckGuzheng(freq, dur, vol, t0){
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type='sawtooth'; o.frequency.value=freq;
    f.type='lowpass'; f.frequency.value=freq*4; f.Q.value=1;
    g.gain.setValueAtTime(vol*0.8,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur*1.3);
    o.connect(f).connect(g).connect(master); o.start(t0); o.stop(t0+dur*1.3+0.05);
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type='sine'; o2.frequency.value=freq*2;
    g2.gain.setValueAtTime(vol*0.2,t0); g2.gain.exponentialRampToValueAtTime(0.001,t0+dur*0.6);
    o2.connect(g2).connect(master); o2.start(t0); o2.stop(t0+dur*0.6+0.05);
  }
  // 音色：口哨（三角波+颤音LFO）
  function pluckWhistle(freq, dur, vol, t0){
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type='triangle'; o.frequency.value=freq;
    lfo.type='sine'; lfo.frequency.value=5.5; lg.gain.value=freq*0.015;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.001,t0);
    g.gain.linearRampToValueAtTime(vol,t0+0.04);
    g.gain.setValueAtTime(vol,t0+dur*0.55);
    g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0+dur+0.05);
    lfo.start(t0); lfo.stop(t0+dur+0.05);
  }
  function pluck(freq, dur, vol, t0, timbre){
    try{
      if(timbre==='guzheng') pluckGuzheng(freq,dur,vol,t0);
      else if(timbre==='whistle') pluckWhistle(freq,dur,vol,t0);
      else pluckMusicbox(freq,dur,vol,t0);
    }catch(e){}
  }
  function playLoop(t0, track){
    const spb = 60/track.bpm;
    const timbre = track.name.includes('古筝')?'guzheng':track.name.includes('口哨')?'whistle':'musicbox';
    for(const [beat,freq,dur,vol] of track.melody) pluck(freq, dur*spb*1.8, vol, t0+beat*spb, timbre);
    for(const [beat,freq] of track.bass){
      try{
        const when=t0+beat*spb;
        const o=ac.createOscillator(), g=ac.createGain();
        o.type='triangle'; o.frequency.value=freq;
        g.gain.setValueAtTime(0.07,when); g.gain.exponentialRampToValueAtTime(0.001,when+spb*3);
        o.connect(g).connect(master); o.start(when); o.stop(when+spb*3+0.1);
      }catch(e){}
    }
    for(const [beat,freq] of track.arp) pluck(freq, spb*1.2, 0.035, t0+beat*spb, timbre);
  }
  function scheduleLoop(){
    if(!playing||!ac) return;
    const track = TRACKS[trackIdx % TRACKS.length];
    playLoop(ac.currentTime+0.1, track);
    loopTimer = setTimeout(scheduleLoop, track.total*(60/track.bpm)*1000 - 200);
  }
  return {
    toggle(){
      if(playing){ this.stop(); return false; }
      ensureCtx(); playing=true; scheduleLoop(); return true;
    },
    setTrack(idx){
      trackIdx = idx % TRACKS.length;
      localStorage.setItem('fishing_music_track', String(trackIdx));
      if(playing){ // 切曲时重新开始
        if(loopTimer){ clearTimeout(loopTimer); loopTimer=null; }
        scheduleLoop();
      }
    },
    get trackIndex(){ return trackIdx; },
    get tracks(){ return TRACKS.map(t=>({name:t.name, icon:t.icon})); },
    stop(){
      playing=false;
      if(loopTimer){ clearTimeout(loopTimer); loopTimer=null; }
      if(ac){ ac.close().catch(()=>{}); ac=null; master=null; }
    },
    get playing(){ return playing; }
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
    d.records = d.records || [];
    d.records.push({ s: fish.species.id, w: fish.weight, t: Date.now() });
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
  const k = (mode==='cast' || mode==='stand') ? (drawAngler.standK ?? 0) : 0;   // 0=坐 1=站
  const lean = mode==='cast'
    ? (drawAngler.castLean ?? 0)
    : mode==='stand' ? 0.05 + Math.sin(t*1.2)*0.015
    : mode==='bite' ? 0.10 : 0.05 + Math.sin(t*1.2)*0.015;
  const lerp = (a,b)=>a+(b-a)*k;
  const hipY = -26 - k*14;          // 站起时臀部真正离开凳面
  const gripY = -17 - k*14;         // 握竿点随身体抬高

  // 凳子（站姿时不画，避免遮挡脚部）
  if(k < 0.05){
    c.fillStyle = silhouette ? C.boot : '#6e5638';
    c.fillRect(-14, -24, 26, 4);
    c.fillRect(-12, -20, 3, 20); c.fillRect(7, -20, 3, 20);
  }

  // 后腿（远侧，先画）：坐姿屈膝 ↔ 站姿伸直
  c.strokeStyle = C.pants; c.lineWidth = 8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(2, hipY);
  c.quadraticCurveTo(lerp(16,5), lerp(-22,-16), lerp(18,3), lerp(-10,-2)); c.stroke();
  c.fillStyle = C.boot;
  c.beginPath(); c.ellipse(lerp(19,4), lerp(-4,-1), 8, 3.5, 0, 0, Math.PI*2); c.fill();

  // 躯干（前倾）
  c.save(); c.translate(2, hipY); c.rotate(lean);
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
  c.beginPath(); c.moveTo(2, hipY); c.quadraticCurveTo(14, hipY+8, 26, gripY+1); c.stroke();
  c.restore();

  // 前腿
  c.strokeStyle = C.pants; c.lineWidth = 8.5;
  c.beginPath(); c.moveTo(4, hipY);
  c.quadraticCurveTo(lerp(22,13), lerp(-26,-16), lerp(30,11), lerp(-12,-2)); c.stroke();
  c.fillStyle = C.boot;
  c.beginPath(); c.ellipse(lerp(33,13), lerp(-4,-1), 9, 3.8, 0, 0, Math.PI*2); c.fill();

  // 前臂（握竿中部）
  const shY = hipY - 26 + lean*26;
  c.strokeStyle = C.skin; c.lineWidth = 5.5;
  c.beginPath(); c.moveTo(10, shY+4); c.quadraticCurveTo(22, shY+10, 30, -18); c.stroke();

  // 鱼竿：以握点为轴，bite 时下拉
  const rodDrop = mode==='cast' ? (drawAngler.castDrop ?? 0.02)
    : mode==='stand' ? 0.02 + Math.sin(t*1.5)*0.012
    : mode==='bite' ? 0.35 + Math.sin(t*18)*0.03
    : (mode==='fight' ? (drawAngler.fightDrop ?? 0.20) : 0.02 + Math.sin(t*1.5)*0.012);
  c.save(); c.translate(27, gripY); c.rotate(rodDrop);
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
  c.beginPath(); c.arc(27, gripY, 3.4, 0, Math.PI*2); c.fill();
  c.beginPath(); c.arc(42, gripY-5, 3.2, 0, Math.PI*2); c.fill();
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
  // 钓鱼人（v0.7.6：路亚收线时沿岸缓步走动）
  const walking = lake.mode==='lure' && lake.state==='retrieving';
  const walkX = walking ? Math.sin(performance.now()/1000 * 0.4) * W*0.045 : 0;
  const ax = W*0.115 + walkX, ay = H*0.905;
  let mode = lake.state==='biting' ? 'bite' : 'idle';
  if(lake.state==='casting' && lake.castAnim){
    // v0.7.3 抛竿三段：起身后摆 → 挥竿前甩 → 收竿坐回
    const T = lake.castAnim.t;
    if(T < 0.45){ const q = T/0.45; drawAngler.standK = Math.sin(q*Math.PI/2); drawAngler.castDrop = 0.02 - q*1.0; drawAngler.castLean = -0.16*Math.sin(q*Math.PI/2); }
    else if(T < 0.62){ const q = (T-0.45)/0.17; drawAngler.standK = 1; drawAngler.castDrop = -0.98 + q*1.33; drawAngler.castLean = -0.16 + q*0.32; }
    else if(T < 1.12){ drawAngler.standK = 1; drawAngler.castDrop = 0.35; drawAngler.castLean = 0.16 - Math.min(1,(T-0.62)/0.5)*0.16; }
    else { const q = Math.min(1,(T-1.12)/0.28); drawAngler.standK = 1-Math.sin(q*Math.PI/2); drawAngler.castDrop = 0.35 - q*0.33; drawAngler.castLean = 0; }
    mode = 'cast';
  }
  if(lake.mode==='lure' && lake.state==='retrieving'){ mode='stand'; drawAngler.standK = 1; }
  else if(mode!=='cast') drawAngler.standK = 0;
  drawAngler(c, ax, ay, Math.min(W,H)/430*1.15, t, mode, false);
  // 竿稍坐标（与 drawAngler 内部几何一致：握点(27,-17) rotate(rodDrop) 竿尖(105,-52)）
  const s = Math.min(W,H)/430*1.15;
  const rodDrop = mode==='cast' ? (drawAngler.castDrop ?? 0.02) : mode==='bite' ? 0.35 : 0.02;
  const standK = drawAngler.standK ?? 0;
  const hx2 = W*0.115 + walkX + 27*s;
  const hx = hx2, hy = ay - (17 + standK*14)*s;
  const dx = 105*Math.cos(rodDrop) + 52*Math.sin(rodDrop);
  const dy = -(105*Math.sin(rodDrop)) + (-52)*Math.cos(rodDrop) + 2*Math.cos(rodDrop);
  return { tipX: hx + dx*s, tipY: hy + dy*s };
}

/* ================= 湖面场景 ================= */
const SPOTS = [
  { id:'shallow', name:'浅滩',   diff:1, stars:1, x:.22, y:.52, tip:'小鱼池：全是2斤内的小鱼，提竿就上' },
  { id:'weed',    name:'水草区', diff:2, stars:2, x:.80, y:.58, tip:'猛鱼池：3斤+黑鱼鳜鱼出没，得会遛鱼' },
  { id:'deep',    name:'深水区', diff:3, stars:3, x:.52, y:.42, tip:'巨物池：4斤起步能上几十斤，最考验遛鱼' },
];

const Lake = {
  canvas:null, ctx:null, spot:null, mode:'tai',
  state:'idle', // idle | waiting | biting | retrieving | attack
  bobber:null, waitTimer:0, biteAt:0, fakes:[], biteT:0, biteWin:1.2, hookedFish:null,
  // 漂相（目）：offset>0 下顿 / <0 送漂；静止露5目
  biteKind:'dun', floatOffset:0, floatTarget:0, floatAnimT:0, fakeT:-1,
  // 路亚
  retProg:0, holding:false, nextAttack:0, attackT:0, attackWin:0.55, _reelT:0,
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
  setMode(m){
    if(this.mode===m) return;
    this.mode = m; this.reset();
    $('#btn-mode-tai').classList.toggle('active', m==='tai');
    $('#btn-mode-lure').classList.toggle('active', m==='lure');
    $('#lake-tip').textContent = m==='tai'
      ? '台钓：静止露5目，吞2目以上再提竿（左下角放大镜看漂）'
      : '路亚：抛投后按住收线，停顿+轻点更诱鱼，炸水花马上扬竿！';
  },
  cast(){
    if(this.state==='casting') return;
    AudioSys.unlock();
    // v0.7.3 抛竿动画：先演完"起身挥竿飞漂落水"，再进等口
    this.state = 'casting';
    this.castAnim = { t: 0, launched: false, landedAt: null, from: null, to: null };
    this.bobber = null;
    $('#btn-cast').classList.remove('pulse');
    $('#btn-cast').disabled = true;
    $('#btn-cast').textContent = '抛竿中…';
    $('#lake-tip').textContent = '抛竿～';
  },
  finishCast(){
    const btn = $('#btn-cast'); btn.disabled = false;
    this.bobber = { t:0 };
    AudioSys.splash();
    if(this.mode==='tai'){
      this.state='waiting'; this.waitTimer=0;
      this.floatOffset=0; this.fakeT=-1; this.biteKind = Math.random()<0.25?'song':'dun';
      if(!localStorage.getItem('fishing_tut_tai')){
        localStorage.setItem('fishing_tut_tai','1');
        toast('口诀：漂尾露5目，假口顿1目别理，吞2目以上/黑漂/送漂马上提竿！', 4200);
      }
      const diff = this.spot.diff||2;
      this.biteAt = diff===1 ? rand(2.5,6.5) : diff===3 ? rand(4,10) : rand(3.5,9);
      this.fakes = [];
      const n = diff===1 ? (Math.random()<0.6?0:1) : diff===3 ? (Math.random()<0.5?1:2) : (Math.random()<0.55?0:1);
      for(let i=0;i<n;i++) this.fakes.push(rand(1.5, Math.max(2, this.biteAt-1)));
      this.fakes.sort((a,b)=>a-b);
      btn.textContent = '刺鱼！';
      $('#lake-tip').textContent = '等口……看漂：顿1目是假口，吞2目以上再提！';
    } else {
      this.state='retrieving'; this.retProg=0; this.holding=false;
      this.hookedFish = rollFish(this.spot, 'lure');
      const ldiff = this.spot.diff||2;
      this.nextAttack = ldiff===1 ? rand(1,2.5) : ldiff===3 ? rand(2,4.5) : rand(1.2,3.5);
      this.attackWin = ldiff===1 ? 0.8 : ldiff===3 ? 0.55 : 0.7;
      btn.textContent = '⚡ 加速收线';
      $('#lake-tip').textContent = '假饵在游……按住加速收线，水花炸了马上扬竿！';
    }
  },
  strikeValid(){
    return this.biteKind==='song' ? this.floatOffset <= -1.8 : this.floatOffset >= 2;
  },
  strike(){ // 台钓：waiting 中点 = 提竿（没口就收竿重抛）
    if(this.state!=='waiting') return;
    if(this.fakes.length && Math.abs(this.waitTimer - this.fakes[0]) < 0.5){
      AudioSys.lose();
      this.biteAt += rand(4,9);
      this.fakes = this.fakes.slice(1);
      toast('空竿惊窝了！那是假口，鱼群散开……');
      return;
    }
    toast('没有口……收竿重抛');
    this.reset();
  },
  earlyStrike(){ // 台钓：有动作但还没到死口就提
    AudioSys.lose();
    const d = Math.round(Math.abs(this.floatOffset)*10)/10;
    this.biteAt += rand(3,6);
    this.state='waiting';
    $('#btn-cast').classList.remove('pulse');
    toast(`空竿惊窝！才${this.biteKind==='song'?'送':'吞'}${d}目，还没吃死口……`, 2200);
  },
  twitch(){ // 路亚轻点抽停
    this.nextAttack -= rand(0.5,1.1);
    AudioSys.splash();
  },
  reset(){
    this.state='idle'; this.bobber=null;
    this.floatOffset=0; this.fakeT=-1; this.retProg=0; this.holding=false;
    $('#btn-cast').classList.remove('pulse');
    const b=$('#btn-cast'); b.textContent='🎣 抛竿'; b.disabled=false;
    $('#lake-tip').textContent = this.spot ? `钓位：${this.spot.name} —— 点击湖面可换位` : '点击湖面选择钓位，然后抛竿';
  },
  hookupNow(){
    this.state='idle'; this.bobber=null;
    $('#btn-cast').classList.remove('pulse');
    Game.hookup();
  },
  update(dt){
    // —— 抛竿动画时间轴 ——
    if(this.state==='casting'){
      const a = this.castAnim;
      a.t += dt;
      const W = innerWidth, H = innerHeight;
      if(!a.launched && a.t >= 0.62){
        // 挥竿到位：漂从竿稍飞出（抛物线）
        a.launched = true; a.launchT = a.t;
        const s = Math.min(W,H)/430*1.15, ax = W*0.115, ay = H*0.905;
        const rd = 0.35;
        const dx = 105*Math.cos(rd) + 52*Math.sin(rd);
        const dy = -(105*Math.sin(rd)) - 52*Math.cos(rd) + 2*Math.cos(rd);
        a.from = { x: ax + 27*s + dx*s, y: ay - 17*s + dy*s };
        a.to = { x: this.spot.x*W, y: this.spot.y*H };
        AudioSys.tick();
      }
      if(a.launched && a.landedAt === null && a.t >= 0.62 + 0.5){
        a.landedAt = a.t;   // 漂落水
        AudioSys.splash();
      }
      if(a.t >= 1.4){ this.finishCast(); }
      return;
    }
    // —— 台钓等口 ——
    if(this.state==='waiting'){
      this.waitTimer += dt;
      if(this.fakes.length && this.waitTimer >= this.fakes[0]){
        this.fakes.shift(); this.fakeT = 0; AudioSys.dip();
        toast('漂子顿了一下……像假口', 900);
      }
      if(this.fakeT>=0){
        this.fakeT += dt;
        this.floatOffset = Math.sin(Math.min(1,this.fakeT/0.5)*Math.PI)*1.3;
        if(this.fakeT>0.5){ this.fakeT=-1; this.floatOffset=0; }
      }
      if(this.waitTimer >= this.biteAt){
        this.state='biting'; this.biteT=0; this.floatAnimT=0;
        this.hookedFish = rollFish(this.spot, 'tai');
        const S = this.hookedFish.strength;
        const diff = this.hookedFish.diff||2;
        const base = diff===1 ? 2.6 : diff===3 ? 1.4 : 1.9;
        this.biteWin = clamp(base - S*0.35, 1.1, base);
        if(this.biteKind==='song'){ this.floatTarget = -2.5; }                        // 送漂
        else if(S > (diff===1 ? 0.9 : 0.72)){ this.floatTarget = 7; }                 // 黑漂（简单级罕见）
        else { this.floatTarget = 2.5 + S*2; }                                        // 顿口
        AudioSys.bite();
        $('#lake-tip').textContent = this.biteKind==='song' ? '❗ 送漂！往上顶了——快提！' : '❗ 顿口！漂下猛了——快提！';
      }
      return;
    }
    // —— 台钓真口窗口 ——
    if(this.state==='biting'){
      this.biteT += dt; this.floatAnimT += dt;
      const pr = Math.min(1, this.floatAnimT/0.4);
      this.floatOffset = this.floatTarget * (1-Math.pow(1-pr,2));
      if(this.strikeValid()){ $('#btn-cast').classList.add('pulse'); }
      if(this.biteT > this.biteWin){
        AudioSys.lose();
        $('#btn-cast').classList.remove('pulse');
        Game.showLost('吐钩跑了', this.hookedFish.strength>0.6 ? '大鱼试探了两口，你慢了半拍，它吐钩而去。' : '提慢了，鱼把饵吐了。到口的瞬间就提，别犹豫。');
        this.reset();
      }
      return;
    }
    // —— 路亚收线（v0.7.6：持续收线+动态路径+自动诱鱼）——
    if(this.state==='retrieving'){
      // 永远在收线：不按=慢收（假饵慢慢游），按住=快收
      const reelSpeed = this.holding ? 0.22 : 0.07;
      this.retProg += dt * reelSpeed;
      // 不按的时候鱼也照样追（诱鱼效果），按住收得快反而刺激攻击
      this.nextAttack -= dt * (this.holding ? 1.2 : 0.8);
      this._reelT += dt;
      if(this._reelT > (this.holding?0.14:0.35)){ this._reelT=0; AudioSys.reel(); }
      if(this.nextAttack <= 0){
        this.state='attack'; this.attackT=0;
        $('#btn-cast').textContent = '扬竿！';
        $('#btn-cast').classList.add('pulse');
        $('#lake-tip').textContent = '❗❗ 炸水花了——马上扬竿！';
        AudioSys.dash(); AudioSys.splash();
        GamepadFx.buzz(0.9, 350);
        return;
      }
      if(this.retProg >= 1){
        toast('假饵收回来了，再抛一竿');
        this.reset();
      }
      return;
    }
    // —— 路亚攻击窗口 ——
    if(this.state==='attack'){
      this.attackT += dt;
      if(this.attackT > this.attackWin){
        this.reset();
        toast('晚了！鱼吐了假饵……下次水花一响马上扬竿', 2400);
      }
    }
  },
  draw(t){
    const c = this.ctx, W = innerWidth, H = innerHeight;
    const sky = c.createLinearGradient(0,0,0,H*0.35);
    sky.addColorStop(0,'#ffd9a0'); sky.addColorStop(1,'#ffb27a');
    c.fillStyle = sky; c.fillRect(0,0,W,H*0.35);
    c.beginPath(); c.arc(W*0.78, H*0.13, 36, 0, Math.PI*2);
    c.fillStyle = 'rgba(255,240,200,0.9)'; c.fill();
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
      // v0.7.5 名牌：放回钓点上方，高到不挡「露5目」和漂
      c.font = '700 14px sans-serif'; c.textAlign='center';
      const nw = Math.max(c.measureText(s.name).width, 56) + 22;
      c.fillStyle = sel ? 'rgba(14,34,46,0.88)' : 'rgba(8,22,32,0.55)';
      c.beginPath(); c.roundRect(sx-nw/2, sy-132, nw, 44, 12); c.fill();
      c.strokeStyle = sel ? '#ffd250' : 'rgba(255,255,255,0.35)';
      c.lineWidth = sel ? 2 : 1; c.stroke();
      c.fillStyle = sel ? '#ffd250' : 'rgba(255,255,255,0.88)';
      c.fillText(s.name, sx, sy-114);
      c.font = '600 13px sans-serif';
      c.fillStyle = '#ffd250';
      c.fillText('★'.repeat(s.stars), sx, sy-97);
      if(sel){
        for(let i=0;i<3;i++){
          const fx = sx + Math.sin(t*0.7+i*2.1)*46;
          c.beginPath(); c.ellipse(fx, sy+28+i*10, 14-i*2, 5, Math.sin(t+i)*0.2, 0, Math.PI*2);
          c.fillStyle = 'rgba(20,30,36,0.35)'; c.fill();
        }
      }
    }
    // —— 台钓：真实立漂（细长分节）——
    let tip = null;
    if(this.bobber && this.spot && this.mode==='tai'){
      const s = this.spot;
      const bx = s.x*W + Math.sin(t*0.8)*4;
      const by = s.y*H;
      const sink = this.floatOffset*3.2;      // 下顿 px（负值=送漂上浮）
      const fy = by - 16 + sink;
      const segH = 7, segW = 5.5, segN = 7;
      const visibleM = clamp(Math.round(5 - this.floatOffset), 0, 7);
      // 漂脚（水下，暗）
      c.strokeStyle = 'rgba(30,60,50,0.75)'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(bx, fy+30); c.lineTo(bx, fy+52); c.stroke();
      // 漂身（枣核红，带描边）
      c.beginPath(); c.ellipse(bx, fy+22, 5.5, 10, 0, 0, Math.PI*2);
      c.fillStyle = '#e0432c'; c.fill();
      c.strokeStyle = 'rgba(40,10,5,0.55)'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.ellipse(bx-1.5, fy+19, 2, 5, 0, 0, Math.PI*2);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
      // 漂尾：7 目红黄相间，水面以上鲜亮、以下变暗
      for(let i=0;i<segN;i++){
        const y = fy + 14 - (i+1)*segH;   // 从漂身往上数
        const above = (7-i) <= visibleM;
        c.fillStyle = i%2===0
          ? (above ? '#ff3b30' : 'rgba(90,30,25,0.5)')
          : (above ? '#ffd250' : 'rgba(100,85,35,0.5)');
        c.fillRect(bx-segW/2, y, segW, segH-1);
        c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = 0.8;
        c.strokeRect(bx-segW/2, y, segW, segH-1);
      }
      // 顶帽
      c.fillStyle = '#ff3b30';
      c.fillRect(bx-segW/2-0.6, fy+14-segN*segH-2, segW+1.2, 2.4);
      // 水纹
      c.beginPath(); c.ellipse(bx, by, 18, 5, 0, 0, Math.PI*2);
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.stroke();
      if(this.state==='biting'){
        for(let i=0;i<2;i++){
          c.beginPath(); c.ellipse(bx, by, 26+this.biteT*26+i*10, 8+this.biteT*8+i*3, 0, 0, Math.PI*2);
          c.strokeStyle = `rgba(255,255,255,${0.5-i*0.2})`; c.stroke();
        }
      }
      // —— 露目小牌 ——
      const strike = this.state==='biting' && this.strikeValid();
      const tag = strike ? (this.biteKind==='song'?'送漂！提竿！':'顿口！提竿！') : '露'+visibleM+'目';
      c.font = '700 13px sans-serif'; c.textAlign = 'center';
      const tw = c.measureText(tag).width + 14;
      const ty = fy + 14 - segN*segH - 14;
      c.fillStyle = strike ? 'rgba(255,80,40,0.92)' : 'rgba(8,22,32,0.78)';
      c.beginPath(); c.roundRect(bx-tw/2, ty-13, tw, 19, 9); c.fill();
      if(strike){ c.strokeStyle = '#ffd250'; c.lineWidth = 1.6; c.stroke(); }
      c.fillStyle = strike ? '#fff' : '#ffd250';
      c.fillText(tag, bx, ty);
    }
    // —— 路亚：假饵蛇形游动 + 尾迹（v0.7.6 动态路径）——
    if(this.bobber && this.spot && this.mode==='lure'){
      const s = this.spot;
      const ax = W*0.19, ay = s.y*H + 40;
      const p = this.state==='attack' ? Math.min(1, this.retProg+0.05) : this.retProg;
      // 蛇形路径：左右摆动幅度大，像真饵在游
      const wiggle = Math.sin(p*14 + t*4) * 38;
      const depth = Math.sin(p*8 + t*2) * 14;
      const lx = s.x*W + (ax - s.x*W)*p + wiggle*(1-p*0.5);
      const ly = s.y*H + depth*(1-p);
      // 收线水花尾迹（V字型）
      for(let i=1;i<=6;i++){
        const wx = lx + i*11*(1+Math.sin(t*8+i)*0.2);
        c.beginPath(); c.ellipse(wx, ly + Math.sin(t*6+i*1.3)*3, 8-i, 2.5-i*0.3, 0, 0, Math.PI*2);
        c.strokeStyle = `rgba(255,255,255,${0.4-i*0.06})`; c.lineWidth = 1.2; c.stroke();
      }
      if(this.state==='attack'){
        const at = this.attackT;
        for(let i=0;i<3;i++){
          c.beginPath(); c.ellipse(lx, ly, 14+at*60+i*12, (14+at*60+i*12)*0.32, 0, 0, Math.PI*2);
          c.strokeStyle = `rgba(255,255,255,${0.6-at*0.9})`; c.lineWidth = 2; c.stroke();
        }
        c.fillStyle = '#ffd250'; c.font = '700 26px sans-serif'; c.textAlign='center';
        c.fillText('！', lx, ly - 24 - Math.sin(t*10)*3);
      } else {
        c.beginPath(); c.ellipse(lx, ly, 4, 2.2, 0, 0, Math.PI*2);
        c.fillStyle = '#ffd250'; c.fill();
      }
    }
    // —— 岸坡 + 钓鱼人 + 竿线 ——
    tip = drawShoreAngler(c, W, H, t, this);
    // —— 抛竿动画：飞行漂 + 线 + 落水涟漪 ——
    if(this.state==='casting' && this.castAnim){
      const a = this.castAnim;
      if(a.launched && !a.landedAt){
        const q = Math.min(1, (a.t - a.launchT)/0.5);
        const fx = a.from.x + (a.to.x - a.from.x)*q;
        const fy = a.from.y + (a.to.y - a.from.y)*q - Math.sin(q*Math.PI)*H*0.16;
        if(tip){
          c.beginPath(); c.moveTo(tip.tipX, tip.tipY);
          c.quadraticCurveTo((tip.tipX+fx)/2, Math.min(tip.tipY,fy)+18, fx, fy);
          c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2; c.stroke();
        }
        c.beginPath(); c.arc(fx, fy, 4.5, 0, Math.PI*2);
        c.fillStyle = '#e0432c'; c.fill();
        c.beginPath(); c.arc(fx, fy-3, 3, 0, Math.PI*2);
        c.fillStyle = '#f2ead2'; c.fill();
      }
      if(a.landedAt !== null){
        const lt = a.t - a.landedAt;
        for(let i=0;i<3;i++){
          c.beginPath(); c.ellipse(a.to.x, a.to.y, 10+lt*44+i*9, (10+lt*44+i*9)*0.32, 0, 0, Math.PI*2);
          c.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.5 - lt*0.9 - i*0.12)})`;
          c.lineWidth = 1.5; c.stroke();
        }
      }
    }
    if(this.bobber && this.spot){
      let ex, ey, sag;
      if(this.mode==='tai'){
        ex = this.spot.x*W + Math.sin(t*0.8)*4;
        ey = this.spot.y*H - 14 + this.floatOffset*2.6;
        sag = this.state==='biting' ? 8 : 22 + Math.sin(t*1.1)*3;
      } else {
        const ax2 = W*0.19;
        const p = this.state==='attack' ? Math.min(1, this.retProg+0.05) : this.retProg;
        const wiggle2 = Math.sin(p*14 + t*4) * 38;
        const depth2 = Math.sin(p*8 + t*2) * 14;
        ex = this.spot.x*W + (ax2 - this.spot.x*W)*p + wiggle2*(1-p*0.5);
        ey = this.spot.y*H + depth2*(1-p) - 2;
        sag = this.state==='attack' ? 6 : 14 + Math.sin(t*4)*5;
      }
      c.beginPath();
      c.moveTo(tip.tipX, tip.tipY);
      c.quadraticCurveTo((tip.tipX+ex)/2, Math.min(tip.tipY,ey)+sag, ex, ey);
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2; c.stroke();
    }
    // —— 漂相放大镜 ——
    const showMag = this.mode==='tai' && this.bobber && (this.state==='waiting'||this.state==='biting');
    $('#mag').classList.toggle('hidden', !showMag);
    if(showMag) this.drawMagnifier();
  },
  drawMagnifier(){
    const cv = $('#mag-canvas');
    const dpr = window.devicePixelRatio||1;
    const w = 120, h = 150;
    if(cv.width !== w*dpr){ cv.width = w*dpr; cv.height = h*dpr; }
    const c = cv.getContext('2d');
    c.setTransform(dpr,0,0,dpr,0,0);
    // 水体
    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#1b4a5e'); g.addColorStop(1,'#081e2c');
    c.fillStyle = g; c.fillRect(0,0,w,h);
    const cx = w/2;
    const seg = 11, tailTop = 14, restM = 5;
    // 水线（漂下沉→水面相对上移）
    const waterY = tailTop + (restM - this.floatOffset)*seg;
    // 漂脚
    c.strokeStyle = '#3f6a58'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, tailTop+7*seg+26); c.lineTo(cx, tailTop+7*seg+48); c.stroke();
    // 漂身
    c.beginPath(); c.ellipse(cx, tailTop+7*seg+14, 7, 15, 0, 0, Math.PI*2);
    c.fillStyle = '#e0552f'; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.stroke();
    // 漂尾 7 目（从上往下 1..7，红绿相间）
    c.font = '700 9px sans-serif'; c.textAlign = 'left';
    for(let i=0;i<7;i++){
      const y = tailTop + i*seg;
      const above = (y+seg/2) < waterY;
      c.fillStyle = i%2===0 ? (above?'#ff4b3a':'#7a2a22') : (above?'#f2ead2':'#6f6c5e');
      c.fillRect(cx-2.6, y, 5.2, seg-1);
      if(above){
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.fillText(String(i+1), cx+8, y+seg-2);
      }
    }
    // 水面线 + 下半透明
    c.fillStyle = 'rgba(20,60,80,0.55)';
    c.fillRect(0, waterY, w, h-waterY);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, waterY); c.lineTo(w, waterY); c.stroke();
    // 水面微光
    for(let i=0;i<4;i++){
      c.beginPath(); c.ellipse(w*0.2+i*28, waterY+6+i*9, 14, 1.4, 0, 0, Math.PI*2);
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill();
    }
    // 标签
    const visible = clamp(Math.round(restM - this.floatOffset), 0, 7);
    const label = $('#mag-label');
    if(this.state==='biting' && this.strikeValid()){
      label.textContent = (this.biteKind==='song'?'送漂！':'顿口！') + ' 提竿！';
      label.classList.add('strike');
      $('#btn-cast').classList.add('pulse');
    } else {
      label.textContent = '露' + visible + '目';
      label.classList.remove('strike');
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
      diff: fish.diff||2,
      tension: 20, progress: 0.12, stamina: 1, t: 0,
      ripples: [], splashT: 0.5,
      dash:null, nextDash: rand(3,7), snag:null, snagHold:0, wash:null,
      redTime:0, slack:0, fightSec:0, netT:0, _reelT:0, _creakT:0,
    };
    const D = this.F.diff;
    // v0.6.0 调参：整体成功率 浅滩~95% / 深水~82% / 水草~70%
    this.redLimit  = D===1 ? 3.0 : D===3 ? 1.7 : 2.2;    // 红线容忍时长（放宽）
    this.slackLimit= D===1 ? 8.0 : D===3 ? 4.0 : 5.5;    // 低张力容忍时长（放宽）
    this.tMul      = D===1 ? 0.7 : D===3 ? 0.95 : 0.85;  // 张力增速倍率（放缓）
    this.pMul      = D===1 ? 1.5 : D===3 ? 0.9 : 1.05;   // 收线进度倍率（搏鱼更短）
    this.evMul     = D===1 ? 0.4 : D===3 ? 1.2 : 0.8;    // 大鱼动作概率（减少）
    this.snagLimit = D===1 ? 2.4 : 1.7;
    // v0.7.0 小鱼(≤2斤)不用遛鱼：轻松拉上来零失败，也不进抄网QTE
    this.small = fish.weight <= 1.0;
    if(this.small){
      this.redLimit = 1e9; this.slackLimit = 1e9; this.snagLimit = 1e9;
      this.tMul = 0.15; this.pMul = 3.0; this.evMul = 0;
      this.F.nextDash = 1e9;
      $('#fight-msg').textContent = '小鱼！直接拉上来～';
    }
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
    this.F.stamina = Math.max(0, this.F.stamina-0.18);
    this.F.tension = Math.max(10, this.F.tension-25);
    $('#btn-steady').classList.add('hidden');
    $('#fight-msg').textContent = '稳住了！鱼呛了一口水';
    AudioSys.splash();
  },
  netPhase(){ return (this.F.netT * this.netSpeed()) % (2*Math.PI); },
  netSpeed(){ return 2.7 + this.F.fish.strength*1.2; },
  inGreen(){
    let d = Math.abs(this.netPhase() - Math.PI);
    if(d > Math.PI) d = 2*Math.PI - d;
    return d < 0.8;
  },
  onNet(){
    if(this.phase!=='net') return;
    if(this.inGreen()){
      this.finish(true, null);
    } else if(!this.F.netMissed){
      // v0.7.7 一次容错：抄早了不跑鱼，重新等下一段挣扎节奏
      this.F.netMissed = true;
      this.F.netT = 0;
      $('#fight-msg').textContent = '💦 抄早了！鱼窜开了，稳住再抄一次';
      AudioSys.splash();
    } else {
      this.finish(false, '抄网撞上鱼头！', '鱼一个摆尾脱钩跑了。两次机会都错过了，挣扎这么凶不能急，看准它喘气的间隙再抄。');
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
    // v0.7.1 遛鱼30秒封顶：超时鱼必力竭加速上岸，不让玩家耗着
    if(f.fightSec > 26){ f.stamina = 0; f.progress += dt*0.35; }

    if(this.phase==='net'){
      f.netT += dt;
      if(f.netT > 8.5){
        this.finish(false, '最后一秒跑了…', '鱼在岸边挣扎太久，挣脱了钩子。都搏到岸边了，就差那一下。');
        return;
      }
      this.render(); return;
    }

    // —— 鱼行为调度 ——
    if(!f.dash && !f.snag && !f.wash && !tired){
      f.nextDash -= dt;
      if(f.nextDash <= 0){
        if(sp.behaviors.includes('deep') && Math.random()<0.4*this.evMul && f.progress>0.3){
          f.snag = { left: rand(1.6,3) };
          $('#fight-msg').textContent = '⚠ 鱼钻底了！松线别硬拉！';
        } else if(sp.behaviors.includes('wash') && Math.random()<0.45*this.evMul && f.progress>0.45){
          f.wash = { left: 0.95 };
          $('#btn-steady').classList.remove('hidden');
          $('#fight-msg').textContent = '⚡ 鱼要洗鳃——快点「稳住」！';
          AudioSys.splash();
        } else {
          f.dash = { left: rand(1.2,2.2) * (0.6+S*0.4) };
          $('#fight-msg').textContent = '💥 大鱼冲刺！快松手放线！';
          AudioSys.dash();
          GamepadFx.buzz(0.9, 400);
        }
        f.nextDash = rand(4.5, 9) * (1.4-S*0.4);
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
    let mult = 1 + S*0.7;
    if(f.dash) mult *= 2.0;
    if(f.snag) mult *= 1.45;
    if(tired) mult *= 0.38;

    if(this.holding){
      let dT = (20 + mult*8) * this.tMul;
      if(f.snag) dT += 20;
      f.tension += dT*dt;
      f.stamina -= dt*(0.08+0.08*S)*(tired?0.3:1);
      f.progress += dt*0.19*this.pMul*(0.55+0.45*f.stamina)*(1.25-S*0.55)*(tired?1.7:1);
      f._reelT += dt;
      if(f._reelT > 0.09){ f._reelT=0; AudioSys.reel(); }
    } else {
      f.tension -= (40 + (100-f.tension)*0.2)*dt;
      f.stamina -= dt*(0.028+0.028*S);
      if(this.small){ f.progress += dt*0.3; }
      else { f.progress -= dt*(0.010*S)*(f.dash?2.5:1); }
    }
    f.tension = clamp(f.tension, 0, 100);
    f.stamina = clamp(f.stamina, 0, 1);
    f.progress = clamp(f.progress, 0, 1);

    // —— 失败判定 ——
    if(f.tension > 90){
      f.redTime += dt;
      f._creakT += dt;
      if(f._creakT > 0.35){ f._creakT=0; AudioSys.creak(); $('#fight-msg').textContent='⚠ 线在响！快松手！'; }
      if(f.redTime > this.redLimit){
        AudioSys.snap();
        this.finish(false, '啪——断线了！',
          (f.dash?'大鱼冲刺时你还贪线，':'张力拉满没松手，')+'鱼线崩断，鱼和线组一起没了。张力到红线要立刻松手遛鱼！');
        return;
      }
    } else { f.redTime = Math.max(0, f.redTime - dt*1.2); }

    if(f.tension < 12 && !f.wash){
      f.slack += dt;
      if(f.slack > this.slackLimit){
        this.finish(false, '脱钩跑了', '收线太松，鱼钩在鱼嘴里晃荡太久，松脱了。张力要保持在中区，别一直放着不管。');
        return;
      }
    } else { f.slack = Math.max(0, f.slack - dt*0.8); }

    if(f.snag && f.snagHold > this.snagLimit){
      AudioSys.snap();
      this.finish(false, '挂底断线！', '鱼钻进水底障碍物，你硬拉硬拽，线挂在树根上崩断了。钻底时必须松线，遛它自己出来。');
      return;
    }

    // —— 浪花：体力越少越贴水面翻花，冲刺也炸水 ——
    const surf = 1 - f.stamina;
    if(surf>0.3 || f.dash){
      f.splashT -= dt;
      if(f.splashT<=0){
        f.splashT = surf>0.6 ? 0.5 : 0.95;
        f.ripples.push({ x: rand(-26,26), dy: rand(-14,8), born: f.t, big: surf>0.6||!!f.dash });
      }
    }
    if(f.progress >= 1 && this.phase==='fight'){
      if(this.small){ this.finish(true, null); return; }
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
    const S = f.fish.strength;   // v0.7.1 挣扎摆动需要
    const g = c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#1b4a5e'); g.addColorStop(1,'#081e2c');
    c.fillStyle = g; c.fillRect(0,0,W,H);
    for(let i=0;i<3;i++){
      c.save(); c.translate(W*(0.25+i*0.25),0); c.rotate(0.18);
      c.fillStyle = 'rgba(180,220,230,0.045)';
      c.fillRect(-40,0,80,H); c.restore();
    }
    // 体力越少越贴近水面（画面上部）
    const surfR = 1 - f.stamina;
    const fishY = H*(0.52 - 0.26*surfR*surfR) + Math.sin(f.t*2.2)*30 + (f.dash?Math.sin(f.t*9)*14:0);
    // v0.7.1 挣扎：鱼在水下左右冲拉，体力越足摆得越猛
    const struggle = Math.sin(f.t*(1.6+S*1.4)) * (24+42*S) * (f.stamina<=0?0.35:1);
    const fishX = W*(0.78 - f.progress*0.6) + Math.sin(f.t*3.1)*26*(1+S) + struggle;
    const yy = f.snag ? Math.min(H*0.86, fishY*1.25) : fishY;
    const size = Math.min(46 + f.fish.weight*20, W*0.38, H*0.30);   // v0.7.1 封顶：大而不吓人
    c.save();
    c.translate(fishX, yy);
    c.rotate(Math.sin(f.t*(2.2+S))*0.22*(1+S*0.6) + (f.dash?-0.2:0) + (f.stamina<=0 ? Math.sin(f.t*4.5)*0.3 : 0));
    c.scale(-1,1);
    drawFishArt(c, f.fish.species.id, size, f.t, {underwater:true});
    c.restore();
    // 浪花圈 + 白沫
    f.ripples = f.ripples.filter(r => f.t - r.born < 1.1);
    for(const r of f.ripples){
      const age = f.t - r.born;
      const rr = (r.big?10:7) + age*(r.big?110:70);
      c.beginPath();
      c.ellipse(fishX + r.x, yy + r.dy - size*0.25, rr, rr*0.3, 0, 0, Math.PI*2);
      c.strokeStyle = 'rgba(255,255,255,' + (0.55*(1-age/1.1)).toFixed(3) + ')';
      c.lineWidth = 2; c.stroke();
    }
    if(surfR > 0.45 || f.dash){
      for(let i=0;i<5;i++){
        const bx3 = fishX + Math.sin(f.t*5+i*2.3)*size*0.4;
        const by3 = yy - size*0.3 + Math.cos(f.t*4+i)*8;
        c.beginPath(); c.arc(bx3, by3, 2.2+Math.sin(f.t*8+i)*1.2, 0, Math.PI*2);
        c.fillStyle = 'rgba(255,255,255,' + (0.3+0.2*Math.sin(f.t*9+i)).toFixed(3) + ')';
        c.fill();
      }
    }
    // 持竿人剪影（右下角，面朝左侧水面，张力越大竿压得越低）
    const fs = Math.min(W,H)/430*1.9;
    const fax = W, fay = H + 6;
    // v0.7.1 竿随鱼摆：鱼左右冲拉+深浅变化带动竿尖俯仰
    const rodSway = Math.sin(f.t*(1.6+S*1.4)) * (0.05+0.09*S) * (f.stamina<=0?0.35:1);
    const depthPull = clamp((yy - H*0.45)/H, -0.2, 0.4);
    drawAngler.fightDrop = -(0.10 + f.tension/500) + rodSway*0.6 + depthPull*0.3 + (f.dash?0.06:0);
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
      bar.textContent = ok ? '✅ 就是现在！点抄网！'
        : f.netMissed ? '💦 抄早了！等它下一个喘气间隙再抄（还有一次机会）'
        : '它在挣扎……等它缓一下';
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
      if(Lake.mode==='lure' && Lake.state==='retrieving'){
        if(a !== this.padHold){ this.padHold = a; Lake.holding = a; if(a) AudioSys.unlock(); }
      } else {
        if(a && !this.padHold){ this.padHold=true; Game.mainAction(); }
        if(!a) this.padHold=false;
      }
    }
  },
};

/* ================= 渔获清单 ================= */
function renderLog(){
  const d = Store.load(), list = $('#log-list');
  list.innerHTML = '';
  const recs = d.records || [];
  const maxW = {};
  for(const r of recs){ maxW[r.s] = Math.max(maxW[r.s]||0, r.w); }
  // v0.7.0 总数统计：累计/今日 条数+斤数+最大个体
  if(recs.length){
    const t0 = new Date(); t0.setHours(0,0,0,0);
    const today = recs.filter(r=>r.t >= t0.getTime());
    const sumW = a => a.reduce((x,r)=>x+r.w, 0);
    const big = recs.reduce((a,r)=> !a || r.w>a.w ? r : a, null);
    const stats = document.createElement('div');
    stats.className = 'log-stats';
    stats.innerHTML = '<div class="st1">🏆 累计 '+recs.length+' 条 · '+(sumW(recs)*2).toFixed(1)+' 斤</div>'
      + '<div class="st2">📅 今日 '+today.length+' 条 · '+(sumW(today)*2).toFixed(1)+' 斤'
      + '　🥇 最大 '+FISH_SPECIES.find(f=>f.id===big.s).name+' '+(big.w*2).toFixed(1)+' 斤</div>';
    list.appendChild(stats);
  }
  const rows = FISH_SPECIES.map(sp => ({ sp, n:d.counts[sp.id]||0 })).sort((a,b)=>b.n-a.n);
  let total = 0;
  for(const {sp,n} of rows){
    total += n;
    const row = document.createElement('div');
    row.className = n>0 ? 'log-row r'+sp.rarity : 'log-row unknown';
    // v0.6.0：每行加鱼缩略图（已解锁=彩色，未解锁=剪影）
    const cv = document.createElement('canvas');
    cv.className = 'log-thumb';
    cv.width = 96; cv.height = 52;
    const tc = cv.getContext('2d');
    tc.translate(50, 26);   // 原点移到画布中心（drawFishArt 以原点画鱼）
    drawFishArt(tc, sp.id, 80, 0, n>0 ? {} : {silhouette:true});
    row.appendChild(cv);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = n>0 ? sp.name+' '+'★'.repeat(sp.rarity) : '？？？';
    row.appendChild(name);
    const cnt = document.createElement('span');
    cnt.className = 'cnt';
    cnt.textContent = n>0 ? '× '+n+' · 最大 '+(maxW[sp.id]*2).toFixed(1)+' 斤' : '—';
    row.appendChild(cnt);
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

/* ================= 本场计时（30分钟/场 + 暂停） ================= */
const Session = {
  DURATION: 30*60,   // 30分钟
  left: 30*60,       // 剩余秒数
  paused: false,
  ended: false,
  timerId: null,
  startCount: 0,     // 本场渔获条数
  startTime: 0,      // 本场开始时间戳
  init(){
    this.left = this.DURATION; this.paused = false; this.ended = false;
    this.startCount = 0; this.startTime = Date.now();
    this.updateUI();
  },
  start(){
    this.init();
    clearInterval(this.timerId);
    this.timerId = setInterval(()=>{
      if(this.paused || this.ended) return;
      this.left--;
      this.updateUI();
      if(this.left <= 0) this.endSession();
    }, 1000);
  },
  pause(){
    if(this.ended) return;
    this.paused = true;
    $('#btn-pause').textContent = '▶';
    showPopup('#popup-pause');
    $('#pause-timer-info').textContent = '剩余时间 '+this.format();
  },
  resume(){
    this.paused = false;
    $('#btn-pause').textContent = '⏸';
    hidePopup('#popup-pause');
  },
  toggleMusic(){
    // 弹出音乐选择面板
    this.renderMusicPanel();
    showPopup('#panel-music');
  },
  renderMusicPanel(){
    const tracks = AmbientMusic.tracks;
    const cur = AmbientMusic.trackIndex;
    const isOn = AmbientMusic.playing;
    let html = '';
    tracks.forEach((t,i)=>{
      const active = isOn && i===cur;
      html += `<button class="music-track-btn ${active?'active':''}" data-track="${i}">
        <span class="track-icon">${t.icon}</span>
        <span class="track-name">${t.name.replace(t.icon+' ','')}</span>
        ${active?'<span class="track-on">▶ 播放中</span>':''}
      </button>`;
    });
    html += `<button class="music-track-btn off" id="btn-music-off">
      <span class="track-icon">🔇</span>
      <span class="track-name">关闭音乐</span>
    </button>`;
    $('#music-track-list').innerHTML = html;
    // 绑定选择
    document.querySelectorAll('.music-track-btn[data-track]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.dataset.track);
        if(!AmbientMusic.playing){ AudioSys.unlock(); AmbientMusic.toggle(); }
        AmbientMusic.setTrack(idx);
        this.renderMusicPanel();
        $('#btn-music').textContent = '🎵';
        $('#btn-music').style.opacity = '1';
        toast('已切换到 '+AmbientMusic.tracks[idx].name);
      });
    });
    const offBtn = $('#btn-music-off');
    if(offBtn) offBtn.addEventListener('click', ()=>{
      AmbientMusic.stop();
      hidePopup('#panel-music');
      $('#btn-music').textContent = '🔇';
      $('#btn-music').style.opacity = '0.5';
      toast('音乐已关闭');
    });
  },
  format(){
    const m = Math.floor(this.left/60), sec = this.left%60;
    return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  },
  updateUI(){
    const el = $('#session-timer');
    el.textContent = this.format();
    el.classList.toggle('warning', this.left <= 300 && this.left > 0);
  },
  endSession(){
    if(this.ended) return;
    this.ended = true;
    clearInterval(this.timerId);
    // 如果正在钓鱼，先收竿
    if(Lake.state!=='idle'){ Lake.reelIn && Lake.reelIn(); Lake.state='idle'; Lake.bobber=null; }
    // 统计本场（用开始时间戳过滤记录）
    const d = Store.load();
    const recs = (d.records||[]).filter(r=>r.t >= this.startTime);
    const totalJin = recs.reduce((a,r)=>a+r.w*2,0);
    $('#session-summary').textContent = `本场共钓到 ${recs.length} 条鱼，合计 ${totalJin.toFixed(1)} 斤`;
    // 本场鱼种明细
    const bySpecies = {};
    recs.forEach(r=>{ bySpecies[r.s] = bySpecies[r.s] || {n:0,jin:0}; bySpecies[r.s].n++; bySpecies[r.s].jin+=r.w*2; });
    const detailEl = $('#session-detail');
    if(Object.keys(bySpecies).length === 0){
      detailEl.innerHTML = '<p style="text-align:center;color:var(--dim)">本场没有钓到鱼，再接再厉！</p>';
    } else {
      detailEl.innerHTML = Object.entries(bySpecies).map(([sid,v])=>{
        const sp = FISH_DATA.find(f=>f.id===sid);
        return `<p>· ${sp?sp.name:sid} ×${v.n}（${v.jin.toFixed(1)} 斤）</p>`;
      }).join('');
    }
    showPopup('#popup-session');
  },
  newSession(){
    hidePopup('#popup-session');
    this.start();
    toast('🎣 新一场开始，限时30分钟');
  }
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
    $('#btn-music-close').addEventListener('click', ()=>hidePopup('#panel-music'));
    $('#btn-mode-tai').addEventListener('click', ()=>Lake.setMode('tai'));
    $('#btn-mode-lure').addEventListener('click', ()=>Lake.setMode('lure'));
    // v0.7.5 计时/暂停/音乐
    $('#btn-pause').addEventListener('click', ()=>{
      if(Session.ended) return;
      Session.paused ? Session.resume() : Session.pause();
    });
    $('#btn-resume').addEventListener('click', ()=>Session.resume());
    $('#btn-end-session').addEventListener('click', ()=>{
      hidePopup('#popup-pause'); Session.resume(); Session.endSession();
    });
    $('#btn-new-session').addEventListener('click', ()=>Session.newSession());
    $('#btn-music').addEventListener('click', ()=>{
      AudioSys.unlock(); Session.toggleMusic();
    });
    Session.start();
    // 路亚：主按钮按住收线
    const castBtn = $('#btn-cast');
    castBtn.addEventListener('pointerdown', ()=>{
      if(Game.screen==='lake' && Lake.mode==='lure' && Lake.state==='retrieving'){ Lake.holding = true; }
    });
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>
      castBtn.addEventListener(ev, ()=>{ Lake.holding = false; }));
    // v0.6.2 刷新按钮：时间戳跳转代替 reload（iOS 主屏PWA模式下 location.reload 可能无效），事件委托兜底
    document.addEventListener('click', e => {
      if(e.target.closest && e.target.closest('#btn-refresh')){
        location.replace('./?r=' + Date.now());
      }
    });
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').then(reg=>{
        reg.update().catch(()=>{});   // 浏览器默认24h才查一次，这里每次加载都查
        reg.addEventListener('updatefound', ()=>{
          const nw = reg.installing;
          if(nw) nw.addEventListener('statechange', ()=>{
            if(nw.state==='installed' && navigator.serviceWorker.controller){
              // 新版已装好且已接管缓存，下次刷新即全量新版；不打断当前对局
              toast('🆕 已更新到新版本，点右上角 🔄 立即体验', 4000);
            }
          });
        });
      }).catch(()=>{});
    }
    requestAnimationFrame(t=>this.loop(t));
  },
  mainAction(){
    AudioSys.unlock();
    if(this.screen!=='lake') return;
    if(Lake.state==='idle'){ if(Lake.spot) Lake.cast(); return; }
    if(Lake.mode==='tai'){
      if(Lake.state==='waiting') Lake.strike();
      else if(Lake.state==='biting'){
        if(Lake.strikeValid()) Lake.hookupNow();
        else Lake.earlyStrike();
      }
    } else {
      if(Lake.state==='attack') Lake.hookupNow();
      else if(Lake.state==='retrieving') Lake.twitch();
    }
  },
  hookup(){
    const fish = Lake.hookedFish;
    this.screen='fight';
    Fight.start(fish);
  },
  onCaught(fish){
    this.screen='lake';
    const isNew = Store.add(fish);
    Session.startCount++;
    AudioSys.win();
    $('#catch-new').classList.toggle('hidden', !isNew);
    $('#catch-name').innerHTML = fish.species.name+' <span class="stars">'+RARITY_INFO[fish.species.rarity].stars+'</span>';
    $('#catch-name').style.color = RARITY_INFO[fish.species.rarity].color;
    const jin = fish.weight*2;
    $('#catch-weight').textContent = jin.toFixed(1)+' 斤'+(jin>=16?' 🏆 巨物！':jin>=6?' 🎣 大鱼！':jin>=3?' 好个体！':'');
    $('#catch-flavor').textContent = FLAVOR[fish.species.id]||'';
    showPopup('#popup-catch');
    const cv = $('#catch-canvas');
    const anim = ()=>{
      if($('#popup-catch').classList.contains('hidden')) return;
      renderCatchCanvas(cv, fish.species.id, performance.now()/1000, fish.weight);
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
    const dt = Session.paused ? 0 : Math.min(0.05, (t-this.last)/1000 || 0.016);
    this.last = t; this.animT = Session.paused ? this.animT : t/1000;
    GamepadFx.poll();
    if(this.screen==='lake'){
      Lake.update(dt);
      Lake.draw(this.animT);
    } else {
      Fight.update(dt);
    }
    requestAnimationFrame(tt=>this.loop(tt));
  },
};

Game.init();

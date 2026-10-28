/* 鱼类半写实 Canvas 绘制 —— fishing-pwa
 * drawFishArt(ctx, id, len, t) ：在当前原点画一条朝左的鱼，len 为体长(px)，t 为动画时间(s)
 * 半写实风格：渐变体色 + 真实体形/鳍形 + 种类花纹，不做卡通化
 */
const FISH_ART = {
  jiyu:      { top:[120,132,140], belly:[225,228,225], fin:[150,160,168], hf:.34, head:.30, tail:.22, pattern:'scale', pc:[92,102,110], dorsal:'mid', forked:.5 },
  luofei:    { top:[96,118,96],   belly:[210,214,196], fin:[70,96,74],    hf:.36, head:.30, tail:.22, pattern:'stripes', pc:[52,72,54], dorsal:'long', forked:.45 },
  huangsang: { top:[150,124,44],  belly:[232,214,140], fin:[120,98,32],   hf:.30, head:.34, tail:.24, pattern:'none',   barbels:true, dorsal:'spine' },
  caoyu:     { top:[104,128,74],  belly:[228,230,210], fin:[120,140,92],  hf:.27, head:.30, tail:.20, pattern:'scale', pc:[88,108,66], dorsal:'mid', forked:.5 },
  lianyu:    { top:[150,158,166], belly:[235,238,240], fin:[160,168,176], hf:.36, head:.32, tail:.20, pattern:'none',   dorsal:'mid', forked:.5 },
  yongyu:    { top:[110,116,124], belly:[220,222,224], fin:[130,136,144], hf:.40, head:.40, tail:.20, pattern:'blots', pc:[70,76,84], dorsal:'mid', forked:.5, fatHead:true },
  liyu:      { top:[128,96,52],   belly:[228,204,160], fin:[150,116,66],  hf:.34, head:.30, tail:.20, pattern:'scale', pc:[104,78,40], barbels:true, dorsal:'mid', forked:.45 },
  qiaozui:   { top:[132,150,160], belly:[235,240,242], fin:[150,166,174], hf:.24, head:.34, tail:.22, pattern:'none',   dorsal:'mid', forked:.55, upmouth:true },
  nianyu:    { top:[76,72,68],    belly:[190,182,166], fin:[96,90,84],    hf:.26, head:.38, tail:.24, pattern:'none',   barbels:true, flatHead:true },
  heiyu:     { top:[70,72,66],    belly:[170,172,158], fin:[86,88,80],    hf:.28, head:.32, tail:.22, pattern:'blots', pc:[48,50,44], snakeHead:true },
  guiyu:     { top:[96,108,56],   belly:[216,212,168], fin:[92,100,50],   hf:.38, head:.32, tail:.20, pattern:'blots', pc:[62,60,30], dorsal:'spiny', bigDorsal:true },
  qingyu:    { top:[52,60,72],    belly:[198,204,212], fin:[80,92,106],   hf:.30, head:.30, tail:.22, pattern:'none',   dorsal:'mid', forked:.5 },
};

function drawFishArt(ctx, id, len, t = 0, opts = {}) {
  const a = FISH_ART[id] || FISH_ART.jiyu;
  const sway = Math.sin(t * 6) * 0.10;
  const L = len, hf = a.hf, H = L * hf;
  const noseX = -L/2, tailX = L/2 - L*a.tail;
  const dark = opts.silhouette;

  function bodyPath(){
    ctx.beginPath();
    ctx.moveTo(noseX, 0);
    ctx.bezierCurveTo(noseX + L*0.06, -H*0.68, noseX + L*0.16, -H*0.80, tailX - L*0.18, -H*0.62);
    ctx.bezierCurveTo(tailX - L*0.08, -H*0.50, tailX, -H*0.30, tailX, -H*0.10);
    ctx.quadraticCurveTo(tailX + L*0.02, 0, tailX, H*0.10);
    ctx.bezierCurveTo(tailX, H*0.30, tailX - L*0.08, H*0.50, tailX - L*0.18, H*0.62);
    ctx.bezierCurveTo(noseX + L*0.16, H*0.80, noseX + L*0.06, H*0.68, noseX, 0);
    ctx.closePath();
  }

  // —— 尾鳍（叉尾）——
  const swayA = sway;
  ctx.save();
  ctx.translate(tailX, 0); ctx.rotate(swayA);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const tf = a.forked ?? .5, TL = L*a.tail*1.15;
  ctx.quadraticCurveTo(TL*0.5, -H*0.3, TL, -H*(0.55*tf+0.25));
  ctx.quadraticCurveTo(TL*0.55, -H*0.05, TL*0.55, 0);
  ctx.quadraticCurveTo(TL*0.55, H*0.05, TL, H*(0.55*tf+0.25));
  ctx.quadraticCurveTo(TL*0.5, H*0.3, 0, 0);
  ctx.closePath();
  const tg = ctx.createLinearGradient(0,0,TL,0);
  tg.addColorStop(0, `rgba(${a.fin},0.9)`); tg.addColorStop(1, `rgba(${a.fin},0.45)`);
  ctx.fillStyle = dark ? 'rgba(30,40,48,0.85)' : tg;
  ctx.fill();
  ctx.restore();

  // —— 背鳍 ——
  if(!dark){
    ctx.beginPath();
    if(a.bigDorsal){
      ctx.moveTo(-L*0.10, -H*0.62);
      for(let i=0;i<=7;i++){ const px=-L*0.10+ (L*0.34)*i/7; ctx.lineTo(px, -H*(0.62 + 0.42*Math.sin(Math.PI*i/7)) ); }
      ctx.lineTo(L*0.24, -H*0.30); ctx.lineTo(-L*0.10, -H*0.62);
    } else if(a.dorsal==='long'){
      ctx.moveTo(noseX+L*0.18, -H*0.60);
      ctx.quadraticCurveTo(L*0.02, -H*1.12, tailX-L*0.06, -H*0.28);
      ctx.lineTo(tailX-L*0.10, -H*0.20);
    } else {
      ctx.moveTo(-L*0.06, -H*0.66);
      ctx.quadraticCurveTo(L*0.10, -H*1.05, L*0.20, -H*0.30);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${a.fin},0.85)`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = Math.max(0.6, L*0.004);
    for(let i=1;i<5;i++){
      const t0 = i/5;
      ctx.beginPath(); ctx.moveTo(-L*0.06 + L*0.26*t0, -H*0.62);
      ctx.lineTo(-L*0.02 + L*0.24*t0, -H*0.98);
      ctx.stroke();
    }
  }

  // —— 身体 ——
  bodyPath();
  if(dark){
    ctx.fillStyle = 'rgba(24,34,42,0.9)';
    ctx.fill();
  } else {
    const bg = ctx.createLinearGradient(0, -H*0.8, 0, H*0.6);
    bg.addColorStop(0, `rgb(${a.top.map(v=>Math.round(v*0.82)).join(',')})`);
    bg.addColorStop(0.42, `rgb(${a.top.join(',')})`);
    bg.addColorStop(0.68, `rgb(${a.top.map((v,i)=>Math.round(v*0.55 + a.belly[i]*0.45)).join(',')})`);
    bg.addColorStop(1, `rgb(${a.belly.join(',')})`);
    ctx.fillStyle = bg; ctx.fill();

    // 侧线高光
    ctx.save(); ctx.clip();
    const hl = ctx.createLinearGradient(0, -H*0.35, 0, H*0.1);
    hl.addColorStop(0,'rgba(255,255,255,0.16)'); hl.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(noseX, -H*0.4, L, H*0.5);
    const dk = ctx.createLinearGradient(0, -H*0.8, 0, -H*0.1);
    dk.addColorStop(0,'rgba(0,0,0,0.30)'); dk.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = dk; ctx.fillRect(noseX, -H*0.8, L, H*0.7);

    // —— 花纹 ——
    ctx.globalAlpha = 0.55;
    if(a.pattern==='stripes'){
      ctx.strokeStyle = `rgb(${a.pc.join(',')})`; ctx.lineWidth = Math.max(1.2, H*0.07);
      for(let i=0;i<9;i++){ const px = noseX + L*0.22 + i*L*0.072;
        ctx.beginPath(); ctx.moveTo(px, -H*0.52);
        ctx.quadraticCurveTo(px+L*0.02+Math.sin(i)*L*0.008, 0, px+L*0.01, H*0.44); ctx.stroke(); }
    } else if(a.pattern==='blots'){
      // 大小不一的不规则斑块，沿背侧密、腹侧疏（拟真分布）
      const rng = (()=>{ let seed=7; return ()=>{ seed=(seed*9301+49297)%233280; return seed/233280; }; })();
      ctx.fillStyle = `rgb(${a.pc.join(',')})`;
      for(let i=0;i<16;i++){
        const bx = -0.36 + (0.68)*(i/15) + (rng()-0.5)*0.05;
        const by = -0.32 + Math.pow(rng(),0.8)*0.55;
        const br = 0.035 + rng()*0.055;
        ctx.globalAlpha = 0.4 + rng()*0.35;
        ctx.beginPath();
        ctx.ellipse(bx*L, by*H, br*L*(1+rng()*0.8), br*H*(1.1+rng()), (rng()-0.5)*0.8, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.55;
    } else if(a.pattern==='scale'){
      ctx.strokeStyle = `rgba(${a.pc.join(',')},0.5)`; ctx.lineWidth = Math.max(0.6, L*0.004);
      for(let cx=noseX+L*0.22; cx<tailX-L*0.05; cx+=L*0.045){
        for(let cy=-H*0.5; cy<H*0.42; cy+=H*0.22){
          ctx.beginPath(); ctx.arc(cx, cy, L*0.022, 0.4, Math.PI-0.4); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // —— 头部细节 ——
  if(!dark){
    // 鳃盖
    ctx.beginPath();
    ctx.moveTo(noseX + L*a.head*0.78, -H*0.52);
    ctx.quadraticCurveTo(noseX + L*a.head*0.95, 0, noseX + L*a.head*0.72, H*0.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = Math.max(1, L*0.008); ctx.stroke();
    // 眼睛
    const ex = noseX + L*a.head*0.45, ey = -H*0.20, er = Math.max(1.8, L*0.017);
    ctx.beginPath(); ctx.arc(ex, ey, er*1.18, 0, Math.PI*2); ctx.fillStyle = '#c9ccd0'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI*2); ctx.fillStyle = '#1b2226'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - er*0.28, ey - er*0.30, er*0.22, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    // 嘴
    ctx.beginPath(); ctx.moveTo(noseX+L*0.012, H*0.16); ctx.quadraticCurveTo(noseX+L*0.05, H*0.22, noseX+L*0.09, H*0.19);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, L*0.007); ctx.stroke();
    // 鲶鱼/鲤鱼须
    if(a.barbels){
      ctx.strokeStyle = 'rgba(60,54,44,0.65)'; ctx.lineWidth = Math.max(0.8, L*0.0035);
      const mx = noseX + L*0.07;
      [[-0.06,-0.30],[0.02,-0.26],[0.05,-0.20]].forEach(([dx,dy])=>{
        ctx.beginPath(); ctx.moveTo(mx, H*0.16);
        ctx.quadraticCurveTo(mx+L*dx*0.5, H*dy+H*0.1, mx+L*dx, H*dy);
        ctx.stroke();
      });
    }
    // 鲶鱼扁头 / 黑鱼蛇头 额外头型提示
    if(a.flatHead || a.snakeHead){
      ctx.beginPath(); ctx.ellipse(noseX+L*a.head*0.4, -H*0.1, L*a.head*0.42, H*0.42, 0, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.stroke();
    }
  }

  // —— 胸鳍 ——
  ctx.save();
  ctx.translate(noseX + L*a.head*0.85, H*0.28); ctx.rotate(0.5 + sway*0.4);
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.quadraticCurveTo(L*0.09, H*0.22, L*0.16, H*0.30);
  ctx.quadraticCurveTo(L*0.07, H*0.12, 0, 0);
  ctx.closePath();
  ctx.fillStyle = dark ? 'rgba(30,40,48,0.85)' : `rgba(${a.fin},0.8)`;
  ctx.fill();
  ctx.restore();
}

/* 渔获展示：把鱼画在指定 canvas 上（带呼吸/摆尾动画由调用方 requestAnimationFrame 驱动） */
function renderCatchCanvas(canvas, id, t){
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(canvas.width !== w*dpr){ canvas.width = w*dpr; canvas.height = h*dpr; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(w*0.52, h*0.55);
  const len = Math.min(w*0.82, 420);
  ctx.rotate(Math.sin(t*1.2)*0.02);
  drawFishArt(ctx, id, len, t);
  ctx.restore();
}

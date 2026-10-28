/* 鱼种数据 —— fishing-pwa
 * rarity: 1普通 2稀有 3传说
 * power 1-10 拉力, stamina 1-10 体力
 * behaviors: dash 冲刺跑线 / deep 钻底 / wash 洗鳃 / teeth 咬线
 * spots: shallow 浅滩 / deep 深水 / weed 水草区
 */
const FISH_SPECIES = [
  { id:'jiyu',   name:'鲫鱼',   rarity:1, wMin:0.1, wMax:0.8, power:2, stamina:2, behaviors:[],                spots:['shallow','weed'],   bite:[4,9] },
  { id:'luofei', name:'罗非鱼', rarity:1, wMin:0.2, wMax:1.5, power:3, stamina:3, behaviors:[],                spots:['shallow'],          bite:[4,9] },
  { id:'huangsang', name:'黄颡鱼', rarity:1, wMin:0.1, wMax:0.6, power:3, stamina:2, behaviors:[],           spots:['deep','weed'],      bite:[5,11] },
  { id:'caoyu',  name:'草鱼',   rarity:1, wMin:1,   wMax:8,   power:6, stamina:6, behaviors:['dash'],          spots:['shallow','weed'],   bite:[6,12] },
  { id:'lianyu', name:'鲢鱼',   rarity:1, wMin:1,   wMax:6,   power:5, stamina:5, behaviors:['dash'],          spots:['deep'],             bite:[6,12] },
  { id:'yongyu', name:'鳙鱼',   rarity:2, wMin:2,   wMax:10,  power:6, stamina:6, behaviors:['dash','deep'],   spots:['deep'],             bite:[7,14] },
  { id:'liyu',   name:'鲤鱼',   rarity:1, wMin:0.5, wMax:6,   power:5, stamina:6, behaviors:['deep'],          spots:['shallow','deep','weed'], bite:[5,11] },
  { id:'qiaozui',name:'翘嘴鲌', rarity:2, wMin:0.5, wMax:4,   power:5, stamina:4, behaviors:['dash','wash'],   spots:['shallow','deep'],   bite:[7,13] },
  { id:'nianyu', name:'鲶鱼',   rarity:1, wMin:0.5, wMax:5,   power:6, stamina:5, behaviors:['deep'],          spots:['deep','weed'],      bite:[8,15] },
  { id:'heiyu',  name:'黑鱼',   rarity:2, wMin:1,   wMax:6,   power:6, stamina:5, behaviors:['dash','teeth'],  spots:['weed'],             bite:[8,14] },
  { id:'guiyu',  name:'鳜鱼',   rarity:2, wMin:0.5, wMax:4,   power:5, stamina:4, behaviors:['dash','wash'],   spots:['deep','weed'],      bite:[8,15] },
  { id:'qingyu', name:'青鱼',   rarity:3, wMin:5,   wMax:25,  power:9, stamina:9, behaviors:['dash','deep','wash'], spots:['deep'],       bite:[10,18] },
];

const RARITY_INFO = { 1:{label:'普通',color:'#9aa5b1',stars:'★'}, 2:{label:'稀有',color:'#4fb3ff',stars:'★★'}, 3:{label:'传说',color:'#ffb02e',stars:'★★★'} };

function rollFish(spotId){
  const pool = FISH_SPECIES.filter(f=>f.spots.includes(spotId));
  // 权重：普通 10 / 稀有 3 / 传说 1，再乘个体重量浮动
  const weights = pool.map(f => f.rarity===1?10:(f.rarity===2?3:1));
  let total = weights.reduce((a,b)=>a+b,0), r = Math.random()*total, pick = pool[0];
  for(let i=0;i<pool.length;i++){ r -= weights[i]; if(r<=0){ pick = pool[i]; break; } }
  // 重量偏小分布：r^2 压向小值
  const rr = Math.pow(Math.random(),1.8);
  const weight = +(pick.wMin + (pick.wMax-pick.wMin)*rr).toFixed(2);
  // 个体强度：重量占比 70% + 随机 30%
  const wr = (weight - pick.wMin)/(pick.wMax-pick.wMin || 1);
  const strength = Math.min(1, wr*0.7 + Math.random()*0.3);
  return { species:pick, weight, strength };
}

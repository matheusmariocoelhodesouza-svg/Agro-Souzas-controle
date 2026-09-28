(()=>{
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

const S={
  level:1,
  stage:null,
  nodes:[],
  leaders:[],
  raf:0,
  inputRaf:0,
  playTimer:0,
  playing:false,
  observer:null,
  recachePending:false
};

function active(){
  return !!document.querySelector('#tab-visual.fleet-premium-active #fleetPremium.active #fleetStage .fleet-node');
}

function parseTranslate(value){
  const m=String(value||'').match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/i);
  return m?{x:Number(m[1]),y:Number(m[2])}:null;
}

function cacheScene(){
  const stage=$('#fleetStage');
  if(!stage)return false;
  const els=$$('.fleet-node',stage);
  if(!els.length)return false;
  S.stage=stage;
  S.nodes=els.map((el,i)=>{
    const p=parseTranslate(el.getAttribute('transform'));
    if(!p)return null;
    return {
      el,
      i,
      ex:p.x,
      ey:p.y,
      ax:540+((i%5)-2)*18,
      ay:300+((Math.floor(i/5)%3)-1)*15
    };
  }).filter(Boolean);
  S.leaders=$$('.fleet-leaders line',stage);
  return S.nodes.length>0;
}

function syncControls(){
  const pct=Math.round(S.level*100);
  const range=$('#fleetRange');
  if(range&&String(range.value)!==String(pct))range.value=String(pct);
  const label=$('#fleetPct');
  if(label)label.textContent=pct+'%';
  $('#fleetAssembled')?.classList.toggle('active',pct===0);
  $('#fleetExploded')?.classList.toggle('active',pct===100);

  const legacy=$$('[data-pv-view]');
  legacy.forEach(btn=>{
    const mode=btn.dataset.pvView;
    if(mode==='assembled')btn.classList.toggle('active',pct===0);
    if(mode==='exploded')btn.classList.toggle('active',pct===100);
  });
}

function paint(level){
  if(!active())return;
  if(S.stage!==$('#fleetStage')||!S.nodes.length){
    if(!cacheScene())return;
  }
  S.level=clamp(level);
  const l=S.level;
  for(let j=0;j<S.nodes.length;j++){
    const n=S.nodes[j];
    const x=n.ax+(n.ex-n.ax)*l;
    const y=n.ay+(n.ey-n.ay)*l;
    n.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const line=S.leaders[j];
    if(line){line.setAttribute('x2',x.toFixed(1));line.setAttribute('y2',y.toFixed(1));}
  }
  syncControls();
}

function cancelAnimation(){
  if(S.raf)cancelAnimationFrame(S.raf);
  S.raf=0;
}

function stopPlay(){
  S.playing=false;
  clearTimeout(S.playTimer);
  S.playTimer=0;
  cancelAnimation();
  const b=$('#fleetPlay');
  if(b){b.classList.remove('active');b.textContent='▶ Animar';}
}

function animateTo(target,duration=320,done){
  if(!active())return;
  stopPlayAnimationOnly();
  const from=S.level,to=clamp(target);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||Math.abs(to-from)<.001){paint(to);done?.();return;}
  const start=performance.now();
  const frame=now=>{
    const p=Math.min(1,(now-start)/duration);
    const ease=1-Math.pow(1-p,3);
    paint(from+(to-from)*ease);
    if(p<1)S.raf=requestAnimationFrame(frame);
    else{S.raf=0;done?.();}
  };
  S.raf=requestAnimationFrame(frame);
}

function stopPlayAnimationOnly(){
  if(S.raf)cancelAnimationFrame(S.raf);
  S.raf=0;
}

function play(){
  if(S.playing){stopPlay();return;}
  S.playing=true;
  const b=$('#fleetPlay');
  if(b){b.classList.add('active');b.textContent='Ⅱ Pausar';}
  const cycle=target=>{
    if(!S.playing||!active())return stopPlay();
    animateTo(target,420,()=>{
      if(!S.playing)return;
      S.playTimer=setTimeout(()=>cycle(target<.5?1:0),220);
    });
  };
  cycle(S.level>.5?0:1);
}

function scheduleSlider(value){
  S.level=clamp(value);
  if(S.inputRaf)return;
  S.inputRaf=requestAnimationFrame(()=>{
    S.inputRaf=0;
    cancelAnimation();
    paint(S.level);
  });
}

function markLegacyMode(mode){
  $$('[data-pv-view]').forEach(b=>b.classList.toggle('active',b.dataset.pvView===mode));
}

function isolateSelected(){
  const nodes=$$('#fleetStage .fleet-node');
  const chosen=$('#fleetStage .fleet-node.selected');
  nodes.forEach(n=>n.classList.toggle('o360-isolated-muted',!!chosen&&n!==chosen));
}

function clearIsolation(){
  $$('#fleetStage .fleet-node.o360-isolated-muted').forEach(n=>n.classList.remove('o360-isolated-muted'));
}

function handleClick(e){
  if(!active())return;
  const t=e.target;

  const fleet=t.closest?.('#fleetAssembled,#fleetExploded,#fleetPlay');
  if(fleet){
    e.preventDefault();e.stopImmediatePropagation();
    clearIsolation();
    if(fleet.id==='fleetAssembled'){stopPlay();animateTo(0);}
    else if(fleet.id==='fleetExploded'){stopPlay();animateTo(1);}
    else play();
    return;
  }

  const legacyMode=t.closest?.('[data-pv-view]');
  if(legacyMode){
    const mode=legacyMode.dataset.pvView;
    if(!['assembled','exploded','isolate'].includes(mode))return;
    e.preventDefault();e.stopImmediatePropagation();
    stopPlay();
    if(mode==='assembled'){clearIsolation();markLegacyMode(mode);animateTo(0);}
    else if(mode==='exploded'){clearIsolation();markLegacyMode(mode);animateTo(1);}
    else{markLegacyMode(mode);isolateSelected();}
    return;
  }

  const legacyButton=t.closest?.('.pv-shell button,#tab-visual button');
  if(legacyButton&&!legacyButton.closest('#fleetPremium')){
    const txt=norm(legacyButton.textContent);
    if(txt==='desmontar'||txt==='montar'||txt==='pausar'){
      e.preventDefault();e.stopImmediatePropagation();
      clearIsolation();
      if(txt==='desmontar'){stopPlay();animateTo(1);}
      else if(txt==='montar'){stopPlay();animateTo(0);}
      else stopPlay();
    }
  }
}

function handleInput(e){
  if(!active()||e.target?.id!=='fleetRange')return;
  e.stopImmediatePropagation();
  clearIsolation();
  stopPlay();
  scheduleSlider(Number(e.target.value)/100);
}

function resetCacheAndRestore(){
  S.stage=null;S.nodes=[];S.leaders=[];
  if(S.recachePending)return;
  S.recachePending=true;
  requestAnimationFrame(()=>{
    S.recachePending=false;
    if(active()&&cacheScene())paint(S.level);
  });
}

function observe(){
  S.observer=new MutationObserver(records=>{
    for(const r of records){
      const stage=$('#fleetStage');
      if(stage&&(r.target===stage||stage.contains(r.target))){resetCacheAndRestore();break;}
    }
  });
  S.observer.observe(document.documentElement,{childList:true,subtree:true});
}

function boot(){
  document.addEventListener('click',handleClick,true);
  document.addEventListener('input',handleInput,true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay();});
  $('#vehiclePicker')?.addEventListener('change',()=>{stopPlay();S.level=1;resetCacheAndRestore();},true);
  observe();
  setTimeout(()=>{if(active()){const r=$('#fleetRange');S.level=r?Number(r.value)/100:1;cacheScene();paint(S.level);}},500);
  window.__O360PerformanceFix={paint,animateTo,stopPlay,cacheScene};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
const canvas=document.querySelector('#game-canvas');
const ctx=canvas.getContext('2d');
const scoreEl=document.querySelector('#score');
const comboEl=document.querySelector('#combo');
const accuracyEl=document.querySelector('#accuracy');
const modeLabel=document.querySelector('#mode-label');
const timeLabel=document.querySelector('#time-label');
const progressEl=document.querySelector('#progress');
const feedbackEl=document.querySelector('#feedback');
const hintEl=document.querySelector('#bottom-hint');
const startScreen=document.querySelector('#start-screen');
const resultsScreen=document.querySelector('#results-screen');

const BPM=120;
const BEAT=60/BPM;
const COUNT_IN=2;
const TOTAL_BEATS=64;
const APPROACH=1.45;
const HIT_WINDOW=0.17;
const KEYS=['D','F','J','K'];
const lanePattern=[0,1,2,3,1,0,2,3,0,2,1,3,2,1,3,0];
let notes=[];
let running=false;
let startedAt=0;
let elapsed=0;
let score=0;
let combo=0;
let maxCombo=0;
let hits=0;
let judged=0;
let totalError=0;
let lastBeat=-1;
let audio=null;
let feedbackUntil=0;
let lastFrame=0;

function resize(){
 const rect=canvas.getBoundingClientRect();
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.floor(rect.width*dpr));
 canvas.height=Math.max(1,Math.floor(rect.height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
new ResizeObserver(resize).observe(canvas);
resize();

function makeChart(){
 notes=[];
 for(let beat=0;beat<TOTAL_BEATS;beat++){
  const mode=(Math.floor(beat/16)%2===0)?'LANES':'AIM';
  const time=COUNT_IN+beat*BEAT;
  if(mode==='LANES'){
   if(beat%4!==3 || beat%8===7){
    notes.push({mode,time,lane:lanePattern[beat%lanePattern.length],judged:false});
   }
  }else{
   if(beat%4!==3 || beat%8===7){
    const n=beat/4;
    const points=[[.22,.28],[.72,.25],[.78,.68],[.28,.72],[.5,.42],[.18,.58],[.82,.45],[.52,.76]];
    const p=points[n%points.length];
    notes.push({mode,time,x:p[0],y:p[1],judged:false});
   }
  }
 }
}

function startAudio(){
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx)return;
 if(!audio)audio=new AudioCtx();
 if(audio.state==='suspended')audio.resume();
}
function tone(freq,duration,type,volume,when){
 if(!audio)return;
 const osc=audio.createOscillator();
 const gain=audio.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,when);
 gain.gain.setValueAtTime(volume,when);
 gain.gain.exponentialRampToValueAtTime(.001,when+duration);
 osc.connect(gain);gain.connect(audio.destination);
 osc.start(when);osc.stop(when+duration);
}
function beatSound(beat){
 if(!audio)return;
 const now=audio.currentTime;
 if(beat%4===0)tone(75,.13,'sine',.12,now);
 tone(beat%2===0?660:440,.045,'triangle',.025,now+.015);
}

function begin(){
 startAudio();
 makeChart();
 score=0;combo=0;maxCombo=0;hits=0;judged=0;totalError=0;elapsed=-COUNT_IN;lastBeat=-1;
 startedAt=performance.now();
 running=true;
 startScreen.classList.add('hidden');
 resultsScreen.classList.add('hidden');
 document.querySelector('.live-dot').classList.add('active');
 feedbackEl.textContent='';hintEl.textContent='FOLLOW THE BEAT';
 updateHud();
}
document.querySelector('#start-button').addEventListener('click',begin);
document.querySelector('#restart-button').addEventListener('click',begin);

function currentMode(){
 const beat=Math.max(0,Math.floor(elapsed/BEAT));
 return Math.floor(beat/16)%2===0?'LANES':'AIM';
}
function updateHud(){
 scoreEl.textContent=String(score).padStart(6,'0');
 comboEl.textContent=String(combo);
 const acc=judged?Math.max(0,100*(1-totalError/judged/0.17)):100;
 accuracyEl.textContent=acc.toFixed(1)+'%';
}
function judge(note,delta){
 if(note.judged)return;
 note.judged=true;judged++;hits++;
 const error=Math.abs(delta);
 let label,points;
 if(error<.055){label='PERFECT';points=1000;totalError+=error*.35;}
 else if(error<.105){label='GREAT';points=700;totalError+=error*.65;}
 else{label='GOOD';points=400;totalError+=error;}
 combo++;maxCombo=Math.max(maxCombo,combo);
 score+=points+Math.min(combo,100)*5;
 feedbackEl.textContent=label;
 feedbackUntil=performance.now()+430;
 updateHud();
}
function miss(note){
 if(note.judged)return;
 note.judged=true;judged++;combo=0;totalError+=.17;
 feedbackEl.textContent='MISS';feedbackUntil=performance.now()+430;
 updateHud();
}

function laneHit(lane){
 if(!running||currentMode()!=='LANES')return;
 let best=null,bestDelta=Infinity;
 for(const note of notes){
  if(note.mode!=='LANES'||note.judged||note.lane!==lane)continue;
  const delta=note.time-elapsed;
  if(Math.abs(delta)<bestDelta){best=note;bestDelta=Math.abs(delta);}
 }
 if(best&&bestDelta<=HIT_WINDOW)judge(best,elapsed-best.time);
}
function aimHit(event){
 if(!running||currentMode()!=='AIM')return;
 const rect=canvas.getBoundingClientRect();
 const x=event.clientX-rect.left,y=event.clientY-rect.top;
 const w=rect.width,h=rect.height;
 let best=null,bestDist=Infinity;
 for(const note of notes){
  if(note.mode!=='AIM'||note.judged)continue;
  const dt=note.time-elapsed;
  if(Math.abs(dt)>HIT_WINDOW)continue;
  const nx=note.x*w,ny=note.y*h;
  const d=Math.hypot(x-nx,y-ny);
  if(d<bestDist){best=note;bestDist=d;}
 }
 if(best&&bestDist<Math.min(w,h)*.09)judge(best,elapsed-best.time);
}
const keyToLane={d:0,f:1,j:2,k:3};
window.addEventListener('keydown',event=>{
 const key=event.key.toLowerCase();
 if(keyToLane[key]!==undefined){event.preventDefault();laneHit(keyToLane[key]);}
});
canvas.addEventListener('pointerdown',aimHit);

function drawBackground(w,h){
 ctx.fillStyle='#ecece7';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#deded7';ctx.lineWidth=1;
 for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
}
function drawLanes(w,h){
 const left=w*.12,right=w*.88,laneW=(right-left)/4,hitY=h*.82;
 ctx.fillStyle='#e4e4de';ctx.fillRect(left,0,right-left,h);
 for(let i=0;i<4;i++){
  const x=left+i*laneW;
  ctx.fillStyle=i%2===0?'#e9e9e3':'#e2e2dc';ctx.fillRect(x,0,laneW,h);
  ctx.strokeStyle='#d1d2ca';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
  ctx.fillStyle='#777970';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(KEYS[i],x+laneW/2,h-15);
 }
 ctx.strokeStyle='#252722';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left,hitY);ctx.lineTo(right,hitY);ctx.stroke();
 ctx.fillStyle='#252722';ctx.font='10px monospace';ctx.textAlign='left';ctx.fillText('HIT',left-30,hitY+4);
 for(const note of notes){
  if(note.mode!=='LANES'||note.judged)continue;
  const dt=note.time-elapsed;if(dt>APPROACH||dt<-.18)continue;
  const x=left+note.lane*laneW+laneW/2;
  const y=hitY-(dt/APPROACH)*(hitY+30);
  const size=Math.min(25,laneW*.28);
  ctx.fillStyle='#242620';ctx.fillRect(x-size/2,y-size/2,size,size);
  ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4);
 }
}
function drawAim(w,h){
 ctx.fillStyle='#e4e4de';ctx.fillRect(w*.07,h*.06,w*.86,h*.82);
 for(const note of notes){
  if(note.mode!=='AIM'||note.judged)continue;
  const dt=note.time-elapsed;if(dt>APPROACH||dt<-.18)continue;
  const x=note.x*w,y=note.y*h;
  const r=Math.min(w,h)*.045;
  const shrink=r+(1-Math.max(0,dt)/APPROACH)*r*1.6;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#252722';ctx.fill();
  ctx.beginPath();ctx.arc(x,y,r+5,0,Math.PI*2);ctx.strokeStyle='#b1b2a9';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,shrink,0,Math.PI*2);ctx.strokeStyle='#55584f';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✳',x,y);
 }
}
function render(){
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
 drawBackground(w,h);
 if(currentMode()==='LANES')drawLanes(w,h);else drawAim(w,h);
}
function finish(){
 running=false;
 document.querySelector('.live-dot').classList.remove('active');
 const acc=judged?Math.max(0,100*(1-totalError/judged/.17)):0;
 document.querySelector('#final-score').textContent=score.toLocaleString();
 document.querySelector('#final-accuracy').textContent=acc.toFixed(1)+'%';
 document.querySelector('#final-combo').textContent=maxCombo;
 document.querySelector('#final-rating').textContent=acc>=95?'S':acc>=85?'A':acc>=70?'B':acc>=50?'C':'D';
 resultsScreen.classList.remove('hidden');
 hintEl.textContent='TRACK COMPLETE';
}
function frame(now){
 requestAnimationFrame(frame);
 if(!running){render();return;}
 elapsed=(now-startedAt)/1000-COUNT_IN;
 const beat=Math.floor(elapsed/BEAT);
 if(beat>lastBeat&&elapsed>=0){
  for(let b=Math.max(0,lastBeat+1);b<=Math.min(beat,TOTAL_BEATS-1);b++)beatSound(b);
  lastBeat=beat;
 }
 const mode=currentMode();
 modeLabel.textContent=mode==='LANES'?'MODE 01 / FOUR LANES':'MODE 02 / AIM CIRCLES';
 hintEl.textContent=mode==='LANES'?'PRESS D   F   J   K':'CLICK OR TAP THE CIRCLES';
 timeLabel.textContent='00:'+String(Math.max(0,Math.floor(elapsed))).padStart(2,'0');
 progressEl.style.width=(Math.max(0,Math.min(1,elapsed/(TOTAL_BEATS*BEAT)))*100)+'%';
 for(const note of notes){if(!note.judged&&elapsed>note.time+HIT_WINDOW)miss(note);}
 if(performance.now()>feedbackUntil)feedbackEl.textContent='';
 render();
 if(elapsed>TOTAL_BEATS*BEAT+1)finish();
}
requestAnimationFrame(frame);
window.addEventListener('blur',()=>{if(running)hintEl.textContent='KEEP THIS TAB ACTIVE';});

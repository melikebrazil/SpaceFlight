const canvas=document.querySelector('#game-canvas');
const ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const scoreEl=$('score'),comboEl=$('combo'),hullEl=$('hull');
const modeEl=$('mode-label'),timeEl=$('time-label'),progressEl=$('progress');
const feedbackEl=$('feedback'),hintEl=$('bottom-hint');
const startScreen=$('start-screen'),resultsScreen=$('results-screen');
const BPM=120,BEAT=60/BPM,COUNT_IN=2,TOTAL_BEATS=64,APPROACH=1.65,HIT_WINDOW=.19;
let objects=[],running=false,startedAt=0,elapsed=0,score=0,combo=0,maxCombo=0,hits=0,hull=100,lastBeat=-1,audio=null,feedbackUntil=0;
let ship={x:.5,y:.79,targetX:.5,targetY:.79,tilt:0};
let stars=[];
let width=1,height=1,dpr=1;
function resize(){
 const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);
 width=r.width;height=r.height;canvas.width=Math.max(1,Math.floor(width*dpr));canvas.height=Math.max(1,Math.floor(height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);makeStars();
}
function makeStars(){stars=Array.from({length:100},()=>({x:Math.random(),y:Math.random(),z:Math.random(),size:Math.random()*1.5+.3}));}
new ResizeObserver(resize).observe(canvas);resize();
function makeChart(){
 objects=[];
 const xs=[.2,.38,.62,.8,.28,.72,.5,.16,.84,.4,.6,.25,.75,.5,.33,.67];
 const ys=[.68,.75,.64,.79,.84,.7,.61,.76,.66,.86,.73,.62,.82,.69,.77,.65];
 for(let beat=0;beat<TOTAL_BEATS;beat++){
  if(beat<2)continue;
  const type=(beat%8===4||beat%8===5)?'mine':'gate';
  const index=(beat*5+Math.floor(beat/4)*3)%xs.length;
  objects.push({type,beat,time:COUNT_IN+beat*BEAT,x:xs[index],y:ys[(index+beat)%ys.length],done:false});
 }
}
function startAudio(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume();}
function tone(freq,duration,type,volume,when){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);g.gain.setValueAtTime(volume,when);g.gain.exponentialRampToValueAtTime(.001,when+duration);o.connect(g);g.connect(audio.destination);o.start(when);o.stop(when+duration);}
function beatSound(beat){if(!audio)return;const t=audio.currentTime;if(beat%4===0)tone(90,.16,'sine',.11,t);tone(beat%2===0?520:360,.05,'triangle',.025,t+.02);}
function begin(){
 startAudio();makeChart();score=0;combo=0;maxCombo=0;hits=0;hull=100;elapsed=0;lastBeat=-1;
 ship={x:.5,y:.79,targetX:.5,targetY:.79,tilt:0};startedAt=performance.now();running=true;
 startScreen.classList.add('hidden');resultsScreen.classList.add('hidden');document.querySelector('.live-dot').classList.add('active');
 feedbackEl.textContent='';hintEl.textContent='STEER INTO CYAN GATES · DODGE RED MINES';updateHud();
}
$('start-button').addEventListener('click',begin);$('restart-button').addEventListener('click',begin);
function updateHud(){scoreEl.textContent=String(score).padStart(6,'0');comboEl.textContent=combo;hullEl.textContent=hull+'%';}
function setFeedback(text){feedbackEl.textContent=text;feedbackUntil=performance.now()+500;}
function hitGate(o,delta){o.done=true;hits++;combo++;maxCombo=Math.max(maxCombo,combo);const a=Math.abs(delta);const pts=a<.055?1000:a<.11?750:450;score+=pts+Math.min(combo,100)*5;setFeedback(a<.055?'PERFECT GATE':a<.11?'GATE HIT':'LATE HIT');updateHud();}
function crash(o){o.done=true;hull=Math.max(0,hull-18);combo=0;score=Math.max(0,score-150);setFeedback('MINE IMPACT');updateHud();if(hull===0)finish(true);}
function pointerMove(e){
 const r=canvas.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width,ny=(e.clientY-r.top)/r.height;
 ship.targetX=Math.max(.12,Math.min(.88,nx));ship.targetY=Math.max(.59,Math.min(.9,.59+ny*.31));
}
canvas.addEventListener('pointermove',pointerMove);
canvas.addEventListener('pointerdown',pointerMove);
function updateObjects(){
 for(const o of objects){
  if(o.done)continue;
  const delta=o.time-elapsed;
  if(Math.abs(delta)<=HIT_WINDOW){
   const dx=ship.x-o.x,dy=ship.y-o.y,dist=Math.hypot(dx,dy);
   const radius=o.type==='gate'?.105:.12;
   if(dist<radius){if(o.type==='gate')hitGate(o,delta);else crash(o);}
  }
  if(!o.done&&elapsed>o.time+HIT_WINDOW){
   o.done=true;
   if(o.type==='gate'){combo=0;setFeedback('GATE MISSED');}
  }
 }
 updateHud();
}
function project(o){
 const p=Math.max(0,Math.min(1,1-(o.time-elapsed)/APPROACH));
 const perspective=.13+p*.98;
 return {x:width/2+(o.x-.5)*width*.92*perspective,y:height*.43+(o.y-.5)*height*.78*perspective+perspective*height*.13,s:perspective};
}
function drawSpace(){
 const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,'#050a16');g.addColorStop(1,'#101e35');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 for(const s of stars){const twinkle=.5+.5*Math.sin(elapsed*2+s.z*20);ctx.fillStyle='rgba(170,215,255,'+(.25+twinkle*.65)+')';ctx.beginPath();ctx.arc(s.x*width,s.y*height,s.size*(.5+s.z),0,Math.PI*2);ctx.fill();}
 const cx=width/2,cy=height*.43;
 ctx.strokeStyle='rgba(71,144,193,.18)';ctx.lineWidth=1;
 for(let i=-5;i<=5;i++){ctx.beginPath();ctx.moveTo(cx+i*width*.045,cy);ctx.lineTo(cx+i*width*.22,height);ctx.stroke();}
 for(let i=0;i<10;i++){const p=((i/10+(elapsed*.19)%1)%1);const y=cy+(p*p)*(height-cy);const half=(y-cy)*.72;ctx.beginPath();ctx.moveTo(cx-half,y);ctx.lineTo(cx+half,y);ctx.stroke();}
 ctx.strokeStyle='rgba(69,192,224,.12)';ctx.strokeRect(width*.08,height*.1,width*.84,height*.82);
}
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function drawGate(o,p){
 const size=19+p.s*30,x=p.x,y=p.y;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
 ctx.shadowBlur=22;ctx.shadowColor='#54f7e0';ctx.fillStyle='#123c48';ctx.fillRect(-size/2,-size/2,size,size);
 ctx.strokeStyle='#64ffe7';ctx.lineWidth=3;ctx.strokeRect(-size/2,-size/2,size,size);
 ctx.shadowBlur=0;ctx.fillStyle='#d5fff9';ctx.fillRect(-size*.15,-size*.15,size*.3,size*.3);ctx.restore();
}
function drawMine(o,p){
 const r=11+p.s*25;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(elapsed*1.8);
 ctx.shadowBlur=20;ctx.shadowColor='#ff526d';ctx.fillStyle='#692438';ctx.strokeStyle='#ff657b';ctx.lineWidth=3;
 ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,rr=i%2?r*.62:r;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#ffd8df';ctx.beginPath();ctx.arc(0,0,r*.18,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawShip(){
 const x=ship.x*width,y=ship.y*height;const scale=Math.min(width,height)/520;
 ctx.save();ctx.translate(x,y);ctx.rotate(ship.tilt*.18);
 ctx.shadowBlur=24;ctx.shadowColor='#40dfff';
 ctx.fillStyle='#42dfff';ctx.beginPath();ctx.moveTo(-7*scale,17*scale);ctx.lineTo(0,32*scale+Math.random()*5*scale);ctx.lineTo(7*scale,17*scale);ctx.fill();
 ctx.shadowBlur=16;ctx.shadowColor='#58e8ff';
 polygon([[-29*scale,12*scale],[-19*scale,-8*scale],[-7*scale,-17*scale],[0,-31*scale],[7*scale,-17*scale],[19*scale,-8*scale],[29*scale,12*scale],[8*scale,7*scale],[0,17*scale],[-8*scale,7*scale]],'#b9d7e9','#e5fbff');
 polygon([[-19*scale,2*scale],[-8*scale,-8*scale],[0,-19*scale],[8*scale,-8*scale],[19*scale,2*scale],[7*scale,5*scale],[0,1*scale],[-7*scale,5*scale]],'#2a789a','#77f5ff');
 ctx.fillStyle='#f0ffff';ctx.beginPath();ctx.ellipse(0,-9*scale,4*scale,7*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function render(){
 drawSpace();
 for(const o of objects){if(o.done)continue;const dt=o.time-elapsed;if(dt>APPROACH||dt<-.25)continue;const p=project(o);if(o.type==='gate')drawGate(o,p);else drawMine(o,p);}
 drawShip();
 const pulse=6+Math.sin(elapsed*BEAT*Math.PI)*2;ctx.strokeStyle='rgba(94,245,220,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(ship.x*width,ship.y*height,34+pulse,24+pulse*.6,0,0,Math.PI*2);ctx.stroke();
}
function finish(destroyed=false){
 if(!running)return;running=false;document.querySelector('.live-dot').classList.remove('active');
 $('final-score').textContent=score.toLocaleString();$('final-hits').textContent=hits;$('final-combo').textContent=maxCombo;$('final-hull').textContent=hull+'%';
 resultsScreen.querySelector('.eyebrow').textContent=destroyed?'SHIP DISABLED':'FLIGHT COMPLETE';
 resultsScreen.querySelector('h1').innerHTML=destroyed?'MISSION<br /><span>FAILED.</span>':'MISSION<br /><span>LOG.</span>';
 resultsScreen.classList.remove('hidden');hintEl.textContent=destroyed?'SHIP SYSTEMS OFFLINE':'FLIGHT COMPLETE';
}
function frame(now){
 requestAnimationFrame(frame);
 if(!running){render();return;}
 elapsed=(now-startedAt)/1000;
 const songTime=elapsed-COUNT_IN,beat=Math.floor(songTime/BEAT);
 if(beat>lastBeat&&elapsed>=COUNT_IN){for(let b=Math.max(0,lastBeat+1);b<=Math.min(beat,TOTAL_BEATS-1);b++)beatSound(b);lastBeat=beat;}
 ship.x+=(ship.targetX-ship.x)*.16;ship.y+=(ship.targetY-ship.y)*.16;ship.tilt+=(ship.targetX-ship.x-ship.tilt)*.12;
 const countdown=COUNT_IN-elapsed;
 modeEl.textContent=countdown>0?'ENGINE IGNITION IN '+Math.ceil(countdown):'RHYTHM FLIGHT // LIVE';
 timeEl.textContent='00:'+String(Math.max(0,Math.floor(songTime))).padStart(2,'0');
 progressEl.style.width=(Math.max(0,Math.min(1,songTime/(TOTAL_BEATS*BEAT)))*100)+'%';
 updateObjects();if(performance.now()>feedbackUntil)feedbackEl.textContent='';
 render();
 if(elapsed>COUNT_IN+TOTAL_BEATS*BEAT+1)finish();
}
requestAnimationFrame(frame);
window.addEventListener('blur',()=>{if(running)hintEl.textContent='KEEP THIS TAB ACTIVE';});

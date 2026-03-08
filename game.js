const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const W=900,H=580;

// ══════════════════════════════════════════
//  RESPONSIVE SCALING — fits any screen
// ══════════════════════════════════════════
const gw=document.getElementById('gw');
function resizeGame(){
  const scaleX=window.innerWidth/900;
  const scaleY=window.innerHeight/580;
  const scale=Math.min(scaleX,scaleY);
  gw.style.transform=`scale(${scale})`;
  gw.style.position='fixed';
  // With transform-origin:center center, the CSS box center stays fixed.
  // Position so the element center lands at the viewport center.
  gw.style.left=((window.innerWidth-900)/2)+'px';
  gw.style.top=((window.innerHeight-580)/2)+'px';
}
resizeGame();
window.addEventListener('resize',resizeGame);
screen.orientation&&screen.orientation.addEventListener('change',resizeGame);

// ══════════════════════════════════════════
//  TOUCH / MOBILE CONTROLS
// ══════════════════════════════════════════
const isTouchDevice=()=>window.matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;

// Map of currently active touch IDs → which button they're holding
const touchMap={};

// IDs that share the same logical key
const sharedKeyIds={'arrowup':['btnJump']};
function isKeyStillHeld(keyName,excludeId){
  const ids=sharedKeyIds[keyName]||[excludeId];
  return ids.some(sid=>Object.values(touchMap).includes(sid));
}

function bindDkey(id,keyName,onPress){
  const el=document.getElementById(id);
  if(!el)return;
  function press(e){
    e.preventDefault();
    [...e.changedTouches].forEach(t=>touchMap[t.identifier]=id);
    keys[keyName]=true;
    el.classList.add('pressed');
    initAudio();
    if(onPress)onPress();
  }
  function release(e){
    e.preventDefault();
    [...e.changedTouches].forEach(t=>{if(touchMap[t.identifier]===id)delete touchMap[t.identifier];});
    // Only clear key if no other button sharing the same key is still held
    if(!isKeyStillHeld(keyName,id)){keys[keyName]=false;el.classList.remove('pressed');}
    else{el.classList.remove('pressed');}
  }
  el.addEventListener('touchstart',press,{passive:false});
  el.addEventListener('touchend',release,{passive:false});
  el.addEventListener('touchcancel',release,{passive:false});
}

// D-pad left/right
bindDkey('btnLeft','arrowleft');
bindDkey('btnRight','arrowright');

// Jump button (also maps to ArrowUp — shared with btnUp via sharedKeyIds)
(function(){
  const el=document.getElementById('btnJump');
  if(!el)return;
  el.addEventListener('touchstart',e=>{
    e.preventDefault();
    [...e.changedTouches].forEach(t=>touchMap[t.identifier]='btnJump');
    keys['arrowup']=true;
    el.classList.add('pressed');
    initAudio();
  },{passive:false});
  el.addEventListener('touchend',e=>{
    e.preventDefault();
    [...e.changedTouches].forEach(t=>{if(touchMap[t.identifier]==='btnJump')delete touchMap[t.identifier];});
    keys['arrowup']=false;
    el.classList.remove('pressed');
  },{passive:false});
  el.addEventListener('touchcancel',e=>{
    e.preventDefault();
    [...e.changedTouches].forEach(t=>{if(touchMap[t.identifier]==='btnJump')delete touchMap[t.identifier];});
    keys['arrowup']=false;
    el.classList.remove('pressed');
  },{passive:false});
})();

// Ability button — fires activateAbility() on tap
(function(){
  const el=document.getElementById('btnAbility');
  if(!el)return;
  el.addEventListener('touchstart',e=>{
    e.preventDefault();
    el.classList.add('pressed');
    initAudio();
    activateAbility();
  },{passive:false});
  el.addEventListener('touchend',e=>{e.preventDefault();el.classList.remove('pressed');},{passive:false});
  el.addEventListener('touchcancel',e=>{e.preventDefault();el.classList.remove('pressed');},{passive:false});
})();

// Canvas tap — forward to existing click handler (for menus/shop)
cv.addEventListener('touchstart',e=>{
  e.preventDefault();
  const rect=gw.getBoundingClientRect();
  const scale=rect.width/900;
  const t=e.changedTouches[0];
  const x=(t.clientX-rect.left)/scale;
  const y=(t.clientY-rect.top)/scale;
  // Synthesise a click at the scaled canvas position
  cv.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:t.clientX,clientY:t.clientY,_tx:x,_ty:y}));
},{passive:false});

// Show touch controls only when the player first touches the screen
(function(){
  const dpad=document.getElementById('dpad');
  const apad=document.getElementById('apad');
  let shown=false;
  function showControls(){
    if(shown)return;shown=true;
    if(dpad)dpad.style.display='block';
    if(apad)apad.style.display='flex';
  }
  document.addEventListener('touchstart',showControls,{passive:true});
})();

// ══════════════════════════════════════════
//  AUDIO ENGINE (enhanced with SFX)
// ══════════════════════════════════════════
let actx=null,musicOn=true,musicNodes=[],beatInterval=null,drBufs=null;
function initAudio(){if(!actx){const hint=(window.PLATFORM_CFG&&window.PLATFORM_CFG.audioLatencyHint)||'interactive';actx=new(window.AudioContext||window.webkitAudioContext)({latencyHint:hint});}if(actx.state==='suspended')actx.resume();}
function stopMusic(){musicNodes.forEach(n=>{try{n.stop();}catch(e){}});musicNodes=[];drBufs=null;if(beatInterval){clearInterval(beatInterval);beatInterval=null;}}

// SFX system
function playSFX(type){
  if(!actx||!sfxOn)return;
  const now=actx.currentTime;
  switch(type){
    case 'jump':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.setValueAtTime(280,now);o.frequency.exponentialRampToValueAtTime(520,now+.12);
      g.gain.setValueAtTime(.22,now);g.gain.exponentialRampToValueAtTime(.001,now+.18);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.2);
      break;}
    case 'doublejump':{
      const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.setValueAtTime(400,now);o.frequency.exponentialRampToValueAtTime(700,now+.1);
      o2.type='triangle';o2.frequency.setValueAtTime(600,now);o2.frequency.exponentialRampToValueAtTime(1000,now+.1);
      g.gain.setValueAtTime(.18,now);g.gain.exponentialRampToValueAtTime(.001,now+.22);
      o.connect(g);o2.connect(g);g.connect(actx.destination);
      o.start(now);o.stop(now+.25);o2.start(now+.05);o2.stop(now+.25);
      break;}
    case 'land':{
      const buf=actx.createBuffer(1,Math.floor(actx.sampleRate*.06),actx.sampleRate);
      const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5);
      const s=actx.createBufferSource(),f=actx.createBiquadFilter(),g=actx.createGain();
      f.type='lowpass';f.frequency.value=400;g.gain.setValueAtTime(.3,now);g.gain.exponentialRampToValueAtTime(.001,now+.06);
      s.buffer=buf;s.connect(f);f.connect(g);g.connect(actx.destination);s.start(now);s.stop(now+.07);
      break;}
    case 'coin':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sine';
      const freqs=[880,1108,1318,1760];const fi=Math.floor(Math.random()*freqs.length);
      o.frequency.setValueAtTime(freqs[fi],now);o.frequency.exponentialRampToValueAtTime(freqs[fi]*1.5,now+.08);
      g.gain.setValueAtTime(.18,now);g.gain.exponentialRampToValueAtTime(.001,now+.18);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.2);
      break;}
    case 'secretcoin':{
      [0,.07,.14].forEach((dt,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=[880,1108,1318][i]*1.5;
        g.gain.setValueAtTime(.12,now+dt);g.gain.exponentialRampToValueAtTime(.001,now+dt+.18);
        o.connect(g);g.connect(actx.destination);o.start(now+dt);o.stop(now+dt+.2);
      });
      break;}
    case 'death':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(440,now);o.frequency.exponentialRampToValueAtTime(55,now+.5);
      g.gain.setValueAtTime(.35,now);g.gain.exponentialRampToValueAtTime(.001,now+.55);
      // distortion
      const wv=actx.createWaveShaper();const crv=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;crv[i]=x*(3+20)/(1+20*Math.abs(x));}wv.curve=crv;
      o.connect(wv);wv.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.6);
      break;}
    case 'hurt':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='square';o.frequency.setValueAtTime(200,now);o.frequency.exponentialRampToValueAtTime(80,now+.22);
      g.gain.setValueAtTime(.28,now);g.gain.exponentialRampToValueAtTime(.001,now+.25);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.28);
      break;}
    case 'ability':{
      const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.setValueAtTime(440,now);o.frequency.exponentialRampToValueAtTime(880,now+.25);
      o2.type='triangle';o2.frequency.setValueAtTime(660,now);o2.frequency.exponentialRampToValueAtTime(1320,now+.25);
      g.gain.setValueAtTime(.22,now);g.gain.linearRampToValueAtTime(.28,now+.1);g.gain.exponentialRampToValueAtTime(.001,now+.35);
      o.connect(g);o2.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.38);o2.start(now);o2.stop(now+.38);
      break;}
    case 'levelup':{
      const notes=[523,659,784,1046];
      notes.forEach((f,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(.22,now+i*.1);g.gain.linearRampToValueAtTime(.28,now+i*.1+.05);g.gain.exponentialRampToValueAtTime(.001,now+i*.1+.25);
        o.connect(g);g.connect(actx.destination);o.start(now+i*.1);o.stop(now+i*.1+.28);
      });
      break;}
    case 'secret':{
      const freqs=[523,659,784,1046,1319];
      freqs.forEach((f,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(.14,now+i*.065);g.gain.exponentialRampToValueAtTime(.001,now+i*.065+.2);
        o.connect(g);g.connect(actx.destination);o.start(now+i*.065);o.stop(now+i*.065+.22);
      });
      break;}
    case 'stomp':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.setValueAtTime(80,now);o.frequency.exponentialRampToValueAtTime(30,now+.25);
      g.gain.setValueAtTime(.5,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.32);
      // Crack
      const buf=actx.createBuffer(1,Math.floor(actx.sampleRate*.12),actx.sampleRate);
      const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
      const s=actx.createBufferSource(),f=actx.createBiquadFilter(),g2=actx.createGain();
      f.type='bandpass';f.frequency.value=200;g2.gain.setValueAtTime(.35,now);g2.gain.exponentialRampToValueAtTime(.001,now+.12);
      s.buffer=buf;s.connect(f);f.connect(g2);g2.connect(actx.destination);s.start(now);s.stop(now+.14);
      break;}
    case 'freeze':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.setValueAtTime(1200,now);o.frequency.exponentialRampToValueAtTime(400,now+.3);
      g.gain.setValueAtTime(.15,now);g.gain.exponentialRampToValueAtTime(.001,now+.35);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.38);
      break;}
    case 'shield':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='triangle';o.frequency.setValueAtTime(440,now);o.frequency.exponentialRampToValueAtTime(880,now+.1);o.frequency.exponentialRampToValueAtTime(440,now+.3);
      g.gain.setValueAtTime(.2,now);g.gain.linearRampToValueAtTime(.25,now+.1);g.gain.exponentialRampToValueAtTime(.001,now+.4);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.42);
      break;}
    case 'shieldhit':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='square';o.frequency.setValueAtTime(880,now);o.frequency.exponentialRampToValueAtTime(220,now+.2);
      g.gain.setValueAtTime(.3,now);g.gain.exponentialRampToValueAtTime(.001,now+.25);
      const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=600;
      o.connect(f);f.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.28);
      break;}
    case 'buy':{
      const notes=[523,784,1046];
      notes.forEach((f,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(.18,now+i*.07);g.gain.exponentialRampToValueAtTime(.001,now+i*.07+.18);
        o.connect(g);g.connect(actx.destination);o.start(now+i*.07);o.stop(now+i*.07+.2);
      });
      break;}
    case 'error':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(180,now);o.frequency.setValueAtTime(120,now+.1);
      g.gain.setValueAtTime(.2,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.22);
      break;}
    case 'teleport':{
      [0,.05,.1,.15].forEach((dt,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=200+i*300;
        g.gain.setValueAtTime(.12,now+dt);g.gain.exponentialRampToValueAtTime(.001,now+dt+.12);
        o.connect(g);g.connect(actx.destination);o.start(now+dt);o.stop(now+dt+.15);
      });
      break;}
    case 'timeslow':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sine';o.frequency.setValueAtTime(600,now);o.frequency.exponentialRampToValueAtTime(150,now+.5);
      g.gain.setValueAtTime(.18,now);g.gain.exponentialRampToValueAtTime(.001,now+.55);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.58);
      break;}
    case 'void':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(80,now);o.frequency.exponentialRampToValueAtTime(40,now+.4);
      const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(400,now);f.frequency.exponentialRampToValueAtTime(100,now+.4);
      g.gain.setValueAtTime(.28,now);g.gain.exponentialRampToValueAtTime(.001,now+.45);
      o.connect(f);f.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.48);
      break;}
    case 'save':{
      const notes=[523,659];
      notes.forEach((f,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(.15,now+i*.08);g.gain.exponentialRampToValueAtTime(.001,now+i*.08+.15);
        o.connect(g);g.connect(actx.destination);o.start(now+i*.08);o.stop(now+i*.08+.18);
      });
      break;}
    case 'equip':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='triangle';o.frequency.setValueAtTime(660,now);o.frequency.exponentialRampToValueAtTime(990,now+.12);
      g.gain.setValueAtTime(.18,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.22);
      break;}
    case 'meow':{
      // Synthesized meow: sawtooth vowel sweep + formant bandpass
      const o=actx.createOscillator(),f=actx.createBiquadFilter(),g=actx.createGain();
      o.type='sawtooth';
      o.frequency.setValueAtTime(380,now);o.frequency.linearRampToValueAtTime(620,now+.12);o.frequency.exponentialRampToValueAtTime(380,now+.28);
      f.type='bandpass';f.frequency.setValueAtTime(700,now);f.frequency.linearRampToValueAtTime(1400,now+.12);f.frequency.exponentialRampToValueAtTime(900,now+.28);f.Q.value=2.5;
      g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.34,now+.04);g.gain.setValueAtTime(.34,now+.18);g.gain.exponentialRampToValueAtTime(.001,now+.32);
      o.connect(f);f.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.35);
      break;}
    case 'catdeath':{
      // Sad descending meow for when the cat dies
      const o=actx.createOscillator(),f=actx.createBiquadFilter(),g=actx.createGain();
      o.type='sawtooth';
      o.frequency.setValueAtTime(500,now);o.frequency.exponentialRampToValueAtTime(180,now+.55);
      f.type='bandpass';f.frequency.setValueAtTime(1000,now);f.frequency.exponentialRampToValueAtTime(400,now+.55);f.Q.value=2;
      g.gain.setValueAtTime(.38,now);g.gain.setValueAtTime(.38,now+.3);g.gain.exponentialRampToValueAtTime(.001,now+.6);
      o.connect(f);f.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.65);
      break;}
    case 'bosshit':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(120,now);o.frequency.exponentialRampToValueAtTime(55,now+.22);
      g.gain.setValueAtTime(.5,now);g.gain.exponentialRampToValueAtTime(.001,now+.28);
      const wv=actx.createWaveShaper();const crv=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;crv[i]=x*(1+15*Math.abs(x))/(1+15*Math.abs(x)*Math.abs(x));}wv.curve=crv;
      o.connect(wv);wv.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.3);
      break;}
    case 'laser':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='square';o.frequency.setValueAtTime(800,now);o.frequency.exponentialRampToValueAtTime(200,now+.12);
      g.gain.setValueAtTime(.18,now);g.gain.exponentialRampToValueAtTime(.001,now+.14);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.15);
      break;}
    case 'starthrow':{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='triangle';o.frequency.setValueAtTime(600,now);o.frequency.exponentialRampToValueAtTime(1200,now+.08);
      g.gain.setValueAtTime(.16,now);g.gain.exponentialRampToValueAtTime(.001,now+.12);
      o.connect(g);g.connect(actx.destination);o.start(now);o.stop(now+.13);
      break;}
    case 'heartget':{
      [0,.06,.12].forEach((dt,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='sine';o.frequency.value=[523,659,784][i];
        g.gain.setValueAtTime(.16,now+dt);g.gain.exponentialRampToValueAtTime(.001,now+dt+.22);
        o.connect(g);g.connect(actx.destination);o.start(now+dt);o.stop(now+dt+.25);
      });break;}
    case 'rankup':{
      [0,.1,.2,.3].forEach((dt,i)=>{
        const o=actx.createOscillator(),g=actx.createGain();
        o.type='triangle';o.frequency.value=[523,659,784,1047][i];
        g.gain.setValueAtTime(.14,now+dt);g.gain.exponentialRampToValueAtTime(.001,now+dt+.18);
        o.connect(g);g.connect(actx.destination);o.start(now+dt);o.stop(now+dt+.22);
      });break;}
  }
}

// ── 10 Distinct music styles — one per world ────────────────────────────────
const THEMES=[
  // LVL 1 "STEREO RUSH" — E minor 135bpm — upbeat GD electro, sawtooth lead
  {bpm:135/2,root:82.41,
   chords:[[0,3,7],[3,7,10],[8,12,15],[5,8,12]],
   mel: [7,10,12,10,7,5,7,10,12,15,12,10,7,5,7,10],
   bass:[0,0,0,3,3,3,10,10,8,8,5,5,3,3,0,0],
   arp: [0,7,12,7],
   kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   hat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // LVL 2 "NEON FOREST" — F major 108bpm — slow synthwave, dreamy pads, triangle lead
  {bpm:108,root:87.31,
   chords:[[0,4,7],[5,9,12],[3,7,10],[7,11,14]],
   mel: [12,11,9,7,9,11,12,14,12,11,9,7,5,7,9,12],
   bass:[0,0,0,0,5,5,5,5,3,3,3,3,7,7,7,7],
   arp: [0,4,7,12],
   kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   hat: [0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
   ohat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
   wave:'sawtooth',leadWave:'triangle',noPad:false},
  // LVL 3 "CHIPBEAT" — A minor 168bpm — fast 8-bit chiptune, square everything, no pads
  {bpm:168/2,root:55,
   chords:[[0,3,7],[5,8,12],[7,10,14],[3,7,10]],
   mel: [12,12,15,12,10,10,12,10,7,7,9,7,5,7,10,12],
   bass:[0,0,3,0,5,0,7,0,3,0,5,0,7,0,5,0],
   arp: [0,3,7,12],
   kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
   snr: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,1,0],
   hat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
   ohat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
   wave:'square',leadWave:'square',noPad:true},
  // LVL 4 "VOLTAGE DROP" — D# minor 140bpm — dubstep half-time, heavy bass drops
  {bpm:140/2,root:77.78,
   chords:[[0,3,7],[8,11,15],[5,8,12],[3,6,10]],
   mel: [12,0,12,15,12,0,10,0,8,0,8,10,12,0,15,0],
   bass:[0,0,7,0,3,0,10,7,5,0,8,0,3,5,0,3],
   arp: [0,7,12,7],
   kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
   snr: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // LVL 5 "FINAL SURGE" — B minor 190bpm — relentless industrial, max intensity
  {bpm:190/2,root:61.74,
   chords:[[0,3,7],[7,10,14],[5,8,12],[3,6,10]],
   mel: [12,15,17,15,12,10,12,14,15,17,19,17,15,12,10,12],
   bass:[0,7,0,7,5,5,3,3,7,7,5,5,3,3,0,0],
   arp: [0,3,7,10],
   kick:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // LVL 6 "DARK ORBIT" — C# minor 125bpm — space ambient drum&bass, triangle lead, off-beat hats
  {bpm:125/2,root:69.30,
   chords:[[0,3,7],[5,8,12],[7,10,14],[8,11,15]],
   mel: [7,7,10,12,10,7,5,3,5,7,10,7,5,3,0,3],
   bass:[0,0,0,0,5,5,5,5,7,7,7,7,8,8,8,8],
   arp: [0,7,12,7],
   kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   hat: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
   wave:'sawtooth',leadWave:'triangle',noPad:false},
  // LVL 7 "ICE STORM" — F# minor 158bpm — icy fast aggression, square waves, extra ghost snares
  {bpm:158/2,root:92.50,
   chords:[[0,3,7],[5,8,12],[3,7,10],[7,10,14]],
   mel: [12,15,17,12,10,7,5,7,10,12,15,12,10,7,5,10],
   bass:[0,0,5,5,3,3,7,7,0,0,5,5,7,7,3,3],
   arp: [0,7,12,15],
   kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
   snr: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,1],
   hat: [1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
   ohat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
   wave:'square',leadWave:'square',noPad:false},
  // LVL 8 "MOLTEN PULSE" — G# minor 152bpm — industrial metal, half-time snare, machine-gun hats
  {bpm:152/2,root:103.83,
   chords:[[0,3,7],[5,8,12],[8,11,15],[3,6,10]],
   mel: [7,7,10,12,15,12,10,7,5,7,10,12,10,7,5,7],
   bass:[0,0,7,0,5,5,3,0,7,0,5,0,3,3,0,5],
   arp: [0,7,12,7],
   kick:[1,0,1,0,0,0,1,0,1,0,0,1,0,0,1,0],
   snr: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // LVL 9 "VOID GLITCH" — D minor 178bpm — chaotic glitch, square/no-pads, erratic kick/snare
  {bpm:178/2,root:73.42,
   chords:[[0,3,7],[5,8,12],[7,10,14],[10,13,17]],
   mel: [12,15,12,7,10,12,15,17,12,10,7,10,12,15,10,12],
   bass:[0,0,7,0,5,0,0,3,7,0,5,0,3,0,0,5],
   arp: [0,3,7,12],
   kick:[1,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0],
   snr: [0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,1],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
   wave:'square',leadWave:'square',noPad:true},
  // LVL 10 "THE DESCENT" — A minor 205bpm — absolute maximum, double kicks, drama ascending runs
  {bpm:205/2,root:110,
   chords:[[0,3,7],[5,8,12],[7,11,14],[10,14,17]],
   mel: [12,15,17,19,17,15,12,15,17,19,22,19,17,15,12,17],
   bass:[0,7,0,5,3,0,7,5,0,7,3,5,0,3,7,0],
   arp: [0,3,7,10],
   kick:[1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,0],
   snr: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,1,0],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // EXTRA 11 "ELECTROMAN ADV" — D major 155bpm — energetic GD electro, fast hats, driving bass
  {bpm:155/2,root:293.66,
   chords:[[0,4,7],[5,9,12],[7,11,14],[2,6,9]],
   mel: [12,14,12,9,7,9,12,14,16,14,12,9,7,9,12,16],
   bass:[0,0,7,0,5,5,4,0,7,0,5,0,4,4,0,5],
   arp: [0,7,12,16],
   kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // EXTRA 12 "ELECTRODYNAMIX" — A minor 175bpm — ultra intense, double kick, relentless energy
  {bpm:175/2,root:110,
   chords:[[0,3,7],[5,8,12],[7,10,14],[3,7,10]],
   mel: [12,15,12,10,7,10,12,15,17,15,12,10,12,15,17,19],
   bass:[0,7,0,7,5,5,3,3,7,7,5,5,3,3,0,7],
   arp: [0,7,12,15],
   kick:[1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,0],
   snr: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,1,0],
   hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
   wave:'sawtooth',leadWave:'sawtooth',noPad:false},
  // EXTRA 13 "POLARGEIST" — D minor 95bpm — dark atmospheric, sparse drums, square lead
  {bpm:95/2,root:146.83,
   chords:[[0,3,7],[5,8,12],[8,11,15],[3,6,10]],
   mel: [7,7,5,3,0,3,5,7,10,7,5,3,5,7,10,12],
   bass:[0,0,0,0,5,5,5,5,3,3,3,3,0,0,0,0],
   arp: [0,3,7,10],
   kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   hat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
   wave:'square',leadWave:'square',noPad:false},
  // EXTRA 14 "PRESS START" — C major 145bpm — 8-bit chiptune, square everything, noPad
  {bpm:145/2,root:261.63,
   chords:[[0,4,7],[5,9,12],[7,11,14],[4,7,11]],
   mel: [12,12,14,12,9,9,12,14,16,14,12,14,12,9,7,9],
   bass:[0,0,4,0,5,0,7,0,4,0,5,0,7,7,0,0],
   arp: [0,4,7,12],
   kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0],
   hat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
   ohat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
   wave:'square',leadWave:'square',noPad:true},
  // EXTRA 15 "CAT THEME" — G major 110bpm — playful cute, triangle lead, garden vibes
  {bpm:110/2,root:196,
   chords:[[0,4,7],[5,9,12],[7,11,14],[2,5,9]],
   mel: [12,14,16,14,12,9,7,9,12,14,16,19,16,14,12,14],
   bass:[0,0,0,0,5,5,5,5,7,7,7,7,5,5,2,2],
   arp: [0,4,7,12],
   kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
   snr: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   hat: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
   ohat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
   wave:'triangle',leadWave:'triangle',noPad:false},
];
const THEME_NAMES=['STEREO RUSH','NEON FOREST','CHIPBEAT','VOLTAGE DROP','FINAL SURGE','DARK ORBIT','ICE STORM','MOLTEN PULSE','VOID GLITCH','THE DESCENT','ELECTROMAN ADV','ELECTRODYNAMIX','POLARGEIST','PRESS START','CAT THEME'];
function n2f(root,semi){return root*Math.pow(2,semi/12);}
function mkReverb(dur,dec){
  const sr=actx.sampleRate,len=Math.floor(sr*dur),buf=actx.createBuffer(2,len,sr);
  for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,dec);}
  const cv=actx.createConvolver();cv.buffer=buf;return cv;
}
function playNote(freq,t,dur,type,gain,dst){
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.02);
  g.gain.setValueAtTime(gain,t+dur-.05);g.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.05);
  musicNodes.push(o,g);
}
function initDrBufs(){
  if(drBufs||!actx)return;
  drBufs={};
  const sr=actx.sampleRate;
  function mkBuf(dur){const b=actx.createBuffer(1,Math.floor(sr*dur),sr);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}
  drBufs.kickClick=mkBuf(.012);drBufs.snare=mkBuf(.18);drBufs.snareRattle=mkBuf(.22);drBufs.hat=mkBuf(.055);drBufs.openhat=mkBuf(.28);
}
function trackSrc(src,...deps){
  musicNodes.push(src,...deps);
  src.addEventListener('ended',()=>{[src,...deps].forEach(n=>{const i=musicNodes.indexOf(n);if(i>=0)musicNodes.splice(i,1);});},{once:true});
}
function playDrum(t,type){
  if(!actx)return;
  initDrBufs();
  if(type==='kick'){
    const delay=Math.max(0,(t-actx.currentTime)*1000-20);
    setTimeout(()=>{beatPulse=1;},delay);
    const o=actx.createOscillator(),g=actx.createGain();
    o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);
    g.gain.setValueAtTime(1.0,t);g.gain.exponentialRampToValueAtTime(.001,t+.38);
    o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+.4);trackSrc(o,g);
    const cs=actx.createBufferSource(),cf=actx.createBiquadFilter(),cg=actx.createGain();
    cf.type='bandpass';cf.frequency.value=3200;cf.Q.value=1;
    cg.gain.setValueAtTime(.55,t);cg.gain.exponentialRampToValueAtTime(.001,t+.012);
    cs.buffer=drBufs.kickClick;cs.connect(cf);cf.connect(cg);cg.connect(actx.destination);cs.start(t);cs.stop(t+.015);trackSrc(cs,cf,cg);
    const sub=actx.createOscillator(),subg=actx.createGain();
    sub.type='sine';sub.frequency.setValueAtTime(65,t);sub.frequency.exponentialRampToValueAtTime(28,t+.18);
    subg.gain.setValueAtTime(.55,t);subg.gain.exponentialRampToValueAtTime(.001,t+.22);
    sub.connect(subg);subg.connect(actx.destination);sub.start(t);sub.stop(t+.25);trackSrc(sub,subg);
  }else if(type==='snare'){
    const s=actx.createBufferSource(),f=actx.createBiquadFilter(),sg=actx.createGain();
    f.type='bandpass';f.frequency.value=3400;f.Q.value=0.6;
    sg.gain.setValueAtTime(.7,t);sg.gain.exponentialRampToValueAtTime(.001,t+.18);
    s.buffer=drBufs.snare;s.connect(f);f.connect(sg);sg.connect(actx.destination);s.start(t);s.stop(t+.2);trackSrc(s,f,sg);
    const rs=actx.createBufferSource(),rf=actx.createBiquadFilter(),rg=actx.createGain();
    rf.type='highpass';rf.frequency.value=6000;rg.gain.setValueAtTime(.32,t);rg.gain.exponentialRampToValueAtTime(.001,t+.22);
    rs.buffer=drBufs.snareRattle;rs.connect(rf);rf.connect(rg);rg.connect(actx.destination);rs.start(t);rs.stop(t+.24);trackSrc(rs,rf,rg);
    const o=actx.createOscillator(),og=actx.createGain();
    o.type='triangle';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(95,t+.08);
    og.gain.setValueAtTime(.3,t);og.gain.exponentialRampToValueAtTime(.001,t+.1);
    o.connect(og);og.connect(actx.destination);o.start(t);o.stop(t+.12);trackSrc(o,og);
  }else if(type==='hat'){
    const s=actx.createBufferSource(),f=actx.createBiquadFilter(),hg=actx.createGain();
    f.type='highpass';f.frequency.value=10000;
    hg.gain.setValueAtTime(.16,t);hg.gain.exponentialRampToValueAtTime(.001,t+.055);
    s.buffer=drBufs.hat;s.connect(f);f.connect(hg);hg.connect(actx.destination);s.start(t);s.stop(t+.07);trackSrc(s,f,hg);
  }else if(type==='openhat'){
    const s=actx.createBufferSource(),f=actx.createBiquadFilter(),hg=actx.createGain();
    f.type='bandpass';f.frequency.value=7500;f.Q.value=0.5;
    hg.gain.setValueAtTime(.25,t);hg.gain.exponentialRampToValueAtTime(.001,t+.28);
    s.buffer=drBufs.openhat;s.connect(f);f.connect(hg);hg.connect(actx.destination);s.start(t);s.stop(t+.3);trackSrc(s,f,hg);
  }
}
function playLevelMusic(idx){
  if(!actx||!musicOn)return;
  stopMusic();
  const th=THEMES[Math.min(idx,THEMES.length-1)];
  const bl=60/th.bpm/4; // bl = one 16th-note duration
  let rev;try{rev=mkReverb(2.6,2.8);}catch(e){return;}
  // Master compressor — makes everything punch harder
  const comp=actx.createDynamicsCompressor();
  comp.threshold.value=-18;comp.knee.value=8;comp.ratio.value=4;
  comp.attack.value=0.004;comp.release.value=0.18;
  comp.connect(actx.destination);
  const mg=actx.createGain();mg.gain.value=.22;mg.connect(comp);
  rev.connect(mg);musicNodes.push(mg,rev,comp);

  // Fat detuned sawtooth bass (two oscillators + LP filter sweep)
  function fatBass(freq,t,dur){
    const o1=actx.createOscillator(),o2=actx.createOscillator(),o3=actx.createOscillator();
    const lp=actx.createBiquadFilter(),g=actx.createGain();
    lp.type='lowpass';
    lp.frequency.setValueAtTime(200,t);
    lp.frequency.linearRampToValueAtTime(520,t+dur*.3);
    lp.frequency.linearRampToValueAtTime(260,t+dur);
    lp.Q.value=1.8;
    o1.type='sawtooth';o2.type='sawtooth';o3.type='square';
    o1.frequency.value=freq;o2.frequency.value=freq*1.009;o3.frequency.value=freq*.5;
    const g3=actx.createGain();g3.gain.value=.12; // quiet sub harmonic
    o3.connect(g3);g3.connect(lp);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.42,t+.012);
    g.gain.setValueAtTime(.42,t+dur*.75);g.gain.linearRampToValueAtTime(0,t+dur);
    o1.connect(lp);o2.connect(lp);lp.connect(g);g.connect(mg);
    o1.start(t);o1.stop(t+dur+.04);o2.start(t);o2.stop(t+dur+.04);o3.start(t);o3.stop(t+dur+.04);
    musicNodes.push(o1,o2,o3,lp,g,g3);
  }
  // 16th-note arpeggio — slightly louder, brighter
  function arpNote(freq,t){
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=th.wave;o.frequency.value=freq;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.005);
    g.gain.setValueAtTime(.09,t+bl*.5);g.gain.linearRampToValueAtTime(0,t+bl*.85);
    o.connect(g);g.connect(rev);o.start(t);o.stop(t+bl+.01);
    musicNodes.push(o,g);
  }
  // Melody lead with vibrato — more expressive
  function leadNote(freq,t,dur){
    const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
    o.type=th.leadWave||th.wave;
    o2.type='sine';
    o.frequency.value=freq;
    o2.frequency.value=freq*2.003;
    // Vibrato: LFO modulates pitch slightly
    const lfo=actx.createOscillator(),lfog=actx.createGain();
    lfo.type='sine';lfo.frequency.value=5.5;
    lfog.gain.value=freq*.012; // ~1.2% pitch depth
    lfo.connect(lfog);lfog.connect(o.frequency);
    lfo.start(t);lfo.stop(t+dur+.04);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.14,t+.015);
    g.gain.setValueAtTime(.14,t+dur*.6);g.gain.linearRampToValueAtTime(0,t+dur);
    const g2=actx.createGain();g2.gain.value=.04;
    o.connect(g);o2.connect(g2);g2.connect(g);g.connect(rev);
    o.start(t);o.stop(t+dur+.02);o2.start(t);o2.stop(t+dur+.02);
    musicNodes.push(o,o2,lfo,lfog,g,g2);
  }
  // Chord pad — triangle for warmth, slightly louder
  function padChord(semis,t,dur){
    semis.forEach((s,ci)=>{
      const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
      o.type='triangle';o.frequency.value=n2f(th.root*2,s);
      o2.type='sine';o2.frequency.value=n2f(th.root*4,s); // octave up, quiet
      const g2=actx.createGain();g2.gain.value=.012;
      const peak=.038+ci*.012;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+.4);
      g.gain.setValueAtTime(peak,t+dur-.3);g.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(g);o2.connect(g2);g2.connect(g);g.connect(rev);
      o.start(t);o.stop(t+dur+.05);o2.start(t);o2.stop(t+dur+.05);
      musicNodes.push(o,o2,g,g2);
    });
  }

  function sched(){
    if(!actx||actx.state==='closed')return;
    const now=actx.currentTime+.05;
    for(let step=0;step<16;step++){
      const t=now+step*bl;
      const beat=Math.floor(step/4);
      const sub=step%4;
      const chord=th.chords[beat%th.chords.length];
      // Drums
      if(th.kick[step]) playDrum(t,'kick');
      if(th.snr[step])  playDrum(t,'snare');
      if(th.hat[step])  playDrum(t,'hat');
      if(th.ohat[step]) playDrum(t,'openhat');
      // Fat bass on every 8th note (even steps)
      if(step%2===0) fatBass(n2f(th.root,th.bass[step]),t,bl*1.75);
      // Arpeggio — 16th-note cycle through chord tones
      arpNote(n2f(th.root*4,chord[0]+th.arp[sub%th.arp.length]),t);
      // Melody lead on every 8th note (even steps)
      if(step%2===0) leadNote(n2f(th.root*4,th.mel[step]),t+bl*.2,bl*1.7);
      // Chord pad changes every beat (every 4 steps) — skip for chiptune themes
      if(sub===0&&!th.noPad) padChord(chord,t,bl*4);
    }
  }
  sched();
  beatInterval=setInterval(()=>{if(musicOn&&(gameState==='playing'||gameState==='gameover'))sched();},bl*16*1000);
}
document.getElementById('mBtn').onclick=()=>{
  musicOn=!musicOn;document.getElementById('mBtn').textContent='🎵 '+(musicOn?'ON':'OFF');
  if(musicOn&&gameState==='playing'){initAudio();gameMode==='risingLava'?playRisingLavaMusic():playLevelMusic(currentLevel);}else stopMusic();
};

// ── Rising Lava Mode Music ─────────────────
// A-minor chord progression with piano, bass and pad layers.
// Piano uses a fast-attack / slow-decay envelope to mimic a real instrument.
function playRisingLavaMusic(){
  if(!actx||!musicOn)return;
  stopMusic();
  const bpm=140,bl=60/bpm;
  let rev;try{rev=mkReverb(2,4);}catch(e){return;}
  const mg=actx.createGain();mg.gain.value=.2;mg.connect(actx.destination);rev.connect(mg);
  musicNodes.push(mg,rev);

  // Piano-like: triangle+harmonic overtone, quick attack, natural decay
  function piano(freq,t,dur,gain,dst){
    const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
    o.type='triangle';o2.type='sine';o.frequency.value=freq;o2.frequency.value=freq*2.003;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.012);
    g.gain.exponentialRampToValueAtTime(gain*.3,t+.12);g.gain.exponentialRampToValueAtTime(.001,t+Math.max(dur,.3));
    o.connect(g);o2.connect(g);g.connect(dst);
    o.start(t);o.stop(t+Math.max(dur,.3)+.05);o2.start(t);o2.stop(t+Math.max(dur,.3)+.05);
    musicNodes.push(o,o2,g);
  }
  // Warm bass: filtered triangle, tight decay
  function bass(freq,t,dur,dst){
    const o=actx.createOscillator(),f=actx.createBiquadFilter(),g=actx.createGain();
    o.type='triangle';f.type='lowpass';f.frequency.value=420;o.frequency.value=freq;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.38,t+.018);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(f);f.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.05);musicNodes.push(o,f,g);
  }
  // Slow-attack chord pad for richness
  function pad(freqs,t,dur,dst){
    freqs.forEach(freq=>{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='sawtooth';o.frequency.value=freq;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.022,t+.55);
      g.gain.setValueAtTime(.022,t+dur-.45);g.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.1);musicNodes.push(o,g);
    });
  }

  // A natural minor: Am | Am | F | G (4 beats each = 16 beats per loop)
  const chords=[[220,261.63,329.63],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
  const bLines=[110,110,110,110, 110,110,110,110, 87.31,87.31,87.31,87.31, 98,98,98,98];
  // Melody: E5 D5 C5 B4 | A4 G4 A4 C5 | F4 A4 C5 A4 | G4 B4 D5 G5
  const mel=[659.25,587.33,523.25,493.88, 440,392,440,523.25, 349.23,440,523.25,440, 392,493.88,587.33,783.99];

  function sched(){
    if(!actx||actx.state==='closed')return;
    const now=actx.currentTime+.05;
    for(let i=0;i<16;i++){
      const t=now+i*bl;
      if(i%4===0)playDrum(t,'kick');
      if(i%4===2)playDrum(t,'snare');
      playDrum(t,'hat');
      bass(bLines[i],t,bl*.8,mg);
      piano(mel[i],t,bl*.88,.24,rev);
      if(i%4===0)pad(chords[Math.floor(i/4)],t,bl*4,rev);
    }
  }
  sched();
  beatInterval=setInterval(()=>{if(musicOn&&(gameState==='playing'||gameState==='gameover'))sched();},bl*16*1000);
}

// ══════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════
const VERSION='v1.6';
const SK='ndultra_v3';
function saveGame(silent=false){
  try{localStorage.setItem(SK,JSON.stringify({totalCoins,selectedSkin,unlockedSkins,completedLevels,catFishStock,catNipStock,catMilkStock,catTreatStock,activeCatSkin,unlockedCatSkins,difficulty,sfxOn,bestScores,lastSaveTime:Date.now(),lastDailyBonus:new Date().toDateString()}));if(!silent){playSFX('save');showNotif('SAVED','#00ffff');}}catch(e){}
}
function loadGame(){
  try{
    const r=localStorage.getItem(SK);if(!r)return;const d=JSON.parse(r);
    totalCoins=d.totalCoins??0;selectedSkin=d.selectedSkin??0;unlockedSkins=d.unlockedSkins??[0];completedLevels=d.completedLevels??[];player.color=SKINS[selectedSkin].color;
    catFishStock=d.catFishStock??5;catNipStock=d.catNipStock??3;catMilkStock=d.catMilkStock??4;catTreatStock=d.catTreatStock??2;activeCatSkin=d.activeCatSkin??0;unlockedCatSkins=d.unlockedCatSkins??[0];
    difficulty=d.difficulty??'medium';sfxOn=d.sfxOn??true;const _bs=d.bestScores??{};bestScores={story:_bs.story??0,endless:_bs.endless??0,risingLava:_bs.risingLava??0,arena:_bs.arena??0};
    // Offline coin bonus — 1 coin per 2 minutes away, max 60
    if(d.lastSaveTime){
      const mins=Math.floor((Date.now()-d.lastSaveTime)/60000);
      if(mins>=30){const bonus=Math.min(60,Math.floor(mins/2));totalCoins+=bonus;setTimeout(()=>showNotif(`🕐 OFFLINE BONUS: +${bonus} ◉ (${mins}m away)!`,'#FFD700'),1200);}
    }
    // Daily login reward — 15 bonus coins once per day
    const today=new Date().toDateString();
    if(d.lastDailyBonus!==today){totalCoins+=15;setTimeout(()=>showNotif('🌟 DAILY REWARD: +15 ◉!','#FFD700'),2200);}
  }catch(e){}
}
function hardReset(){
  try{localStorage.removeItem(SK);}catch(e){}
  totalCoins=0;selectedSkin=0;unlockedSkins=[0];player.color=SKINS[0].color;catFishStock=5;catNipStock=3;catMilkStock=4;catTreatStock=2;activeCatSkin=0;unlockedCatSkins=[0];playSFX('error');showNotif('RESET','#ff6b6b');
}
function getDiffLives(){return{easy:5,medium:3,hard:2,hardcore:1}[difficulty]||3;}
function getDiffEnemyMult(){return{easy:0.65,medium:1,hard:1.35,hardcore:1.75}[difficulty]||1;}
function getDiffPlatBonus(){return{easy:55,medium:0,hard:-20,hardcore:-45}[difficulty]||0;}
function getDiffGapMult(){return{easy:0.72,medium:1,hard:1.28,hardcore:1.6}[difficulty]||1;}
function getDiffScoreMult(){return{easy:0.75,medium:1,hard:1.5,hardcore:2.5}[difficulty]||1;}
function diffColor(){return{easy:'#44ff88',medium:'#ffdd44',hard:'#ff7722',hardcore:'#ff2244'}[difficulty]||'#ffdd44';}
let _notifTimer=null;
function showNotif(msg,color='#00ffff'){
  const el=document.getElementById('notif');el.textContent=msg;el.style.color=color;
  el.style.borderColor=color;el.style.boxShadow=`0 0 30px ${color}44,inset 0 0 20px ${color}08`;
  el.classList.add('show');clearTimeout(_notifTimer);_notifTimer=setTimeout(()=>el.classList.remove('show'),2000);
}

// ══════════════════════════════════════════
//  PARTICLES (enhanced with more shapes/types)
// ══════════════════════════════════════════
const particles=[];
class Particle{
  constructor(x,y,color,vx,vy,life,size=4,world=true,shape='square'){
    Object.assign(this,{x,y,color,vx,vy,life,maxLife:life,size,world,shape});
  }
  update(){this.x+=this.vx;this.y+=this.vy;this.vy+=.055;this.vx*=.96;this.life--;}
  draw(ox=0,oy=0){
    const a=this.life/this.maxLife;
    ctx.save();ctx.globalAlpha=a;ctx.shadowColor=this.color;ctx.shadowBlur=10;ctx.fillStyle=this.color;
    const s=this.size*a;
    const dx=this.world?this.x-ox:this.x,dy=this.world?this.y-oy:this.y;
    if(this.shape==='circle'){ctx.beginPath();ctx.arc(dx,dy,s/2,0,Math.PI*2);ctx.fill();}
    else if(this.shape==='star'){ctx.save();ctx.translate(dx,dy);drawStarShape(0,0,s,s*.4,5);ctx.fill();ctx.restore();}
    else if(this.shape==='ring'){ctx.beginPath();ctx.arc(dx,dy,s,0,Math.PI*2);ctx.strokeStyle=this.color;ctx.lineWidth=1.5;ctx.stroke();}
    else if(this.shape==='spark'){
      ctx.save();ctx.translate(dx,dy);ctx.rotate(Math.atan2(this.vy,this.vx));
      ctx.fillRect(-s*1.5,-s*.25,s*3,s*.5);ctx.restore();
    }
    else{ctx.fillRect(dx-s/2,dy-s/2,s,s);}
    ctx.restore();
  }
}
function spawnBurst(x,y,color,count=15,speed=5){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=Math.random()*speed;
    const shapes=['square','circle','spark'];
    particles.push(new Particle(x,y,color,Math.cos(a)*s,Math.sin(a)*s-1,25+Math.random()*20,3+Math.random()*4,true,shapes[Math.floor(Math.random()*shapes.length)]));
  }
}
function spawnRing(x,y,color,count=12,radius=30){
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2;
    particles.push(new Particle(x+Math.cos(a)*radius,y+Math.sin(a)*radius,color,Math.cos(a)*2,Math.sin(a)*2-1.5,22,3+Math.random()*2,true,'circle'));
  }
}
function spawnShockwave(x,y,color){
  for(let r=0;r<3;r++){
    const p=new Particle(x,y,color,0,0,15+r*5,20+r*12,true,'ring');
    p.vx=0;p.vy=0;p.update=function(){this.size+=4;this.life--;};
    particles.push(p);
  }
}

// ══════════════════════════════════════════
//  SKINS — rebalanced (more expensive, less OP)
// ══════════════════════════════════════════
const SKINS=[
  {name:'CUBE',    color:'#FF6B6B',cost:0,   spd:1.0, jmp:1.0, shape:'cube',   trail:['#FF6B6B','#FF9999'],ability:'dash',     abilityName:'DASH',       abilityDesc:'Forward burst',              abilityCooldown:200, abilityDuration:10},
  {name:'SPEEDER', color:'#6B9BFF',cost:100,  spd:1.2, jmp:0.95,shape:'bolt',   trail:['#6B9BFF','#aaddff','#ffffff'],ability:'rocket',   abilityName:'ROCKET',     abilityDesc:'Quick upward boost',         abilityCooldown:240, abilityDuration:15},
  {name:'JUMPER',  color:'#6BFF6B',cost:150,  spd:0.95,jmp:1.25,shape:'star',   trail:['#6BFF6B','#ccffcc'],ability:'doubleJump',abilityName:'SUPER JUMP', abilityDesc:'+1 bonus jump',             abilityCooldown:280, abilityDuration:1},
  {name:'PHANTOM', color:'#C96BFF',cost:225,  spd:1.1, jmp:1.1, shape:'ghost',  trail:['#C96BFF','#eebbff'],ability:'ghost',    abilityName:'PHASE',      abilityDesc:'Brief hazard phasing',      abilityCooldown:360, abilityDuration:60},
  {name:'KING',    color:'#FFD700',cost:350,  spd:1.2, jmp:1.2, shape:'crown',  trail:['#FFD700','#FFA500'],ability:'decree',   abilityName:'ROYAL DECREE',abilityDesc:'Freeze enemies, rain coins',abilityCooldown:400, abilityDuration:1},
  {name:'CYBER',   color:'#00FFFF',cost:275,  spd:1.05,jmp:1.2, shape:'diamond',trail:['#00FFFF','#00DDDD'],ability:'freeze',   abilityName:'FREEZE',     abilityDesc:'Slow then freeze enemies',  abilityCooldown:340, abilityDuration:100},
  {name:'LAVA',    color:'#FF4500',cost:400,  spd:1.15,jmp:1.15,shape:'orb',    trail:['#FF4500','#FFAA00','#ff6600'],ability:'stomp',    abilityName:'STOMP',      abilityDesc:'Ground slam shockwave',     abilityCooldown:200, abilityDuration:22},
  {name:'ICE',     color:'#AAEEFF',cost:375,  spd:1.1, jmp:1.0, shape:'crystal',trail:['#AAEEFF','#66CCFF','#ffffff'],ability:'shield',   abilityName:'ICE SHIELD', abilityDesc:'Absorb one hit',            abilityCooldown:480, abilityDuration:160},
  {name:'SHADOW',  color:'#6644AA',cost:550,  spd:1.35,jmp:1.35,shape:'ghost',  trail:['#6644AA','#AA88EE'],ability:'timeSlow', abilityName:'TIME SLOW',  abilityDesc:'Slow everything briefly',   abilityCooldown:420, abilityDuration:90},
  {name:'STAR',    color:'#FFFF44',cost:475,  spd:1.2, jmp:1.5, shape:'star',   trail:['#FFFF44','#FF9900','#ffffff'],ability:'teleport', abilityName:'WARP',       abilityDesc:'Short-range teleport',       abilityCooldown:260, abilityDuration:1},
  {name:'TOXIC',   color:'#88FF00',cost:500,  spd:1.25,jmp:1.15,shape:'orb',    trail:['#88FF00','#CCFF66','#44ff44'],ability:'toxic',    abilityName:'TOXIC CLOUD',abilityDesc:'Poison nearby enemies',     abilityCooldown:240, abilityDuration:50},
  {name:'VOID',    color:'#9900FF',cost:750,  spd:1.45,jmp:1.6, shape:'tri',    trail:['#9900FF','#CC00FF'],ability:'void',     abilityName:'VOID RIFT',  abilityDesc:'Pull all coins, freeze all enemies, immunity', abilityCooldown:320, abilityDuration:90},
  {name:'AURORA',  color:'#44ffcc',cost:900,  spd:1.25,jmp:1.5, shape:'crystal',trail:['#44ffcc','#44aaff','#aaffee'],ability:'rocket',   abilityName:'AURORA LAUNCH',abilityDesc:'Powerful sky burst',     abilityCooldown:220,abilityDuration:1},
  {name:'PRISM',   color:'#ff88ff',cost:1200, spd:1.35,jmp:1.45,shape:'tri',    trail:['#ff88ff','#ffff66','#88ffff'],ability:'teleport', abilityName:'PRISM WARP', abilityDesc:'Warp forward instantly',   abilityCooldown:220,abilityDuration:1},
  {name:'OMEGA',   color:'#ff3300',cost:1600, spd:1.6, jmp:1.55,shape:'bolt',   trail:['#ff3300','#ff8800','#ffff00'],ability:'stomp',    abilityName:'OMEGA SLAM', abilityDesc:'Devastating slam wave',    abilityCooldown:240,abilityDuration:25},
  {name:'DIVINE',  color:'#fffff0',cost:2500, spd:1.7, jmp:1.8, shape:'crown',  trail:['#fffff0','#ffddff','#ddffff'],ability:'divine',   abilityName:'ASCEND',     abilityDesc:'Full invincibility+boost', abilityCooldown:500,abilityDuration:200},
  // ── Cat skins (can appear as 5% featured offer in shop) ──────────────────
  {name:'KITTY',   color:'#FF99CC',cost:300,  spd:1.1, jmp:1.15,shape:'cat',   trail:['#FF99CC','#ffddee','#ffffff'],ability:'dash',     abilityName:'POUNCE',     abilityDesc:'Quick dash burst',          abilityCooldown:180,abilityDuration:10},
  {name:'NEKKO',   color:'#CC88FF',cost:600,  spd:1.2, jmp:1.3, shape:'cat',   trail:['#CC88FF','#eebbff','#ffffff'],ability:'doubleJump',abilityName:'LEAP',       abilityDesc:'+1 bonus jump',            abilityCooldown:240,abilityDuration:1},
  {name:'PURRFECT',color:'#FFD700',cost:1000, spd:1.3, jmp:1.4, shape:'cat',   trail:['#FFD700','#ff99cc','#ffffff'],ability:'ghost',    abilityName:'STEALTH',    abilityDesc:'Phase through hazards',    abilityCooldown:320,abilityDuration:60},
];

// ── Cat Garden Skin Themes ───────────────────────────────────────────────────
const CAT_SKIN_DATA=[
  {name:'CLASSIC', cost:0,   cols:['#cccccc','#e07820','#556080'], desc:'The original trio'},
  {name:'PASTEL',  cost:120, cols:['#ffbbdd','#ffcc88','#aac0ee'], desc:'Soft & dreamy'},
  {name:'NEON',    cost:280, cols:['#00ffcc','#ff3399','#ffdd00'], desc:'Electric vibes'},
  {name:'VOID',    cost:480, cols:['#9933ff','#0055ff','#ff0077'], desc:'Dark side cats'},
  {name:'GOLDEN',  cost:700, cols:['#FFD700','#FFA500','#FFEE44'], desc:'All that glitters'},
];

let totalCoins=0,selectedSkin=0,unlockedSkins=[0];
let coinFlash=0;
let abilityCooldownLeft=0,abilityActiveLeft=0,abilityActive=false;
let shieldActive=false;
let enemyFrozen=false,enemyFrozenLeft=0;
let timeSlowActive=false,timeSlowLeft=0;
let prevOnGround=false;

function activateAbility(){
  if(abilityCooldownLeft>0||gameState!=='playing')return;
  const sk=SKINS[selectedSkin];
  abilityActive=true;abilityActiveLeft=sk.abilityDuration;abilityCooldownLeft=sk.abilityCooldown;
  const color=sk.color;
  playSFX('ability');
  switch(sk.ability){
    case 'dash':
      player.velX=player.facing*18;
      spawnRing(player.x+player.width/2,player.y+player.height/2,color,12,20);
      spawnBurst(player.x+player.width/2,player.y+player.height/2,color,10,5);
      break;
    case 'rocket':
      player.velY=-14;
      for(let i=0;i<12;i++)particles.push(new Particle(player.x+player.width/2,player.y+player.height,'#FF6600',(Math.random()-.5)*3,Math.random()*3+2,25,5,true,'circle'));
      break;
    case 'doubleJump':
      player.jumpsLeft+=1;
      spawnRing(player.x+player.width/2,player.y+player.height/2,color,10,16);
      playSFX('doublejump');
      break;
    case 'ghost':
      spawnBurst(player.x+player.width/2,player.y+player.height/2,color,8,3);
      break;
    case 'magnet':
      spawnRing(player.x+player.width/2,player.y+player.height/2,color,16,60);
      break;
    case 'freeze':
      enemyFrozen=true;enemyFrozenLeft=sk.abilityDuration;
      playSFX('freeze');
      spawnBurst(player.x+player.width/2,player.y+player.height/2,'#aaeeff',20,8);
      spawnShockwave(player.x+player.width/2,player.y+player.height/2,'#aaeeff');
      break;
    case 'stomp':
      player.velY=14;
      playSFX('stomp');
      for(let i=0;i<20;i++)particles.push(new Particle(player.x+player.width/2,player.y+player.height,color,Math.cos(i/20*Math.PI*2)*6,Math.sin(i/20*Math.PI*2)*6,30,5,true,'spark'));
      break;
    case 'shield':
      shieldActive=true;
      playSFX('shield');
      spawnRing(player.x+player.width/2,player.y+player.height/2,'#aaeeff',16,18);
      break;
    case 'timeSlow':
      timeSlowActive=true;timeSlowLeft=sk.abilityDuration;
      playSFX('timeslow');
      spawnBurst(player.x+player.width/2,player.y+player.height/2,'#8888ff',20,6);
      break;
    case 'teleport':{
      const dist=sk.name==='PRISM'?220:130;
      const newX=Math.max(0,Math.min(WORLD_W-player.width,player.x+player.facing*dist));
      spawnBurst(player.x+player.width/2,player.y+player.height/2,color,16,8);
      spawnRing(player.x+player.width/2,player.y+player.height/2,color,12,24);
      playSFX('teleport');
      player.x=newX;
      invincible=70;
      spawnBurst(player.x+player.width/2,player.y+player.height/2,color,16,8);
      spawnRing(player.x+player.width/2,player.y+player.height/2,color,12,24);
      break;}
    case 'toxic':
      enemies.forEach(e=>{const dx=player.x-e.x,dy=player.y-e.y;if(Math.sqrt(dx*dx+dy*dy)<180){e.poisoned=true;e.poisonTimer=0;}});
      spawnBurst(player.x+player.width/2,player.y+player.height/2,'#88FF00',18,7);
      spawnShockwave(player.x+player.width/2,player.y+player.height/2,'#88FF00');
      break;
    case 'void':
      enemyFrozen=true;enemyFrozenLeft=150;
      invincible=sk.abilityDuration;
      playSFX('void');
      spawnShockwave(player.x+player.width/2,player.y+player.height/2,'#9900FF');
      spawnShockwave(player.x+player.width/2,player.y+player.height/2,'#cc00ff');
      for(let i=0;i<36;i++){const ang=i/36*Math.PI*2;particles.push(new Particle(player.x+player.width/2+Math.cos(ang)*80,player.y+player.height/2+Math.sin(ang)*80,'#9900FF',Math.cos(ang)*-7,Math.sin(ang)*-7,45,5,true,'circle'));}
      for(let i=0;i<18;i++){const ang=i/18*Math.PI*2;particles.push(new Particle(player.x+player.width/2+Math.cos(ang)*40,player.y+player.height/2+Math.sin(ang)*40,'#cc00ff',Math.cos(ang)*-4,Math.sin(ang)*-4,35,3,true,'star'));}
      break;
    case 'decree':
      enemyFrozen=true;enemyFrozenLeft=200;
      for(let ci=0;ci<8;ci++)coins.push(new Coin(player.x+(Math.random()-.5)*320,player.y-100-Math.random()*220,false));
      spawnShockwave(player.x+player.width/2,player.y+player.height/2,sk.color);
      spawnBurst(player.x+player.width/2,player.y+player.height/2,sk.color,24,10);
      spawnRing(player.x+player.width/2,player.y+player.height/2,sk.color,18,24);
      break;
    case 'divine':
      invincible=sk.abilityDuration;
      spawnBurst(player.x+player.width/2,player.y+player.height/2,'#ffffff',30,12);
      spawnBurst(player.x+player.width/2,player.y+player.height/2,'#ffddff',20,8);
      spawnShockwave(player.x+player.width/2,player.y+player.height/2,'#ffffffcc');
      spawnRing(player.x+player.width/2,player.y+player.height/2,'#ffffff',22,30);
      player.velY=Math.min(player.velY,-6);
      break;
  }
  showNotif('⚡ '+sk.abilityName,sk.color);
}

// ══════════════════════════════════════════
//  PLAYER
// ══════════════════════════════════════════
const player={
  x:100,y:2800,width:28,height:28,
  velX:0,velY:0,jumpsLeft:3,color:'#FF6B6B',
  angle:0,squash:1,squashVel:0,onGround:false,
  facing:1,walkFrame:0,walkTimer:0,
};
const gravity=0.52,BASE_SPEED=5,BASE_JUMP=11.5;
let level=1,gameWon=false,gameState='home',gameMode='story';
let maxJumps=3;let risingLavaWave=1;
let completedLevels=[];  // indices of story levels the player has beaten
let storyStartLevel=0;   // which level the story map selected
let cats=[];let catSelectedFood='fish';let catTick=0;
let catFishStock=5,catNipStock=3,catMilkStock=4,catTreatStock=2,activeCatSkin=0,unlockedCatSkins=[0];
// ── Level Editor ────────────────────────────────────────────────────────────
const EDITOR_GRID=16,LEVELS_KEY='ndu_levels';
const ED_TOP=44,ED_RIGHT=116,ED_VW=784,ED_VH=536;
const EDITOR_PALETTE=[
  {label:'BLKS',tools:['platform','movingPlatform','killbrick','crate'],colors:['#cc9966','#88ff88','#ff4444','#cc8833']},
  {label:'HZRD',tools:['enemy','spike','boss','laser'],colors:['#ff5555','#ff8833','#ff2200','#ff6644']},
  {label:'ITEM',tools:['coin','secretcoin','spring','powerup'],colors:['#FFD700','#ff88ff','#00ffaa','#aaffaa']},
  {label:'SPEC',tools:['goal','spawn','eraser','copy'],colors:['#FFD700','#88ddff','#ff6666','#ffdd44']},
  {label:'ZONE',tools:['iceZone','tpPad','stickyPad','conveyZone'],colors:['#88ddff','#cc44ff','#aaff44','#ffaa22']},
  {label:'PORT',tools:['portal','warpGate'],colors:['#4488ff','#ff44ff']},
];
const EDITOR_TOOL_LABELS={platform:'PLATFORM',movingPlatform:'MOVE PLT',killbrick:'KILL BRK',crate:'CRATE',enemy:'ENEMY',spike:'SPIKE',boss:'BOSS',laser:'LASER BEAM',coin:'COIN',secretcoin:'SECRET',spring:'SPRING',goal:'GOAL',spawn:'SPAWN',eraser:'ERASER',copy:'COPY/PASTE',powerup:'POWERUP',iceZone:'ICE ZONE',tpPad:'TP PAD',stickyPad:'STICKY',conveyZone:'CONVEYOR',portal:'PORTAL',warpGate:'WARP GATE'};
let editorTool='platform';let editorCategory=0;
let editorObjs=[];let editorSpawn={x:200,y:2820};let editorGoalPos=null;
let editorDrag=null;let editorPan={active:false,lastX:0,lastY:0};
let editorLevelName='My Level';let editorLevelId=null;
let editorRenaming=false;let editorRenameStr='';
let levelSelectScroll=0;
let editorPwStr='';let editorPwError=0;const EDITOR_PASSWORD='NeonDash1324';
let editorCopyObj=null;
let editorPowerupType='speedBoost';
let editorConveyDir=1; // 1=right, -1=left
let editorMovePlatRange=120,editorMovePlatSpd=1.5;
let editorPortalType='gravity';
let editorWarpPairId=0;
let editorBossHp=3;
let editorLaserInterval=60;
let editorPlatformStyle='stone';
const PLATFORM_STYLES=['stone','ice','grass','lava','void','cyber'];
let editorLavaRise=false,editorLavaSpd=0.2,editorMusicIdx=0,editorSizeIdx=1;
const WORLD_SIZES=[{w:2000,h:2000,label:'SMALL'},{w:4000,h:3000,label:'MED'},{w:6000,h:4000,label:'LARGE'}];
let shopScroll=0,catShopOffer=null;
let score=0,currentSkinSpd=1,currentSkinJmp=1;
const MAX_LIVES=3;
let lives=MAX_LIVES;
let heartFlash=0;
let beatPulse=0; // 0→1, flashes on kick drum, decays each frame
let invincible=0;
let powerUps=[];
let tpPads=[],stickyPads=[],onSticky=false,stickyDropTimer=0;
let puSpeedActive=false,puSpeedLeft=0;
let puMagnetActive=false,puMagnetLeft=0;
let puScoreMult=false,puScoreMultLeft=0;
let difficulty='medium'; // 'easy','medium','hard','hardcore'
let sfxOn=true;
let bestScores={story:0,endless:0,risingLava:0,arena:0};
// ── ARENA MODE ──────────────────────────────
let arenaWave=1,arenaEnemiesLeft=0,arenaIntermission=false,arenaIntermTimer=0,arenaKillsTotal=0;
let rageMode=false,rageModeLeft=0;
let luckyCoins=false;
const jumpGhosts=[];
let checkpointPos=null,checkpointActivated=false;

loadGame();

// ══════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════
const keys={};let prevUp=false,prevW=false;
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(editorRenaming){editorRenaming=false;return;}
    if(gameState==='paused'){gameState='playing';if(musicOn){initAudio();}return;}
    if(gameState==='playing'&&gameMode!=='editor'){gameState='paused';return;}
    stopMusic();
    if(gameState==='storyMap'){gameState='home';return;}
    if(gameState==='changelog'){gameState='home';return;}
    if(gameState==='catShop'){gameState='cats';return;}
    if(gameState==='settings'){gameState='home';return;}
    if(gameState==='editorPw'){gameState='home';return;}
    if(gameMode==='editor'&&(gameState==='playing'||gameState==='gameover')){gameState='editor';return;}
    if(gameState==='levelSelect'){gameState='home';return;}
    if(gameState==='editor'){gameState='levelSelect';return;}
    gameState='home';return;
  }
  // Password input
  if(gameState==='editorPw'){
    if(e.key==='Enter'){
      if(editorPwStr===EDITOR_PASSWORD){gameState='levelSelect';editorPwStr='';}
      else{editorPwError=70;editorPwStr='';}
      e.preventDefault();return;
    }
    if(e.key==='Backspace'){editorPwStr=editorPwStr.slice(0,-1);e.preventDefault();return;}
    if(e.key.length===1&&editorPwStr.length<20){editorPwStr+=e.key;e.preventDefault();return;}
    return;
  }
  // Editor rename input
  if(editorRenaming){
    if(e.key==='Enter'){editorRenaming=false;editorLevelName=editorRenameStr||'My Level';e.preventDefault();return;}
    if(e.key==='Backspace'){editorRenameStr=editorRenameStr.slice(0,-1);e.preventDefault();return;}
    if(e.key.length===1&&editorRenameStr.length<24){editorRenameStr+=e.key;e.preventDefault();return;}
    return;
  }
  // Editor arrow-key panning
  if(gameState==='editor'){
    const P=80;
    if(e.key==='ArrowLeft'){camera.x=Math.max(0,camera.x-P);e.preventDefault();}
    if(e.key==='ArrowRight'){camera.x=Math.min(WORLD_W-ED_VW,camera.x+P);e.preventDefault();}
    if(e.key==='ArrowUp'){camera.y=Math.max(0,camera.y-P);e.preventDefault();}
    if(e.key==='ArrowDown'){camera.y=Math.min(WORLD_H-ED_VH,camera.y+P);e.preventDefault();}
    return;
  }
  if(gameState==='gameover'){
    if(e.key==='Enter'){
      lives=getDiffLives();heartFlash=0;invincible=0;score=0;
      if(gameMode==='story')loadLevel(currentLevel);else if(gameMode==='risingLava')generateRisingLavaLevel();else if(gameMode==='arena'){arenaWave=1;arenaKillsTotal=0;arenaIntermission=false;arenaIntermTimer=0;generateArenaLevel();}else generateEndlessLevel(level);
      gameState='playing';
    }else{gameState='home';}
    return;
  }
  if(e.key==='Enter'&&gameState==='playing'){loadLevel(currentLevel);return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveGame();return;}
  if((e.key==='z'||e.key==='Z'||e.key==='q'||e.key==='Q')&&gameState==='playing')activateAbility();
// Double-tap directional dash
if(gameState==='playing'&&!doubleTapDashing){
  const now=performance.now();
  if(e.key==='ArrowLeft'||e.key==='a'){if(now-lastLeftTap<220&&dashCooldown<=0){doubleTapDashing=16;doubleTapDashVelX=-24;dashCooldown=50;playSFX('jump');}lastLeftTap=now;}
  if(e.key==='ArrowRight'||e.key==='d'){if(now-lastRightTap<220&&dashCooldown<=0){doubleTapDashing=16;doubleTapDashVelX=24;dashCooldown=50;playSFX('jump');}lastRightTap=now;}
}
// Toggle speedrun timer with T key
if(e.key==='t'||e.key==='T'){showTimer=!showTimer;}
// Star throw with E key
if((e.key==='e'||e.key==='E')&&gameState==='playing'&&throwStarCount>0&&throwStarCooldown<=0){
  const vx=player.facing*14,vy=-3;
  throwStarPr.push(new ThrowStarObj(player.x+player.width/2,player.y+player.height/2,vx,vy));
  throwStarCount--;throwStarCooldown=25;playSFX('starthrow');
  floatTexts.push({x:player.x+player.width/2-camera.x,y:player.y-20-camera.y,text:`★ ${throwStarCount} left`,color:'#FFD700',life:40,maxLife:40});
}
  keys[e.key.toLowerCase()]=true;
  initAudio();
});
window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
function lighten(hex,amt){const n=parseInt(hex.replace('#',''),16);return '#'+[Math.min(255,(n>>16)+amt),Math.min(255,((n>>8)&255)+amt),Math.min(255,(n&255)+amt)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function darken(hex,amt){const n=parseInt(hex.replace('#',''),16);return '#'+[Math.max(0,(n>>16)-amt),Math.max(0,((n>>8)&255)-amt),Math.max(0,(n&255)-amt)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function lerp(a,b,t){return a+(b-a)*t;}
function drawStarShape(cx,cy,oR,iR,pts){
  ctx.beginPath();for(let i=0;i<pts*2;i++){const a=i*Math.PI/pts-Math.PI/2,r=i%2===0?oR:iR;i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}ctx.closePath();
}
let animTick=0;
let screenShake=0;
const playerTrail=[];
let coinComboCount=0,coinComboTimer=0;
const floatTexts=[];
let deathlessStreak=0,diedThisLevel=false;
const levelAmbient=[];
// ── NEW FEATURE VARS ───────────────────────
let killStreak=0,killStreakTimer=0,killStreakBest=0;
let lastLeftTap=0,lastRightTap=0,dashCooldown=0,doubleTapDashVelX=0,doubleTapDashing=0;
let onWallLeft=false,onWallRight=false,wallJumpCooldown=0;
let endlessEventTimer=0,endlessEvent=null,endlessEventLeft=0;
let levelTimer=0,showTimer=false;let levelBestTimes={};
let levelCompleteFlash=0;
let totalKills=0;
const achievementsUnlocked=new Set();
// ── PORTAL SYSTEM ──────────────────────────
let portals=[],warpGates=[];
let gravityFlipped=false,gravityFlipLeft=0;
let mirrorWorld=false,mirrorWorldLeft=0;
let playerShrunk=false,playerShrunkLeft=0;
let ghostPortalMode=false,ghostPortalModeLeft=0;
let speedPortalLeft=0,scorePortalLeft=0;
// ── ADVANCED FEATURES v1.6 ─────────────────
let bullets=[],laserBeams=[],bossEnemies=[],heartDrops=[],throwStarPr=[],spikeRainDrops=[],weatherDrops=[];
let shieldBubble=0;
let throwStarCount=5,throwStarCooldown=0;
let deathCount=0,levelRank='';
let weatherType=null;
function editorSnap(v){return Math.round(v/EDITOR_GRID)*EDITOR_GRID;}
function editorPlaceAt(wx,wy){
  switch(editorTool){
    case 'enemy':      editorObjs.push({type:'enemy',x:wx-14,y:wy-28,minX:wx-160,maxX:wx+160,spd:1.5});break;
    case 'spike':      editorObjs.push({type:'spike',x:wx-12,y:wy-24,count:1});break;
    case 'coin':       editorObjs.push({type:'coin',x:wx,y:wy,secret:false});break;
    case 'secretcoin': editorObjs.push({type:'coin',x:wx,y:wy,secret:true});break;
    case 'spring':     editorObjs.push({type:'spring',x:wx-30,y:wy-16});break;
    case 'powerup':    editorObjs.push({type:'powerup',x:wx-14,y:wy-14,w:28,h:28,puType:editorPowerupType});break;
    case 'tpPad':      editorObjs.push({type:'tpPad',x:wx-30,y:wy-12,w:60,h:12});break;
    case 'stickyPad':  editorObjs.push({type:'stickyPad',x:wx-40,y:wy-14,w:80,h:14});break;
    case 'crate':      editorObjs.push({type:'crate',x:wx-16,y:wy-32,hp:1,coins:2});break;
    case 'portal':     editorObjs.push({type:'portal',x:wx-20,y:wy-30,portalType:editorPortalType});break;
    case 'warpGate':   editorObjs.push({type:'warpGate',x:wx-22,y:wy-33,pairId:editorWarpPairId,color:['#ff44ff','#44ffff','#ffff44','#ff8800'][editorWarpPairId%4]});break;
    case 'laser':      editorObjs.push({type:'laser',x:wx-100,y:wy,x2:wx+100,y2:wy,interval:editorLaserInterval});break;
    case 'boss':       editorObjs.push({type:'boss',x:wx-28,y:wy-56,minX:wx-160,maxX:wx+160,hp:editorBossHp});break;
    case 'platform':   editorObjs.push({type:'platform',x:wx-48,y:wy-9,w:96,h:18,style:editorPlatformStyle});break;
    case 'goal':       editorGoalPos={x:wx-18,y:wy-18};break;
    case 'spawn':      editorSpawn={x:wx-14,y:wy-28};break;
    case 'eraser':
      let erased=false;
      for(let i=editorObjs.length-1;i>=0;i--){
        const o=editorObjs[i];const ow=o.w||48,oh=o.h||24;
        if(wx>=o.x-8&&wx<=o.x+ow+8&&wy>=o.y-8&&wy<=o.y+oh+8){editorObjs.splice(i,1);erased=true;break;}
      }
      if(!erased&&editorGoalPos&&Math.abs(wx-editorGoalPos.x-18)<28&&Math.abs(wy-editorGoalPos.y-18)<28)editorGoalPos=null;
      break;
    case 'copy':{
      let cpFound=null;
      for(let ci=editorObjs.length-1;ci>=0;ci--){
        const co=editorObjs[ci];const cow=co.w||48,coh=co.h||24;
        if(wx>=co.x-8&&wx<=co.x+cow+8&&wy>=co.y-8&&wy<=co.y+coh+8){cpFound=co;break;}
      }
      if(cpFound){editorCopyObj={...cpFound};showNotif('COPIED! Click empty space to paste','#ffdd44');}
      else if(editorCopyObj){editorObjs.push({...editorCopyObj,x:wx,y:wy});showNotif('PASTED!','#ffdd44');}
      break;}
  }
}
function getAllLevels(){try{return JSON.parse(localStorage.getItem(LEVELS_KEY)||'[]');}catch(e){return[];}}
function saveCurrentLevel(){
  if(!editorLevelId)editorLevelId=Date.now();
  const levels=getAllLevels();const now=Date.now();
  const existing=levels.find(l=>l.id===editorLevelId);
  const data={id:editorLevelId,name:editorLevelName,objs:editorObjs,spawn:editorSpawn,goal:editorGoalPos,
    lavaRise:editorLavaRise,lavaSpd:editorLavaSpd,musicIdx:editorMusicIdx,sizeIdx:editorSizeIdx,
    modified:now,created:existing?existing.created:now};
  const idx=levels.findIndex(l=>l.id===editorLevelId);
  if(idx>=0)levels[idx]=data;else levels.push(data);
  try{localStorage.setItem(LEVELS_KEY,JSON.stringify(levels));showNotif('💾 SAVED: '+editorLevelName,'#00ffff');}
  catch(e){showNotif('SAVE FAILED','#ff4444');}
}
function loadLevelIntoEditor(id){
  const d=getAllLevels().find(l=>l.id===id);
  if(!d){showNotif('NOT FOUND','#ff4444');return;}
  editorObjs=d.objs||[];editorSpawn=d.spawn||{x:200,y:2820};editorGoalPos=d.goal||null;
  editorLevelName=d.name||'Level';editorLevelId=d.id;
  editorLavaRise=d.lavaRise||false;editorLavaSpd=d.lavaSpd||0.2;editorMusicIdx=d.musicIdx||0;editorSizeIdx=d.sizeIdx??1;
  camera.x=0;camera.y=Math.max(0,WORLD_H-ED_VH);
  showNotif('📂 '+editorLevelName,'#88ddff');
}
function newLevel(){
  editorObjs=[];editorGoalPos=null;editorSpawn={x:200,y:2820};
  editorLevelName='My Level';editorLevelId=null;
  editorLavaRise=false;editorLavaSpd=0.2;editorMusicIdx=0;editorSizeIdx=1;editorMovePlatRange=120;editorMovePlatSpd=1.5;
  camera.x=0;camera.y=Math.max(0,WORLD_H-ED_VH);
}
function deleteSavedLevel(id){
  const levels=getAllLevels().filter(l=>l.id!==id);
  try{localStorage.setItem(LEVELS_KEY,JSON.stringify(levels));}catch(e){}
}
function editorClear(){editorObjs=[];editorGoalPos=null;editorSpawn={x:200,y:2820};showNotif('CLEARED','#ffaa00');}
function editorBuildLevel(){
  platforms=[];movingPlatforms=[];enemies=[];spikes=[];coins=[];springPads=[];killBricks=[];crates=[];
  goal=null;secretDoors=[];iceZones=[];conveyorZones=[];powerUps=[];tpPads=[];stickyPads=[];
  editorObjs.forEach(o=>{
    switch(o.type){
      case 'platform':      platforms.push(new Platform(o.x,o.y,o.w,o.h||18,o.style||'stone'));break;
      case 'movingPlatform':movingPlatforms.push(new MovingPlatform(o.x,o.y,o.w||90,o.h||18,o.minX??o.x-100,o.maxX??o.x+100,o.spd||1.5));break;
      case 'enemy':         enemies.push(new Enemy(o.x,o.y,o.minX??o.x-80,o.maxX??o.x+80,o.spd||1.5));break;
      case 'spike':         spikes.push(new Spike(o.x,o.y,o.count||1));break;
      case 'coin':          coins.push(new Coin(o.x,o.y,o.secret||false));break;
      case 'spring':        springPads.push(new SpringPad(o.x,o.y));break;
      case 'killbrick':     killBricks.push(new KillBrick(o.x,o.y,o.w||60,o.h||20));break;
      case 'iceZone':       iceZones.push({x:o.x,x2:o.x+o.w});break;
      case 'conveyZone':    conveyorZones.push({x:o.x,x2:o.x+o.w,dir:o.dir||1,y:o.y,h:o.h||24});break;
      case 'powerup':       powerUps.push(new PowerUp(o.x,o.y,o.puType||'speedBoost'));break;
      case 'tpPad':         tpPads.push(new TpPad(o.x,o.y));break;
      case 'stickyPad':     stickyPads.push(new StickyPad(o.x,o.y,o.w||80));break;
      case 'crate':         crates.push(new Crate(o.x,o.y,o.hp||1,o.coins||2));break;
      case 'portal':        portals.push(new Portal(o.x,o.y,o.portalType||'gravity'));break;
      case 'warpGate':      warpGates.push(new WarpGate(o.x,o.y,o.pairId||0,o.color||'#ff44ff'));break;
      case 'laser':         laserBeams.push(new LaserBeam(o.x,o.y,o.x2??o.x+200,o.y2??o.y,o.interval||60));break;
      case 'boss':          bossEnemies.push(new BossEnemy(o.x,o.y,o.minX??o.x-100,o.maxX??o.x+100,o.hp||3));break;
    }
  });
  if(editorGoalPos)goal=new Goal(editorGoalPos.x,editorGoalPos.y);
}
function editorPlayTest(){
  saveCurrentLevel();editorBuildLevel();
  gameMode='editor';maxJumps=3;
  player.x=editorSpawn.x;player.y=editorSpawn.y;player.velX=0;player.velY=0;
  player.jumpsLeft=maxJumps;player.angle=0;player.squash=1;player.squashVel=0;
  player.color=SKINS[selectedSkin].color;currentSkinSpd=SKINS[selectedSkin].spd;currentSkinJmp=SKINS[selectedSkin].jmp;
  lives=MAX_LIVES;heartFlash=0;invincible=0;gameWon=false;score=0;
  camera.x=Math.max(0,Math.min(player.x-W/2,WORLD_W-W));
  camera.y=Math.max(0,Math.min(player.y-H/2,WORLD_H-H));
  particles.length=0;resetLava();if(editorLavaRise)startLava(editorLavaSpd);
  puSpeedActive=false;puSpeedLeft=0;puMagnetActive=false;puMagnetLeft=0;puScoreMult=false;puScoreMultLeft=0;
  abilityCooldownLeft=0;abilityActiveLeft=0;abilityActive=false;shieldActive=false;
  enemyFrozen=false;enemyFrozenLeft=0;timeSlowActive=false;timeSlowLeft=0;
  inSecretRoom=false;currentSecretRoom=null;currentSecretRoomData=null;
  bullets=[];heartDrops=[];throwStarPr=[];spikeRainDrops=[];weatherDrops=[];
  shieldBubble=0;throwStarCount=5;throwStarCooldown=0;
  gravityFlipped=false;gravityFlipLeft=0;mirrorWorld=false;mirrorWorldLeft=0;
  playerShrunk=false;playerShrunkLeft=0;ghostPortalMode=false;ghostPortalModeLeft=0;speedPortalLeft=0;scorePortalLeft=0;
  deathCount=0;levelRank='';weatherType=null;
  gameState='playing';
  if(musicOn){initAudio();playLevelMusic(editorMusicIdx);}
  showNotif('▶ PLAY TEST  —  ESC returns to editor','#ffdd44');
}

// ══════════════════════════════════════════
//  ENHANCED BG CONFIGS
// ══════════════════════════════════════════
const BG_CONFIGS=[
  {sky:['#02050f','#071525','#0d2040'],cloud:'#5577cc',star:'#aaddff',aurora:false,lava:false,grid:false,glitch:false,forest:false,nebula:true},
  {sky:['#010a03','#061508','#0d2210'],cloud:'#33cc66',star:'#aaffcc',aurora:false,lava:false,grid:false,glitch:false,forest:true,nebula:false},
  {sky:['#020812','#050f22','#081a38'],cloud:'#33ddff',star:'#aaeeff',aurora:true,lava:false,grid:false,glitch:false,forest:false,nebula:false},
  {sky:['#100200','#220500','#380800'],cloud:'#ff5500',star:'#ffaa44',aurora:false,lava:true,grid:false,glitch:false,forest:false,nebula:false},
  {sky:['#020003','#060010','#0c0022'],cloud:'#bb00ff',star:'#cc88ff',aurora:false,lava:false,grid:true,glitch:true,forest:false,nebula:true},
];
let bgStars=Array.from({length:200},()=>({
  x:Math.random()*W,y:Math.random()*H,r:.2+Math.random()*2.4,
  t:Math.random()*Math.PI*2,spd:.003+Math.random()*.025,
  color:`hsl(${200+Math.random()*60},${60+Math.random()*40}%,${70+Math.random()*30}%)`
}));
let bgClouds=Array.from({length:8},()=>({x:Math.random()*2000,y:Math.random()*350+30,w:80+Math.random()*160,alpha:.03+Math.random()*.06,spd:.08+Math.random()*.2}));
let bgTrees=Array.from({length:25},()=>({x:Math.random()*2000,y:H-Math.random()*60-50,h:50+Math.random()*100,spd:.25+Math.random()*.45,lean:(Math.random()-.5)*.1}));
let auroraPhase=0,lavaPhase=0;
let nebulaClusters=Array.from({length:5},()=>({x:Math.random()*W,y:Math.random()*H*.7,r:80+Math.random()*150,hue:Math.random()*360,alpha:.04+Math.random()*.06,spd:.001+Math.random()*.003,t:Math.random()*Math.PI*2}));

// Enhanced shooting stars
let shootingStars=[];
function maybeSpawnShootingStar(){
  if(Math.random()<.003){
    shootingStars.push({x:Math.random()*W,y:Math.random()*H*.4,vx:3+Math.random()*4,vy:1+Math.random()*2,life:40,maxLife:40,trail:[]});
  }
}

function drawBG(bgIdx){
  const cfg=BG_CONFIGS[Math.min(bgIdx,BG_CONFIGS.length-1)];
  auroraPhase+=.007;lavaPhase+=.04;

  const sg=ctx.createLinearGradient(0,0,0,H);
  cfg.sky.forEach((c,i)=>sg.addColorStop(i/(cfg.sky.length-1),c));
  ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);

  if(cfg.nebula){
    nebulaClusters.forEach((nb,ni)=>{
      nb.t+=nb.spd;
      const px=W*(.15+ni*.18)+Math.sin(nb.t+ni)*40,py=H*(.3+ni*.1)+Math.cos(nb.t*.7+ni)*25;
      const rg=ctx.createRadialGradient(px,py,0,px,py,nb.r+Math.sin(nb.t)*20);
      const hue=nb.hue+animTick*.1;
      rg.addColorStop(0,`hsla(${hue},80%,40%,${nb.alpha*1.5})`);
      rg.addColorStop(.5,`hsla(${hue+30},70%,30%,${nb.alpha*.8})`);
      rg.addColorStop(1,'transparent');
      ctx.save();ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);ctx.restore();
    });
  }else{
    const cols=[['rgba(0,30,80,.2)','rgba(40,0,80,.15)'],['rgba(0,60,10,.2)','rgba(20,60,0,.1)'],['rgba(0,40,80,.25)','rgba(0,100,140,.12)'],['rgba(80,15,0,.3)','rgba(150,40,0,.12)'],['rgba(50,0,100,.35)','rgba(80,0,150,.18)']];
    for(let ni=0;ni<3;ni++){
      const px=W*(.2+ni*.3)+Math.sin(auroraPhase*.4+ni)*30,py=H*(.4+ni*.1);
      const rg=ctx.createRadialGradient(px,py,0,px,py,W*.3);
      const c=cols[Math.min(bgIdx,4)];rg.addColorStop(0,c[0]);rg.addColorStop(1,'transparent');
      ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
    }
  }

  if(cfg.aurora){
    for(let i=0;i<7;i++){
      const ax=W*(.08+i*.14);
      ctx.save();ctx.globalAlpha=.08+Math.sin(auroraPhase+i*.7)*.07;
      const ag=ctx.createLinearGradient(ax-80,0,ax+80,H*.8);
      const h1=160+i*22+Math.sin(auroraPhase)*25,h2=210+i*18;
      ag.addColorStop(0,`hsl(${h1},100%,65%)`);ag.addColorStop(.4,`hsl(${(h1+h2)/2},100%,55%)`);ag.addColorStop(.75,`hsl(${h2},100%,60%)`);ag.addColorStop(1,'transparent');
      ctx.fillStyle=ag;
      ctx.beginPath();
      const wv=60+Math.sin(auroraPhase*.6+i)*25;
      ctx.moveTo(ax-wv+Math.sin(auroraPhase*.9+i)*30,0);
      for(let y=0;y<=H*.8;y+=20){const xOff=Math.sin(y*.008+auroraPhase+i*.5)*wv;ctx.lineTo(ax+xOff,y);}
      ctx.lineTo(ax+wv,H*.8);
      for(let y=H*.8;y>=0;y-=20){const xOff=Math.sin(y*.008+auroraPhase+i*.5)*wv+wv*.5;ctx.lineTo(ax+xOff,y);}
      ctx.closePath();ctx.fill();ctx.restore();
    }
  }

  if(cfg.lava){
    for(let i=0;i<5;i++){
      ctx.save();ctx.globalAlpha=.08+Math.sin(lavaPhase+i)*.06;
      const lg=ctx.createRadialGradient(W*(.15+i*.17),H,0,W*(.15+i*.17),H,200+Math.sin(lavaPhase+i)*60);
      lg.addColorStop(0,'#ff5500');lg.addColorStop(.4,'#cc2200');lg.addColorStop(1,'transparent');
      ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);ctx.restore();
    }
    if(Math.random()<.05)particles.push(new Particle(Math.random()*W,H,'#FF6600',(Math.random()-.5)*2,-Math.random()*5-2,35+Math.random()*20,2+Math.random()*3,false,'circle'));
  }

  if(cfg.grid){
    ctx.save();ctx.globalAlpha=.05+Math.sin(auroraPhase*3)*.025;ctx.strokeStyle='#7700ff';ctx.lineWidth=.5;
    const glit=Math.random()<.025;
    for(let gx=0;gx<W;gx+=42){const dr=glit?(Math.random()-.5)*14:0;ctx.beginPath();ctx.moveTo(gx+dr,0);ctx.lineTo(gx+dr,H);ctx.stroke();}
    for(let gy=0;gy<H;gy+=42){const dr=glit?(Math.random()-.5)*7:0;ctx.beginPath();ctx.moveTo(0,gy+dr);ctx.lineTo(W,gy+dr);ctx.stroke();}
    if(glit){ctx.globalAlpha=.15;ctx.fillStyle=`rgba(${Math.random()>.5?200:0},0,${Math.random()>.5?200:0},.5)`;ctx.fillRect(0,Math.random()*H,W,2+Math.random()*14);}
    ctx.restore();
  }

  if(cfg.forest){
    ctx.save();
    bgTrees.slice(0,12).forEach(t=>{t.x-=t.spd*.5*(1+camera.x*.00005);if(t.x<-80)t.x=W+150;ctx.globalAlpha=.2;ctx.fillStyle='#060d07';ctx.fillRect(t.x-6,t.y,12,t.h);ctx.beginPath();ctx.moveTo(t.x,t.y-t.h*.8);ctx.lineTo(t.x+22,t.y+10);ctx.lineTo(t.x-22,t.y+10);ctx.closePath();ctx.fill();});
    bgTrees.slice(12).forEach(t=>{t.x-=t.spd*(1+camera.x*.0001);if(t.x<-80)t.x=W+150;ctx.globalAlpha=.45;ctx.fillStyle='#081208';ctx.fillRect(t.x-7,t.y,14,t.h);ctx.beginPath();ctx.moveTo(t.x,t.y-t.h*.95);ctx.lineTo(t.x+26,t.y+10);ctx.lineTo(t.x-26,t.y+10);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(t.x,t.y-t.h*1.35);ctx.lineTo(t.x+19,t.y-t.h*.5);ctx.lineTo(t.x-19,t.y-t.h*.5);ctx.closePath();ctx.fill();});
    ctx.restore();
    ctx.save();ctx.globalAlpha=.18;const fg=ctx.createLinearGradient(0,H-60,0,H);fg.addColorStop(0,'transparent');fg.addColorStop(.5,'rgba(100,255,130,.15)');fg.addColorStop(1,'rgba(60,200,80,.08)');ctx.fillStyle=fg;ctx.fillRect(0,H-60,W,60);ctx.restore();
  }

  // Stars with enhanced twinkle
  bgStars.forEach(s=>{
    s.t+=s.spd;const twinkle=.3+Math.sin(s.t)*.35;
    ctx.save();ctx.globalAlpha=twinkle;ctx.fillStyle=s.color||cfg.star;
    ctx.shadowColor=s.color||cfg.star;ctx.shadowBlur=s.r>1.5?8:0;
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();
  });

  // Shooting stars
  maybeSpawnShootingStar();
  for(let i=shootingStars.length-1;i>=0;i--){
    const ss=shootingStars[i];
    ss.trail.push({x:ss.x,y:ss.y});
    if(ss.trail.length>12)ss.trail.shift();
    ss.x+=ss.vx;ss.y+=ss.vy;ss.life--;
    if(ss.life<=0){shootingStars.splice(i,1);continue;}
    ctx.save();
    ss.trail.forEach((tp,ti)=>{
      const ta=ti/ss.trail.length*(ss.life/ss.maxLife);
      ctx.globalAlpha=ta*.8;ctx.fillStyle='#ffffff';ctx.shadowColor='#aaddff';ctx.shadowBlur=4;
      ctx.beginPath();ctx.arc(tp.x,tp.y,1.5*(ti/ss.trail.length),0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
  }

  // Clouds
  bgClouds.forEach(c=>{
    c.x-=c.spd*(1+camera.x*.0002);if(c.x+c.w<0){c.x=W+c.w;c.y=Math.random()*350+30;}
    ctx.save();ctx.globalAlpha=c.alpha;ctx.shadowColor=cfg.cloud;ctx.shadowBlur=15;ctx.fillStyle=cfg.cloud;
    for(let ci=0;ci<3;ci++){ctx.globalAlpha=c.alpha*(1-ci*.3);ctx.beginPath();ctx.ellipse(c.x+ci*c.w*.2,c.y,c.w*(1-ci*.15),c.w*.32*(1-ci*.1),0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  });
}

// ══════════════════════════════════════════
//  PLATFORM CLASS (enhanced visuals with texture)
// ══════════════════════════════════════════
class Platform{
  constructor(x,y,w,h,style='stone'){this.x=x;this.y=y;this.width=w;this.height=h;this.style=style;this._t=Math.random()*Math.PI*2;this._seed=Math.random();}
  draw(){
    this._t+=.02;
    let top,bot,edge,glow,lineCol=null,shineA=.14;
    switch(this.style){
      case 'lava':  top='#cc3300';bot='#7a1500';edge='#ff5500';glow='#ff4400';break;
      case 'ice':   top='#c8f0ff';bot='#5aaccf';edge='#e0f8ff';glow='#55eeff';lineCol='rgba(200,240,255,.22)';shineA=.28;break;
      case 'grass': top='#5cbf60';bot='#2e7d32';edge='#1b5e20';glow='#44ee55';break;
      case 'void':  top='#150028';bot='#0a001a';edge='#8800ff';glow='#aa00ff';lineCol='rgba(120,0,220,.15)';break;
      case 'cyber': top='#001133';bot='#000d22';edge='#00aaff';glow='#00ccff';lineCol='rgba(0,170,255,.1)';break;
      case 'secret':top='#221133';bot='#110022';edge='#ff44ff';glow='#ff88ff';break;
      default:      top='#9a6a45';bot='#5e3318';edge='#3a1c08';glow='#aa8855';
    }
    ctx.save();
    ctx.shadowColor=glow;ctx.shadowBlur=12+Math.sin(this._t)*3;
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);
    g.addColorStop(0,top);g.addColorStop(1,bot);
    ctx.fillStyle=g;ctx.fillRect(this.x,this.y,this.width,this.height);

    // Enhanced top edge highlight
    const shine=ctx.createLinearGradient(this.x,this.y,this.x+this.width,this.y);
    shine.addColorStop(0,'rgba(255,255,255,.05)');shine.addColorStop(.3,`rgba(255,255,255,${shineA+.1})`);shine.addColorStop(1,'rgba(255,255,255,.04)');
    ctx.fillStyle=shine;ctx.fillRect(this.x,this.y,this.width,4);

    ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(this.x,this.y+this.height-3,this.width,3);

    if(lineCol){
      ctx.strokeStyle=lineCol;ctx.lineWidth=.5;
      for(let lx=this.x+16;lx<this.x+this.width;lx+=16){ctx.beginPath();ctx.moveTo(lx,this.y);ctx.lineTo(lx,this.y+this.height);ctx.stroke();}
    }

    // Style-specific enhanced effects
    if(this.style==='lava'){
      // Flowing lava cracks
      if(animTick%2===0){ctx.globalAlpha=.35+Math.random()*.3;ctx.fillStyle='#ff9900';ctx.beginPath();ctx.arc(this.x+Math.random()*this.width,this.y+2,1+Math.random()*2.5,0,Math.PI*2);ctx.fill();}
      // Lava crack lines
      ctx.save();ctx.globalAlpha=.08+Math.sin(this._t*3)*.05;ctx.strokeStyle='#ffaa00';ctx.lineWidth=1;
      for(let li=0;li<3;li++){
        const lx=this.x+this.width*(li*.3+.1);
        ctx.beginPath();ctx.moveTo(lx,this.y);ctx.quadraticCurveTo(lx+10,this.y+this.height*.5,lx-5,this.y+this.height);ctx.stroke();
      }
      ctx.restore();
    }
    if(this.style==='ice'){
      ctx.globalAlpha=.15+Math.sin(this._t*2)*.08;
      const ig=ctx.createLinearGradient(this.x,this.y,this.x+this.width,this.y);
      ig.addColorStop(0,'transparent');ig.addColorStop(.4,'rgba(255,255,255,.4)');ig.addColorStop(1,'transparent');
      ctx.fillStyle=ig;ctx.fillRect(this.x,this.y,this.width,this.height);
      // Ice crystal highlights
      ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle='#aaeeff';ctx.lineWidth=.8;
      for(let ci=0;ci<2;ci++){
        const cx=this.x+this.width*(.25+ci*.5),cy=this.y+this.height*.5;
        ctx.beginPath();ctx.moveTo(cx-6,cy);ctx.lineTo(cx+6,cy);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx,cy+6);ctx.stroke();
      }
      ctx.restore();
    }
    if(this.style==='void'&&Math.random()<.04){ctx.globalAlpha=.6;ctx.fillStyle='#cc00ff';ctx.beginPath();ctx.arc(this.x+Math.random()*this.width,this.y+Math.random()*this.height,1,0,Math.PI*2);ctx.fill();}
    if(this.style==='cyber'&&animTick%60===0){ctx.globalAlpha=.5;ctx.fillStyle='#00ffff';ctx.fillRect(this.x,this.y,this.width,1);}

    // Stone/grass texture
    if(this.style==='stone'||this.style==='grass'){
      ctx.globalAlpha=.08;ctx.strokeStyle='#000';ctx.lineWidth=1;
      for(let lx=this.x+20;lx<this.x+this.width;lx+=20){ctx.beginPath();ctx.moveTo(lx,this.y);ctx.lineTo(lx,this.y+this.height);ctx.stroke();}
      // Stone cracks
      if(this._seed>.6){
        ctx.globalAlpha=.06;ctx.strokeStyle='#000';ctx.lineWidth=1;
        const crx=this.x+this.width*(.3+this._seed*.4);
        ctx.beginPath();ctx.moveTo(crx,this.y);ctx.lineTo(crx+4,this.y+this.height*.4);ctx.stroke();
      }
    }

    // Grass top layer tufts
    if(this.style==='grass'){
      ctx.globalAlpha=.7;ctx.fillStyle='#6dd471';
      for(let gi=0;gi<Math.floor(this.width/20);gi++){
        const gx=this.x+gi*20+10;const sway=Math.sin(this._t+gi)*.8;
        ctx.fillRect(gx+sway,this.y-3,2,5);
      }
    }

    ctx.restore();
    ctx.strokeStyle=edge;ctx.lineWidth=1;ctx.strokeRect(this.x,this.y,this.width,this.height);
  }
  collidesWith(r){
    return r.x<this.x+this.width&&r.x+r.width>this.x&&
           r.y+r.height>=this.y&&r.y+r.height<=this.y+22&&r.velY>=0;
  }
}

class MovingPlatform{
  constructor(x,y,w,h,minX,maxX,spd=1.5,vert=false,minY=0,maxY=0,style='grass'){
    Object.assign(this,{x,y,width:w,height:h,minX,maxX,spd,direction:1,vert,minY,maxY,style});this._t=Math.random()*Math.PI*2;
  }
  update(){
    this._t+=.05;
    if(this.vert){this.y+=this.direction*this.spd;if(this.y<=this.minY||this.y+this.height>=this.maxY)this.direction*=-1;}
    else{this.x+=this.direction*this.spd;if(this.x<=this.minX||this.x+this.width>=this.maxX)this.direction*=-1;}
  }
  draw(){
    const pulse=Math.sin(this._t)*.25+.75;
    ctx.save();
    ctx.shadowColor=`rgba(0,255,150,${pulse*.7})`;ctx.shadowBlur=16;
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);
    g.addColorStop(0,`rgba(80,220,80,${pulse})`);g.addColorStop(1,'#1a5a1a');
    ctx.fillStyle=g;ctx.fillRect(this.x,this.y,this.width,this.height);
    // Animated glow stripe
    const prog=((animTick*.8)%this.width);
    ctx.globalAlpha=.35;ctx.fillStyle='rgba(180,255,180,.8)';ctx.fillRect(this.x+prog-2,this.y,4,this.height);
    // Edge glow
    ctx.globalAlpha=.4;ctx.fillStyle='rgba(120,255,120,.5)';ctx.fillRect(this.x,this.y,this.width,2);
    ctx.restore();
    ctx.fillStyle='rgba(200,255,200,.6)';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText(this.vert?(this.direction>0?'↓':'↑'):(this.direction>0?'→':'←'),this.x+this.width/2,this.y+13);
  }
  collidesWith(r){
    return r.x<this.x+this.width&&r.x+r.width>this.x&&
           r.y+r.height>=this.y&&r.y+r.height<=this.y+22&&r.velY>=0;
  }
}
let onIce=false;

// ══════════════════════════════════════════
//  RISING LAVA (enhanced)
// ══════════════════════════════════════════
let lavaY=3500,lavaRising=false,lavaSpeed=0,lavaWobble=0;
function resetLava(){lavaY=3500;lavaRising=false;lavaSpeed=0;lavaWobble=0;}
function startLava(spd=0.3){lavaRising=true;lavaSpeed=spd;}
function updateLava(){
  if(!lavaRising)return;
  const effectiveSpd=timeSlowActive?lavaSpeed*.25:lavaSpeed;
  lavaY-=effectiveSpd;lavaWobble+=.055;
  if(player.y+player.height>lavaY-10&&!(abilityActive&&(SKINS[selectedSkin].ability==='ghost'||SKINS[selectedSkin].ability==='toxic'))){
    if(shieldActive){shieldActive=false;invincible=90;playSFX('shieldhit');return;}
    loseLife();
  }
}
function drawLava(){
  if(lavaY>WORLD_H+50)return;
  const ly=lavaY-camera.y;
  if(ly>H+80)return;
  ctx.save();

  // Enhanced glow beneath
  const glowGrad=ctx.createLinearGradient(0,ly-80,0,ly);
  glowGrad.addColorStop(0,'transparent');
  glowGrad.addColorStop(.7,'rgba(255,60,0,.12)');
  glowGrad.addColorStop(1,'rgba(255,80,0,.35)');
  ctx.fillStyle=glowGrad;ctx.fillRect(0,Math.max(0,ly-80),W,80);

  // Lava body
  const lg=ctx.createLinearGradient(0,ly,0,H);
  lg.addColorStop(0,'#FF7700');lg.addColorStop(.04,'#CC2200');lg.addColorStop(.3,'#881100');lg.addColorStop(1,'#440600');
  ctx.fillStyle=lg;
  ctx.beginPath();ctx.moveTo(0,ly);
  for(let lx=0;lx<=W;lx+=12){
    const wave=Math.sin((lx*.025)+lavaWobble)*14+Math.sin(lx*.055+lavaWobble*1.3)*7+Math.sin(lx*.012+lavaWobble*.7)*5;
    ctx.lineTo(lx,ly+wave);
  }
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();

  // Lava hot spots
  for(let i=0;i<4;i++){
    const cx=W*(.15+i*.2)+Math.sin(lavaWobble+i)*30;
    ctx.globalAlpha=.25+Math.sin(lavaWobble*2+i)*.15;
    const vg=ctx.createRadialGradient(cx,ly,0,cx,ly,60);
    vg.addColorStop(0,'#ffcc00');vg.addColorStop(.4,'#ff8800');vg.addColorStop(1,'transparent');
    ctx.fillStyle=vg;ctx.fillRect(cx-60,ly,120,60);
  }

  // Surface line
  ctx.globalAlpha=.85;ctx.strokeStyle='#FFCC00';ctx.lineWidth=2.5;
  ctx.shadowColor='#FF8800';ctx.shadowBlur=25;
  ctx.beginPath();ctx.moveTo(0,ly);
  for(let lx=0;lx<=W;lx+=12){
    const wave=Math.sin((lx*.025)+lavaWobble)*14+Math.sin(lx*.055+lavaWobble*1.3)*7+Math.sin(lx*.012+lavaWobble*.7)*5;
    ctx.lineTo(lx,ly+wave);
  }
  ctx.stroke();

  // Enhanced bubbles
  if(animTick%5===0&&ly<H){
    particles.push(new Particle(Math.random()*W+camera.x,lavaY-5,'#FF6600',(Math.random()-.5)*1.5,-Math.random()*4-1,22+Math.random()*15,2+Math.random()*3,true,'circle'));
  }
  // Lava sparks
  if(animTick%8===0&&ly<H){
    const sx=Math.random()*W+camera.x;
    particles.push(new Particle(sx,lavaY-2,'#FFAA00',(Math.random()-.5)*3,-Math.random()*6-2,18,2,true,'spark'));
  }
  ctx.restore();
}

// ══════════════════════════════════════════
//  GAME OBJECTS
// ══════════════════════════════════════════
class Spike{
  constructor(x,y,count=1,flipped=false){this.x=x;this.y=y;this.count=count;this.flipped=flipped;this.width=count*24;this.height=24;this._t=Math.random()*Math.PI*2;}
  draw(){
    this._t+=.04;
    ctx.save();ctx.shadowColor='#FF3300';ctx.shadowBlur=14+Math.sin(this._t)*6;
    for(let i=0;i<this.count;i++){
      const sx=this.x+i*24,sy=this.y;
      const g=ctx.createLinearGradient(sx+12,sy,sx+12,sy+24);
      g.addColorStop(0,'#FF9900');g.addColorStop(.45,'#FF2200');g.addColorStop(1,'#880000');
      ctx.fillStyle=g;
      ctx.beginPath();
      if(!this.flipped){ctx.moveTo(sx+12,sy);ctx.lineTo(sx+24,sy+24);ctx.lineTo(sx,sy+24);}
      else{ctx.moveTo(sx+12,sy+24);ctx.lineTo(sx+24,sy);ctx.lineTo(sx,sy);}
      ctx.closePath();ctx.fill();
      // Enhanced highlight
      ctx.fillStyle='rgba(255,220,80,.4)';
      if(!this.flipped){ctx.beginPath();ctx.moveTo(sx+12,sy+2);ctx.lineTo(sx+18,sy+12);ctx.lineTo(sx+12,sy+8);ctx.closePath();ctx.fill();}
      // Edge
      ctx.strokeStyle='rgba(255,100,0,.65)';ctx.lineWidth=.8;ctx.stroke();
      // Glow dot at tip
      ctx.fillStyle='rgba(255,200,0,.7)';ctx.beginPath();ctx.arc(sx+12,this.flipped?sy+22:sy+2,1.5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  collidesWith(r){const hx=this.x+3,hy=this.y+4,hw=this.width-6,hh=this.height-5;return r.x+3<hx+hw&&r.x+r.width-3>hx&&r.y+3<hy+hh&&r.y+r.height-3>hy;}
}

class Goal{
  constructor(x,y){this.x=x;this.y=y;this.width=36;this.height=36;this._t=0;}
  draw(){
    this._t+=.04;
    ctx.save();
    // Outer halo rings
    for(let ri=4;ri>=0;ri--){
      const rrad=28+ri*14+Math.sin(this._t*2+ri)*(4+ri*2);
      ctx.globalAlpha=(.07-ri*.012)*(Math.sin(this._t+ri)*.3+.7);
      ctx.strokeStyle=`hsl(${45+ri*22},100%,${65+ri*4}%)`;ctx.lineWidth=1.5-ri*.25;
      ctx.beginPath();ctx.arc(this.x+18,this.y+18,rrad,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Orbiting gems
    for(let i=0;i<6;i++){
      const a=this._t*1.4+i*(Math.PI/3);
      const gx=this.x+18+Math.cos(a)*22,gy=this.y+18+Math.sin(a)*22;
      ctx.fillStyle=`hsla(${i*60+animTick},100%,70%,.85)`;
      ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(gx,gy,3.2,0,Math.PI*2);ctx.fill();
    }
    // Inner glow pulse
    ctx.globalAlpha=.2+Math.sin(this._t*3)*.1;
    const ig=ctx.createRadialGradient(this.x+18,this.y+18,0,this.x+18,this.y+18,20);
    ig.addColorStop(0,'#FFD700');ig.addColorStop(1,'transparent');
    ctx.fillStyle=ig;ctx.fillRect(this.x-2,this.y-2,40,40);
    ctx.globalAlpha=1;
    // Core star
    ctx.shadowColor='#FFD700';ctx.shadowBlur=40+Math.sin(this._t*3)*14;
    ctx.translate(this.x+18,this.y+18+Math.sin(this._t*.6)*2.5);ctx.rotate(this._t*.4);
    const starColor=`hsl(${48+Math.sin(this._t*2)*15},100%,${55+Math.sin(this._t*3)*8}%)`;
    ctx.fillStyle=starColor;drawStarShape(0,0,20,8,5);ctx.fill();
    ctx.fillStyle='rgba(255,255,220,.75)';drawStarShape(0,0,12,5,5);ctx.fill();
    // Center dot
    ctx.fillStyle='#fff';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}

class Enemy{
  constructor(x,y,minX,maxX,spd=1.5){Object.assign(this,{x,y,startX:x,width:32,height:28,minX,maxX,spd,direction:1,_t:0,poisoned:false,poisonTimer:0,frozen:false,health:3,flashTimer:0});}
  update(){
    if(this.poisoned){this.poisonTimer++;if(this.poisonTimer>180){this.poisoned=false;this.poisonTimer=0;}}
    if(this.flashTimer>0)this.flashTimer--;
    if(enemyFrozen||this.frozen)return;
    const s=timeSlowActive?this.spd*.3:this.spd;
    this.x+=this.direction*s;if(this.x<=this.minX||this.x+this.width>=this.maxX)this.direction*=-1;this._t+=.1;
  }
  draw(){
    ctx.save();
    if(this.flashTimer>0){ctx.shadowColor='#ffffff';ctx.shadowBlur=28;}
    else if(this.poisoned){ctx.shadowColor='#88FF00';ctx.shadowBlur=20;}
    else if(enemyFrozen||this.frozen){ctx.shadowColor='#aaeeff';ctx.shadowBlur=20;}
    else{ctx.shadowColor='#FF0000';ctx.shadowBlur=16+Math.sin(this._t)*5;}

    const bobY=Math.sin(this._t)*2.2;
    const baseCol=this.poisoned?'#44aa00':enemyFrozen?'#336688':'#CC1111';
    const topCol=this.poisoned?'#88FF00':enemyFrozen?'#88ccee':'#FF5555';
    const eg=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);
    eg.addColorStop(0,topCol);eg.addColorStop(1,baseCol);
    ctx.fillStyle=eg;ctx.beginPath();ctx.roundRect(this.x,this.y+bobY,this.width,this.height,5);ctx.fill();
    // Highlight
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.roundRect(this.x,this.y+bobY,this.width,this.height*.45,5);ctx.fill();
    // Horns
    ctx.fillStyle='#FF7700';ctx.shadowColor='#FF9900';ctx.shadowBlur=8;
    ctx.beginPath();ctx.moveTo(this.x+6,this.y+bobY);ctx.lineTo(this.x+3,this.y-10+bobY);ctx.lineTo(this.x+12,this.y+bobY);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(this.x+20,this.y+bobY);ctx.lineTo(this.x+29,this.y-10+bobY);ctx.lineTo(this.x+26,this.y+bobY);ctx.closePath();ctx.fill();
    const eyeCol=this.poisoned?'#ccff00':enemyFrozen?'#88eeff':'#FFFF00';
    ctx.shadowColor=eyeCol;ctx.shadowBlur=12;ctx.fillStyle=eyeCol;
    ctx.beginPath();ctx.ellipse(this.x+8,this.y+8+bobY,4.5,5.5,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(this.x+24,this.y+8+bobY,4.5,5.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.shadowBlur=0;
    ctx.fillRect(this.x+6.5,this.y+7+bobY,3,4.5);ctx.fillRect(this.x+22.5,this.y+7+bobY,3,4.5);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(this.x+7,this.y+7+bobY,1.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(this.x+23,this.y+7+bobY,1.4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=this.poisoned?'#88ff00':enemyFrozen?'#aaeeff':'#ff0000';ctx.lineWidth=2.2;
    ctx.beginPath();ctx.moveTo(this.x+4,this.y+3+bobY);ctx.lineTo(this.x+12,this.y+6.5+bobY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(this.x+28,this.y+3+bobY);ctx.lineTo(this.x+20,this.y+6.5+bobY);ctx.stroke();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(this.x+16,this.y+20+bobY,5.5,0,Math.PI);ctx.fill();
    ctx.fillStyle='#ff4444';ctx.beginPath();ctx.arc(this.x+16,this.y+20+bobY,4,0,Math.PI);ctx.fill();
    // Teeth
    ctx.fillStyle='#fff';ctx.fillRect(this.x+11,this.y+20+bobY,3,3);ctx.fillRect(this.x+15,this.y+20+bobY,3,3);ctx.fillRect(this.x+19,this.y+20+bobY,3,3);
    if(enemyFrozen||this.frozen){
      for(let i=0;i<3;i++){const a=this._t+i*(Math.PI*2/3);ctx.globalAlpha=.7;ctx.fillStyle='#aaeeff';ctx.shadowColor='#aaeeff';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(this.x+16+Math.cos(a)*14,this.y+14+Math.sin(a)*12,3,0,Math.PI*2);ctx.fill();}
    }
    if(this.poisoned&&animTick%4===0){
      ctx.globalAlpha=.5;ctx.fillStyle='#88FF00';ctx.beginPath();ctx.arc(this.x+Math.random()*32,this.y+Math.random()*28,3,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}

class Coin{
  constructor(x,y,secret=false){this.x=x;this.y=y;this.radius=7;this.collected=false;this._t=Math.random()*Math.PI*2;this.secret=secret;this.magnetized=false;this.voidPull=false;this.dropped=false;this.dvx=0;this.dvy=0;this.dropT=0;}
  draw(){
    if(this.collected)return;
    this._t+=.055;const bob=Math.sin(this._t)*3.5;
    ctx.save();
    ctx.shadowColor=this.secret?'#ff66ff':'#FFD700';ctx.shadowBlur=18+Math.sin(this._t*2)*6;
    const cg=ctx.createRadialGradient(this.x-2,this.y+bob-2,0,this.x,this.y+bob,this.radius+2);
    if(this.secret){cg.addColorStop(0,'#ffccff');cg.addColorStop(.45,'#ee44ff');cg.addColorStop(.8,'#aa00cc');cg.addColorStop(1,'#660088');}
    else{cg.addColorStop(0,'#FFFF99');cg.addColorStop(.4,'#FFD700');cg.addColorStop(.8,'#CC9900');cg.addColorStop(1,'#885500');}
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(this.x,this.y+bob,this.radius,0,Math.PI*2);ctx.fill();
    // Rim
    ctx.strokeStyle=this.secret?'#cc00cc':'#BB7700';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(this.x,this.y+bob,this.radius,0,Math.PI*2);ctx.stroke();
    // Spinning shine — simulates 3D coin rotation
    const spinAng=this._t*1.3;
    const ssx=this.x+Math.cos(spinAng)*this.radius*.65;
    const ssy=this.y+bob+Math.sin(spinAng)*this.radius*.22;
    ctx.save();ctx.globalAlpha=.62;ctx.fillStyle='rgba(255,255,240,.85)';
    ctx.beginPath();ctx.ellipse(ssx,ssy,3.5,1.8,spinAng,0,Math.PI*2);ctx.fill();ctx.restore();
    // Static top-left shine
    ctx.fillStyle='rgba(255,255,255,.52)';ctx.beginPath();ctx.ellipse(this.x-2.5,this.y+bob-2.5,this.radius*.36,this.radius*.33,-Math.PI/6,0,Math.PI*2);ctx.fill();
    // Inner ring
    ctx.strokeStyle=this.secret?'rgba(255,150,255,.4)':'rgba(255,200,0,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(this.x,this.y+bob,this.radius*.55,0,Math.PI*2);ctx.stroke();
    // Sparkle flicker (random chance)
    if(animTick%7===Math.floor(this._t*3)%7){
      const sa=this._t*2.4;
      for(let si=0;si<4;si++){
        const sxa=this.x+Math.cos(sa+si*Math.PI/2)*(this.radius+5);
        const sya=this.y+bob+Math.sin(sa+si*Math.PI/2)*(this.radius+5);
        ctx.save();ctx.globalAlpha=.5+Math.sin(this._t*3)*.3;ctx.fillStyle=this.secret?'#ff88ff':'#FFEE44';
        ctx.beginPath();ctx.arc(sxa,sya,1.2,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    ctx.restore();
  }
  update(){
    if(this.dropped){
      this.dvx*=0.95;this.dvy+=0.32;
      this.x+=this.dvx;this.y+=this.dvy;this.dropT++;
      if(this.dropT>28){
        const dx=player.x+player.width/2-this.x,dy=player.y+player.height/2-this.y;
        const d=Math.sqrt(dx*dx+dy*dy)||1;this.x+=dx/d*5.5;this.y+=dy/d*5.5;
      }
    }
  }
  collidesWith(r){const cx=Math.max(r.x,Math.min(this.x,r.x+r.width)),cy=Math.max(r.y,Math.min(this.y,r.y+r.height));const dx=this.x-cx,dy=this.y-cy;return dx*dx+dy*dy<this.radius*this.radius*3.5;}
}

// Crumbling platform — shakes on landing, then falls away
class CrumblePlatform extends Platform{
  constructor(x,y,w){super(x,y,w,16);this.shakeT=0;this.falling=false;this.fallV=0;this.alpha=1;}
  collidesWith(r){return !this.falling&&super.collidesWith(r);}
  touch(){if(!this.shakeT){this.shakeT=1;spawnBurst(this.x+this.width/2,this.y+2,'#aa6633',5,2);}}
  update(){
    if(this.shakeT&&!this.falling){
      this.shakeT++;
      if(this.shakeT>55){this.falling=true;spawnBurst(this.x+this.width/2,this.y,'#cc7744',10,3);}
    }
    if(this.falling){this.fallV+=0.55;this.y+=this.fallV;this.alpha=Math.max(0,this.alpha-0.026);}
  }
  draw(){
    if(this.alpha<=0)return;
    const t=Math.min(this.shakeT/55,1);
    const sx=this.shakeT&&!this.falling?(Math.random()-.5)*t*7:0;
    ctx.save();ctx.globalAlpha=this.alpha;ctx.translate(sx,0);
    ctx.shadowColor='#dd6600';ctx.shadowBlur=8+t*10;
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);
    g.addColorStop(0,`hsl(22,${70+t*15}%,${42+t*8}%)`);g.addColorStop(1,`hsl(16,65%,22%)`);
    ctx.fillStyle=g;ctx.fillRect(this.x,this.y,this.width,this.height);
    // Crack lines deepen as shakeT grows
    if(t>.22){
      ctx.globalAlpha=this.alpha*.55;ctx.strokeStyle='#1a0500';ctx.lineWidth=1;
      for(let ci=0;ci<Math.ceil(t*3);ci++){
        const cx2=this.x+this.width*(.22+ci*.28);
        ctx.beginPath();ctx.moveTo(cx2,this.y);ctx.lineTo(cx2+(ci%2?2:-2),this.y+16);ctx.stroke();
      }
    }
    ctx.globalAlpha=this.alpha;
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(this.x,this.y,this.width,3);
    ctx.strokeStyle='#cc5500';ctx.lineWidth=1;ctx.strokeRect(this.x,this.y,this.width,this.height);
    ctx.restore();
  }
}

class KillBrick{
  constructor(x,y,w,h){this.x=x;this.y=y;this.width=w;this.height=h;this._t=0;}
  draw(){
    this._t+=.045;
    const pulse=Math.sin(this._t*3)*.4+.6;
    ctx.save();ctx.shadowColor=`rgba(255,0,0,${pulse})`;ctx.shadowBlur=20+pulse*10;
    ctx.fillStyle='#6a0000';ctx.fillRect(this.x,this.y,this.width,this.height);
    const eg=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);
    eg.addColorStop(0,`rgba(220,20,0,${pulse*.5})`);eg.addColorStop(1,'rgba(100,0,0,.3)');
    ctx.fillStyle=eg;ctx.fillRect(this.x,this.y,this.width,this.height);
    // Enhanced X marks
    ctx.strokeStyle=`rgba(255,${30+pulse*30},0,.95)`;ctx.lineWidth=2.5;ctx.strokeRect(this.x,this.y,this.width,this.height);
    ctx.strokeStyle=`rgba(255,0,0,${.5+pulse*.3})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(this.x+5,this.y+5);ctx.lineTo(this.x+this.width-5,this.y+this.height-5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(this.x+this.width-5,this.y+5);ctx.lineTo(this.x+5,this.y+this.height-5);ctx.stroke();
    // Warning dots
    if(pulse>.8){ctx.fillStyle=`rgba(255,120,0,.8)`;ctx.beginPath();ctx.arc(this.x+this.width*.25,this.y+this.height*.5,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(this.x+this.width*.75,this.y+this.height*.5,2,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}

class Crate{
  constructor(x,y,hp=1,coins=2){this.x=x;this.y=y;this.width=32;this.height=32;this.hp=hp;this.maxHp=hp;this.coins=coins;this._t=0;this._flash=0;}
  draw(){
    this._t++;if(this._flash>0)this._flash--;
    const sx=this.x-camera.x,sy=this.y-camera.y;
    if(sx>W+40||sx<-40||sy>H+40||sy<-40)return;
    ctx.save();
    ctx.shadowColor=this._flash>0?'#ffffff':'#aa7733';ctx.shadowBlur=this._flash>0?16:6;
    const bg=ctx.createLinearGradient(sx,sy,sx,sy+32);
    bg.addColorStop(0,'#c8843a');bg.addColorStop(0.5,'#8b5a1a');bg.addColorStop(1,'#5a3200');
    ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(sx,sy,32,32,3);ctx.fill();
    ctx.strokeStyle='#ffcc88';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(sx,sy,32,32,3);ctx.stroke();
    // Wood grain lines
    ctx.globalAlpha=0.3;ctx.strokeStyle='#3a1a00';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sx+8,sy+2);ctx.lineTo(sx+8,sy+30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sx+24,sy+2);ctx.lineTo(sx+24,sy+30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sx+2,sy+16);ctx.lineTo(sx+30,sy+16);ctx.stroke();
    ctx.globalAlpha=1;
    // HP indicator dots
    if(this.maxHp>1){for(let i=0;i<this.hp;i++){ctx.fillStyle='#ffff88';ctx.beginPath();ctx.arc(sx+6+i*10,sy+4,2.5,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  }
}

class SpringPad{
  constructor(x,y){this.x=x;this.y=y;this.width=60;this.height=16;this._t=0;this._pressed=0;}
  trigger(){this._pressed=10;}
  draw(){
    this._t+=.06;if(this._pressed>0)this._pressed--;
    const compress=this._pressed>0?Math.max(.35,1-this._pressed/10):1;
    ctx.save();
    ctx.shadowColor='#00FFAA';ctx.shadowBlur=16+Math.sin(this._t*2)*5;
    // Base plate
    ctx.fillStyle='#004433';ctx.fillRect(this.x,this.y+this.height-5,this.width,5);
    ctx.fillStyle='rgba(0,255,170,.12)';ctx.fillRect(this.x,this.y+this.height-5,this.width,5);
    // Top plate (compresses down)
    const topY=this.y+(this.height-5)*(1-compress);
    ctx.fillStyle='#00FFCC';ctx.shadowBlur=22;ctx.fillRect(this.x,topY,this.width,4);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(this.x,topY,this.width,2);
    // Spring coils between top and base
    ctx.strokeStyle='#00FFAA';ctx.lineWidth=2;ctx.shadowBlur=8;
    const coils=4;const coilSpacing=this.width/(coils+1);
    for(let ci=1;ci<=coils;ci++){
      const cx=this.x+ci*coilSpacing;
      const baseYc=this.y+this.height-5;const topYc=topY+4;
      ctx.beginPath();ctx.moveTo(cx,baseYc);
      ctx.bezierCurveTo(cx+8,baseYc-(baseYc-topYc)*.5,cx-8,baseYc-(baseYc-topYc)*.5,cx,topYc);
      ctx.stroke();
    }
    // Label
    ctx.fillStyle='rgba(0,255,170,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.shadowBlur=6;
    ctx.fillText('SPRING',this.x+this.width/2,this.y-2);
    ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y+r.height>=this.y&&r.y+r.height<=this.y+22&&r.velY>=0;}
}

class PowerUp{
  constructor(x,y,type='speedBoost'){
    this.x=x;this.y=y;this.type=type;this.width=28;this.height=28;
    this.collected=false;this._t=Math.random()*Math.PI*2;
  }
  draw(){
    if(this.collected)return;
    this._t+=.07;const bob=Math.sin(this._t)*4;
    const cx=this.x+14,cy=this.y+14+bob;
    const cols={speedBoost:'#00ffff',shield:'#4488ff',extraJump:'#44ff88',invincibility:'#ffdd00',coinMagnet:'#FFD700',scoreMult:'#FF88FF',freeze:'#88eeff',coinShower:'#FFDD44',nuke:'#FF4422',shieldBubble:'#88ff44'};
    const lbls={speedBoost:'SPD',shield:'SHD',extraJump:'JMP',invincibility:'INV',coinMagnet:'MAG',scoreMult:'x2',freeze:'ICE',coinShower:'$$$',nuke:'BOOM',shieldBubble:'BUB'};
    const col=cols[this.type]||'#ffffff';
    ctx.save();
    ctx.shadowColor=col;ctx.shadowBlur=22+Math.sin(this._t*2)*7;
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=.5+Math.sin(this._t*3)*.3;
    ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
    const grad=ctx.createRadialGradient(cx-3,cy-3,0,cx,cy,13);
    grad.addColorStop(0,col+'cc');grad.addColorStop(.6,col+'66');grad.addColorStop(1,col+'11');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.shadowBlur=6;ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(lbls[this.type]||'?',cx,cy);
    ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}
class TpPad{
  constructor(x,y){this.x=x;this.y=y;this.width=60;this.height=12;this._t=Math.random()*Math.PI*2;}
  draw(){
    this._t+=.09;
    const cx=this.x+30;
    ctx.save();
    ctx.shadowColor='#cc44ff';ctx.shadowBlur=16+Math.sin(this._t)*6;
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+12);
    g.addColorStop(0,'#aa22ee');g.addColorStop(1,'#44006a');
    ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(this.x,this.y,60,12,4);ctx.fill();
    ctx.strokeStyle='#ee88ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(this.x,this.y,60,12,4);ctx.stroke();
    ctx.globalAlpha=0.4+Math.sin(this._t*2)*.2;ctx.strokeStyle='#ff88ff';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(cx,this.y-4,10+Math.sin(this._t)*2,4,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
    ctx.fillStyle='#ffddff';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('TP',cx,this.y+6);
    ctx.restore();
  }
  landCollide(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y+r.height>=this.y&&r.y+r.height<=this.y+16&&r.velY>=0;}
}
class StickyPad{
  constructor(x,y,w){this.x=x;this.y=y;this.width=w||80;this.height=14;this._t=Math.random()*Math.PI*2;}
  draw(){
    this._t+=.06;
    ctx.save();
    ctx.shadowColor='#88ff44';ctx.shadowBlur=10;
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+14);
    g.addColorStop(0,'#55bb00');g.addColorStop(1,'#224400');
    ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(this.x,this.y,this.width,14,5);ctx.fill();
    ctx.strokeStyle='#aaff44';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(this.x,this.y,this.width,14,5);ctx.stroke();
    const drops=Math.floor(this.width/20);
    for(let i=0;i<drops;i++){
      const bx=this.x+10+i*20;const drop=Math.abs(Math.sin(this._t+i*1.2))*5;
      ctx.fillStyle='rgba(100,220,20,.6)';ctx.beginPath();ctx.arc(bx,this.y+14+drop,2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='rgba(190,255,80,.9)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('STICKY',this.x+this.width/2,this.y+7);
    ctx.restore();
  }
  landCollide(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y+r.height>=this.y&&r.y+r.height<=this.y+16&&r.velY>=0;}
}
class SecretDoor{
  constructor(x,y){this.x=x;this.y=y;this.width=40;this.height=60;this._t=0;this.discovered=false;}
  draw(){
    this._t+=.035;
    ctx.save();ctx.shadowColor='#ff44ff';ctx.shadowBlur=24+Math.sin(this._t*2)*8;
    const grad=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);
    grad.addColorStop(0,'#550088');grad.addColorStop(.5,'#330066');grad.addColorStop(1,'#110033');
    ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(this.x,this.y,this.width,this.height,5);ctx.fill();
    // Inner glow
    ctx.globalAlpha=.15+Math.sin(this._t)*.08;
    const ig=ctx.createRadialGradient(this.x+20,this.y+30,0,this.x+20,this.y+30,25);
    ig.addColorStop(0,'#ff88ff');ig.addColorStop(1,'transparent');
    ctx.fillStyle=ig;ctx.fillRect(this.x,this.y,this.width,this.height);
    ctx.globalAlpha=1;
    ctx.strokeStyle=`rgba(255,80,255,${.5+Math.sin(this._t)*.3})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(this.x,this.y,this.width,this.height,5);ctx.stroke();
    // Swirl
    for(let i=0;i<4;i++){
      ctx.globalAlpha=.35+Math.sin(this._t+i)*.15;ctx.strokeStyle=`hsl(${280+i*25+animTick},100%,70%)`;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(this.x+20,this.y+30,6+i*5,this._t*(.8+i*.1),this._t*(.8+i*.1)+Math.PI*(.6+i*.1));ctx.stroke();
    }
    // Particle wisps
    if(animTick%6===0){particles.push(new Particle(this.x+10+Math.random()*20,this.y+5,'#ff88ff',(Math.random()-.5)*.5,-1-Math.random(),20,2,true,'circle'));}
    ctx.globalAlpha=1;ctx.fillStyle='rgba(255,150,255,.85)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.shadowBlur=8;ctx.fillText(this.discovered?'EXIT':'SECRET',this.x+20,this.y-4);
    ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}
class LaserBeam{
  constructor(x1,y1,x2,y2,interval=60){this.x1=x1;this.y1=y1;this.x2=x2;this.y2=y2;this.interval=interval;this._t=Math.floor(Math.random()*interval);this.on=false;}
  draw(){
    const on=this.on;
    ctx.save();
    if(on){
      ctx.shadowColor='#ff2200';ctx.shadowBlur=16+Math.sin(this._t*.2)*6;
      ctx.strokeStyle='#ff6644';ctx.lineWidth=3;
      ctx.globalAlpha=0.85+Math.sin(this._t*.3)*.12;
    }else{
      ctx.strokeStyle='#441100';ctx.lineWidth=1;ctx.globalAlpha=0.3;
    }
    ctx.beginPath();ctx.moveTo(this.x1,this.y1);ctx.lineTo(this.x2,this.y2);ctx.stroke();
    if(on){
      ctx.globalAlpha=0.22;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(this.x1,this.y1);ctx.lineTo(this.x2,this.y2);ctx.stroke();
      // End nodes
      [this.x1,this.x2].forEach((bx,i)=>{const by=i===0?this.y1:this.y2;ctx.globalAlpha=0.9;ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(bx,by,5+Math.sin(this._t*.2)*2,0,Math.PI*2);ctx.fill();});
    }
    ctx.restore();
  }
}
class BossEnemy{
  constructor(x,y,minX,maxX,hp=3){this.x=x;this.y=y;this.width=56;this.height=56;this.minX=minX;this.maxX=maxX;this.spd=1.2;this.dir=1;this.hp=hp;this.maxHp=hp;this._t=0;this.flashTimer=0;}
  draw(){
    this._t++;const cx=this.x+28,cy=this.y+28;
    const flash=this.flashTimer>0&&Math.floor(this.flashTimer/4)%2===0;
    ctx.save();
    ctx.shadowColor=flash?'#ffffff':'#ff2200';ctx.shadowBlur=20+Math.sin(this._t*.08)*8;
    // Body
    const grad=ctx.createRadialGradient(cx,cy,4,cx,cy,30);
    grad.addColorStop(0,flash?'#ffffff':'#ff6644');grad.addColorStop(1,flash?'#ffaaaa':'#880000');
    ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(this.x,this.y,56,56,8);ctx.fill();
    ctx.strokeStyle='#ff2200';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(this.x,this.y,56,56,8);ctx.stroke();
    // Eyes
    ctx.fillStyle='#ffff00';[-14,14].forEach(dx=>{ctx.beginPath();ctx.arc(cx+dx,cy-8,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.beginPath();ctx.arc(cx+dx,cy-8,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffff00';});
    // Mouth
    ctx.strokeStyle='#ffff00';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy+8,12,0,Math.PI);ctx.stroke();
    // HP bar
    const barW=60,barX=this.x-2,barY=this.y-14;
    ctx.fillStyle='#220000';ctx.fillRect(barX,barY,barW,8);
    ctx.fillStyle=this.hp>this.maxHp*.5?'#ff4400':'#ff0000';
    ctx.fillStyle=this.hp===1?'#ff0000':this.hp===2?'#ff8800':'#ff4400';
    ctx.fillRect(barX,barY,barW*(this.hp/this.maxHp),8);
    ctx.strokeStyle='#ff2200';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,8);
    ctx.fillStyle='#ffffff';ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BOSS HP',cx,barY+4);
    // Pulse aura
    if(animTick%20===0)spawnRing(cx,cy,'#ff2200',6,28+Math.random()*8);
    ctx.restore();
  }
}
class HeartDrop{
  constructor(x,y){this.x=x;this.y=y;this.vy=-(3+Math.random()*2);this.life=240;this._t=Math.random()*Math.PI*2;}
  draw(){
    this._t+=.08;
    ctx.save();ctx.shadowColor='#ff6688';ctx.shadowBlur=14+Math.sin(this._t)*5;
    const s=1+Math.sin(this._t)*.08;
    ctx.translate(this.x,this.y);ctx.scale(s,s);
    ctx.fillStyle='#ff4466';ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(-3,2,-12,-3,-12,-11);ctx.bezierCurveTo(-12,-19,0,-19,0,-13);ctx.bezierCurveTo(0,-19,12,-19,12,-11);ctx.bezierCurveTo(12,-3,3,2,0,6);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,200,210,.45)';ctx.beginPath();ctx.ellipse(-4,-14,3,2,-.4,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}
class ThrowStarObj{
  constructor(x,y,vx,vy){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.life=90;this.angle=0;}
  draw(){
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
    ctx.shadowColor='#FFD700';ctx.shadowBlur=12;
    ctx.fillStyle='#FFD700';
    ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2,oa=(i+.5)*Math.PI*2/5-Math.PI/2;ctx.lineTo(Math.cos(a)*9,Math.sin(a)*9);ctx.lineTo(Math.cos(oa)*4,Math.sin(oa)*4);}ctx.closePath();ctx.fill();
    ctx.restore();
  }
}
class Portal{
  constructor(x,y,type){
    this.x=x;this.y=y;this.type=type;this._t=Math.random()*Math.PI*2;
    this.width=40;this.height=60;this.collected=false;
    const C={gravity:'#4488ff',mirror:'#ff8800',shrink:'#00ffdd',ghost:'#eeeeff',speed:'#ffff00',score:'#ffd700',rage:'#ff2200',coinStorm:'#00ff88',bounce:'#ff88ff'};
    this.color=C[type]||'#00ffff';
  }
  draw(){
    this._t+=.04;const cx=this.x+20,cy=this.y+30;
    ctx.save();
    ctx.shadowColor=this.color;ctx.shadowBlur=22+Math.sin(this._t)*8;
    // Outer ellipse ring
    ctx.strokeStyle=this.color;ctx.lineWidth=3;ctx.globalAlpha=0.75+Math.sin(this._t)*.18;
    ctx.beginPath();ctx.ellipse(cx,cy,18,28,0,0,Math.PI*2);ctx.stroke();
    // Inner swirl arcs
    for(let i=0;i<4;i++){
      ctx.globalAlpha=0.4+Math.sin(this._t+i)*.15;ctx.strokeStyle=this.color;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(cx,cy,5+i*4,this._t*(0.9+i*.18),this._t*(0.9+i*.18)+Math.PI*.7);ctx.stroke();
    }
    // Glow fill
    ctx.globalAlpha=0.13+Math.sin(this._t)*.06;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,22);
    g.addColorStop(0,this.color);g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,18,28,0,0,Math.PI*2);ctx.fill();
    // Label
    const LBL={gravity:'↕ GRAV',mirror:'↔ MIR',shrink:'↓ SHK',ghost:'◌ GHO',speed:'» SPD',score:'★ SCR',rage:'💥 RGE',coinStorm:'$ CST',bounce:'↑ BNC'};
    ctx.globalAlpha=0.92;ctx.shadowBlur=7;ctx.fillStyle=this.color;
    ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(LBL[this.type]||'?',cx,cy);
    // Type icon above
    const ICO={gravity:'↕',mirror:'↔',shrink:'↓↑',ghost:'◌',speed:'»»',score:'★',rage:'💥',coinStorm:'$',bounce:'↑↑'};
    ctx.font='bold 9px Orbitron';ctx.fillText(ICO[this.type]||'?',cx,cy-15);
    // Particle wisp
    if(animTick%9===0)particles.push(new Particle(cx+(Math.random()-.5)*14,this.y+4+Math.random()*52,this.color,(Math.random()-.5)*.7,-1.1-Math.random()*.8,22,2,true,'circle'));
    ctx.globalAlpha=1;ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}
class WarpGate{
  constructor(x,y,pairId,color){
    this.x=x;this.y=y;this.pairId=pairId;this.color=color||'#ff44ff';
    this._t=Math.random()*Math.PI*2;this.width=44;this.height=66;this.collected=false;
  }
  draw(){
    if(this.collected)return;
    this._t+=.035;const cx=this.x+22,cy=this.y+33;
    ctx.save();
    ctx.shadowColor=this.color;ctx.shadowBlur=28+Math.sin(this._t)*10;
    ctx.strokeStyle=this.color;ctx.lineWidth=4;ctx.globalAlpha=0.8+Math.sin(this._t)*.15;
    ctx.beginPath();ctx.ellipse(cx,cy,20,32,0,0,Math.PI*2);ctx.stroke();
    // Second ring
    ctx.lineWidth=1.5;ctx.globalAlpha=0.4+Math.sin(this._t+1)*.2;
    ctx.beginPath();ctx.ellipse(cx,cy,26,38,0,0,Math.PI*2);ctx.stroke();
    // Fill
    ctx.globalAlpha=0.15+Math.sin(this._t)*.07;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,28);
    g.addColorStop(0,this.color);g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,20,32,0,0,Math.PI*2);ctx.fill();
    // Swirl
    for(let i=0;i<5;i++){
      ctx.globalAlpha=0.35+Math.sin(this._t+i*1.2)*.12;ctx.strokeStyle=this.color;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(cx,cy,5+i*5,this._t*(1+i*.12),this._t*(1+i*.12)+Math.PI*.65);ctx.stroke();
    }
    ctx.globalAlpha=0.92;ctx.shadowBlur=10;ctx.fillStyle=this.color;
    ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('WARP',cx,cy-2);
    ctx.font='bold 6px Orbitron';ctx.fillText(String.fromCharCode(65+this.pairId),cx,cy+10);
    if(animTick%7===0){
      const a=Math.random()*Math.PI*2;
      particles.push(new Particle(cx+Math.cos(a)*20,cy+Math.sin(a)*32,this.color,Math.cos(a)*(.5+Math.random()*1.5),Math.sin(a)*(.5+Math.random()*1.5),28,2.5,true,'circle'));
    }
    ctx.globalAlpha=1;ctx.restore();
  }
  collidesWith(r){return r.x<this.x+this.width&&r.x+r.width>this.x&&r.y<this.y+this.height&&r.y+r.height>this.y;}
}

// ══════════════════════════════════════════
//  WORLD
// ══════════════════════════════════════════
const WORLD_W=4000,WORLD_H=3000;
const LEVEL_DATA=[
  // LEVEL 1: Stone/Space
  {bgIdx:0,lavaRise:false,lavaSpd:0,platforms:[
    new Platform(0,2900,800,100),new Platform(200,2700,220,20),new Platform(580,2550,200,20),
    new Platform(900,2700,220,20),new Platform(1200,2550,200,20),new Platform(1500,2700,200,20),
    new Platform(1800,2550,220,20),new Platform(2100,2700,200,20),new Platform(2400,2550,200,20),
    new Platform(2700,2700,200,20),new Platform(3000,2550,200,20),new Platform(3300,2700,200,20),
    new Platform(3600,2550,200,20),new Platform(3800,2600,200,20),
    new Platform(3850,2400,140,20),new Platform(3700,2200,140,20),new Platform(3850,2000,140,20),
    new Platform(3700,1800,140,20),new Platform(3850,1600,140,20),new Platform(3700,1400,140,20),
    new Platform(3500,1200,200,20),
  ],movingPlatforms:[
    new MovingPlatform(760,2620,130,20,600,1050),new MovingPlatform(1350,2620,130,20,1100,1700),
    new MovingPlatform(1950,2620,130,20,1700,2300),new MovingPlatform(2550,2620,130,20,2300,2900),
    new MovingPlatform(3150,2620,130,20,2900,3500),
  ],spikes:[
    new Spike(300,2880,3),new Spike(700,2880,2),new Spike(1000,2880,3),new Spike(1400,2880,2),
    new Spike(1700,2880,3),new Spike(2000,2880,2),new Spike(2300,2880,3),new Spike(2600,2880,2),
    new Spike(2900,2880,3),new Spike(3200,2880,2),new Spike(3500,2880,3),
  ],enemies:[
    new Enemy(600,2680,450,780,1.5),new Enemy(1200,2530,1000,1400,2),
    new Enemy(1900,2530,1600,2100,2.2),new Enemy(2500,2530,2200,2700,2.5),
    new Enemy(3100,2530,2800,3400,2.5),
  ],killBricks:[],
  coins:[...Array.from({length:9},(_,i)=>new Coin(300+i*400,2640)),new Coin(3720,2370),new Coin(3720,2170),new Coin(3720,1970),new Coin(3720,1770),new Coin(3600,1170)],
  secretDoors:[new SecretDoor(1900,2840)],secretRoomX:1900,secretRoomY:2600,
  portals:[new Portal(1200,2520,'gravity'),new Portal(2500,2520,'speed'),new Portal(3300,2520,'score')],
  warpGates:[new WarpGate(800,2640,0,'#ff44ff'),new WarpGate(3000,2540,0,'#ff44ff')],
  goal:new Goal(3500,1130),iceZones:[],},
  // LEVEL 2: Forest
  {bgIdx:1,lavaRise:false,lavaSpd:0,platforms:[
    new Platform(0,2900,800,100,'grass'),new Platform(150,2720,200,20,'grass'),new Platform(500,2560,180,20,'grass'),
    new Platform(800,2720,180,20,'grass'),new Platform(1100,2560,200,20,'grass'),new Platform(1400,2720,200,20,'grass'),
    new Platform(1700,2560,180,20,'grass'),new Platform(2000,2720,180,20,'grass'),new Platform(2300,2560,200,20,'grass'),
    new Platform(2600,2720,180,20,'grass'),new Platform(2900,2560,200,20,'grass'),new Platform(3200,2720,200,20,'grass'),
    new Platform(3500,2560,200,20,'grass'),new Platform(3700,2720,200,20,'grass'),
    new Platform(1000,2560,300,20,'ice'),new Platform(1300,2380,250,20,'ice'),new Platform(1600,2200,250,20,'ice'),
    new Platform(3750,2520,140,20,'grass'),new Platform(3600,2320,140,20,'grass'),new Platform(3750,2120,140,20,'grass'),
    new Platform(3600,1920,140,20,'grass'),new Platform(3750,1720,140,20,'grass'),new Platform(3600,1520,200,20,'grass'),
  ],movingPlatforms:[
    new MovingPlatform(640,2640,120,20,500,900),new MovingPlatform(1240,2640,120,20,1000,1500),
    new MovingPlatform(2040,2640,120,20,1700,2400),new MovingPlatform(2740,2640,120,20,2400,3100),
    new MovingPlatform(3340,2640,120,20,3100,3700),
  ],spikes:[
    new Spike(280,2880,3),new Spike(700,2880,3),new Spike(1100,2880,2),new Spike(1600,2880,3),
    new Spike(2000,2880,2),new Spike(2500,2880,3),new Spike(3000,2880,2),new Spike(3500,2880,2),
    new Spike(350,2720,2),new Spike(900,2720,2),new Spike(1500,2560,2,true),new Spike(1700,2200,2,true),
  ],enemies:[
    new Enemy(500,2540,350,680,2),new Enemy(1100,2540,800,1300,2.5),new Enemy(1700,2540,1400,2000,2.5),
    new Enemy(2300,2540,2000,2600,3),new Enemy(2900,2540,2600,3200,3),new Enemy(3500,2700,3300,3900,3),
  ],killBricks:[new KillBrick(700,2680,60,20),new KillBrick(2100,2680,60,20)],
  coins:[...Array.from({length:10},(_,i)=>new Coin(250+i*352,2640+(i%2===0?0:80))),new Coin(3670,2490),new Coin(3670,2290),new Coin(3670,2090),new Coin(3670,1890),new Coin(3670,1490)],
  secretDoors:[new SecretDoor(2600,2840)],secretRoomX:2600,secretRoomY:2700,
  portals:[new Portal(1000,2520,'mirror'),new Portal(2200,2520,'coinStorm'),new Portal(3400,2520,'bounce')],
  warpGates:[new WarpGate(600,2640,1,'#44ffff'),new WarpGate(2800,2540,1,'#44ffff')],
  goal:new Goal(3600,1470),iceZones:[{x:900,x2:1900}],},
  // LEVEL 3: Ice/Aurora
  {bgIdx:2,lavaRise:true,lavaSpd:.35,platforms:[
    new Platform(0,2900,800,100,'ice'),new Platform(100,2720,180,20,'ice'),new Platform(430,2540,180,20,'ice'),
    new Platform(750,2720,180,20,'ice'),new Platform(1060,2540,180,20,'ice'),new Platform(1360,2720,180,20,'ice'),
    new Platform(1660,2540,180,20,'ice'),new Platform(1960,2720,180,20,'ice'),new Platform(2260,2540,180,20,'ice'),
    new Platform(2560,2720,180,20,'ice'),new Platform(2860,2540,180,20,'ice'),new Platform(3160,2720,180,20,'ice'),
    new Platform(3460,2540,180,20,'ice'),new Platform(3660,2720,180,20,'ice'),
    new Platform(3720,2520,140,20,'ice'),new Platform(3600,2300,140,20,'ice'),new Platform(3720,2100,140,20,'ice'),
    new Platform(3600,1900,140,20,'ice'),new Platform(3720,1700,140,20,'ice'),new Platform(3600,1500,200,20,'ice'),
  ],movingPlatforms:[
    new MovingPlatform(600,2640,110,20,430,760,2),new MovingPlatform(1200,2640,110,20,900,1500,2.5),
    new MovingPlatform(1800,2640,110,20,1500,2100,2.5),new MovingPlatform(2400,2640,110,20,2100,2700,3),
    new MovingPlatform(3000,2640,110,20,2700,3300,3),new MovingPlatform(3550,2640,110,20,3300,3800,3),
  ],spikes:[
    new Spike(280,2880,4),new Spike(700,2880,3),new Spike(1100,2880,4),new Spike(1600,2880,3),
    new Spike(2000,2880,4),new Spike(2500,2880,3),new Spike(3000,2880,4),new Spike(3500,2880,3),
    new Spike(350,2720,2,true),new Spike(800,2540,2,true),new Spike(1200,2720,2,true),
  ],enemies:[
    new Enemy(430,2720,280,610,2.5),new Enemy(1060,2520,800,1340,3),new Enemy(1660,2520,1350,1950,3),
    new Enemy(2260,2520,1950,2550,3.5),new Enemy(2860,2520,2550,3150,3.5),new Enemy(3460,2700,3200,3800,4),
  ],killBricks:[new KillBrick(600,2680,60,20),new KillBrick(1800,2680,60,20),new KillBrick(3000,2680,60,20)],
  coins:[...Array.from({length:10},(_,i)=>new Coin(200+i*368,2640+(i%3===0?0:i%3===1?80:-40))),new Coin(3670,2470),new Coin(3670,2270),new Coin(3670,2070),new Coin(3670,1870),new Coin(3670,1470)],
  secretDoors:[new SecretDoor(3000,2840)],secretRoomX:3000,secretRoomY:2700,
  portals:[new Portal(900,2520,'shrink'),new Portal(2000,2520,'gravity'),new Portal(3100,2520,'score')],
  warpGates:[new WarpGate(500,2640,2,'#ff8844'),new WarpGate(2600,2540,2,'#ff8844')],
  goal:new Goal(3600,1450),iceZones:[{x:0,x2:4000}],},
  // LEVEL 4: Inferno
  {bgIdx:3,lavaRise:true,lavaSpd:.7,platforms:[
    new Platform(0,2900,800,100,'lava'),new Platform(80,2720,160,20,'lava'),new Platform(380,2540,150,20,'lava'),
    new Platform(670,2720,150,20,'lava'),new Platform(960,2540,150,20,'lava'),new Platform(1240,2720,150,20,'lava'),
    new Platform(1520,2540,150,20,'lava'),new Platform(1800,2720,150,20,'lava'),new Platform(2080,2540,150,20,'lava'),
    new Platform(2360,2720,150,20,'lava'),new Platform(2640,2540,150,20,'lava'),new Platform(2920,2720,150,20,'lava'),
    new Platform(3200,2540,150,20,'lava'),new Platform(3480,2720,150,20,'lava'),new Platform(3700,2540,150,20,'lava'),
    new Platform(3760,2340,130,20,'lava'),new Platform(3640,2140,130,20,'lava'),new Platform(3760,1940,130,20,'lava'),
    new Platform(3640,1740,130,20,'lava'),new Platform(3760,1540,130,20,'lava'),new Platform(3640,1340,200,20,'lava'),
  ],movingPlatforms:[
    new MovingPlatform(520,2640,100,20,380,680,3),new MovingPlatform(1100,2640,100,20,750,1340,3.5),
    new MovingPlatform(1660,2640,100,20,1340,1960,3.5),new MovingPlatform(2220,2640,100,20,1960,2560,4),
    new MovingPlatform(2780,2640,100,20,2520,3100,4),new MovingPlatform(3340,2640,100,20,3080,3680,4),
  ],spikes:[
    new Spike(240,2880,8),new Spike(700,2880,6),new Spike(1200,2880,6),new Spike(1700,2880,6),
    new Spike(2200,2880,6),new Spike(2700,2880,6),new Spike(3200,2880,6),new Spike(3700,2880,4),
    new Spike(280,2720,3),new Spike(530,2540,3,true),new Spike(820,2720,3),new Spike(1110,2540,3,true),
    new Spike(1390,2720,3),new Spike(1670,2540,3,true),
  ],enemies:[
    new Enemy(380,2520,200,530,3),new Enemy(960,2520,650,1140,3.5),new Enemy(1520,2520,1200,1800,3.5),
    new Enemy(2080,2520,1760,2360,4),new Enemy(2640,2520,2300,2920,4),new Enemy(3200,2520,2850,3500,4.5),new Enemy(3700,2700,3450,3900,4.5),
  ],killBricks:[new KillBrick(430,2680,60,20),new KillBrick(1000,2680,60,20),new KillBrick(2000,2680,60,20),new KillBrick(3000,2680,60,20)],
  coins:[...Array.from({length:11},(_,i)=>new Coin(180+i*344,2640+(i%2===0?0:100))),new Coin(3710,2300),new Coin(3710,2100),new Coin(3710,1900),new Coin(3710,1700),new Coin(3710,1300)],
  secretDoors:[new SecretDoor(2000,2840)],secretRoomX:2000,secretRoomY:2700,
  portals:[new Portal(1100,2520,'rage'),new Portal(2300,2520,'ghost'),new Portal(3500,2520,'coinStorm')],
  warpGates:[new WarpGate(700,2640,3,'#ffff44'),new WarpGate(3000,2540,3,'#ffff44')],
  goal:new Goal(3640,1300),iceZones:[],},
  // LEVEL 5: The Void
  {bgIdx:4,lavaRise:true,lavaSpd:1.1,platforms:[
    new Platform(0,2900,800,100,'void'),new Platform(60,2720,140,20,'void'),new Platform(340,2540,130,20,'void'),
    new Platform(620,2720,130,20,'void'),new Platform(900,2540,130,20,'void'),new Platform(1170,2720,130,20,'void'),
    new Platform(1440,2540,130,20,'void'),new Platform(1710,2720,130,20,'void'),new Platform(1980,2540,130,20,'void'),
    new Platform(2250,2720,130,20,'void'),new Platform(2520,2540,130,20,'void'),new Platform(2790,2720,130,20,'void'),
    new Platform(3060,2540,130,20,'void'),new Platform(3330,2720,130,20,'void'),new Platform(3600,2540,130,20,'void'),
    new Platform(3720,2340,120,20,'void'),new Platform(3620,2140,120,20,'void'),new Platform(3720,1940,120,20,'void'),
    new Platform(3620,1740,120,20,'void'),new Platform(3720,1540,120,20,'void'),new Platform(3620,1340,180,20,'void'),
  ],movingPlatforms:[
    new MovingPlatform(470,2640,90,20,340,650,4),new MovingPlatform(1030,2640,90,20,640,1200,4.5),
    new MovingPlatform(1580,2640,90,20,1200,1780,4.5),new MovingPlatform(2120,2640,90,20,1780,2400,5),
    new MovingPlatform(2660,2640,90,20,2400,2960,5),new MovingPlatform(3190,2640,90,20,2940,3500,5),
    new MovingPlatform(3680,2640,90,20,3440,3880,5),
  ],spikes:[
    new Spike(200,2880,10),new Spike(700,2880,8),new Spike(1200,2880,8),new Spike(1700,2880,8),
    new Spike(2200,2880,8),new Spike(2700,2880,8),new Spike(3200,2880,8),new Spike(3700,2880,5),
    new Spike(300,2720,4),new Spike(490,2540,4,true),new Spike(770,2720,4),new Spike(1050,2540,4,true),
    new Spike(1310,2720,4),new Spike(1590,2540,4,true),new Spike(1860,2720,4),
    new Spike(2130,2540,4,true),new Spike(2400,2720,4),new Spike(2670,2540,4,true),
    new Spike(2940,2720,4),new Spike(3210,2540,4,true),new Spike(3480,2720,4),
  ],enemies:[
    new Enemy(340,2520,100,610,4),new Enemy(900,2520,560,1170,4.5),new Enemy(1440,2520,1110,1740,5),
    new Enemy(1980,2520,1680,2280,5),new Enemy(2520,2520,2260,2820,5),new Enemy(3060,2520,2800,3350,5.5),new Enemy(3600,2700,3350,3900,5.5),
  ],killBricks:[new KillBrick(380,2680,60,20),new KillBrick(940,2680,60,20),new KillBrick(1760,2680,60,20),new KillBrick(2580,2680,60,20),new KillBrick(3280,2680,60,20)],
  coins:[...Array.from({length:11},(_,i)=>new Coin(160+i*344,2640+(i%3===0?0:i%3===1?90:-50))),new Coin(3670,2300),new Coin(3670,2100),new Coin(3670,1900),new Coin(3670,1700),new Coin(3670,1300)],
  secretDoors:[new SecretDoor(1600,2840),new SecretDoor(3100,2840)],secretRoomX:1600,secretRoomY:2700,
  portals:[new Portal(1000,2520,'ghost'),new Portal(2200,2520,'mirror'),new Portal(3300,2520,'bounce')],
  warpGates:[new WarpGate(600,2640,4,'#88ff44'),new WarpGate(2700,2540,4,'#88ff44')],
  goal:new Goal(3620,1300),iceZones:[],},
  // LEVEL 6: Deep Space — bgIdx:0, hard lava, narrower platforms, faster everything
  {bgIdx:0,lavaRise:true,lavaSpd:.55,platforms:[
    new Platform(0,2900,700,100),new Platform(50,2720,120,20),new Platform(310,2540,110,20),
    new Platform(570,2720,110,20),new Platform(830,2540,110,20),new Platform(1080,2720,110,20),
    new Platform(1330,2540,110,20),new Platform(1580,2720,110,20),new Platform(1830,2540,110,20),
    new Platform(2080,2720,110,20),new Platform(2330,2540,110,20),new Platform(2580,2720,110,20),
    new Platform(2830,2540,110,20),new Platform(3080,2720,110,20),new Platform(3330,2540,110,20),
    new Platform(3550,2720,110,20),
    new Platform(3700,2520,100,20),new Platform(3580,2300,100,20),new Platform(3700,2080,100,20),
    new Platform(3580,1860,100,20),new Platform(3700,1640,100,20),new Platform(3580,1420,160,20),
  ],movingPlatforms:[
    new MovingPlatform(430,2640,85,20,310,580,5),new MovingPlatform(980,2640,85,20,700,1250,5.5),
    new MovingPlatform(1520,2640,85,20,1200,1820,5.5),new MovingPlatform(2050,2640,85,20,1750,2390,6),
    new MovingPlatform(2580,2640,85,20,2310,2920,6),new MovingPlatform(3120,2640,85,20,2860,3450,6),
    new MovingPlatform(3620,2640,85,20,3400,3880,6),
  ],spikes:[
    new Spike(180,2880,10),new Spike(700,2880,8),new Spike(1200,2880,8),new Spike(1700,2880,8),
    new Spike(2200,2880,8),new Spike(2700,2880,8),new Spike(3200,2880,6),new Spike(3600,2880,5),
    new Spike(280,2720,5),new Spike(540,2540,5,true),new Spike(800,2720,5),new Spike(1060,2540,5,true),
    new Spike(1320,2720,5),new Spike(1580,2540,5,true),new Spike(1840,2720,5),new Spike(2100,2540,5,true),
    new Spike(2360,2720,5),new Spike(2620,2540,5,true),new Spike(2880,2720,5),new Spike(3140,2540,5,true),
  ],enemies:[
    new Enemy(310,2520,150,580,5),new Enemy(830,2520,620,1160,5.5),new Enemy(1330,2520,1100,1760,5.5),
    new Enemy(1830,2520,1640,2380,6),new Enemy(2330,2520,2200,2880,6),
    new Enemy(2830,2520,2700,3400,6.5),new Enemy(3330,2700,3200,3850,6.5),
  ],killBricks:[
    new KillBrick(360,2680,60,20),new KillBrick(900,2680,60,20),new KillBrick(1440,2680,60,20),
    new KillBrick(1980,2680,60,20),new KillBrick(2520,2680,60,20),new KillBrick(3060,2680,60,20),
  ],
  coins:[...Array.from({length:12},(_,i)=>new Coin(150+i*308,2640+(i%3===0?0:i%3===1?90:-50))),
    new Coin(3640,2470),new Coin(3640,2250),new Coin(3640,2030),new Coin(3640,1810),new Coin(3640,1390)],
  secretDoors:[new SecretDoor(1800,2840)],secretRoomX:1800,secretRoomY:2700,
  portals:[new Portal(1200,2520,'gravity'),new Portal(2000,2520,'speed'),new Portal(3000,2520,'score'),new Portal(3600,2520,'coinStorm')],
  warpGates:[new WarpGate(800,2640,5,'#ff44ff'),new WarpGate(3200,2540,5,'#ff44ff')],
  goal:new Goal(3580,1380),iceZones:[],},
  // LEVEL 7: Storm Zone — bgIdx:2 (aurora), brutal ice + lava combo
  {bgIdx:2,lavaRise:true,lavaSpd:.9,platforms:[
    new Platform(0,2900,700,100,'ice'),new Platform(40,2720,100,20,'ice'),new Platform(290,2540,100,20,'ice'),
    new Platform(540,2720,100,20,'ice'),new Platform(790,2540,100,20,'ice'),new Platform(1030,2720,100,20,'ice'),
    new Platform(1270,2540,100,20,'ice'),new Platform(1510,2720,100,20,'ice'),new Platform(1750,2540,100,20,'ice'),
    new Platform(1990,2720,100,20,'ice'),new Platform(2230,2540,100,20,'ice'),new Platform(2470,2720,100,20,'ice'),
    new Platform(2710,2540,100,20,'ice'),new Platform(2950,2720,100,20,'ice'),new Platform(3190,2540,100,20,'ice'),
    new Platform(3430,2720,100,20,'ice'),new Platform(3620,2540,100,20,'ice'),
    new Platform(3720,2340,90,20,'ice'),new Platform(3620,2140,90,20,'ice'),new Platform(3720,1940,90,20,'ice'),
    new Platform(3620,1740,90,20,'ice'),new Platform(3720,1540,90,20,'ice'),new Platform(3620,1340,150,20,'ice'),
  ],movingPlatforms:[
    new MovingPlatform(390,2640,75,20,290,580,6),new MovingPlatform(880,2640,75,20,620,1190,6.5),
    new MovingPlatform(1380,2640,75,20,1160,1720,6.5),new MovingPlatform(1870,2640,75,20,1680,2260,7),
    new MovingPlatform(2360,2640,75,20,2200,2790,7),new MovingPlatform(2850,2640,75,20,2700,3290,7),
    new MovingPlatform(3340,2640,75,20,3200,3720,7),
  ],spikes:[
    new Spike(160,2880,11),new Spike(680,2880,9),new Spike(1180,2880,9),new Spike(1680,2880,9),
    new Spike(2180,2880,9),new Spike(2680,2880,9),new Spike(3180,2880,7),new Spike(3680,2880,5),
    new Spike(260,2720,5,true),new Spike(510,2540,5),new Spike(760,2720,5,true),new Spike(1010,2540,5),
    new Spike(1250,2720,5,true),new Spike(1490,2540,5),new Spike(1730,2720,5,true),new Spike(1970,2540,5),
    new Spike(2210,2720,5,true),new Spike(2450,2540,5),new Spike(2690,2720,5,true),new Spike(2930,2540,5),
  ],enemies:[
    new Enemy(290,2520,100,530,5.5),new Enemy(790,2520,570,1090,6),new Enemy(1270,2520,1100,1710,6),
    new Enemy(1750,2520,1650,2310,6.5),new Enemy(2230,2520,2180,2820,6.5),
    new Enemy(2710,2520,2660,3320,7),new Enemy(3190,2700,3100,3800,7),
  ],killBricks:[
    new KillBrick(340,2680,60,20),new KillBrick(840,2680,60,20),new KillBrick(1340,2680,60,20),
    new KillBrick(1840,2680,60,20),new KillBrick(2340,2680,60,20),new KillBrick(2840,2680,60,20),new KillBrick(3340,2680,60,20),
  ],
  coins:[...Array.from({length:12},(_,i)=>new Coin(140+i*300,2640+(i%2===0?0:100))),
    new Coin(3670,2300),new Coin(3670,2100),new Coin(3670,1900),new Coin(3670,1700),new Coin(3670,1300)],
  secretDoors:[new SecretDoor(2200,2840)],secretRoomX:2200,secretRoomY:2700,
  portals:[new Portal(900,2520,'mirror'),new Portal(1800,2520,'shrink'),new Portal(2700,2520,'ghost'),new Portal(3500,2520,'bounce')],
  warpGates:[new WarpGate(500,2640,6,'#44aaff'),new WarpGate(2400,2540,6,'#44aaff')],
  goal:new Goal(3620,1300),iceZones:[{x:0,x2:4200}],},
  // LEVEL 8: Molten Core — bgIdx:3, searing heat, extreme lava speed
  {bgIdx:3,lavaRise:true,lavaSpd:1.35,platforms:[
    new Platform(0,2900,650,100,'lava'),new Platform(30,2720,90,20,'lava'),new Platform(270,2540,90,20,'lava'),
    new Platform(510,2720,90,20,'lava'),new Platform(750,2540,90,20,'lava'),new Platform(980,2720,90,20,'lava'),
    new Platform(1210,2540,90,20,'lava'),new Platform(1440,2720,90,20,'lava'),new Platform(1670,2540,90,20,'lava'),
    new Platform(1900,2720,90,20,'lava'),new Platform(2130,2540,90,20,'lava'),new Platform(2360,2720,90,20,'lava'),
    new Platform(2590,2540,90,20,'lava'),new Platform(2820,2720,90,20,'lava'),new Platform(3050,2540,90,20,'lava'),
    new Platform(3280,2720,90,20,'lava'),new Platform(3510,2540,90,20,'lava'),
    new Platform(3700,2340,80,20,'lava'),new Platform(3600,2140,80,20,'lava'),new Platform(3700,1940,80,20,'lava'),
    new Platform(3600,1740,80,20,'lava'),new Platform(3700,1540,80,20,'lava'),new Platform(3600,1340,140,20,'lava'),
  ],movingPlatforms:[
    new MovingPlatform(360,2640,68,20,270,490,6.5),new MovingPlatform(840,2640,68,20,620,1110,7),
    new MovingPlatform(1320,2640,68,20,1100,1620,7),new MovingPlatform(1790,2640,68,20,1580,2130,7.5),
    new MovingPlatform(2250,2640,68,20,2060,2680,7.5),new MovingPlatform(2710,2640,68,20,2500,3130,8),
    new MovingPlatform(3170,2640,68,20,2960,3600,8),new MovingPlatform(3620,2640,68,20,3430,3900,8),
  ],spikes:[
    new Spike(140,2880,12),new Spike(640,2880,10),new Spike(1140,2880,10),new Spike(1640,2880,10),
    new Spike(2140,2880,10),new Spike(2640,2880,10),new Spike(3140,2880,8),new Spike(3640,2880,6),
    new Spike(240,2720,6,true),new Spike(480,2540,6),new Spike(720,2720,6,true),new Spike(960,2540,6),
    new Spike(1190,2720,6,true),new Spike(1420,2540,6),new Spike(1650,2720,6,true),new Spike(1880,2540,6),
    new Spike(2110,2720,6,true),new Spike(2340,2540,6),new Spike(2570,2720,6,true),new Spike(2800,2540,6),
    new Spike(3030,2720,6,true),new Spike(3260,2540,6),
  ],enemies:[
    new Enemy(270,2520,80,500,6),new Enemy(750,2520,540,1080,6.5),new Enemy(1210,2520,1040,1670,6.5),
    new Enemy(1670,2520,1600,2280,7),new Enemy(2130,2520,2090,2820,7),
    new Enemy(2590,2520,2530,3210,7.5),new Enemy(3050,2700,2960,3700,7.5),
  ],killBricks:[
    new KillBrick(320,2680,60,20),new KillBrick(800,2680,60,20),new KillBrick(1280,2680,60,20),
    new KillBrick(1760,2680,60,20),new KillBrick(2240,2680,60,20),new KillBrick(2720,2680,60,20),
    new KillBrick(3200,2680,60,20),new KillBrick(3560,2680,60,20),
  ],
  coins:[...Array.from({length:13},(_,i)=>new Coin(120+i*285,2640+(i%3===0?0:i%3===1?95:-55))),
    new Coin(3650,2300),new Coin(3650,2100),new Coin(3650,1900),new Coin(3650,1700),new Coin(3650,1300)],
  secretDoors:[new SecretDoor(1500,2840),new SecretDoor(3000,2840)],secretRoomX:1500,secretRoomY:2700,
  portals:[new Portal(1100,2520,'rage'),new Portal(2100,2520,'gravity'),new Portal(3100,2520,'score'),new Portal(3700,2520,'coinStorm')],
  warpGates:[new WarpGate(700,2640,7,'#ff6622'),new WarpGate(2800,2540,7,'#ff6622')],
  goal:new Goal(3600,1300),iceZones:[],},
  // LEVEL 9: Null Void II — bgIdx:4, void again, extreme density
  {bgIdx:4,lavaRise:true,lavaSpd:1.65,platforms:[
    new Platform(0,2900,600,100,'void'),new Platform(20,2720,80,20,'void'),new Platform(250,2540,80,20,'void'),
    new Platform(480,2720,80,20,'void'),new Platform(710,2540,80,20,'void'),new Platform(930,2720,80,20,'void'),
    new Platform(1150,2540,80,20,'void'),new Platform(1370,2720,80,20,'void'),new Platform(1590,2540,80,20,'void'),
    new Platform(1810,2720,80,20,'void'),new Platform(2030,2540,80,20,'void'),new Platform(2250,2720,80,20,'void'),
    new Platform(2470,2540,80,20,'void'),new Platform(2690,2720,80,20,'void'),new Platform(2910,2540,80,20,'void'),
    new Platform(3130,2720,80,20,'void'),new Platform(3350,2540,80,20,'void'),new Platform(3560,2720,80,20,'void'),
    new Platform(3720,2520,75,20,'void'),new Platform(3620,2320,75,20,'void'),new Platform(3720,2120,75,20,'void'),
    new Platform(3620,1920,75,20,'void'),new Platform(3720,1720,75,20,'void'),new Platform(3620,1520,75,20,'void'),
    new Platform(3720,1320,130,20,'void'),
  ],movingPlatforms:[
    new MovingPlatform(340,2640,60,20,250,460,7),new MovingPlatform(780,2640,60,20,590,1030,7.5),
    new MovingPlatform(1240,2640,60,20,1060,1510,7.5),new MovingPlatform(1690,2640,60,20,1530,1990,8),
    new MovingPlatform(2130,2640,60,20,1980,2460,8),new MovingPlatform(2570,2640,60,20,2430,2920,8.5),
    new MovingPlatform(3010,2640,60,20,2870,3430,8.5),new MovingPlatform(3450,2640,60,20,3320,3780,9),
  ],spikes:[
    new Spike(120,2880,13),new Spike(600,2880,11),new Spike(1100,2880,11),new Spike(1600,2880,11),
    new Spike(2100,2880,11),new Spike(2600,2880,11),new Spike(3100,2880,9),new Spike(3600,2880,7),
    new Spike(220,2720,6,true),new Spike(460,2540,6),new Spike(700,2720,6,true),new Spike(930,2540,6),
    new Spike(1140,2720,6,true),new Spike(1360,2540,6),new Spike(1580,2720,6,true),new Spike(1800,2540,6),
    new Spike(2020,2720,6,true),new Spike(2240,2540,6),new Spike(2460,2720,6,true),new Spike(2680,2540,6),
    new Spike(2900,2720,6,true),new Spike(3120,2540,6),new Spike(3340,2720,6,true),new Spike(3550,2540,6),
  ],enemies:[
    new Enemy(250,2520,50,460,6.5),new Enemy(710,2520,540,1040,7),new Enemy(1150,2520,1000,1630,7),
    new Enemy(1590,2520,1530,2240,7.5),new Enemy(2030,2520,1980,2780,7.5),
    new Enemy(2470,2520,2400,3130,8),new Enemy(2910,2700,2840,3580,8),new Enemy(3350,2700,3280,3920,8.5),
  ],killBricks:[
    new KillBrick(300,2680,60,20),new KillBrick(760,2680,60,20),new KillBrick(1220,2680,60,20),
    new KillBrick(1680,2680,60,20),new KillBrick(2140,2680,60,20),new KillBrick(2600,2680,60,20),
    new KillBrick(3060,2680,60,20),new KillBrick(3520,2680,60,20),new KillBrick(3700,2680,60,20),
  ],
  coins:[...Array.from({length:14},(_,i)=>new Coin(110+i*268,2640+(i%3===0?0:i%3===1?95:-55))),
    new Coin(3670,2490),new Coin(3670,2290),new Coin(3670,2090),new Coin(3670,1890),new Coin(3670,1490),new Coin(3670,1290)],
  secretDoors:[new SecretDoor(1600,2840),new SecretDoor(3100,2840)],secretRoomX:1600,secretRoomY:2700,
  goal:new Goal(3720,1280),iceZones:[],},
  // LEVEL 10: The Abyss — bgIdx:4, maximum terror, fastest lava, tiny platforms
  {bgIdx:4,lavaRise:true,lavaSpd:2.1,platforms:[
    new Platform(0,2900,550,100,'void'),new Platform(10,2720,70,20,'void'),new Platform(230,2540,70,20,'void'),
    new Platform(450,2720,70,20,'void'),new Platform(670,2540,70,20,'void'),new Platform(880,2720,70,20,'void'),
    new Platform(1090,2540,70,20,'void'),new Platform(1300,2720,70,20,'void'),new Platform(1510,2540,70,20,'void'),
    new Platform(1720,2720,70,20,'void'),new Platform(1930,2540,70,20,'void'),new Platform(2140,2720,70,20,'void'),
    new Platform(2350,2540,70,20,'void'),new Platform(2560,2720,70,20,'void'),new Platform(2770,2540,70,20,'void'),
    new Platform(2980,2720,70,20,'void'),new Platform(3190,2540,70,20,'void'),new Platform(3400,2720,70,20,'void'),
    new Platform(3600,2540,70,20,'void'),
    new Platform(3720,2340,65,20,'void'),new Platform(3620,2140,65,20,'void'),new Platform(3720,1940,65,20,'void'),
    new Platform(3620,1740,65,20,'void'),new Platform(3720,1540,65,20,'void'),new Platform(3620,1340,65,20,'void'),
    new Platform(3720,1140,65,20,'void'),new Platform(3620,940,120,20,'void'),
  ],movingPlatforms:[
    new MovingPlatform(320,2640,55,20,230,440,8),new MovingPlatform(750,2640,55,20,560,980,8.5),
    new MovingPlatform(1180,2640,55,20,1000,1480,8.5),new MovingPlatform(1610,2640,55,20,1440,1960,9),
    new MovingPlatform(2040,2640,55,20,1870,2490,9),new MovingPlatform(2470,2640,55,20,2310,2970,9.5),
    new MovingPlatform(2900,2640,55,20,2740,3390,9.5),new MovingPlatform(3330,2640,55,20,3170,3820,10),
    new MovingPlatform(3710,2640,55,20,3560,3980,10),
  ],spikes:[
    new Spike(100,2880,14),new Spike(580,2880,12),new Spike(1080,2880,12),new Spike(1580,2880,12),
    new Spike(2080,2880,12),new Spike(2580,2880,12),new Spike(3080,2880,10),new Spike(3580,2880,8),
    new Spike(200,2720,7,true),new Spike(440,2540,7),new Spike(670,2720,7,true),new Spike(900,2540,7),
    new Spike(1100,2720,7,true),new Spike(1290,2540,7),new Spike(1500,2720,7,true),new Spike(1710,2540,7),
    new Spike(1920,2720,7,true),new Spike(2130,2540,7),new Spike(2340,2720,7,true),new Spike(2550,2540,7),
    new Spike(2760,2720,7,true),new Spike(2970,2540,7),new Spike(3180,2720,7,true),new Spike(3390,2540,7),
    new Spike(3590,2720,7,true),
  ],enemies:[
    new Enemy(230,2520,30,440,7),new Enemy(670,2520,510,1050,7.5),new Enemy(1090,2520,980,1620,7.5),
    new Enemy(1510,2520,1450,2200,8),new Enemy(1930,2520,1880,2700,8),
    new Enemy(2350,2520,2300,3090,8.5),new Enemy(2770,2700,2700,3500,8.5),
    new Enemy(3190,2700,3120,3920,9),new Enemy(3600,2700,3500,4000,9),
  ],killBricks:[
    new KillBrick(280,2680,60,20),new KillBrick(720,2680,60,20),new KillBrick(1160,2680,60,20),
    new KillBrick(1600,2680,60,20),new KillBrick(2040,2680,60,20),new KillBrick(2480,2680,60,20),
    new KillBrick(2920,2680,60,20),new KillBrick(3360,2680,60,20),new KillBrick(3640,2680,60,20),
  ],
  coins:[...Array.from({length:14},(_,i)=>new Coin(100+i*260,2640+(i%3===0?0:i%3===1?100:-60))),
    new Coin(3670,2300),new Coin(3670,2100),new Coin(3670,1900),new Coin(3670,1700),new Coin(3670,1500),new Coin(3670,1100),new Coin(3670,910)],
  secretDoors:[new SecretDoor(1400,2840),new SecretDoor(2900,2840)],secretRoomX:1400,secretRoomY:2700,
  goal:new Goal(3620,900),iceZones:[],},
];

let inSecretRoom=false,currentSecretRoom=null,currentSecretRoomData=null;
const secretRoomsMap=new Map();
function makeSecretRoom(baseX,baseY){
  return{
    platforms:[new Platform(baseX-20,baseY+200,400,20,'secret'),new Platform(baseX+50,baseY+100,200,20,'secret'),new Platform(baseX+150,baseY,200,20,'secret')],
    coins:[new Coin(baseX+20,baseY+160,true),new Coin(baseX+60,baseY+160,true),new Coin(baseX+100,baseY+160,true),new Coin(baseX+140,baseY+160,true),new Coin(baseX+180,baseY+160,true),new Coin(baseX+80,baseY+60,true),new Coin(baseX+150,baseY+60,true),new Coin(baseX+200,baseY-40,true),new Coin(baseX+250,baseY-40,true)],
    exitY:baseY+260,
  };
}
function buildSecretRooms(doorDefs){
  secretRoomsMap.clear();
  for(const {door,roomX,roomY} of doorDefs)secretRoomsMap.set(door,makeSecretRoom(roomX,roomY));
}

let currentLevel=0;
let platforms=[],movingPlatforms=[],spikes=[],enemies=[],killBricks=[],coins=[],springPads=[],crates=[];
let goal=null,secretDoors=[],iceZones=[],conveyorZones=[];
let onConveyor=false,conveyorDir=0;

function initLevelAmbient(themeIdx){
  levelAmbient.length=0;
  // Per-theme particle appearance
  const themes=[
    {color:'#ffffff',glow:'#aaccff',count:24,spd:.13,r:1.3},   // 0 space   — stars
    {color:'#aaffaa',glow:'#44ff44',count:20,spd:.2, r:2.1},   // 1 forest  — fireflies
    {color:'#ddfcff',glow:'#88eeff',count:22,spd:.16,r:1.9},   // 2 ice     — snowflakes
    {color:'#ff9944',glow:'#ff4000',count:28,spd:.24,r:1.5},   // 3 inferno — embers
    {color:'#cc55ff',glow:'#8800cc',count:18,spd:.15,r:2.3},   // 4 void    — orbs
  ];
  const th=themes[themeIdx%themes.length];
  for(let i=0;i<th.count;i++){
    levelAmbient.push({
      x:Math.random()*WORLD_W,y:Math.random()*WORLD_H,
      vx:(Math.random()-.5)*th.spd*2,vy:-(Math.random()*th.spd+th.spd*.3),
      r:th.r*(0.7+Math.random()*.7),color:th.color,glow:th.glow,
      phase:Math.random()*Math.PI*2,
    });
  }
}
function loadLevel(idx){
  currentLevel=idx;
  const d=LEVEL_DATA[idx];
  platforms=d.platforms;movingPlatforms=d.movingPlatforms||[];
  spikes=d.spikes||[];killBricks=d.killBricks||[];
  enemies=d.enemies||[];const _dm=getDiffEnemyMult();enemies.forEach(e=>{e.x=e.startX;e.direction=1;e._t=0;e.poisoned=false;e.poisonTimer=0;e.frozen=false;e.flashTimer=0;if(!e.baseSpd)e.baseSpd=e.spd;e.spd=e.baseSpd*_dm;});
  coins=d.coins.map(c=>{c.magnetized=false;c.voidPull=false;c.collected=false;return c;});
  goal=d.goal;secretDoors=d.secretDoors||[];iceZones=d.iceZones||[];conveyorZones=d.conveyorZones||[];
  inSecretRoom=false;currentSecretRoom=null;currentSecretRoomData=null;
  const doorDefs=d.secretDoors.map((door,di)=>({door,roomX:d.secretRoomX+(di*500),roomY:d.secretRoomY}));
  buildSecretRooms(doorDefs);
  resetLava();if(d.lavaRise){const _lm={easy:0.65,medium:1,hard:1.35,hardcore:1.75}[difficulty]||1;startLava(d.lavaSpd*_lm);}
  springPads=[];powerUps=[];tpPads=[];stickyPads=[];portals=(d.portals||[]).map(p=>{p.collected=false;p._t=Math.random()*Math.PI*2;return p;});warpGates=(d.warpGates||[]).map(g=>{g.collected=false;g._t=Math.random()*Math.PI*2;return g;});
  gravityFlipped=false;gravityFlipLeft=0;mirrorWorld=false;mirrorWorldLeft=0;playerShrunk=false;playerShrunkLeft=0;ghostPortalMode=false;ghostPortalModeLeft=0;speedPortalLeft=0;scorePortalLeft=0;
  bullets=[];laserBeams=d.laserBeams||[];bossEnemies=d.bossEnemies||[];heartDrops=[];throwStarPr=[];spikeRainDrops=[];
  shieldBubble=0;throwStarCount=5;throwStarCooldown=0;
  const _thIdx=d.bgIdx??0;weatherType=_thIdx===1?'rain':_thIdx===2?'snow':_thIdx===3?'embers':null;weatherDrops=[];
  onSticky=false;stickyDropTimer=0;puSpeedActive=false;puSpeedLeft=0;puMagnetActive=false;puMagnetLeft=0;puScoreMult=false;puScoreMultLeft=0;
  player.x=100;player.y=2750;player.velY=0;player.velX=0;
  player.jumpsLeft=3;player.angle=0;player.squash=1;player.squashVel=0;
  player.color=SKINS[selectedSkin].color;
  currentSkinSpd=SKINS[selectedSkin].spd;currentSkinJmp=SKINS[selectedSkin].jmp;
  gameWon=false;camera.x=0;camera.y=0;particles.length=0;diedThisLevel=false;
  checkpointPos=null;checkpointActivated=false;
  initLevelAmbient(d.bgIdx??0);
  abilityCooldownLeft=0;abilityActiveLeft=0;abilityActive=false;shieldActive=false;
  enemyFrozen=false;enemyFrozenLeft=0;timeSlowActive=false;timeSlowLeft=0;
  if(musicOn){initAudio();playLevelMusic(idx);}
  levelTimer=0;levelCompleteFlash=0;
  playSFX('levelup');
  const LEVEL_NAMES=['SPACE','FOREST','ICE WORLD','INFERNO','THE VOID','DEEP SPACE','STORM ZONE','MOLTEN CORE','NULL VOID II','THE ABYSS'];
  showNotif(`LEVEL ${idx+1} — ${LEVEL_NAMES[idx]||'???'}`,'#00ffff');
}

const camera={x:0,y:0};
function updateCamera(){
  const tx=player.x-W/2+player.width/2;const ty=player.y-H/2;
  if(gameMode==='arena'){
    camera.x=0;camera.y=2420;return;
  }
  if(gameMode==='risingLava'){
    camera.x=0;
    if(lavaY-player.y<H-60){
      // Lava is close: frame so player is near top and lava is near bottom — both visible
      camera.y=lavaY-H+40;
    }else{
      // Lava far below: centre on player normally
      camera.y=Math.max(0,Math.min(ty,WORLD_H-H));
    }
  }else{camera.x=Math.max(0,Math.min(tx,WORLD_W-W));camera.y=Math.max(0,Math.min(ty,WORLD_H-H));}
}
function startGame(){
  gameState='playing';score=0;lives=getDiffLives();heartFlash=0;invincible=0;deathCount=0;levelRank='';
  puSpeedActive=false;puSpeedLeft=0;puMagnetActive=false;puMagnetLeft=0;puScoreMult=false;puScoreMultLeft=0;
  player.color=SKINS[selectedSkin].color;currentSkinSpd=SKINS[selectedSkin].spd;currentSkinJmp=SKINS[selectedSkin].jmp;
  particles.length=0;
  if(gameMode==='story'){maxJumps=3;loadLevel(storyStartLevel);}
  else if(gameMode==='risingLava'){maxJumps=2;risingLavaWave=1;generateRisingLavaLevel();}
  else if(gameMode==='arena'){maxJumps=3;arenaWave=1;arenaKillsTotal=0;arenaIntermission=false;arenaIntermTimer=0;generateArenaLevel();}
  else{maxJumps=3;level=1;generateEndlessLevel(1);}
}

function generateEndlessLevel(lv){
  // diff ramps faster now — fully difficult by level 7
  const diff=Math.min((lv-1)/7,1);
  resetLava(); // ensure no lingering lava from other modes
  const BASE_Y=2800;const GOAL_Y=600;
  const platBonus=getDiffPlatBonus();const gm=getDiffGapMult();
  // Platforms shrink faster: 220→70px by level 7, adjusted by difficulty
  const pW_max=Math.max(60,220-Math.round(diff*140)+platBonus);
  const pW_min=Math.max(50,Math.max(pW_max-40,80-Math.round(diff*30)+platBonus));
  // Gaps grow: 90→280px, adjusted by difficulty
  const gapMin=Math.round((90+Math.round(diff*60))*gm),gapMax=Math.round((200+diff*80)*gm);
  platforms=[];movingPlatforms=[];spikes=[];enemies=[];killBricks=[];crates=[];coins=[];secretDoors=[];iceZones=[];conveyorZones=[];powerUps=[];tpPads=[];stickyPads=[];onSticky=false;stickyDropTimer=0;springPads=[];
  platforms.push(new Platform(0,BASE_Y,700,100));platforms.push(new Platform(0,BASE_Y-100,200,20));
  let cx=720,cy=BASE_Y-140;const mainPlats=[];
  while(cx<WORLD_W-700){
    const pw=pW_min+Math.floor(Math.random()*(pW_max-pW_min+1));
    const gap=gapMin+Math.floor(Math.random()*(gapMax-gapMin));
    const dy=(Math.random()<0.5?1:-1)*(50+Math.random()*90);
    cy=Math.max(BASE_Y-420,Math.min(BASE_Y-60,cy+dy));
    const p=diff>.12&&Math.random()<.22?new CrumblePlatform(cx,cy,pw):new Platform(cx,cy,pw,20);platforms.push(p);mainPlats.push(p);cx+=pw+gap;
  }
  // Moving platforms bridging large gaps — faster at higher levels
  for(let i=0;i<mainPlats.length-1;i++){
    const a=mainPlats[i],b=mainPlats[i+1];const gap=b.x-(a.x+a.width);
    if(gap>180){const my=Math.min(a.y,b.y)-10;const mw=Math.max(50,90-Math.round(diff*30));const mx=a.x+a.width+gap/2-mw/2;
    movingPlatforms.push(new MovingPlatform(mx,my,mw,20,a.x+a.width,b.x-mw,1.8+diff*3));}
  }
  // Vertical climb section
  const climbStartX=WORLD_W-650;const climbPlats=[];let vy=BASE_Y-300;let vx=climbStartX;
  while(vy>GOAL_Y+120){const pw=Math.max(70,130-Math.round(diff*50));const p=new Platform(vx,vy,pw,20);platforms.push(p);climbPlats.push(p);vy-=110+Math.floor(Math.random()*70);vx=(vx===climbStartX)?climbStartX+180:climbStartX;}
  platforms.push(new Platform(WORLD_W-500,GOAL_Y+40,500,20));
  // Ice zones at higher levels (lv >= 3)
  if(lv>=3){
    mainPlats.filter((_,i)=>i%3===0).forEach(rp=>{if(Math.random()<0.3+diff*0.2)iceZones.push({x:rp.x,x2:rp.x+rp.width});});
  }
  // Enemies: more and much faster
  const enemyCount=Math.floor(3+diff*10);
  for(let i=0;i<enemyCount;i++){
    const rp=mainPlats[2+Math.floor(Math.random()*(mainPlats.length-2))];if(!rp)continue;
    const spd=getDiffEnemyMult()*(1.8+diff*4+Math.random()*1.5);
    enemies.push(new Enemy(rp.x+20,rp.y-28,rp.x,rp.x+rp.width,spd));
  }
  // Spikes: denser clusters
  const spikeChance=0.25+diff*0.35;
  mainPlats.slice(2).forEach(rp=>{
    if(Math.random()<spikeChance&&rp.width>60){
      const count=1+Math.floor(diff*3);const atLeft=Math.random()<0.5;
      const sx=atLeft?rp.x:(rp.x+rp.width-count*24);
      if(count*24<rp.width*0.65)spikes.push(new Spike(sx,rp.y-24,count));
    }
  });
  // Kill bricks: many more
  const kbCount=Math.floor(diff*9)+1;
  for(let i=0;i<kbCount;i++){
    const rp=mainPlats[Math.floor(Math.random()*mainPlats.length)];
    if(rp&&rp.width>100)killBricks.push(new KillBrick(rp.x+rp.width/2-30,rp.y-60,60,20));
  }
  // Crates — scattered on platforms, 1-2 per level section at higher levels
  crates=[];
  if(lv>=2){
    const crateCount=Math.min(1+Math.floor(lv/3),6);
    for(let ci3=0;ci3<crateCount;ci3++){
      const rp=mainPlats[1+Math.floor(Math.random()*(mainPlats.length-2))];
      if(rp)crates.push(new Crate(rp.x+Math.random()*(rp.width-32),rp.y-32,lv>=5?2:1,2+Math.floor(lv/4)));
    }
  }
  // Coins
  mainPlats.forEach(p=>{if(Math.random()<0.35)coins.push(new Coin(p.x+10+Math.random()*(p.width-20),p.y-38));});
  climbPlats.forEach(p=>{coins.push(new Coin(p.x+p.width/2,p.y-70,true));});
  // PowerUps: one every few platforms
  const puTypes=['speedBoost','shield','extraJump','invincibility','coinMagnet','scoreMult','freeze','coinShower','nuke','shieldBubble'];
  mainPlats.filter((_,i)=>i%4===1).forEach(p=>{
    if(Math.random()<0.45){const t=puTypes[Math.floor(Math.random()*puTypes.length)];powerUps.push(new PowerUp(p.x+p.width/2-14,p.y-50,t));}
  });
  // TP Pads: teleport player forward — more common at higher levels
  const tpCount=Math.min(1+Math.floor(diff*3),5);
  for(let i=0;i<tpCount;i++){
    const rp=mainPlats[3+Math.floor(Math.random()*(mainPlats.length-6))];
    if(rp&&rp.width>=60)tpPads.push(new TpPad(rp.x+rp.width/2-30,rp.y-12));
  }
  // Sticky Pads: slow the player — appear from level 2
  if(lv>=2){
    const stCount=Math.min(2+Math.floor(diff*5),8);
    for(let i=0;i<stCount;i++){
      const rp=mainPlats[Math.floor(Math.random()*mainPlats.length)];
      if(rp&&rp.width>=80)stickyPads.push(new StickyPad(rp.x+Math.floor(Math.random()*(rp.width-80)),rp.y-14,80));
    }
  }
  // Laser beams between platform pairs at higher levels
  laserBeams=[];
  if(lv>=3){
    const lbCount=Math.min(Math.floor((lv-2)/2)+1,5);
    for(let i=0;i<lbCount;i++){
      const rp=mainPlats[2+Math.floor(Math.random()*(mainPlats.length-4))];
      if(rp){laserBeams.push(new LaserBeam(rp.x,rp.y-60,rp.x+rp.width,rp.y-60,45+Math.floor(Math.random()*30)));}
    }
  }
  // Boss enemy at level 5+
  bossEnemies=[];
  if(lv>=5&&Math.random()<0.5+diff*0.4){
    const bossPlat=mainPlats[Math.floor(mainPlats.length*0.6)];
    if(bossPlat)bossEnemies.push(new BossEnemy(bossPlat.x+20,bossPlat.y-56,bossPlat.x,bossPlat.x+bossPlat.width,Math.min(2+Math.floor(lv/3),5)));
  }
  // Weather type by theme
  const themeIdx=(lv-1)%5;
  weatherType=themeIdx===1?'rain':themeIdx===2?'snow':themeIdx===3?'embers':null;
  weatherDrops=[];
  // Random portals in endless mode
  portals=[];warpGates=[];
  const epTypes=['gravity','mirror','shrink','ghost','speed','score','coinStorm','bounce'];
  const numEPortals=Math.min(1+Math.floor(lv/3),5);
  for(let pi=0;pi<numEPortals;pi++){
    const rp=mainPlats[1+Math.floor(Math.random()*(mainPlats.length-2))];
    if(rp)portals.push(new Portal(rp.x+rp.width/2-20,rp.y-80,epTypes[Math.floor(Math.random()*epTypes.length)]));
  }
  if(lv%4===0){
    const wc=['#ff44ff','#44ffff','#ffff44','#ff8844'][Math.floor(lv/4)%4];
    const ga=mainPlats[2],gb=mainPlats[mainPlats.length-3];
    if(ga&&gb){warpGates=[new WarpGate(ga.x,ga.y-80,0,wc),new WarpGate(gb.x,gb.y-80,0,wc)];}
  }
  // Throw stars refilled each level
  throwStarCount=5;spikeRainDrops=[];heartDrops=[];throwStarPr=[];bullets=[];
  goal=new Goal(WORLD_W-320,GOAL_Y);
  maxJumps=3;
  player.x=100;player.y=BASE_Y-80;player.velY=0;player.velX=0;player.jumpsLeft=3;player.angle=0;player.squash=1;player.squashVel=0;player.color=SKINS[selectedSkin].color;
  inSecretRoom=false;currentSecretRoom=null;currentSecretRoomData=null;gameWon=false;camera.x=0;camera.y=0;particles.length=0;diedThisLevel=false;
  initLevelAmbient((lv-1)%5);
  puSpeedActive=false;puSpeedLeft=0;puMagnetActive=false;puMagnetLeft=0;puScoreMult=false;puScoreMultLeft=0;
  abilityCooldownLeft=0;abilityActiveLeft=0;abilityActive=false;shieldActive=false;enemyFrozen=false;enemyFrozenLeft=0;timeSlowActive=false;timeSlowLeft=0;
  luckyCoins=Math.random()<0.2;
  if(musicOn){initAudio();playLevelMusic(Math.min(lv-1,THEMES.length-1));}
  levelTimer=0;levelCompleteFlash=0;
  playSFX('levelup');
  if(luckyCoins){showNotif(`⭐ LUCKY COINS! ENDLESS LV ${lv} — 2× VALUE!`,'#FFD700');}
  else{showNotif(`ENDLESS LV ${lv}`,'#FF6B6B');}
}
function playGameOverJingle(){
  if(!actx||!musicOn)return;
  initAudio();
  const now=actx.currentTime+.05;
  // Descending minor third melody: A→G→F→E with slow fade
  [[440,.0],[392,.26],[349.23,.52],[329.63,.78]].forEach(([freq,dt])=>{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='triangle';o.frequency.setValueAtTime(freq,now+dt);
    o.frequency.exponentialRampToValueAtTime(freq*.97,now+dt+.22);
    g.gain.setValueAtTime(0,now+dt);g.gain.linearRampToValueAtTime(.14,now+dt+.04);
    g.gain.exponentialRampToValueAtTime(.001,now+dt+.42);
    o.connect(g);g.connect(actx.destination);o.start(now+dt);o.stop(now+dt+.5);
  });
  // Low bass hit
  const ob=actx.createOscillator(),gb=actx.createGain();
  ob.type='sine';ob.frequency.setValueAtTime(110,now);ob.frequency.exponentialRampToValueAtTime(55,now+.7);
  gb.gain.setValueAtTime(.22,now);gb.gain.exponentialRampToValueAtTime(.001,now+.8);
  ob.connect(gb);gb.connect(actx.destination);ob.start(now);ob.stop(now+.85);
}
function endGame(){stopMusic();gameState='gameover';playGameOverJingle();}

// ── Rising Lava Level Generator ─────────────────────────────────────────────
function generateRisingLavaLevel(){
  platforms=[];movingPlatforms=[];spikes=[];enemies=[];killBricks=[];crates=[];
  coins=[];secretDoors=[];iceZones=[];springPads=[];powerUps=[];tpPads=[];stickyPads=[];portals=[];warpGates=[];laserBeams=[];bossEnemies=[];heartDrops=[];throwStarPr=[];bullets=[];spikeRainDrops=[];weatherDrops=[];
  onSticky=false;stickyDropTimer=0;puSpeedActive=false;puSpeedLeft=0;puMagnetActive=false;puMagnetLeft=0;puScoreMult=false;puScoreMultLeft=0;shieldBubble=0;throwStarCount=5;throwStarCooldown=0;gravityFlipped=false;gravityFlipLeft=0;mirrorWorld=false;mirrorWorldLeft=0;playerShrunk=false;playerShrunkLeft=0;ghostPortalMode=false;ghostPortalModeLeft=0;speedPortalLeft=0;scorePortalLeft=0;weatherType=null;

  // Wide starting floor and a launch pad
  platforms.push(new Platform(0,2900,W,100));
  platforms.push(new Platform(120,2760,200,18));
  platforms.push(new Platform(580,2760,200,18));

  // Zigzag platform tower up to the top
  let py=2600;let side=1;
  while(py>120){
    const pw=110+Math.random()*110;
    const px=side>0?60+Math.random()*200:W-60-pw-Math.random()*200;
    const style=py<1200?'void':py<1800?'cyber':py<2300?'ice':'stone';
    platforms.push(new Platform(px,py,pw,18,style));

    // Spring pad: ~30% chance, more common higher up
    if(Math.random()<(.3+(2700-py)/8000))springPads.push(new SpringPad(px+pw/2-30,py-16));

    // No random coins in Rising Lava — only 3 secret purple coins placed below

    // Moving bridge on wider gaps
    const gap=150+Math.random()*100;
    if(gap>190&&py-gap>120){
      const mp=new MovingPlatform(side>0?px+pw+20:px-120,py-gap/2,90,18,0,W-90,2+Math.random()*1.5);
      movingPlatforms.push(mp);
    }

    side=-side;py-=gap;
  }

  // 3 secret purple coins at evenly spaced heights
  [2000,1400,800].forEach(cy=>coins.push(new Coin(W/2,cy,true)));

  // Goal star at the very top
  goal=new Goal(W/2-18,60);

  // Lava starts below world and rises; speed increases each wave
  resetLava();startLava(Math.min(0.6+risingLavaWave*0.2,2.4));

  player.x=W/2-14;player.y=2820;player.velX=0;player.velY=0;
  player.jumpsLeft=maxJumps;player.angle=0;player.squash=1;player.squashVel=0;
  player.color=SKINS[selectedSkin].color;currentSkinSpd=SKINS[selectedSkin].spd;currentSkinJmp=SKINS[selectedSkin].jmp;

  inSecretRoom=false;currentSecretRoom=null;currentSecretRoomData=null;
  gameWon=false;camera.x=0;camera.y=0;particles.length=0;
  abilityCooldownLeft=0;abilityActiveLeft=0;abilityActive=false;shieldActive=false;
  enemyFrozen=false;enemyFrozenLeft=0;timeSlowActive=false;timeSlowLeft=0;score=0;

  if(musicOn){initAudio();playRisingLavaMusic();}
  playSFX('levelup');showNotif(risingLavaWave===1?'🌋 RISING LAVA — DOUBLE JUMP ONLY':`🌋 WAVE ${risingLavaWave} — SURVIVE!`,'#FF4500');
}

// ── Arena Mode ──────────────────────────────────────────────────────────────
const ARENA_BASE_Y=2420; // camera.y locked here; arena floor at 2970
function generateArenaLevel(){
  platforms=[];movingPlatforms=[];enemies=[];spikes=[];coins=[];springPads=[];killBricks=[];crates=[];
  goal=null;secretDoors=[];iceZones=[];conveyorZones=[];powerUps=[];tpPads=[];stickyPads=[];
  portals=[];warpGates=[];laserBeams=[];bossEnemies=[];heartDrops=[];throwStarPr=[];bullets=[];spikeRainDrops=[];weatherDrops=[];
  onSticky=false;stickyDropTimer=0;puSpeedActive=false;puSpeedLeft=0;puMagnetActive=false;puMagnetLeft=0;puScoreMult=false;puScoreMultLeft=0;shieldBubble=0;throwStarCount=5;throwStarCooldown=0;gravityFlipped=false;gravityFlipLeft=0;mirrorWorld=false;mirrorWorldLeft=0;playerShrunk=false;playerShrunkLeft=0;ghostPortalMode=false;ghostPortalModeLeft=0;speedPortalLeft=0;scorePortalLeft=0;weatherType=null;
  inSecretRoom=false;currentSecretRoom=null;currentSecretRoomData=null;
  gameWon=false;particles.length=0;abilityCooldownLeft=0;abilityActiveLeft=0;abilityActive=false;shieldActive=false;
  enemyFrozen=false;enemyFrozenLeft=0;timeSlowActive=false;timeSlowLeft=0;
  // Arena floor + side walls
  platforms.push(new Platform(0,2970,900,30,'stone'));   // floor
  platforms.push(new Platform(0,ARENA_BASE_Y,20,560,'void'));   // left wall
  platforms.push(new Platform(880,ARENA_BASE_Y,20,560,'void')); // right wall
  // Mid platforms
  platforms.push(new Platform(80,2880,180,18,'grass'));   // low-left
  platforms.push(new Platform(640,2880,180,18,'grass'));  // low-right
  platforms.push(new Platform(300,2770,300,18,'ice'));    // mid-center
  platforms.push(new Platform(50,2640,160,18,'cyber'));   // high-left
  platforms.push(new Platform(690,2640,160,18,'cyber'));  // high-right
  platforms.push(new Platform(360,2520,180,18,'void'));   // top-center
  // Moving platforms
  movingPlatforms.push(new MovingPlatform(200,2700,120,18,80,400,2));
  movingPlatforms.push(new MovingPlatform(500,2700,120,18,430,760,2));
  // Spikes on floor edges
  spikes.push(new Spike(20,2960,3));
  spikes.push(new Spike(790,2960,3));
  // Player spawn center
  player.x=436;player.y=2930;player.velX=0;player.velY=0;
  player.jumpsLeft=maxJumps;player.angle=0;player.squash=1;player.squashVel=0;
  player.color=SKINS[selectedSkin].color;currentSkinSpd=SKINS[selectedSkin].spd;currentSkinJmp=SKINS[selectedSkin].jmp;
  camera.x=0;camera.y=ARENA_BASE_Y;
  resetLava();
  spawnArenaWave();
  if(musicOn){initAudio();playLevelMusic(arenaWave%5);}
  showNotif('⚔ ARENA MODE — SURVIVE THE WAVES!','#ff4488');
}
function spawnArenaWave(){
  enemies=[];bossEnemies=[];crates=[];
  arenaIntermission=false;arenaIntermTimer=0;
  const isBossWave=arenaWave%3===0;
  const isHazardWave=arenaWave%5===0;
  const count=isBossWave?Math.floor(arenaWave/3):2+arenaWave;
  const spd=Math.min(1.5+arenaWave*0.25,6);
  for(let i=0;i<count;i++){
    const fromLeft=i%2===0;
    const ex=fromLeft?30+Math.random()*60:810-Math.random()*60;
    enemies.push(new Enemy(ex,2940,30,860,spd+(Math.random()-.5)*0.5));
  }
  if(isBossWave){
    const bossHp=2+Math.floor(arenaWave/3);
    bossEnemies.push(new BossEnemy(440,2900,30,860,bossHp));
  }
  // Hazard waves: add crates with extra coins
  if(isHazardWave||arenaWave>=4){
    const ccount=Math.min(1+Math.floor(arenaWave/4),4);
    for(let ci=0;ci<ccount;ci++){
      const cx=100+Math.random()*700;crates.push(new Crate(cx,2920,2,4));
    }
  }
  arenaEnemiesLeft=enemies.length+bossEnemies.length;
  const scoreMult=Math.floor(arenaWave/5)+1;
  const waveTxt=isBossWave?`⚠ BOSS WAVE ${arenaWave}!`:isHazardWave?`⚡ HAZARD WAVE ${arenaWave}  ×${scoreMult}`:
    arenaWave>=6?`🔥 WAVE ${arenaWave}  ×${scoreMult}`:`WAVE ${arenaWave}`;
  floatTexts.push({x:W/2,y:H/2-30,text:waveTxt,color:isBossWave?'#ff2200':isHazardWave?'#ffff00':'#ff4488',life:90,maxLife:90,size:isBossWave?22:16});
  if(isBossWave)playSFX('bosshit');else playSFX('levelup');
}

// ══════════════════════════════════════════
//  SPRITE DRAWING (enhanced)
// ══════════════════════════════════════════
function drawSprite(px,py){
  if(invincible>0&&Math.floor(invincible/5)%2===0)return;
  const sk=SKINS[selectedSkin];const pw=player.width,ph=player.height;
  const cx=px+pw/2,cy=py+ph/2;const sy=player.squash,sx=1/player.squash;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(player.angle);ctx.scale(sx*player.facing,sy);
  const c=sk.color;ctx.shadowColor=c;ctx.shadowBlur=22+Math.sin(animTick*.08)*5;
  if(abilityActive&&sk.ability==='ghost'){ctx.globalAlpha=.48+Math.sin(animTick*.12)*.22;}
  if(shieldActive){
    ctx.save();
    // Animated shield hexagonal ring
    for(let ri=0;ri<3;ri++){
      ctx.globalAlpha=.12+Math.sin(animTick*.12+ri)*.08;
      ctx.strokeStyle='#aaeeff';ctx.lineWidth=2-ri*.5;ctx.shadowBlur=14;ctx.shadowColor='#aaeeff';
      ctx.beginPath();ctx.arc(0,0,22+ri*5,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=.07;ctx.fillStyle='#aaeeff';ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  if(timeSlowActive){ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle='#8888ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,26+Math.sin(animTick*.15)*4,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(sk.shape==='cube')drawCube(pw,ph,c);
  else if(sk.shape==='diamond')drawDiamond(pw,ph,c);
  else if(sk.shape==='ghost')drawGhost(pw,ph,c);
  else if(sk.shape==='crown')drawCrown(pw,ph,c);
  else if(sk.shape==='bolt')drawBolt(pw,ph,c);
  else if(sk.shape==='star')drawStar(pw,ph,c);
  else if(sk.shape==='tri')drawTri(pw,ph,c);
  else if(sk.shape==='crystal')drawCrystal(pw,ph,c);
  else if(sk.shape==='orb')drawOrb(pw,ph,c);
  else if(sk.shape==='cat')drawCat(pw,ph,c);
  ctx.restore();
}
function drawCube(w,h,c){
  const hw=w/2,hh=h/2;
  const g=ctx.createLinearGradient(-hw,-hh,hw,hh);
  g.addColorStop(0,lighten(c,60));g.addColorStop(.4,c);g.addColorStop(1,darken(c,55));
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-hw,-hh,w,h,4);ctx.fill();
  // Edge
  ctx.strokeStyle=lighten(c,40);ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-hw,-hh,w,h,4);ctx.stroke();
  // Top shine (two-tone)
  const shine=ctx.createLinearGradient(-hw,-hh,hw,-hh);
  shine.addColorStop(0,'rgba(255,255,255,.05)');shine.addColorStop(.5,'rgba(255,255,255,.28)');shine.addColorStop(1,'rgba(255,255,255,.05)');
  ctx.fillStyle=shine;ctx.beginPath();ctx.roundRect(-hw,-hh,w,hh*.8,4);ctx.fill();
  // Bottom shadow strip
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.roundRect(-hw,hh*.5,w,hh*.5,4);ctx.fill();
  const ey=-3+(player.onGround?Math.sin(animTick*.28)*.5:0);
  ctx.shadowBlur=0;
  // Eye whites
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-6,ey,4,5.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,ey,4,5.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-6,ey,2.5,3.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,ey,2.5,3.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-7,ey-1.5,1.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(5,ey-1.5,1.3,0,Math.PI*2);ctx.fill();
  if(player.onGround){const ls=Math.sin(player.walkTimer*.5)*4;ctx.fillStyle=darken(c,65);ctx.fillRect(-8,hh-2,6,4+ls);ctx.fillRect(2,hh-2,6,4-ls);}
}
function drawDiamond(w,h,c){
  const g=ctx.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,lighten(c,65));g.addColorStop(.4,c);g.addColorStop(1,darken(c,50));ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(0,h/2);ctx.lineTo(-w/2,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,40);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(0,h/2);ctx.lineTo(-w/2,0);ctx.closePath();ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.32)';ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(0,-2);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(-w/2,0);ctx.lineTo(0,2);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-1.5,0,4,5.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-1.5,0,2.5,3.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-2,-1,1.2,0,Math.PI*2);ctx.fill();
}
function drawGhost(w,h,c){
  const hw=w/2,hh=h/2,bob=Math.sin(animTick*.07)*2.5;
  const g=ctx.createRadialGradient(0,-hh*.25,0,0,0,hw*1.15);
  g.addColorStop(0,lighten(c,60));g.addColorStop(.55,c);g.addColorStop(1,darken(c,20)+'aa');
  ctx.fillStyle=g;ctx.globalAlpha=Math.min(ctx.globalAlpha,1)*.92;
  ctx.beginPath();ctx.arc(0,-hh*.2+bob,hw,Math.PI,0);ctx.lineTo(hw,hh);
  ctx.quadraticCurveTo(hw*.55,hh-9,0,hh-5);ctx.quadraticCurveTo(-hw*.55,hh-9,-hw,hh);ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,30);ctx.lineWidth=.8;ctx.stroke();
  // Translucent belly
  ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(0,hh*.1+bob,hw*.8,0,Math.PI);ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.ellipse(-6,bob,4.5,5.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,bob,4.5,5.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-6,bob,2.8,3.8,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,bob,2.8,3.8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-7,bob-1.5,1.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(5,bob-1.5,1.2,0,Math.PI*2);ctx.fill();
}
function drawCrown(w,h,c){
  const hw=w/2,hh=h/2;
  const g=ctx.createLinearGradient(-hw,-hh,hw,hh);g.addColorStop(0,lighten(c,60));g.addColorStop(.5,c);g.addColorStop(1,darken(c,40));ctx.fillStyle=g;
  ctx.beginPath();ctx.roundRect(-hw,-hh*.4,w,h*.9,4);ctx.fill();
  ctx.fillStyle=lighten(c,40);ctx.beginPath();ctx.moveTo(-hw,-hh*.4);ctx.lineTo(-hw,-hh);ctx.lineTo(-hw*.3,-hh*.5);ctx.lineTo(0,-hh);ctx.lineTo(hw*.3,-hh*.5);ctx.lineTo(hw,-hh);ctx.lineTo(hw,-hh*.4);ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,45);ctx.lineWidth=.8;ctx.stroke();
  // Shine on body
  ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.roundRect(-hw,-hh*.4,w,h*.35,4);ctx.fill();
  const gemCols=['#FF4444','#FFFF44','#FF4444'];
  [[-hw*.5,-hh*.75],[0,-hh*.92],[hw*.5,-hh*.75]].forEach(([gx,gy],gi)=>{
    const gc=ctx.createRadialGradient(gx-1,gy-1,0,gx,gy,4);gc.addColorStop(0,'#fff');gc.addColorStop(.4,gemCols[gi]);gc.addColorStop(1,darken(gemCols[gi],40));
    ctx.fillStyle=gc;ctx.shadowColor=gemCols[gi];ctx.shadowBlur=10;ctx.beginPath();ctx.arc(gx,gy,3.5,0,Math.PI*2);ctx.fill();
  });
  ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-6,2,4,5.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,2,4,5.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-6,2,2.5,3.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6,2,2.5,3.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-7,.5,1.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(5,.5,1.2,0,Math.PI*2);ctx.fill();
}

// ── New skin shapes ──────────────────────────────────────────────────────────
function drawBolt(w,h,c){
  const hw=w/2,hh=h/2;
  const g=ctx.createLinearGradient(0,-hh,0,hh);
  g.addColorStop(0,lighten(c,70));g.addColorStop(0.45,c);g.addColorStop(1,darken(c,40));
  ctx.fillStyle=g;
  // 8-point Z-shaped lightning bolt
  ctx.beginPath();
  ctx.moveTo(-hw*.5,-hh*.6);  // 1 top-left tip
  ctx.lineTo(hw*.2,-hh);      // 2 top-right (apex)
  ctx.lineTo(-hw*.1,-hh*.1);  // 3 inner kink top
  ctx.lineTo(hw*.5,-hh*.1);   // 4 outer kink top
  ctx.lineTo(hw*.5,hh*.6);    // 5 bottom-right tip
  ctx.lineTo(-hw*.2,hh);      // 6 bottom-left (nadir)
  ctx.lineTo(hw*.1,hh*.1);    // 7 inner kink bottom
  ctx.lineTo(-hw*.5,hh*.1);   // 8 outer kink bottom
  ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,50);ctx.lineWidth=1;ctx.stroke();
  // Shine on upper arm
  ctx.fillStyle='rgba(255,255,255,.28)';
  ctx.beginPath();
  ctx.moveTo(-hw*.5,-hh*.6);ctx.lineTo(hw*.2,-hh);ctx.lineTo(-hw*.1,-hh*.1);ctx.lineTo(-hw*.5,-hh*.1);
  ctx.closePath();ctx.fill();
  // Electric centre line
  ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-hw*.15,-hh*.75);ctx.lineTo(hw*.15,0);ctx.lineTo(-hw*.15,hh*.75);ctx.stroke();
  ctx.shadowBlur=0;
  const ey=-hh*.38;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-5,ey,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(4,ey,3.5,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-5,ey,2.2,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(4,ey,2.2,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-6,ey-1.5,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(3,ey-1.5,1,0,Math.PI*2);ctx.fill();
}
function drawStar(w,h,c){
  const r1=Math.min(w,h)/2*.95,r2=r1*.42;
  const g=ctx.createRadialGradient(0,-r1*.3,0,0,0,r1);
  g.addColorStop(0,lighten(c,70));g.addColorStop(.55,c);g.addColorStop(1,darken(c,35));
  ctx.fillStyle=g;
  ctx.beginPath();
  for(let i=0;i<10;i++){
    const r=i%2===0?r1:r2;const a=-Math.PI/2+i*Math.PI/5;
    if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,40);ctx.lineWidth=1;ctx.stroke();
  // Spin-shine inner star
  ctx.fillStyle='rgba(255,255,255,.22)';
  ctx.beginPath();
  for(let i=0;i<10;i++){
    const r=i%2===0?r1*.55:r2*.55;const a=-Math.PI/2+i*Math.PI/5;
    if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-5,-1,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,-1,3.5,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-5,-1,2.2,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,-1,2.2,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-6,-2,1.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4,-2,1.2,0,Math.PI*2);ctx.fill();
}
function drawTri(w,h,c){
  const hw=w/2,hh=h/2;
  const g=ctx.createLinearGradient(-hw,-hh,hw,hh);
  g.addColorStop(0,lighten(c,65));g.addColorStop(.5,c);g.addColorStop(1,darken(c,40));
  ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(hw,hh);ctx.lineTo(-hw,hh);ctx.closePath();ctx.fill();
  // Left face highlight
  ctx.fillStyle='rgba(255,255,255,.22)';
  ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(-hw,hh);ctx.lineTo(0,hh*.15);ctx.closePath();ctx.fill();
  // Right face shadow
  ctx.fillStyle='rgba(0,0,0,.18)';
  ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(hw,hh);ctx.lineTo(0,hh*.15);ctx.closePath();ctx.fill();
  // Rainbow prism sheen
  const irid=ctx.createLinearGradient(-hw,0,hw,0);
  irid.addColorStop(0,'rgba(255,80,80,.14)');irid.addColorStop(.33,'rgba(80,255,80,.14)');
  irid.addColorStop(.66,'rgba(80,80,255,.14)');irid.addColorStop(1,'rgba(255,80,255,.14)');
  ctx.fillStyle=irid;
  ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(hw,hh);ctx.lineTo(-hw,hh);ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,40);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(hw,hh);ctx.lineTo(-hw,hh);ctx.closePath();ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-5,2,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,2,3.5,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-5,2,2.2,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,2,2.2,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-6,1,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4,1,1,0,Math.PI*2);ctx.fill();
}
function drawCrystal(w,h,c){
  const hw=w/2,hh=h/2;
  const g=ctx.createLinearGradient(-hw,-hh,hw,hh);
  g.addColorStop(0,lighten(c,75));g.addColorStop(.4,c);g.addColorStop(1,darken(c,30));
  ctx.fillStyle=g;
  // Elongated hex-crystal outline (7 points)
  ctx.beginPath();
  ctx.moveTo(0,-hh);ctx.lineTo(hw*.55,-hh*.45);ctx.lineTo(hw*.8,hh*.2);
  ctx.lineTo(hw*.4,hh);ctx.lineTo(-hw*.4,hh);ctx.lineTo(-hw*.8,hh*.2);
  ctx.lineTo(-hw*.55,-hh*.45);ctx.closePath();ctx.fill();
  // Facet lines
  ctx.strokeStyle=lighten(c,55);ctx.lineWidth=.7;
  ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(0,hh);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-hw*.8,hh*.2);ctx.lineTo(hw*.8,hh*.2);ctx.stroke();
  // Top-right shine facet
  ctx.fillStyle='rgba(255,255,255,.32)';
  ctx.beginPath();ctx.moveTo(0,-hh);ctx.lineTo(hw*.55,-hh*.45);ctx.lineTo(hw*.3,hh*.2);ctx.lineTo(0,hh*.2);ctx.closePath();ctx.fill();
  ctx.strokeStyle=lighten(c,40);ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(0,-hh);ctx.lineTo(hw*.55,-hh*.45);ctx.lineTo(hw*.8,hh*.2);
  ctx.lineTo(hw*.4,hh);ctx.lineTo(-hw*.4,hh);ctx.lineTo(-hw*.8,hh*.2);
  ctx.lineTo(-hw*.55,-hh*.45);ctx.closePath();ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-5,1,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,1,3.5,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-5,1,2.2,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,1,2.2,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-6,0,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4,0,1,0,Math.PI*2);ctx.fill();
}
function drawOrb(w,h,c){
  const r=Math.min(w,h)/2;
  // 3-D radial gradient (light from upper-left)
  const g=ctx.createRadialGradient(-r*.28,-r*.28,0,0,0,r);
  g.addColorStop(0,lighten(c,80));g.addColorStop(.35,lighten(c,28));g.addColorStop(.7,c);g.addColorStop(1,darken(c,55));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  // Pulsing inner rings (save/restore to avoid alpha leak)
  const pulse=.55+Math.sin(animTick*.13)*.45;
  ctx.save();ctx.strokeStyle=lighten(c,45);ctx.lineWidth=.8;
  for(let i=0;i<3;i++){ctx.globalAlpha*=.75;ctx.beginPath();ctx.arc(0,0,r*(0.62-i*.14)*pulse,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  // Specular highlight
  ctx.fillStyle='rgba(255,255,255,.48)';
  ctx.beginPath();ctx.ellipse(-r*.25,-r*.28,r*.32,r*.18,-Math.PI/4,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-5,0,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,0,3.5,4.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-5,0,2.2,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,0,2.2,3,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-6,-1,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4,-1,1,0,Math.PI*2);ctx.fill();
}
function drawCat(w,h,c){
  const hw=w/2,hh=h/2;
  // Body — starts high enough to always overlap the head base
  const g=ctx.createLinearGradient(-hw,-hh*0.75,hw,hh*0.95);
  g.addColorStop(0,lighten(c,35));g.addColorStop(1,darken(c,30));
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-hw,-hh*0.72,w,h*0.98,6);ctx.fill();
  // Head circle — drawn on top of body so seam is hidden
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-hh*0.38,hw*0.78,0,Math.PI*2);ctx.fill();
  // Ears
  ctx.fillStyle=lighten(c,22);
  ctx.beginPath();ctx.moveTo(-hw*0.55,-hh*0.88);ctx.lineTo(-hw*0.15,-hh*1.55);ctx.lineTo(hw*0.15,-hh*0.88);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(hw*0.1,-hh*0.88);ctx.lineTo(hw*0.5,-hh*1.55);ctx.lineTo(hw*0.85,-hh*0.88);ctx.closePath();ctx.fill();
  // Inner ear pink
  ctx.fillStyle='#ff99cc';
  ctx.beginPath();ctx.moveTo(-hw*0.46,-hh*0.93);ctx.lineTo(-hw*0.2,-hh*1.32);ctx.lineTo(hw*0.06,-hh*0.93);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(hw*0.19,-hh*0.93);ctx.lineTo(hw*0.43,-hh*1.32);ctx.lineTo(hw*0.7,-hh*0.93);ctx.closePath();ctx.fill();
  // Eyes
  const ey=player.onGround?Math.sin(animTick*.28)*.5:0;
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-hw*0.3,-hh*0.38+ey,hw*0.22,hh*0.24,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(hw*0.3,-hh*0.38+ey,hw*0.22,hh*0.24,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.ellipse(-hw*0.3,-hh*0.38+ey,hw*0.13,hh*0.15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.ellipse(hw*0.3,-hh*0.38+ey,hw*0.13,hh*0.15,0,0,Math.PI*2);ctx.fill();
  // Nose
  ctx.fillStyle='#ff88aa';ctx.beginPath();ctx.arc(0,-hh*0.08,hw*0.1,0,Math.PI*2);ctx.fill();
  // Whiskers
  ctx.save();ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=0.7;
  ctx.beginPath();ctx.moveTo(-hw*0.12,-hh*0.1);ctx.lineTo(-hw*0.9,-hh*0.22);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-hw*0.12,-hh*0.04);ctx.lineTo(-hw*0.9,hh*0.02);ctx.stroke();
  ctx.beginPath();ctx.moveTo(hw*0.12,-hh*0.1);ctx.lineTo(hw*0.9,-hh*0.22);ctx.stroke();
  ctx.beginPath();ctx.moveTo(hw*0.12,-hh*0.04);ctx.lineTo(hw*0.9,hh*0.02);ctx.stroke();
  ctx.restore();
  // Tail
  ctx.save();ctx.strokeStyle=lighten(c,20);ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(hw*0.7,hh*0.25);ctx.quadraticCurveTo(hw*1.35,hh*0.75,hw*0.55,hh*0.98);ctx.stroke();
  ctx.restore();
}

// Trail
let trailTmr=0;
function spawnTrail(){
  const sk=SKINS[selectedSkin];const tc=sk.trail;
  const shapes=['square','circle'];
  particles.push(new Particle(
    player.x+player.width/2+(Math.random()-.5)*10,player.y+player.height-2+(Math.random()-.5)*5,
    tc[Math.floor(Math.random()*tc.length)],(Math.random()-.5)*.8,Math.random()*.5+.15,
    20+Math.random()*15,3+Math.random()*3,true,shapes[Math.floor(Math.random()*shapes.length)]
  ));
}

// ══════════════════════════════════════════
//  SHOP PARTICLES
// ══════════════════════════════════════════
const shopParts=[];let shopPTmr=0;
function spawnShopPart(){
  const cols=['#FFD700','#FF6B6B','#6B9BFF','#6BFF6B','#C96BFF','#00FFFF','#FF88FF'];
  shopParts.push(new Particle(Math.random()*900,-10,cols[Math.floor(Math.random()*cols.length)],(Math.random()-.5)*1.2,1+Math.random()*2,100+Math.random()*60,2+Math.random()*4,false,'circle'));
}
function clearShopParts(){shopParts.length=0;}
const shopCardAnims=SKINS.map(()=>({hover:0,pulse:Math.random()*Math.PI*2,hoverProgress:0}));
window.addEventListener('mousemove',e=>{
  if(gameState!=='shop')return;
  const rect=cv.getBoundingClientRect();const sc=rect.width/900;const mx=(e.clientX-rect.left)/sc,my=(e.clientY-rect.top)/sc;
  SKINS.forEach((s,i)=>{const col=i%4,row=Math.floor(i/4);const bx=14+col*224,by=100+row*148-shopScroll;shopCardAnims[i].hover=(my>=62&&mx>=bx&&mx<=bx+210&&my>=by&&my<=by+140)?1:0;});
});

// ══════════════════════════════════════════
//  CLICK
// ══════════════════════════════════════════
window.addEventListener('click',e=>{
  initAudio();
  const rect=cv.getBoundingClientRect();const sc=rect.width/900;const x=(e.clientX-rect.left)/sc,y=(e.clientY-rect.top)/sc;
  if(gameState==='home'){
    if(x>=12&&x<=448&&y>=378&&y<=438){storyStartLevel=0;gameState='storyMap';}
    if(x>=456&&x<=888&&y>=378&&y<=438){gameMode='endless';startGame();}
    if(x>=12&&x<=448&&y>=446&&y<=506){gameMode='risingLava';startGame();}
    if(x>=456&&x<=888&&y>=446&&y<=506){gameMode='arena';startGame();}
    if(x>=W-125&&x<=W-8&&y>=8&&y<=55){
      clearShopParts();
      // 5% chance to feature a cat skin that the player doesn't own yet
      if(Math.random()<0.05){
        const catIdxs=SKINS.map((sk,i)=>({sk,i})).filter(({sk,i})=>sk.shape==='cat'&&!unlockedSkins.includes(i));
        catShopOffer=catIdxs.length>0?catIdxs[Math.floor(Math.random()*catIdxs.length)].i:null;
      }else{catShopOffer=null;}
      gameState='shop';
    }
    if(x>=8&&x<=146&&y>=54&&y<=88){gameState='settings';return;}
    if(x>=W/2+46&&x<=W/2+120&&y>=H-20&&y<=H-2){gameState='changelog';return;}
    // Paw print secret button — bottom-left corner
    if(x>=0&&x<=40&&y>=H-34&&y<=H){initCats();gameState='cats';stopMusic();if(musicOn){initAudio();playLevelMusic(14);}}
    // Level editor button — bottom right
    if(x>=W-164&&x<=W&&y>=H-36&&y<=H-6){editorPwStr='';editorPwError=0;gameState='editorPw';}
  }
  if(gameState==='paused'){
    const px=W/2-160,py=H/2-160,pw=320;
    // Resume
    if(x>=px+28&&x<=px+pw-28&&y>=py+98&&y<=py+144){gameState='playing';if(musicOn)initAudio();}
    // Settings
    if(x>=px+28&&x<=px+pw-28&&y>=py+164&&y<=py+210){gameState='settings';}
    // Exit to menu
    if(x>=px+28&&x<=px+pw-28&&y>=py+230&&y<=py+276){stopMusic();gameState='home';}
    return;
  }
  if(gameState==='settings'){
    // Difficulty buttons
    [{id:'easy',i:0},{id:'medium',i:1},{id:'hard',i:2},{id:'hardcore',i:3}].forEach(d=>{
      const bx=W/2-438+d.i*222,by=106,bw=208,bh=88;
      if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh){difficulty=d.id;saveGame(true);showNotif('DIFFICULTY: '+d.id.toUpperCase(),diffColor());}
    });
    // Music toggle
    if(x>=W/2-228&&x<=W/2-18&&y>=214&&y<=264){
      musicOn=!musicOn;document.getElementById('mBtn').textContent='🎵 '+(musicOn?'ON':'OFF');
      if(!musicOn)stopMusic();saveGame(true);
    }
    // SFX toggle
    if(x>=W/2+18&&x<=W/2+228&&y>=214&&y<=264){sfxOn=!sfxOn;saveGame(true);}
    // Back button
    if(x>=W/2-72&&x<=W/2+72&&y>=446&&y<=494){gameState='home';}
    // Reset Data button
    if(x>=W/2-310&&x<=W/2-150&&y>=446&&y<=494){hardReset();gameState='home';}
    // Exit App button
    if(x>=W/2+150&&x<=W/2+310&&y>=446&&y<=494){window.close();}
    return;
  }
  if(gameState==='changelog'){
    if(x>=W/2-72&&x<=W/2+72&&y>=536&&y<=572){gameState='home';return;}
    return;
  }
  if(gameState==='storyMap'){
    // Back button
    if(x>=8&&x<=115&&y>=8&&y<=46){gameState='home';return;}
    // Snake layout: row 1 = levels 1-5, row 2 = levels 6-10 (right-to-left)
    const smNodes=[
      {lv:0,nx:90, ny:230},{lv:1,nx:225,ny:230},{lv:2,nx:360,ny:230},
      {lv:3,nx:495,ny:230},{lv:4,nx:630,ny:230},
      {lv:5,nx:630,ny:400},{lv:6,nx:495,ny:400},{lv:7,nx:360,ny:400},
      {lv:8,nx:225,ny:400},{lv:9,nx:90, ny:400},
    ];
    smNodes.forEach(({lv,nx,ny})=>{
      const unlocked=lv===0||completedLevels.includes(lv-1);
      if(!unlocked)return;
      if(x>=nx-38&&x<=nx+38&&y>=ny-38&&y<=ny+38){
        storyStartLevel=lv;gameMode='story';startGame();
      }
    });
    return;
  }
  if(gameState==='levelSelect'){
    if(x>=8&&x<=88&&y>=10&&y<=50){gameState='home';return;}
    if(x>=W-128&&x<=W-8&&y>=10&&y<=50){newLevel();gameState='editor';return;}
    const lsLevels=getAllLevels();
    const LS_CH=80,LS_CP=8,LS_CY=70,LS_BW=68,LS_BH=26;
    lsLevels.forEach((lev,li)=>{
      const cy=LS_CY+li*(LS_CH+LS_CP)-levelSelectScroll;
      if(y<cy||y>cy+LS_CH)return;
      const bsy=cy+(LS_CH-LS_BH)/2;
      if(x>=W-LS_BW-16&&x<=W-16&&y>=bsy&&y<=bsy+LS_BH){deleteSavedLevel(lev.id);showNotif('🗑 DELETED','#ff6666');return;}
      if(x>=W-LS_BW*2-24&&x<=W-LS_BW-24&&y>=bsy&&y<=bsy+LS_BH){loadLevelIntoEditor(lev.id);gameState='editor';return;}
      if(x>=W-LS_BW*3-32&&x<=W-LS_BW*2-32&&y>=bsy&&y<=bsy+LS_BH){loadLevelIntoEditor(lev.id);editorPlayTest();return;}
    });
  }
  if(gameState==='cats'){
    if(x>=10&&x<=90&&y>=8&&y<=46){stopMusic();gameState='home';return;}
    if(x>=W-106&&x<=W-10&&y>=8&&y<=46){gameState='catShop';return;}
    cats.forEach((c,i)=>{
      if(x>=c.x-74&&x<=c.x+76&&y>=358&&y<=386)feedCat(i);
      if(x>=c.x-74&&x<=c.x+76&&y>=392&&y<=420)petCat(i);
      if(x>=c.x-74&&x<=c.x+76&&y>=426&&y<=454)playCat(i);
    });
    const selW2=200,selGap2=6,selStart2=(W-4*(selW2+selGap2)+selGap2)/2;
    const foodKeys=['fish','catnip','milk','treat'];
    foodKeys.forEach((fk,fi)=>{const fx2=selStart2+fi*(selW2+selGap2);if(x>=fx2&&x<=fx2+selW2&&y>=462&&y<=500){catSelectedFood=fk;}});
  }
  if(gameState==='catShop'){
    if(x>=10&&x<=90&&y>=8&&y<=46){gameState='cats';return;}
    // Food buy buttons — position matches shopFoods layout: cardW=416, buy button at x+cw-76, y+8, 68x38
    const shopFoodDefs=[
      {fx:22,fy:96,stock:'catFishStock',add:10,cost:15,notif:'+10 FISH! 🐟'},
      {fx:462,fy:96,stock:'catNipStock',add:10,cost:22,notif:'+10 CATNIP! 🌿'},
      {fx:22,fy:186,stock:'catMilkStock',add:10,cost:8,notif:'+10 MILK! 🥛'},
      {fx:462,fy:186,stock:'catTreatStock',add:5,cost:35,notif:'+5 TREATS! 🍖'},
    ];
    const cw=416;
    shopFoodDefs.forEach(sf=>{
      const bx=sf.fx+cw-76,by=sf.fy+8;
      if(x>=bx&&x<=bx+68&&y>=by&&y<=by+38&&totalCoins>=sf.cost){
        totalCoins-=sf.cost;
        if(sf.stock==='catFishStock')catFishStock+=sf.add;
        else if(sf.stock==='catNipStock')catNipStock+=sf.add;
        else if(sf.stock==='catMilkStock')catMilkStock+=sf.add;
        else if(sf.stock==='catTreatStock')catTreatStock+=sf.add;
        saveGame(true);showNotif(sf.notif,'#ffcc88');
      }
    });
    // Cat skin buttons
    const skinCardW=160,skinCardH=200,skinGap=20;
    const skinStartX=(W-CAT_SKIN_DATA.length*(skinCardW+skinGap)+skinGap)/2;
    CAT_SKIN_DATA.forEach((sk,i)=>{
      const cx2=skinStartX+i*(skinCardW+skinGap);const cy2=298;const btnY=cy2+skinCardH-44;
      if(x>=cx2+10&&x<=cx2+skinCardW-10&&y>=btnY&&y<=btnY+32){
        const isOwned=unlockedCatSkins.includes(i);
        if(unlockedCatSkins.includes(i)){activeCatSkin=i;initCats();showNotif(sk.name+' THEME!','#ffdd88');}
        else if(totalCoins>=sk.cost){totalCoins-=sk.cost;unlockedCatSkins.push(i);activeCatSkin=i;initCats();saveGame(true);showNotif(sk.name+' UNLOCKED!','#ffaa44');}
        else{showNotif('NOT ENOUGH COINS','#ff4444');}
      }
    });
  }
  if(gameState==='shop'){
    if(x>=10&&x<=92&&y>=10&&y<=50){gameState='home';shopScroll=0;return;}
    if(x>=W-120&&x<=W-8&&y>=10&&y<=50){saveGame();return;}
    // Featured cat offer buttons
    if(catShopOffer!==null){
      const fx=570,fy=68,fw=320;
      // Dismiss button
      if(x>=fx+fw-28&&x<=fx+fw-4&&y>=fy+4&&y<=fy+24){catShopOffer=null;}
      // Buy button
      else if(x>=fx+78&&x<=fx+188&&y>=fy+68&&y<=fy+96){
        const ofIdx=catShopOffer;const osk=SKINS[ofIdx];
        if(!unlockedSkins.includes(ofIdx)){
          if(totalCoins>=osk.cost){totalCoins-=osk.cost;unlockedSkins.push(ofIdx);selectedSkin=ofIdx;player.color=osk.color;currentSkinSpd=osk.spd;currentSkinJmp=osk.jmp;catShopOffer=null;playSFX('buy');showNotif('🐱 '+osk.name+' UNLOCKED!',osk.color);saveGame(true);}
          else{playSFX('error');showNotif('NOT ENOUGH COINS','#ff4444');}
        }else{selectedSkin=ofIdx;catShopOffer=null;playSFX('equip');showNotif('✓ '+osk.name+' EQUIPPED',osk.color);}
      }
    }
    if(y<62)return;
    SKINS.forEach((sk,i)=>{
      const col=i%4,row=Math.floor(i/4);const bx=14+col*224,by=100+row*148-shopScroll;
      if(x>=bx&&x<=bx+210&&y>=by&&y<=by+140){
        const owned=unlockedSkins.includes(i);
        if(owned){selectedSkin=i;player.color=sk.color;currentSkinSpd=sk.spd;currentSkinJmp=sk.jmp;playSFX('equip');showNotif('✓ '+sk.name+' EQUIPPED',sk.color);}
        else if(totalCoins>=sk.cost){totalCoins-=sk.cost;unlockedSkins.push(i);selectedSkin=i;player.color=sk.color;playSFX('buy');showNotif('✓ '+sk.name+' UNLOCKED!',sk.color);saveGame(true);}
        else{playSFX('error');showNotif('NOT ENOUGH COINS','#ff4444');}
      }
    });
  }
  if(gameState==='playing'){
    if(x>=W-190&&x<=W-100&&y>=5&&y<=30)saveGame();
    if(x>=W-95&&x<=W-5&&y>=5&&y<=30)hardReset();
    // HUD pause/save/reset (new positions at y=40-62)
    if(x>=W-230&&x<=W-152&&y>=40&&y<=62)saveGame();
    if(x>=W-146&&x<=W-71&&y>=40&&y<=62)hardReset();
    if(x>=W-66&&x<=W-8&&y>=40&&y<=62){gameState='paused';}
  }
  // Editor button clicks
  if(gameState==='editor'){
    if(y<ED_TOP){
      if(x>=6&&x<=88){gameState='levelSelect';return;}
      const saveX=W-ED_RIGHT-186;if(x>=saveX&&x<=saveX+82){saveCurrentLevel();return;}
      const testX=W-ED_RIGHT-96;if(x>=testX&&x<=testX+88){editorPlayTest();return;}
      const nameX=96,nameW=saveX-nameX-8;
      if(x>=nameX&&x<=nameX+nameW){editorRenaming=true;editorRenameStr=editorLevelName;return;}
    }
    if(x>=ED_VW&&y>=ED_TOP&&y<ED_TOP+30){
      const _ctw=Math.floor(ED_RIGHT/EDITOR_PALETTE.length);const ci=Math.floor((x-ED_VW)/_ctw);if(ci>=0&&ci<EDITOR_PALETTE.length){editorCategory=ci;return;}
    }
    if(x>=ED_VW&&y>=ED_TOP+30){
      const ti=Math.floor((y-ED_TOP-30)/44);
      const cat=EDITOR_PALETTE[editorCategory];
      if(ti>=0&&ti<cat.tools.length){
        const newTool=cat.tools[ti];
        if(newTool==='powerup'&&editorTool==='powerup'){
          const PTYPES=['speedBoost','shield','extraJump','invincibility','coinMagnet','scoreMult'];
          editorPowerupType=PTYPES[(PTYPES.indexOf(editorPowerupType)+1)%PTYPES.length];
          showNotif('POWERUP TYPE: '+editorPowerupType.toUpperCase(),'#aaffaa');
        }else{editorTool=newTool;}
        return;
      }
      // Settings panel (context-sensitive below tool buttons)
      const settY=ED_TOP+30+4*44+5;const rpx=ED_VW;
      if(editorTool==='powerup'){
        // 2×2 grid of powerup type buttons
        const ptypes=['speedBoost','shield','extraJump','invincibility','coinMagnet','scoreMult'];
        ptypes.forEach((pt,i)=>{
          const bx=rpx+4+(i%2)*57;const by=settY+16+Math.floor(i/2)*30;
          if(x>=bx&&x<=bx+53&&y>=by&&y<=by+24){editorPowerupType=pt;return;}
        });
      } else if(editorTool==='conveyZone'){
        if(x>=rpx+4&&x<=rpx+58&&y>=settY+18&&y<=settY+40){editorConveyDir=-1;return;}
        if(x>=rpx+62&&x<=rpx+116&&y>=settY+18&&y<=settY+40){editorConveyDir=1;return;}
      } else if(editorTool==='portal'){
        const ptypes2=['gravity','mirror','shrink','ghost','speed','score','coinStorm','bounce'];
        ptypes2.forEach((pt,i)=>{
          const bx=rpx+4+(i%2)*57;const by=settY+16+Math.floor(i/2)*24;
          if(x>=bx&&x<=bx+52&&y>=by&&y<=by+20){editorPortalType=pt;showNotif('PORTAL: '+pt.toUpperCase(),'#44aaff');return;}
        });
      } else if(editorTool==='warpGate'){
        ['#ff44ff','#44ffff','#ffff44','#ff8800'].forEach((_,i)=>{
          const bx=rpx+4+(i%2)*57;const by=settY+18+Math.floor(i/2)*30;
          if(x>=bx&&x<=bx+52&&y>=by&&y<=by+24){editorWarpPairId=i;showNotif('WARP PAIR #'+i,'#ff44ff');return;}
        });
      } else if(editorTool==='boss'){
        if(x>=rpx+8&&x<=rpx+32&&y>=settY+16&&y<=settY+42){editorBossHp=Math.max(1,editorBossHp-1);return;}
        if(x>=rpx+82&&x<=rpx+106&&y>=settY+16&&y<=settY+42){editorBossHp=Math.min(8,editorBossHp+1);return;}
      } else if(editorTool==='laser'){
        if(x>=rpx+8&&x<=rpx+32&&y>=settY+16&&y<=settY+42){editorLaserInterval=Math.max(20,editorLaserInterval-10);return;}
        if(x>=rpx+82&&x<=rpx+106&&y>=settY+16&&y<=settY+42){editorLaserInterval=Math.min(300,editorLaserInterval+10);return;}
      } else if(editorTool==='platform'){
        PLATFORM_STYLES.forEach((ps,i)=>{
          const bx=rpx+4+(i%2)*57;const by=settY+16+Math.floor(i/2)*24;
          if(x>=bx&&x<=bx+52&&y>=by&&y<=by+20){editorPlatformStyle=ps;showNotif('PLT STYLE: '+ps.toUpperCase(),'#cc9966');return;}
        });
      } else if(editorTool==='movingPlatform'){
        // RANGE row
        if(y>=settY+15&&y<=settY+33){
          if(x>=rpx+46&&x<=rpx+64){editorMovePlatRange=Math.max(40,editorMovePlatRange-20);return;}
          if(x>=rpx+92&&x<=rpx+110){editorMovePlatRange=Math.min(600,editorMovePlatRange+20);return;}
        }
        // SPEED row
        if(y>=settY+35&&y<=settY+53){
          if(x>=rpx+46&&x<=rpx+64){editorMovePlatSpd=Math.max(0.5,+(editorMovePlatSpd-0.5).toFixed(1));return;}
          if(x>=rpx+92&&x<=rpx+110){editorMovePlatSpd=Math.min(10.0,+(editorMovePlatSpd+0.5).toFixed(1));return;}
        }
      } else {
        // LAVA toggle row
        if(y>=settY+12&&y<=settY+30){
          if(x>=rpx+36&&x<=rpx+63){editorLavaRise=false;return;}
          if(x>=rpx+66&&x<=rpx+96){editorLavaRise=true;return;}
        }
        // LAVA SPD row
        if(y>=settY+32&&y<=settY+50){
          if(x>=rpx+40&&x<=rpx+58){editorLavaSpd=Math.max(0.05,+(editorLavaSpd-0.05).toFixed(2));return;}
          if(x>=rpx+78&&x<=rpx+96){editorLavaSpd=Math.min(3.0,+(editorLavaSpd+0.05).toFixed(2));return;}
        }
        // MUSIC row
        if(y>=settY+52&&y<=settY+70){
          if(x>=rpx+6&&x<=rpx+24){editorMusicIdx=(editorMusicIdx-1+THEMES.length)%THEMES.length;return;}
          if(x>=rpx+94&&x<=rpx+112){editorMusicIdx=(editorMusicIdx+1)%THEMES.length;return;}
        }
        // SIZE row
        if(y>=settY+72&&y<=settY+90){
          if(x>=rpx+6&&x<=rpx+24){editorSizeIdx=(editorSizeIdx-1+3)%3;return;}
          if(x>=rpx+94&&x<=rpx+112){editorSizeIdx=(editorSizeIdx+1)%3;return;}
        }
      }
    }
  }
});

// ══════════════════════════════════════════
//  EDITOR MOUSE DRAG EVENTS
// ══════════════════════════════════════════
cv.addEventListener('contextmenu',e=>{if(gameState==='editor')e.preventDefault();});
cv.addEventListener('mousedown',e=>{
  if(gameState!=='editor')return;
  initAudio();
  const rect=cv.getBoundingClientRect();const sc=rect.width/900;
  const mx=(e.clientX-rect.left)/sc,my=(e.clientY-rect.top)/sc;
  if(e.button===2){editorPan.active=true;editorPan.lastX=mx;editorPan.lastY=my;e.preventDefault();return;}
  if(e.button!==0||my<ED_TOP||mx>=ED_VW)return;
  const wx=editorSnap(mx+camera.x),wy=editorSnap((my-ED_TOP)+camera.y);
  if(editorTool==='platform'||editorTool==='movingPlatform'||editorTool==='killbrick'||editorTool==='iceZone'||editorTool==='conveyZone'){
    editorDrag={sx:wx,sy:wy,cx:wx,cy:wy};
  }else{editorPlaceAt(wx,wy);}
});
cv.addEventListener('mousemove',e=>{
  if(gameState!=='editor')return;
  const rect=cv.getBoundingClientRect();const sc=rect.width/900;
  const mx=(e.clientX-rect.left)/sc,my=(e.clientY-rect.top)/sc;
  if(editorPan.active){
    camera.x=Math.max(0,Math.min(WORLD_W-ED_VW,camera.x-(mx-editorPan.lastX)));
    camera.y=Math.max(0,Math.min(WORLD_H-ED_VH,camera.y-(my-editorPan.lastY)));
    editorPan.lastX=mx;editorPan.lastY=my;return;
  }
  if(editorDrag){editorDrag.cx=editorSnap(mx+camera.x);editorDrag.cy=editorSnap((my-ED_TOP)+camera.y);}
});
cv.addEventListener('mouseup',e=>{
  if(gameState!=='editor')return;
  if(e.button===2){editorPan.active=false;return;}
  if(!editorDrag||e.button!==0)return;
  const px=Math.min(editorDrag.sx,editorDrag.cx),py=Math.min(editorDrag.sy,editorDrag.cy);
  const pw=Math.max(EDITOR_GRID*2,Math.abs(editorDrag.cx-editorDrag.sx));
  if(editorTool==='platform')editorObjs.push({type:'platform',x:px,y:py,w:pw,h:18,style:editorPlatformStyle});
  else if(editorTool==='movingPlatform')editorObjs.push({type:'movingPlatform',x:px,y:py,w:pw,h:18,minX:px-editorMovePlatRange,maxX:px+pw+editorMovePlatRange,spd:editorMovePlatSpd});
  else if(editorTool==='killbrick')editorObjs.push({type:'killbrick',x:px,y:py,w:pw,h:20});
  else if(editorTool==='iceZone'){const ph=Math.max(EDITOR_GRID,Math.abs(editorDrag.cy-editorDrag.sy)||24);editorObjs.push({type:'iceZone',x:px,y:py,w:pw,h:ph});}
  else if(editorTool==='conveyZone'){const ph=Math.max(EDITOR_GRID,Math.abs(editorDrag.cy-editorDrag.sy)||24);editorObjs.push({type:'conveyZone',x:px,y:py,w:pw,h:ph,dir:editorConveyDir});}
  editorDrag=null;
});
cv.addEventListener('wheel',e=>{
  if(gameState==='shop'){
    const maxS=Math.max(0,(Math.ceil(SKINS.length/4)-3)*148);
    shopScroll=Math.max(0,Math.min(maxS,shopScroll+e.deltaY*.5));
    e.preventDefault();return;
  }
  if(gameState==='levelSelect'){
    levelSelectScroll=Math.max(0,levelSelectScroll+e.deltaY*.5);
    e.preventDefault();return;
  }
  if(gameState==='editor'){
    camera.y=Math.max(0,Math.min(WORLD_H-ED_VH,camera.y+e.deltaY*.5));
    camera.x=Math.max(0,Math.min(WORLD_W-ED_VW,camera.x+(e.deltaX||0)*.5));
    e.preventDefault();
  }
},{passive:false});

// ══════════════════════════════════════════
//  UPDATE
// ══════════════════════════════════════════
function update(){
  animTick++;
  if(coinComboTimer>0)coinComboTimer--;else if(coinComboCount>0)coinComboCount=0;
  // Kill streak timer
  if(killStreakTimer>0){killStreakTimer--;if(killStreakTimer<=0&&killStreak>0){killStreak=0;}}
  // Dash cooldown
  if(dashCooldown>0)dashCooldown--;
  if(doubleTapDashing>0){
    doubleTapDashing--;player.velX=doubleTapDashVelX;
    if(animTick%2===0)particles.push(new Particle(player.x+player.width/2,player.y+player.height/2,SKINS[selectedSkin].color,(Math.random()-.5)*2,(Math.random()-.5)*2,14,4,true,'spark'));
    if(doubleTapDashing===0){doubleTapDashVelX=0;}
  }
  // Speedrun level timer
  if(gameState==='playing')levelTimer++;
  // Endless random events
  if(gameMode==='endless'&&gameState==='playing'){
    endlessEventTimer++;
    if(endlessEventLeft>0){
      endlessEventLeft--;
      if(endlessEventLeft===0){endlessEvent=null;showNotif('EVENT OVER','#aaaaff');}
    }
    if(endlessEventTimer>1800&&endlessEventLeft<=0){
      endlessEventTimer=0;
      const evts=['coinFrenzy','freezeWave','speedRush','spikeRain','goldRush','meteorStrike'];
      endlessEvent=evts[Math.floor(Math.random()*evts.length)];
      endlessEventLeft=480;
      if(endlessEvent==='coinFrenzy')showNotif('COIN FRENZY! 8s — COINS x3!','#FFD700');
      else if(endlessEvent==='freezeWave'){showNotif('FREEZE WAVE! 8s — ENEMIES FROZEN!','#88eeff');enemyFrozen=true;enemyFrozenLeft=Math.max(enemyFrozenLeft,480);enemies.forEach(e=>{e.frozen=true;});}
      else if(endlessEvent==='speedRush')showNotif('SPEED RUSH! 8s — GO GO GO!','#ffff44');
      else if(endlessEvent==='spikeRain')showNotif('SPIKE RAIN! 8s — DODGE!','#ff4444');
      else if(endlessEvent==='goldRush'){showNotif('GOLD RUSH! 8s — COINS x5!','#ffd700');}
      else if(endlessEvent==='meteorStrike'){showNotif('METEOR STRIKE! 8s — WATCH OUT!','#ff8800');}
    }
  }
  // Portal timers
  if(gravityFlipLeft>0){gravityFlipLeft--;if(gravityFlipLeft<=0){gravityFlipped=false;player.velY*=-.4;showNotif('↕ GRAVITY RESTORED','#4488ff');}}
  if(mirrorWorldLeft>0){mirrorWorldLeft--;if(mirrorWorldLeft<=0){mirrorWorld=false;showNotif('↔ MIRROR LIFTED','#ff8800');}}
  if(playerShrunkLeft>0){playerShrunkLeft--;if(playerShrunkLeft<=0){playerShrunk=false;player.width=28;player.height=28;showNotif('NORMAL SIZE','#00ffdd');}}
  if(ghostPortalModeLeft>0){ghostPortalModeLeft--;if(ghostPortalModeLeft<=0){ghostPortalMode=false;showNotif('PHASE ENDED','#eeeeff');}}
  if(speedPortalLeft>0)speedPortalLeft--;
  if(scorePortalLeft>0)scorePortalLeft--;
  // Star throw cooldown
  if(throwStarCooldown>0)throwStarCooldown--;
  // Weather drops (visual only)
  if(weatherType&&gameState==='playing'){
    if(animTick%3===0){
      if(weatherType==='rain')weatherDrops.push({x:camera.x+Math.random()*W,y:camera.y-10,vx:-1,vy:14+Math.random()*6,color:'rgba(100,160,255,.5)',w:1,h:8});
      else if(weatherType==='snow')weatherDrops.push({x:camera.x+Math.random()*W,y:camera.y-10,vx:(Math.random()-.5)*1.2,vy:1.5+Math.random()*2,color:'rgba(220,240,255,.8)',w:3,h:3});
      else if(weatherType==='embers')weatherDrops.push({x:camera.x+Math.random()*W,y:camera.y+H,vx:(Math.random()-.5)*1.5,vy:-(1+Math.random()*3),color:`rgba(255,${80+Math.floor(Math.random()*80)},0,.7)`,w:2,h:2});
    }
    for(let wi=weatherDrops.length-1;wi>=0;wi--){const d=weatherDrops[wi];d.x+=d.vx;d.y+=d.vy;if(d.y>camera.y+H+20||d.y<camera.y-20)weatherDrops.splice(wi,1);}
    if(weatherDrops.length>200)weatherDrops.splice(0,weatherDrops.length-200);
  }
  // Spike rain event
  if(endlessEvent==='spikeRain'&&gameState==='playing'&&animTick%14===0){
    spikeRainDrops.push({x:camera.x+Math.random()*W,y:camera.y-20,vy:5+Math.random()*5,life:180,r:8});
  }
  for(let si=spikeRainDrops.length-1;si>=0;si--){
    const d=spikeRainDrops[si];d.y+=d.vy;d.life--;
    if(d.life<=0)spikeRainDrops.splice(si,1);
  }
  // Gold rush – rain coins + 5x score multiplier active
  if(endlessEvent==='goldRush'&&gameState==='playing'&&animTick%6===0){
    const dc=new Coin(camera.x+Math.random()*W,camera.y-10);dc.dropped=true;dc.dvx=(Math.random()-.5)*3;dc.dvy=1.5+Math.random()*2;coins.push(dc);
  }
  // Meteor strike – fireballs rain and damage
  if(endlessEvent==='meteorStrike'&&gameState==='playing'&&animTick%28===0){
    const mx=camera.x+Math.random()*W,my=camera.y-20;
    bullets.push({x:mx,y:my,vx:(Math.random()-.5)*2,vy:6+Math.random()*4,life:120,color:'#ff6600',r:9,isMeteor:true});
  }
  if(gameState==='editor'||gameState==='levelSelect')return;
  if(gameState==='editorPw'){if(editorPwError>0)editorPwError--;return;}
  if(gameState==='storyMap'||gameState==='changelog')return;
  if(gameState==='home'||gameState==='shop'){
    shopPTmr++;if(shopPTmr%3===0)spawnShopPart();
    for(let i=shopParts.length-1;i>=0;i--){shopParts[i].update();if(shopParts[i].life<=0||shopParts[i].y>H+20)shopParts.splice(i,1);}
    shopCardAnims.forEach(a=>{a.pulse+=.04;a.hoverProgress=lerp(a.hoverProgress,a.hover,.12);});
    return;
  }
  if(gameState==='cats'||gameState==='catShop'){updateCats();return;}
  if(gameState==='gameover'||gameState==='paused')return;

  const sk=SKINS[selectedSkin];
  if(puSpeedActive){puSpeedLeft--;if(puSpeedLeft<=0)puSpeedActive=false;}
  if(puMagnetActive){puMagnetLeft--;if(puMagnetLeft<=0){puMagnetActive=false;}}
  if(puScoreMult){puScoreMultLeft--;if(puScoreMultLeft<=0){puScoreMult=false;}}
  // Coin magnet pull — attract nearby uncollected coins toward player
  if(puMagnetActive){
    const pcx=player.x+player.width/2,pcy=player.y+player.height/2;
    const activeCoinListMag=[...coins];if(inSecretRoom&&currentSecretRoomData)activeCoinListMag.push(...currentSecretRoomData.coins);
    activeCoinListMag.forEach(c=>{
      if(c.collected)return;
      const dx=pcx-c.x,dy=pcy-c.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
      if(dist<220){const spd=Math.min(8,18/dist*5.5);c.x+=dx/dist*spd;c.y+=dy/dist*spd;}
    });
  }
  // Rage mode tick
  if(rageModeLeft>0){
    rageModeLeft--;
    if(rageModeLeft===0){rageMode=false;showNotif('💨 Rage over','#ff8844');}
    // Kill enemies on contact while raging
    if(rageMode&&invincible<=0){
      for(let ri=enemies.length-1;ri>=0;ri--){
        if(enemies[ri].collidesWith(player)){
          spawnBurst(enemies[ri].x+enemies[ri].width/2,enemies[ri].y,'#ff4400',12,6);
          for(let ci=0;ci<2;ci++){const dc=new Coin(enemies[ri].x+enemies[ri].width/2+(ci-1)*8,enemies[ri].y);dc.dropped=true;dc.dvx=(ci-1)*2+(Math.random()-.5)*2;dc.dvy=-4-Math.random()*2;coins.push(dc);}
          const _rex=enemies[ri].x+enemies[ri].width/2,_rey=enemies[ri].y;
          enemies.splice(ri,1);score+=puScoreMult?60:30;playSFX('stomp');registerKill(_rex,_rey);
          if(Math.random()<0.08)heartDrops.push(new HeartDrop(_rex,_rey));
        }
      }
    }
  }
  // Sticky pad slows movement (onSticky set from previous frame collision)
  const spd=BASE_SPEED*currentSkinSpd*(puSpeedActive?1.65:1)*(onSticky?0.28:1)*(rageMode?1.35:1)*(endlessEvent==='speedRush'?1.45:1)*(speedPortalLeft>0?3:1);
  const jp=BASE_JUMP*currentSkinJmp*(onSticky?0.75:1);
  const ts=timeSlowActive?.32:1;

  onIce=false;
  if(iceZones.length>0){const px=player.x+player.width/2;for(const z of iceZones){if(px>=z.x&&px<=z.x2&&player.onGround){onIce=true;break;}}}
  onConveyor=false;conveyorDir=0;
  if(conveyorZones.length>0){const px=player.x+player.width/2;for(const z of conveyorZones){if(px>=z.x&&px<=z.x2&&player.onGround){onConveyor=true;conveyorDir=z.dir;break;}}}

  const _mleft=mirrorWorld?(keys['arrowright']||keys['d']):(keys['arrowleft']||keys['a']);
  const _mright=mirrorWorld?(keys['arrowleft']||keys['a']):(keys['arrowright']||keys['d']);
  if(_mleft){if(onIce)player.velX=lerp(player.velX,-spd,.07);else player.velX=-spd;}
  else if(_mright){if(onIce)player.velX=lerp(player.velX,spd,.07);else player.velX=spd;}
  else{if(onIce)player.velX=lerp(player.velX,0,.04);else player.velX=0;}
  if(sk.ability==='dash'&&abilityActive){player.velX=player.facing*22;player.velY*=.85;}
  // Conveyor belt — nudge player horizontally
  if(onConveyor)player.velX=lerp(player.velX,conveyorDir*spd*0.6,.12);
  player.x+=player.velX*ts;player.x=Math.max(0,Math.min(player.x,WORLD_W-player.width));
  // Rocket: continuous upward thrust during active window
  if(abilityActive&&sk.ability==='rocket'){player.velY=Math.max(player.velY-1.1,-16);}
  // Divine: sustained flight — slow fall, boost speed
  if(abilityActive&&sk.ability==='divine'){player.velY=Math.max(player.velY-0.55,-8);player.velX*=1.015;}
  if(gravityFlipped){player.velY-=gravity*ts;if(player.velY<-18)player.velY=-18;}
  else{player.velY+=gravity*ts;if(player.velY>18)player.velY=18;}
  player.y+=player.velY*ts;
  if(player.velX>0.5)player.facing=1;else if(player.velX<-0.5)player.facing=-1;

  movingPlatforms.forEach(p=>p.update());
  enemies.forEach(e=>e.update());
  if(enemyFrozen){enemyFrozenLeft--;if(enemyFrozenLeft<=0){enemyFrozen=false;enemies.forEach(e=>e.frozen=false);}}
  if(abilityCooldownLeft>0)abilityCooldownLeft--;
  if(abilityActiveLeft>0){abilityActiveLeft--;if(abilityActiveLeft<=0){abilityActive=false;if(sk.ability==='shield')shieldActive=false;}}
  if(timeSlowActive){timeSlowLeft--;if(timeSlowLeft<=0)timeSlowActive=false;}

  // ── Continuous ability effects (visuals + gameplay per frame) ──────────────
  if(abilityActive){
    const cx=player.x+player.width/2,cy=player.y+player.height/2;
    // DASH: afterimage spark trail behind player
    if(sk.ability==='dash'&&Math.random()<.6)
      particles.push(new Particle(player.x+(player.facing<0?player.width:0),player.y+player.height/2,sk.color,-player.facing*(1+Math.random()*2),(Math.random()-.5)*1.5,16,5,true,'spark'));
    // ROCKET: exhaust fire from bottom
    if(sk.ability==='rocket'&&Math.random()<.5)
      particles.push(new Particle(cx+(Math.random()-.5)*6,player.y+player.height+2,'#FF6600',(Math.random()-.5)*2,Math.random()*2.5+1,18,5,true,'circle'));
    // GHOST: fading translucent afterimages
    if(sk.ability==='ghost'&&Math.random()<.22){
      const gp=new Particle(player.x+(Math.random()-.5)*4,player.y+(Math.random()-.5)*4,sk.color,0,0,22,player.width*.7,true,'circle');
      gp.update=function(){this.size*=.9;this.life--;};particles.push(gp);
    }
    // TOXIC: green smoke cloud around player
    if(sk.ability==='toxic'&&Math.random()<.3)
      particles.push(new Particle(cx+(Math.random()-.5)*22,player.y+(Math.random()-.5)*18,'#88FF00',(Math.random()-.5)*1.1,-Math.random()*.9-.2,38,8,true,'circle'));
    // VOID: pull nearby coins toward player each frame
    if(sk.ability==='void'){
      coins.forEach(c=>{if(!c.collected){const dx=cx-c.x,dy=cy-c.y;const d=Math.sqrt(dx*dx+dy*dy)||1;if(d<300){c.x+=dx/d*6;c.y+=dy/d*6;}}});
      if(Math.random()<.18)particles.push(new Particle(cx+(Math.random()-.5)*110,cy+(Math.random()-.5)*80,'#9900FF',(Math.random()-.5)*.9,(Math.random()-.5)*.9,28,3,true,'circle'));
    }
    // DIVINE: holy sparkles orbiting player
    if(sk.ability==='divine'&&Math.random()<.4){
      const a=Math.random()*Math.PI*2;const r=20+Math.random()*14;
      particles.push(new Particle(cx+Math.cos(a)*r,cy+Math.sin(a)*r,'#ffffff',Math.cos(a)*1.2,Math.sin(a)*1.2,24,4,true,'star'));
    }
    // TIME SLOW: slow blue ripple ring from player
    if(sk.ability==='timeSlow'&&animTick%18===0)
      spawnRing(cx,cy,'#8888ff',8,30);
    // SHIELD: pulsing shield ring
    if(sk.ability==='shield'&&shieldActive&&animTick%12===0)
      spawnRing(cx,cy,'#aaeeff',6,22);
  }

  prevOnGround=player.onGround;
  player.onGround=false;
  const activePlats=[...platforms,...movingPlatforms];
  if(inSecretRoom&&currentSecretRoomData)activePlats.push(...currentSecretRoomData.platforms);
  let onMovingPlat=null;
  if(!ghostPortalMode){
    activePlats.forEach(p=>{
      if(!gravityFlipped&&player.velY>=0&&p.collidesWith({...player,velY:player.velY})){
        player.velY=0;player.y=p.y-player.height;player.onGround=true;player.jumpsLeft=maxJumps;
        if(p instanceof CrumblePlatform)p.touch();
        if(p instanceof MovingPlatform&&!p.vert)onMovingPlat=p;
      }
      if(gravityFlipped&&player.velY<=0){
        // Ceiling collision — player.y hits p.y+p.height from below
        const testTop=player.y+player.velY;
        if(player.x<p.x+p.width&&player.x+player.width>p.x&&testTop<=p.y+p.height&&player.y+player.height>=p.y){
          player.velY=0;player.y=p.y+p.height;player.onGround=true;player.jumpsLeft=maxJumps;
        }
      }
    });
  }
  if(onMovingPlat)player.x=Math.max(0,Math.min(WORLD_W-player.width,player.x+onMovingPlat.direction*onMovingPlat.spd*ts));
  // Update crumbling platforms; remove fully fallen ones
  for(let pi=platforms.length-1;pi>=0;pi--){const cp=platforms[pi];if(cp instanceof CrumblePlatform){cp.update();if(cp.alpha<=0)platforms.splice(pi,1);}}

  // ── Wall detection (side collision check against platforms) ─────────────
  onWallLeft=false;onWallRight=false;
  if(!player.onGround&&wallJumpCooldown<=0){
    const pBot=player.y+player.height,pTop=player.y;
    for(const p of activePlats){
      if(pBot<=p.y+4||pTop>=p.y+p.height-4)continue;
      // Right side of player against left face of platform
      if(player.x+player.width>=p.x-3&&player.x+player.width<=p.x+10&&player.velX>=0)onWallRight=true;
      // Left side of player against right face of platform
      if(player.x<=p.x+p.width+3&&player.x>=p.x+p.width-10&&player.velX<=0)onWallLeft=true;
    }
  }
  if(wallJumpCooldown>0)wallJumpCooldown--;
  // Wall slide — slowly drift down while hugging wall
  if((onWallLeft||onWallRight)&&player.velY>0){
    player.velY=Math.min(player.velY,1.8);
    if(animTick%4===0){
      const wx=onWallRight?player.x+player.width:player.x;
      particles.push(new Particle(wx,player.y+player.height*0.5+(Math.random()-.5)*10,'#aaeeff',(onWallRight?-1:1)*0.5+Math.random()-0.5,Math.random()*1.5,12,2.5,true,'spark'));
    }
  }

  // Crate collisions — solid from above, breaks from below
  for(let ci2=crates.length-1;ci2>=0;ci2--){
    const cr=crates[ci2];
    const hit=player.x+player.width>cr.x+4&&player.x<cr.x+cr.width-4&&player.y+player.height>=cr.y&&player.y<cr.y+cr.height;
    if(!hit)continue;
    // Standing on top
    if(player.velY>=0&&player.y+player.height<=cr.y+20){
      player.velY=0;player.y=cr.y-player.height;player.onGround=true;player.jumpsLeft=maxJumps;
    }
    // Headbutt from below
    else if(player.velY<0&&player.y>=cr.y+cr.height-12){
      player.velY=0;cr.hp--;cr._flash=15;playSFX('stomp');
      spawnBurst(cr.x+16,cr.y,player.color,8,4);
      if(cr.hp<=0){
        // Break the crate
        for(let di=0;di<cr.coins;di++){const dc=new Coin(cr.x+8+di*8,cr.y);dc.dropped=true;dc.dvx=(di-cr.coins/2)*2.5;dc.dvy=-6-Math.random()*3;coins.push(dc);}
        spawnBurst(cr.x+16,cr.y+16,'#cc8833',18,8);playSFX('coin');
        crates.splice(ci2,1);score+=puScoreMult?30:15;
        floatTexts.push({x:cr.x+16-camera.x,y:cr.y-camera.y,text:'SMASH!',color:'#cc8833',life:40,maxLife:40});
      }
    }
  }
  // Spring pad collisions
  springPads.forEach(sp=>{
    if(player.velY>=0&&sp.collidesWith({...player,velY:player.velY})){
      player.velY=-26*currentSkinJmp;player.y=sp.y-player.height;
      player.onGround=false;player.jumpsLeft=maxJumps;
      sp.trigger();playSFX('doublejump');
      player.squash=1.42;player.squashVel=-.16;
      spawnBurst(player.x+player.width/2,player.y+player.height,'#00FFAA',16,8);
      spawnRing(player.x+player.width/2,player.y+player.height,'#00FFAA',8,22);
    }
  });

  // Rising lava mode: track height score and gradually speed up lava
  if(gameMode==='risingLava'){
    const h=Math.max(0,Math.round((WORLD_H-player.y)/8));
    if(h>score)score=h;
    lavaSpeed=Math.min(lavaSpeed+.00015,3);
  }
  // Arena mode: check wave completion
  if(gameMode==='arena'&&gameState==='playing'){
    // Lock camera to arena
    camera.x=0;camera.y=ARENA_BASE_Y;
    // Count living enemies
    const livingCount=enemies.length+bossEnemies.length;
    if(!arenaIntermission&&livingCount===0&&arenaEnemiesLeft>0){
      // Wave cleared!
      arenaIntermission=true;arenaIntermTimer=0;
      const _waveMult=Math.floor(arenaWave/5)+1;
      const wavePts=(arenaWave*50+arenaKillsTotal*10)*getDiffScoreMult()*_waveMult;
      score+=wavePts;if(score>bestScores.arena){bestScores.arena=score;saveGame(true);}
      floatTexts.push({x:W/2,y:H/2,text:`WAVE ${arenaWave} CLEAR! +${Math.round(wavePts)}`,color:'#00ffcc',life:100,maxLife:100,size:14});
      // Drop a random powerup
      const dropTypes=['speedBoost','shield','extraJump','invincibility','coinMagnet','shieldBubble'];
      powerUps.push(new PowerUp(380+Math.random()*140,2920,dropTypes[Math.floor(Math.random()*dropTypes.length)]));
      playSFX('coin');
    }
    if(arenaIntermission){
      arenaIntermTimer++;
      if(arenaIntermTimer>=180){
        arenaWave++;
        spawnArenaWave();
        if(musicOn){initAudio();playLevelMusic(arenaWave%5);}
      }
    }
  }

  // Landing SFX + screen shake
  if(player.onGround&&!prevOnGround&&Math.abs(player.velY)>0.5){playSFX('land');screenShake=Math.min(6,Math.abs(player.velY)*.35);}

  player.squashVel+=(1-player.squash)*.38;player.squashVel*=.72;player.squash+=player.squashVel;
  player.squash=Math.max(.55,Math.min(1.45,player.squash));
  if(player.onGround&&player.velY===0&&Math.abs(player.squashVel)<.04&&player.squash>1.08){player.squash=.72;player.squashVel=.12;}

  const moving=player.velX!==0;
  if(player.onGround&&moving){player.walkTimer++;if(player.walkTimer%6===0)player.walkFrame=(player.walkFrame+1)%4;}else if(!moving){player.walkFrame=0;player.walkTimer=0;}
  if(!player.onGround&&sk.shape==='diamond')player.angle+=.07*player.facing;else player.angle*=.87;
  // Track player trail (only when moving fast enough)
  if(Math.abs(player.velX)>1.2||Math.abs(player.velY)>2){
    playerTrail.push({x:player.x+player.width/2,y:player.y+player.height/2,color:sk.color});
    if(playerTrail.length>10)playerTrail.shift();
  }else if(playerTrail.length>0)playerTrail.shift();

  // Speed ghost trail — dense when dashing/portaling, sparse otherwise
  const _spd2=Math.abs(player.velX)+Math.abs(player.velY);
  const _trailFreq=doubleTapDashing||speedPortalLeft>0?2:rageMode?3:_spd2>10?4:_spd2>5?7:12;
  if(_spd2>2.5&&animTick%_trailFreq===0){
    const _tc=speedPortalLeft>0?'#ffff00':doubleTapDashing?'#00ffee':rageMode?'#ff4400':sk.color;
    jumpGhosts.push({x:player.x,y:player.y,w:player.width,h:player.height,color:_tc,life:doubleTapDashing?20:14,maxLife:doubleTapDashing?20:14,filled:doubleTapDashing||speedPortalLeft>0||rageMode});
    if(jumpGhosts.length>18)jumpGhosts.shift();
  }
  for(let gi=jumpGhosts.length-1;gi>=0;gi--){jumpGhosts[gi].life--;if(jumpGhosts[gi].life<=0)jumpGhosts.splice(gi,1);}

  // Story checkpoint — auto-save when crossing halfway
  if(gameMode==='story'&&!checkpointActivated&&player.x>WORLD_W*0.5&&player.y<WORLD_H-200){
    checkpointPos={x:player.x,y:player.y};checkpointActivated=true;
    spawnBurst(player.x+player.width/2,player.y,'#44ff88',14,5);
    showNotif('✅ CHECKPOINT SAVED!','#44ff88');playSFX('save');
  }

  // Hazard checks
  const ghostMode=abilityActive&&sk.ability==='ghost';
  const toxicMode=abilityActive&&sk.ability==='toxic';
  if(!ghostMode&&!toxicMode&&invincible<=0&&gameState==='playing'){
    const hazards=[...spikes,...enemies,...killBricks];
    for(const h of hazards){
      if(h.collidesWith(player)){
        if(shieldActive){shieldActive=false;abilityActiveLeft=0;invincible=90;playSFX('shieldhit');spawnRing(player.x+player.width/2,player.y+player.height/2,'#aaeeff',12,20);showNotif('SHIELD ABSORBED!','#aaeeff');break;}
        if(shieldBubble>0){shieldBubble--;invincible=90;playSFX('shieldhit');spawnRing(player.x+player.width/2,player.y+player.height/2,'#88ff44',12,20);showNotif(`BUBBLE SHIELD! ${shieldBubble} left`,'#88ff44');break;}
        loseLife();return;
      }
    }
  }
  if(invincible>0){
    invincible--;
    // Star mode — kill enemies on touch while truly invincible (not just shield-hit grace)
    if(invincible>60&&gameState==='playing'){
      for(let ei=enemies.length-1;ei>=0;ei--){
        if(enemies[ei].collidesWith(player)){
          spawnBurst(enemies[ei].x+enemies[ei].width/2,enemies[ei].y+enemies[ei].height/2,sk.color,12,5);
          const dc=new Coin(enemies[ei].x+enemies[ei].width/2,enemies[ei].y);dc.dropped=true;dc.dvx=(Math.random()-.5)*3;dc.dvy=-3.5;coins.push(dc);
          const _iex=enemies[ei].x+enemies[ei].width/2,_iey=enemies[ei].y;
          score+=(puScoreMult?40:20);enemies.splice(ei,1);playSFX('coin');registerKill(_iex,_iey);
          if(Math.random()<0.08)heartDrops.push(new HeartDrop(_iex,_iey));
        }
      }
    }
  }

  // Stomp landing impact
  if(abilityActive&&sk.ability==='stomp'&&player.onGround&&!prevOnGround){
    const isOmega=sk.name==='OMEGA';
    const radius=isOmega?260:175;
    const impactX=player.x+player.width/2,impactY=player.y+player.height;
    // Damage enemies in radius
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];const dx=Math.abs(impactX-e.x-e.width/2);const dy=Math.abs(impactY-e.y);
      if(dx<radius&&dy<80){
        if(isOmega){
          spawnBurst(e.x+e.width/2,e.y+e.height/2,sk.color,14,7);
          for(let ci=0;ci<3;ci++){const dc=new Coin(e.x+e.width/2+(ci-1)*9,e.y+6);dc.dropped=true;dc.dvx=(ci-1)*1.8+(Math.random()-.5)*2;dc.dvy=-4.5-Math.random()*2;coins.push(dc);}
          enemies.splice(ei,1);score+=puScoreMult?100:50;
        }else{e.poisoned=true;e.poisonTimer=0;e.flashTimer=20;}
      }
    }
    // Shockwaves — OMEGA gets triple shockwave + coin bounce
    spawnShockwave(impactX,impactY,sk.color);
    spawnBurst(impactX,impactY,sk.color,isOmega?28:14,isOmega?10:6);
    if(isOmega){
      spawnShockwave(impactX,impactY,lighten(sk.color,30));
      spawnShockwave(impactX,impactY,'#ffff00');
      coins.forEach(c=>{if(!c.collected){const dx=impactX-c.x;c.x-=dx/Math.abs(dx||1)*3;}});
      camera.y+=6; // screen shake feel
      showNotif('💥 OMEGA SLAM!',sk.color);
    }
    playSFX('stomp');
  }

  // Jump
  if((keys['arrowup']||keys['w'])&&!(prevUp||prevW)){
    if(player.jumpsLeft>0){
      const effectiveJp=jp*(timeSlowActive?.82:1);
      player.velY=gravityFlipped?effectiveJp:-effectiveJp;player.jumpsLeft--;player.squash=1.42;player.squashVel=-.14;
      playSFX(player.jumpsLeft<2?'doublejump':'jump');
      for(let i=0;i<10;i++)particles.push(new Particle(player.x+player.width/2+(Math.random()-.5)*14,player.y+player.height,sk.trail[0],(Math.random()-.5)*3.5,Math.random()*2.5+1,20,3,true,'circle'));
    }else if(onWallLeft||onWallRight){
      // Wall jump!
      const wdir=onWallLeft?1:-1;
      player.velY=-jp*.9;player.velX=wdir*spd*1.5;player.squash=1.38;player.squashVel=-.14;
      wallJumpCooldown=18;onWallLeft=false;onWallRight=false;
      playSFX('doublejump');
      spawnBurst(player.x+player.width/2,player.y+player.height/2,'#aaeeff',14,7);
      spawnRing(player.x+player.width/2,player.y+player.height/2,'#aaeeff',8,18);
      showNotif('WALL JUMP!','#aaeeff');
    }
  }
  prevUp=keys['arrowup'];prevW=keys['w'];

  trailTmr++;if(trailTmr%2===0&&(Math.abs(player.velX)>0.5||Math.abs(player.velY)>0.5))spawnTrail();
  for(let i=particles.length-1;i>=0;i--){particles[i].update();if(particles[i].life<=0)particles.splice(i,1);}const _pMax=(window.PLATFORM_CFG&&window.PLATFORM_CFG.particleMax)||480;if(particles.length>_pMax)particles.splice(0,particles.length-_pMax);

  const activeCoinList=[...coins];if(inSecretRoom&&currentSecretRoomData)activeCoinList.push(...currentSecretRoomData.coins);
  activeCoinList.forEach(c=>{
    c.update();
    if(!c.collected&&c.collidesWith(player)){
      c.collected=true;let val=c.secret?3:(luckyCoins?2:1);if(c.dropped)val=Math.max(val,2);if(endlessEvent==='coinFrenzy')val=Math.round(val*3);if(endlessEvent==='goldRush')val=Math.round(val*5);if(scorePortalLeft>0)val=Math.round(val*5);totalCoins+=val;coinFlash=35;saveGame(true);
      playSFX(c.secret?'secretcoin':'coin');
      spawnBurst(c.x,c.y,c.secret?'#ff88ff':'#FFD700',12,5);
      if(c.secret)showNotif('💎 SECRET COIN x3','#ff88ff');
      if(!c.secret){
        coinComboTimer=90;coinComboCount++;
        if(coinComboCount>=3){
          const bonus=coinComboCount-2;totalCoins+=bonus;
          floatTexts.push({x:c.x-camera.x,y:c.y-camera.y-20,text:`STREAK ×${coinComboCount}! +${bonus}`,color:'#FFD700',life:65,maxLife:65});
        }else if(coinComboCount===2){
          floatTexts.push({x:c.x-camera.x,y:c.y-camera.y-20,text:'COMBO!',color:'#ffee55',life:55,maxLife:55});
        }
      }
    }
  });

  // PowerUp collection
  const puColors={speedBoost:'#00ffff',shield:'#4488ff',extraJump:'#44ff88',invincibility:'#ffdd00',coinMagnet:'#FFD700',scoreMult:'#FF88FF',freeze:'#88eeff',coinShower:'#FFDD44',nuke:'#FF4422'};
  for(let pi=powerUps.length-1;pi>=0;pi--){
    const pu=powerUps[pi];
    if(!pu.collected&&pu.collidesWith(player)){
      pu.collected=true;
      spawnBurst(pu.x+14,pu.y+14,puColors[pu.type]||'#ffffff',14,6);
      playSFX('coin');
      switch(pu.type){
        case 'speedBoost':puSpeedActive=true;puSpeedLeft=300;showNotif('SPEED BOOST!','#00ffff');break;
        case 'shield':shieldActive=true;showNotif('SHIELD ACTIVE!','#4488ff');break;
        case 'extraJump':maxJumps++;player.jumpsLeft=Math.min(player.jumpsLeft+1,maxJumps);showNotif('+1 JUMP!','#44ff88');break;
        case 'invincibility':invincible=300;showNotif('INVINCIBLE!','#ffdd00');break;
        case 'coinMagnet':puMagnetActive=true;puMagnetLeft=600;showNotif('COIN MAGNET! 10s','#FFD700');break;
        case 'scoreMult':puScoreMult=true;puScoreMultLeft=600;showNotif('SCORE ×2! 10s','#FF88FF');break;
        case 'freeze':
          enemyFrozen=true;enemyFrozenLeft=480;enemies.forEach(e=>{e.frozen=true;e.flashTimer=480;});
          spawnBurst(player.x+player.width/2,player.y+player.height/2,'#88eeff',24,8);
          screenShake=6;showNotif('❄ FREEZE! 8s','#88eeff');playSFX('shieldhit');break;
        case 'coinShower':
          for(let ci=0;ci<18;ci++){const cx2=camera.x+60+Math.random()*(W-120),cy2=camera.y-20;const dc=new Coin(cx2,cy2);dc.dropped=true;dc.dvx=(Math.random()-.5)*3;dc.dvy=1+Math.random()*3;coins.push(dc);}
          showNotif('💰 COIN SHOWER!','#FFDD44');screenShake=4;break;
        case 'nuke':
          const _nukex=player.x+player.width/2,_nukey=player.y+player.height/2;
          spawnBurst(_nukex,_nukey,'#FF4422',40,14);spawnBurst(_nukex,_nukey,'#FFAA00',24,10);
          spawnShockwave(_nukex,_nukey,'#FF4422');spawnShockwave(_nukex,_nukey,'#ffff00');
          screenShake=18;
          for(let ei=enemies.length-1;ei>=0;ei--){
            const e=enemies[ei];const dx=Math.abs(_nukex-e.x-e.width/2),dy=Math.abs(_nukey-e.y);
            if(dx<420&&dy<300){
              spawnBurst(e.x+e.width/2,e.y+e.height/2,'#FF6622',12,6);
              for(let ci=0;ci<2;ci++){const dc=new Coin(e.x+e.width/2+(ci-1)*10,e.y);dc.dropped=true;dc.dvx=(Math.random()-.5)*4;dc.dvy=-5-Math.random()*3;coins.push(dc);}
              enemies.splice(ei,1);score+=(puScoreMult?40:20);killStreak++;killStreakTimer=120;totalKills++;
            }
          }
          showNotif('NUKE! ALL CLEAR!','#FF4422');break;
        case 'shieldBubble':
          shieldBubble=Math.min(shieldBubble+3,6);
          spawnRing(player.x+player.width/2,player.y+player.height/2,'#88ff44',12,22);
          showNotif(`BUBBLE SHIELD x${shieldBubble}!`,'#88ff44');break;
      }
    }
  }

  // TP Pad teleport
  for(const tp of tpPads){
    if(tp.landCollide(player)){
      spawnBurst(player.x+14,player.y+14,'#cc44ff',18,8);
      spawnRing(player.x+14,player.y+14,'#cc44ff',12,18);
      playSFX('teleport');
      player.x=Math.min(WORLD_W-player.width-80,player.x+400);
      player.y=Math.max(200,player.y-240);
      player.velY=-3;player.velX=player.facing*3;invincible=25;
      spawnBurst(player.x+14,player.y+14,'#cc44ff',16,7);
      showNotif('TELEPORTED!','#cc44ff');
      // remove so can't retrigger
      tpPads.splice(tpPads.indexOf(tp),1);break;
    }
  }
  // Portal collisions
  for(let pi=portals.length-1;pi>=0;pi--){
    const p=portals[pi];
    if(!p.collected&&p.collidesWith(player)){
      p.collected=true;
      const cx=player.x+player.width/2,cy=player.y+player.height/2;
      spawnBurst(cx,cy,p.color,18,8);spawnRing(cx,cy,p.color,12,26);playSFX('teleport');
      switch(p.type){
        case 'gravity':
          gravityFlipped=!gravityFlipped;gravityFlipLeft=gravityFlipped?300:0;
          player.velY*=-0.5;
          showNotif(gravityFlipped?'↕ GRAVITY FLIPPED!':'↕ GRAVITY RESTORED!',p.color);break;
        case 'mirror':
          mirrorWorld=true;mirrorWorldLeft=240;
          showNotif('↔ WORLD MIRRORED!',p.color);break;
        case 'shrink':
          playerShrunk=true;playerShrunkLeft=480;
          player.width=14;player.height=14;
          showNotif('↓↑ SHRUNK! 8s',p.color);break;
        case 'ghost':
          ghostPortalMode=true;ghostPortalModeLeft=240;
          showNotif('◌ PHASE MODE! 4s',p.color);break;
        case 'speed':
          speedPortalLeft=180;
          player.velX=player.facing*spd*3;
          showNotif('»» SPEED BOOST! 3s',p.color);break;
        case 'score':
          scorePortalLeft=480;
          showNotif('★ 5× SCORE! 8s',p.color);break;
        case 'rage':
          rageMode=true;rageModeLeft=480;invincible=480;
          showNotif('💥 RAGE PORTAL! 8s',p.color);
          for(let ei=enemies.length-1;ei>=0;ei--){
            const ex=enemies[ei].x+enemies[ei].width/2,ey=enemies[ei].y;
            spawnBurst(ex,ey,p.color,10,5);enemies.splice(ei,1);registerKill(ex,ey);
          }break;
        case 'coinStorm':
          for(let ci=0;ci<25;ci++){const dc=new Coin(cx+(Math.random()-.5)*200,cy+(Math.random()-.5)*120);dc.dropped=true;dc.dvx=(Math.random()-.5)*5;dc.dvy=-6-Math.random()*4;coins.push(dc);}
          showNotif('$ COIN STORM!',p.color);break;
        case 'bounce':
          player.velY=-28*currentSkinJmp;player.jumpsLeft=maxJumps;
          player.squash=1.5;player.squashVel=-.18;screenShake=8;
          spawnBurst(cx,cy+player.height/2,p.color,22,10);
          showNotif('↑↑ MEGA BOUNCE!',p.color);break;
      }
      portals.splice(pi,1);
    }
  }
  // Warp gate collision
  for(let wi=0;wi<warpGates.length;wi++){
    const gate=warpGates[wi];
    if(!gate.collected&&gate.collidesWith(player)){
      const twin=warpGates.find((g,gi)=>gi!==wi&&g.pairId===gate.pairId&&!g.collected);
      if(twin){
        gate.collected=true;
        spawnBurst(player.x+player.width/2,player.y+player.height/2,gate.color,16,8);
        player.x=twin.x+twin.width/2-player.width/2;player.y=twin.y;
        player.velY=Math.min(player.velY,-2);player.velX*=.6;
        invincible=30;
        spawnBurst(twin.x+twin.width/2,twin.y+twin.height/2,twin.color,18,9);
        spawnRing(twin.x+twin.width/2,twin.y+twin.height/2,twin.color,14,30);
        playSFX('teleport');showNotif('⊕ WARP!',gate.color);
        camera.x=Math.max(0,Math.min(player.x-W/2+player.width/2,WORLD_W-W));
        camera.y=Math.max(0,Math.min(player.y-H/2,WORLD_H-H));
      }
      break;
    }
  }

  // ── BULLETS (enemy projectiles + meteors) ──────────────
  for(let bi=bullets.length-1;bi>=0;bi--){
    const b=bullets[bi];b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0||b.x<camera.x-200||b.x>camera.x+W+200||b.y>camera.y+H+200){bullets.splice(bi,1);continue;}
    if(!ghostPortalMode&&invincible<=0&&b.x>player.x&&b.x<player.x+player.width&&b.y>player.y&&b.y<player.y+player.height){
      bullets.splice(bi,1);
      if(shieldBubble>0){shieldBubble--;spawnRing(player.x+player.width/2,player.y+player.height/2,'#88ff44',8,18);playSFX('shieldhit');showNotif(`BUBBLE SHIELDS! ${shieldBubble} left`,'#88ff44');}
      else if(shieldActive){shieldActive=false;abilityActiveLeft=0;invincible=90;playSFX('shieldhit');spawnRing(player.x+player.width/2,player.y+player.height/2,'#aaeeff',12,20);showNotif('SHIELD ABSORBED!','#aaeeff');}
      else{loseLife();return;}
    }
  }
  // ── THROW STARS ─────────────────────────────────────────
  for(let ti=throwStarPr.length-1;ti>=0;ti--){
    const s=throwStarPr[ti];s.x+=s.vx;s.y+=s.vy;s.vy+=0.15;s.life--;s.angle=(s.angle||0)+0.3;
    if(s.life<=0||s.x<0||s.x>WORLD_W||s.y>WORLD_H){throwStarPr.splice(ti,1);continue;}
    let hit=false;
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];
      if(s.x>e.x&&s.x<e.x+e.width&&s.y>e.y&&s.y<e.y+e.height){
        spawnBurst(e.x+16,e.y,'#FFD700',12,6);const _ex=e.x+16,_ey=e.y;
        enemies.splice(ei,1);score+=(puScoreMult?40:20);registerKill(_ex,_ey);playSFX('stomp');hit=true;break;
      }
    }
    for(let bi2=bossEnemies.length-1;!hit&&bi2>=0;bi2--){
      const boss=bossEnemies[bi2];
      if(s.x>boss.x&&s.x<boss.x+boss.width&&s.y>boss.y&&s.y<boss.y+boss.height){
        boss.hp--;boss.flashTimer=20;playSFX('bosshit');screenShake=5;
        spawnBurst(boss.x+28,boss.y,'#ff4400',14,7);hit=true;
        if(boss.hp<=0){spawnBurst(boss.x+28,boss.y,'#ff4400',30,12);spawnRing(boss.x+28,boss.y+28,'#FFD700',14,40);score+=(puScoreMult?500:250);registerKill(boss.x+28,boss.y);bossEnemies.splice(bi2,1);showNotif('BOSS DEFEATED!','#FFD700');playSFX('levelup');}
        break;
      }
    }
    if(hit)throwStarPr.splice(ti,1);
  }
  // ── BOSS ENEMIES ────────────────────────────────────────
  for(let bi=bossEnemies.length-1;bi>=0;bi--){
    const boss=bossEnemies[bi];boss._t++;
    boss.x+=boss.spd*boss.dir;
    if(boss.x<boss.minX||boss.x+boss.width>boss.maxX)boss.dir*=-1;
    if(boss.flashTimer>0)boss.flashTimer--;
    // Stomped from above
    if(player.velY>0&&player.x+player.width>boss.x+8&&player.x<boss.x+boss.width-8&&player.y+player.height>=boss.y&&player.y+player.height<=boss.y+22&&invincible<=0){
      boss.hp--;boss.flashTimer=20;playSFX('bosshit');screenShake=7;player.velY=-10;
      spawnBurst(boss.x+28,boss.y,'#ff4400',16,8);
      if(boss.hp<=0){spawnBurst(boss.x+28,boss.y,'#FFD700',30,12);spawnRing(boss.x+28,boss.y+28,'#FFD700',14,40);score+=(puScoreMult?500:250);registerKill(boss.x+28,boss.y);bossEnemies.splice(bi,1);showNotif('BOSS DEFEATED! +500','#FFD700');playSFX('levelup');}
      continue;
    }
    // Boss damages player on side/below contact
    if(!ghostPortalMode&&invincible<=0&&player.x+player.width>boss.x+4&&player.x<boss.x+boss.width-4&&player.y+player.height>boss.y+8&&player.y<boss.y+boss.height){
      if(shieldBubble>0){shieldBubble--;invincible=60;spawnRing(player.x+player.width/2,player.y+player.height/2,'#88ff44',8,18);playSFX('shieldhit');showNotif(`BUBBLE SHIELDS! ${shieldBubble} left`,'#88ff44');}
      else if(shieldActive){shieldActive=false;abilityActiveLeft=0;invincible=90;playSFX('shieldhit');spawnRing(player.x+player.width/2,player.y+player.height/2,'#aaeeff',12,20);showNotif('SHIELD ABSORBED!','#aaeeff');}
      else{loseLife();return;}
    }
    // Boss fires bullet at player every 90 frames
    if(boss._t%90===0){
      const bcx=boss.x+28,bcy=boss.y+28;const pcx=player.x+player.width/2,pcy=player.y+player.height/2;
      const d=Math.sqrt((pcx-bcx)**2+(pcy-bcy)**2)||1;
      bullets.push({x:bcx,y:bcy,vx:(pcx-bcx)/d*4.5,vy:(pcy-bcy)/d*4.5,life:90,color:'#ff4400',r:5});
      playSFX('laser');
    }
  }
  // ── LASER BEAMS ─────────────────────────────────────────
  for(const lb of laserBeams){
    lb._t++;const nowOn=Math.floor(lb._t/lb.interval)%2===0;lb.on=nowOn;
    if(nowOn&&invincible<=0&&!ghostPortalMode){
      const bx1=Math.min(lb.x1,lb.x2)-4,bx2=Math.max(lb.x1,lb.x2)+4;
      const by1=Math.min(lb.y1,lb.y2)-4,by2=Math.max(lb.y1,lb.y2)+4;
      if(player.x<bx2&&player.x+player.width>bx1&&player.y<by2&&player.y+player.height>by1){
        if(shieldBubble>0){shieldBubble--;invincible=60;playSFX('shieldhit');spawnRing(player.x+player.width/2,player.y+player.height/2,'#88ff44',8,18);}
        else if(shieldActive){shieldActive=false;abilityActiveLeft=0;invincible=90;playSFX('shieldhit');}
        else{loseLife();return;}
      }
    }
  }
  // ── HEART DROPS ─────────────────────────────────────────
  for(let hi=heartDrops.length-1;hi>=0;hi--){
    const h=heartDrops[hi];h.y+=h.vy;h.vy=Math.min(h.vy+0.3,5);h.life--;
    if(h.life<=0){heartDrops.splice(hi,1);continue;}
    if(h.x>player.x&&h.x<player.x+player.width&&h.y>player.y&&h.y<player.y+player.height){
      if(lives<getDiffLives()){lives++;heartFlash=35;playSFX('heartget');showNotif('HEART! +1 LIFE','#ff6688');spawnBurst(h.x,h.y,'#ff6688',14,6);}
      else{score+=100;floatTexts.push({x:h.x-camera.x,y:h.y-camera.y-20,text:'+100',color:'#ff6688',life:55,maxLife:55});}
      heartDrops.splice(hi,1);
    }
  }
  // ── SPIKE RAIN player collision ──────────────────────────
  if(spikeRainDrops.length>0&&invincible<=0&&!ghostPortalMode){
    for(let si=spikeRainDrops.length-1;si>=0;si--){
      const d=spikeRainDrops[si];
      if(d.x>player.x&&d.x<player.x+player.width&&d.y>player.y&&d.y<player.y+player.height){
        if(shieldBubble>0){shieldBubble--;invincible=60;spikeRainDrops.splice(si,1);playSFX('shieldhit');}
        else{loseLife();return;}
      }
    }
  }
  // ── KILL STREAK FIRE AURA (streak >= 5) ─────────────────
  if(killStreak>=5&&gameState==='playing'&&animTick%50===0){
    const pcx=player.x+player.width/2,pcy=player.y+player.height/2;
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];const ex=e.x+16,ey=e.y+14;
      if(Math.sqrt((pcx-ex)**2+(pcy-ey)**2)<90){
        spawnBurst(ex,ey,'#FF4400',10,5);const _ex=ex,_ey=ey;
        enemies.splice(ei,1);score+=(puScoreMult?15:8);registerKill(_ex,_ey);playSFX('stomp');
      }
    }
  }

  // Sticky Pad detection — hold DOWN/S to fall through
  if(stickyDropTimer>0)stickyDropTimer--;
  onSticky=false;
  for(const sp of stickyPads){
    if(sp.landCollide(player)){
      if(stickyDropTimer>0)break; // falling through, skip
      if(keys['arrowdown']||keys['s']){
        // Release from sticky and drop
        stickyDropTimer=28;player.velY=3.5;break;
      }
      onSticky=true;
      player.velY=0;player.y=sp.y-player.height;break;
    }
  }

  if(!inSecretRoom){
    for(const sd of secretDoors){
      if(sd.collidesWith(player)){
        const roomData=secretRoomsMap.get(sd);if(!roomData)continue;
        inSecretRoom=true;currentSecretRoom=sd;currentSecretRoomData=roomData;sd.discovered=true;
        playSFX('secret');showNotif('SECRET ROOM','#ff88ff');
        player.x=roomData.platforms[0].x+20;player.y=roomData.platforms[0].y-35;player.velY=0;player.velX=0;break;
      }
    }
  }
  if(inSecretRoom&&currentSecretRoomData){
    if(player.y>currentSecretRoomData.exitY){
      inSecretRoom=false;
      if(currentSecretRoom){player.x=currentSecretRoom.x+25;player.y=currentSecretRoom.y-35;}
      player.velY=-4;currentSecretRoomData=null;currentSecretRoom=null;showNotif('EXIT SECRET ROOM','#aaddff');
    }
  }

  if(goal&&goal.collidesWith(player)&&!gameWon){
    spawnBurst(goal.x+18,goal.y+18,'#FFD700',35,10);spawnBurst(goal.x+18,goal.y+18,'#FF6BFF',25,8);
    // Coin shower across the screen
    for(let ci=0;ci<28;ci++){
      const cx=camera.x+Math.random()*W,cy=camera.y-10;
      const col=['#FFD700','#FFEE44','#FFF080','#FF6B6B','#FF9BFF'][Math.floor(Math.random()*5)];
      particles.push(new Particle(cx,cy,col,(Math.random()-.5)*4,2+Math.random()*5,55+Math.random()*35,4+Math.random()*4,true,'circle'));
    }
    playSFX('levelup');levelCompleteFlash=35;
    // Calculate level rank
    {const t=levelTimer,d=diedThisLevel?1:0;let rp=4;if(t<900)rp=Math.min(rp,4);else if(t<1800)rp=Math.min(rp,3);else if(t<2700)rp=Math.min(rp,2);else rp=Math.min(rp,1);if(d)rp=Math.max(0,rp-1);levelRank=['D','C','B','A','S'][Math.max(0,Math.min(4,rp))];playSFX('rankup');floatTexts.push({x:W/2,y:H/2-50,text:`RANK ${levelRank}`,color:levelRank==='S'?'#FFD700':levelRank==='A'?'#00FF88':levelRank==='B'?'#00CCFF':levelRank==='C'?'#FF8800':'#FF4444',life:120,maxLife:120});}
    // Speedrun achievement
    if(levelTimer<1800&&gameMode==='story')checkAchievement('SPEED RUNNER','Complete a level in under 30s');
    if(gameMode==='story'){
      const _spts=Math.round((150+(currentLevel*100))*getDiffScoreMult()*(puScoreMult?2:1));score+=_spts;
      floatTexts.push({x:W/2,y:H/2,text:(puScoreMult?'×2 ':'+')+_spts,color:puScoreMult?'#FF88FF':'#FFD700',life:80,maxLife:80});
      if(!completedLevels.includes(currentLevel))completedLevels.push(currentLevel);
      if(score>bestScores.story){bestScores.story=score;}
      saveGame(true);
      if(currentLevel<LEVEL_DATA.length-1)loadLevel(currentLevel+1);
      else{gameWon=true;stopMusic();}
    }else if(gameMode==='risingLava'){risingLavaWave++;score+=Math.round(risingLavaWave*200*getDiffScoreMult());if(score>bestScores.risingLava){bestScores.risingLava=score;saveGame(true);}showNotif(`🌋 WAVE ${risingLavaWave} — FASTER!`,'#FF4500');generateRisingLavaLevel();}
    else if(gameMode==='editor'){showNotif('★ GOAL REACHED  —  ESC to return to editor','#FFD700');}
    else{
      if(!diedThisLevel){
        deathlessStreak++;
        if(deathlessStreak>1){const bonus=deathlessStreak*2;totalCoins+=bonus;showNotif(`✨ FLAWLESS ×${deathlessStreak}  +${bonus} COINS!`,'#ffdd44');}
      }else{deathlessStreak=0;}
      diedThisLevel=false;level++;const pts=Math.round((100+(level-1)*55)*getDiffScoreMult()*(puScoreMult?2:1));score+=pts;
      floatTexts.push({x:W-180,y:55,text:(puScoreMult?'×2 ':'+')+pts,color:puScoreMult?'#FF88FF':'#00ffcc',life:70,maxLife:70});
      if(score>bestScores.endless){bestScores.endless=score;saveGame(true);}
      generateEndlessLevel(level);
    }
  }

  if(player.y>WORLD_H+50&&gameState==='playing'){loseLife();if(lives<=0)return;}
  updateLava();
  // Drift ambient particles
  levelAmbient.forEach(a=>{
    a.x+=a.vx;a.y+=a.vy;a.phase+=0.04;
    if(a.x<0)a.x+=WORLD_W;else if(a.x>WORLD_W)a.x-=WORLD_W;
    if(a.y<0)a.y+=WORLD_H;else if(a.y>WORLD_H)a.y-=WORLD_H;
  });
  updateCamera();
  updateAbilityBar();
}

function updateAbilityBar(){
  const sk=SKINS[selectedSkin];
  const pct=abilityCooldownLeft>0?1-abilityCooldownLeft/sk.abilityCooldown:1;
  const activePct=abilityActiveLeft>0?abilityActiveLeft/sk.abilityDuration:0;
  const bar=document.getElementById('abilityBar');const ready=pct>=1;
  bar.innerHTML=`<div style="background:rgba(0,5,20,.92);border:1px solid ${sk.color}${ready?'88':'33'};border-radius:6px;padding:5px 12px;display:flex;align-items:center;gap:8px;backdrop-filter:blur(4px);box-shadow:${ready?`0 0 12px ${sk.color}22`:''};transition:all .3s;">
    <span style="color:${ready?sk.color:'#446677'};font-size:8px;font-family:Orbitron;text-shadow:0 0 ${ready?10:0}px ${sk.color};letter-spacing:1.5px;transition:all .3s;">[Z] ${sk.abilityName}</span>
    <div style="width:82px;height:5px;background:#111;border-radius:3px;overflow:hidden;border:1px solid ${sk.color}33">
      <div style="width:${pct*100}%;height:100%;background:${ready?sk.color:'#224444'};box-shadow:${ready?`0 0 8px ${sk.color}`:''};border-radius:3px;transition:background .3s;"></div>
    </div>
    ${activePct>0?`<div style="width:${activePct*44}px;height:5px;background:rgba(255,255,255,.75);border-radius:3px;box-shadow:0 0 6px rgba(255,255,255,.5);"></div>`:''}
    ${shieldActive?`<span style="color:#aaeeff;font-size:9px;text-shadow:0 0 8px #aaeeff;">🛡</span>`:''}
    ${timeSlowActive?`<span style="color:#8888ff;font-size:9px;text-shadow:0 0 8px #8888ff;">⏱</span>`:''}
  </div>`;
}

function registerKill(x,y){
  killStreak++;killStreakTimer=120;totalKills++;
  if(gameMode==='arena')arenaKillsTotal++;
  if(killStreak>killStreakBest)killStreakBest=killStreak;
  if(killStreak>=2){
    const bonus=killStreak*5*(puScoreMult?2:1);
    score+=bonus;
    const col=killStreak>=5?'#FF00FF':killStreak>=3?'#FF8800':'#FFD700';
    floatTexts.push({x:x,y:y-20,text:(killStreak>=5?'💀 ':'⚡ ')+'COMBO ×'+killStreak+' +'+bonus,color:col,life:90,maxLife:90});
    screenShake=Math.min(screenShake+3,10);
    if(killStreak===5){checkAchievement('COMBO MASTER','Kill 5 enemies in a row');}
  }
  if(totalKills===1)checkAchievement('FIRST BLOOD','Kill your first enemy');
}
function checkAchievement(name,desc){
  if(achievementsUnlocked.has(name))return;
  achievementsUnlocked.add(name);
  floatTexts.push({x:W/2,y:H/2+60,text:'🏆 ACHIEVEMENT: '+name,color:'#FFD700',life:180,maxLife:180});
  playSFX('levelup');
}

function spawnDeathBurst(){
  spawnBurst(player.x+player.width/2,player.y+player.height/2,player.color,30,10);
  spawnBurst(player.x+player.width/2,player.y+player.height/2,'#ffffff',12,6);
  spawnShockwave(player.x+player.width/2,player.y+player.height/2,player.color);
}
function loseLife(){
  if(invincible>0||gameState!=='playing')return;
  spawnDeathBurst();lives--;heartFlash=90;diedThisLevel=true;deathCount++;
  const _isCat=SKINS[selectedSkin]?.shape==='cat';
  if(lives<=0){
    lives=0;playSFX(_isCat?'catdeath':'death');screenShake=12;
    const mk=gameMode==='risingLava'?'risingLava':gameMode;
    if(score>bestScores[mk]){bestScores[mk]=score;saveGame(true);}
    if(gameMode==='endless'&&difficulty!=='hardcore'){
      // Restart from level 1 instead of game over
      lives=getDiffLives();level=1;score=0;deathlessStreak=0;diedThisLevel=false;
      generateEndlessLevel(1); // resets lava, player pos, music
      showNotif('💀 BACK TO LEVEL 1','#ff4466');
    }else{
      stopMusic();gameState='gameover';playGameOverJingle();
    }
  }
  else{
    rageMode=true;rageModeLeft=210;
    playSFX(_isCat?'meow':'hurt');showNotif('😡 RAGE MODE! '+(lives===2?'2 HEARTS LEFT':'LAST HEART!'),'#ff6600');
    invincible=120;
    if(gameMode==='risingLava'){player.x=W/2-14;player.y=2700;}
    else if(gameMode==='arena'){player.x=436;player.y=2930;}
    else if(gameMode==='story'&&checkpointPos){player.x=checkpointPos.x;player.y=checkpointPos.y;showNotif('⬛ RESPAWNED AT CHECKPOINT','#44ff88');}
    else{player.x=120;player.y=gameMode==='story'?2720:2700;}
    player.velX=0;player.velY=0;player.jumpsLeft=maxJumps;player.angle=0;player.squash=1;player.squashVel=0;
    if(inSecretRoom){inSecretRoom=false;currentSecretRoom=null;currentSecretRoomData=null;}
    abilityCooldownLeft=0;abilityActiveLeft=0;abilityActive=false;shieldActive=false;
  }
}

// ══════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════
function draw(){
  const bgIdx=(gameState==='playing'||gameState==='gameover'||gameState==='paused')?(LEVEL_DATA[currentLevel]?.bgIdx??0):0;
  drawBG(bgIdx);
  if(gameState==='home'){drawHome();return;}
  if(gameState==='settings'){drawSettings();return;}
  if(gameState==='changelog'){drawChangelog();return;}
  if(gameState==='storyMap'){drawStoryMap();return;}
  if(gameState==='shop'){drawShop();return;}
  if(gameState==='cats'){drawCats();return;}
  if(gameState==='catShop'){drawCatShop();return;}
  if(gameState==='levelSelect'){drawLevelSelect();return;}
  if(gameState==='editorPw'){drawEditorPw();return;}
  if(gameState==='editor'){drawEditor();return;}

  // Screen shake
  const shakeDX=screenShake>0?(Math.random()-.5)*screenShake*4:0;
  const shakeDY=screenShake>0?(Math.random()-.5)*screenShake*3:0;
  if(screenShake>0)screenShake=Math.max(0,screenShake-.7);
  const _portalFlip=(mirrorWorld||gravityFlipped)&&gameState==='playing';
  if(_portalFlip){ctx.save();if(mirrorWorld&&gravityFlipped){ctx.translate(W,H);ctx.scale(-1,-1);}else if(mirrorWorld){ctx.translate(W,0);ctx.scale(-1,1);}else{ctx.translate(0,H);ctx.scale(1,-1);}}
  ctx.save();ctx.translate(-camera.x+shakeDX,-camera.y+shakeDY);

  if(inSecretRoom&&currentSecretRoomData){
    const rd=currentSecretRoomData;
    const srx=rd.platforms[0].x-35,sry=rd.platforms[0].y-230;
    // Enhanced secret room bg
    const roomGrad=ctx.createLinearGradient(srx,sry,srx+480,sry+320);
    roomGrad.addColorStop(0,'rgba(30,0,50,.97)');roomGrad.addColorStop(1,'rgba(15,0,30,.97)');
    ctx.fillStyle=roomGrad;ctx.beginPath();ctx.roundRect(srx,sry,480,320,8);ctx.fill();
    ctx.strokeStyle='rgba(255,60,255,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(srx,sry,480,320,8);ctx.stroke();
    // Inner glow
    const ig=ctx.createRadialGradient(srx+240,sry+160,0,srx+240,sry+160,200);
    ig.addColorStop(0,'rgba(180,0,255,.08)');ig.addColorStop(1,'transparent');
    ctx.fillStyle=ig;ctx.fillRect(srx,sry,480,320);
    // Grid
    ctx.save();ctx.globalAlpha=.06;ctx.strokeStyle='#ff44ff';ctx.lineWidth=.5;
    for(let gx=srx;gx<srx+480;gx+=16){ctx.beginPath();ctx.moveTo(gx,sry);ctx.lineTo(gx,sry+320);ctx.stroke();}
    for(let gy=sry;gy<sry+320;gy+=16){ctx.beginPath();ctx.moveTo(srx,gy);ctx.lineTo(srx+480,gy);ctx.stroke();}
    ctx.restore();
    rd.platforms.forEach(p=>p.draw());rd.coins.forEach(c=>c.draw());
    ctx.save();ctx.fillStyle='rgba(255,120,255,.65)';ctx.font='bold 13px Orbitron';ctx.textAlign='center';ctx.shadowColor='#ff44ff';ctx.shadowBlur=18;ctx.fillText('✦ SECRET ROOM ✦',srx+240,sry+18);
    ctx.fillStyle='rgba(200,150,255,.55)';ctx.font='8px Orbitron';ctx.shadowBlur=5;ctx.fillText('▼ FALL TO EXIT ▼',srx+240,sry+303);ctx.restore();
  }

  // Ambient level particles — behind all platforms
  levelAmbient.forEach(a=>{
    if(a.x<camera.x-24||a.x>camera.x+W+24||a.y<camera.y-24||a.y>camera.y+H+24)return;
    ctx.save();ctx.globalAlpha=0.2+Math.sin(a.phase)*.14;
    ctx.shadowColor=a.glow;ctx.shadowBlur=9;
    ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });

  // Checkpoint flag (story mode)
  if(gameMode==='story'&&checkpointActivated&&checkpointPos){
    const fx=checkpointPos.x,fy=checkpointPos.y-32;
    if(fx>camera.x-24&&fx<camera.x+W+24){
      ctx.save();ctx.shadowColor='#44ff88';ctx.shadowBlur=14+Math.sin(animTick*.1)*5;
      ctx.fillStyle='#44ff88';ctx.fillRect(fx,fy-28,3,32);
      ctx.beginPath();ctx.moveTo(fx+3,fy-28);ctx.lineTo(fx+22,fy-20);ctx.lineTo(fx+3,fy-12);ctx.closePath();ctx.fill();
      ctx.globalAlpha=0.5+Math.sin(animTick*.12)*.3;ctx.font='bold 7px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText('✅',fx-6,fy-36);ctx.restore();
    }
  }
  // Conveyor zones — draw in world space before platforms
  if(conveyorZones.length>0){
    ctx.save();
    conveyorZones.forEach(z=>{
      const wx=z.x-camera.x,wy=z.y-camera.y,ww=z.x2-z.x,wh=z.h||24;
      ctx.globalAlpha=0.22;ctx.fillStyle=z.dir>0?'#ffaa22':'#22aaff';ctx.fillRect(wx,wy,ww,wh);
      ctx.globalAlpha=0.55;ctx.strokeStyle=z.dir>0?'#ffaa22':'#22aaff';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.strokeRect(wx,wy,ww,wh);ctx.setLineDash([]);
      // Animated arrows
      const arrowCount=Math.floor(ww/36);
      const arrowOffset=(animTick*z.dir*1.4)%36;
      ctx.globalAlpha=0.65;ctx.fillStyle=z.dir>0?'#ffcc66':'#66ccff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      for(let ai=0;ai<arrowCount+1;ai++){
        const ax=wx+(ai*36+arrowOffset*z.dir+ww)%ww;
        if(ax>=wx&&ax<=wx+ww)ctx.fillText(z.dir>0?'▶':'◀',ax,wy+wh/2);
      }
    });
    ctx.globalAlpha=1;ctx.restore();
  }
  // Weather visual (world-space, behind platforms)
  if(weatherType&&weatherDrops.length>0){
    ctx.save();
    weatherDrops.forEach(d=>{
      ctx.globalAlpha=1;ctx.fillStyle=d.color;
      if(weatherType==='rain'){ctx.fillRect(d.x,d.y,d.w,d.h);}
      else{ctx.beginPath();ctx.arc(d.x,d.y,d.w,0,Math.PI*2);ctx.fill();}
    });
    ctx.restore();
  }
  platforms.forEach(p=>p.draw());movingPlatforms.forEach(p=>p.draw());spikes.forEach(s=>s.draw());
  crates.forEach(c=>c.draw());
  enemies.forEach(e=>e.draw());killBricks.forEach(b=>b.draw());springPads.forEach(s=>s.draw());coins.forEach(c=>c.draw());
  powerUps.forEach(p=>p.draw());
  tpPads.forEach(p=>p.draw());stickyPads.forEach(p=>p.draw());
  portals.forEach(p=>{if(!p.collected)p.draw();});
  warpGates.forEach(g=>{if(!g.collected)g.draw();});
  laserBeams.forEach(lb=>lb.draw());
  bossEnemies.forEach(b=>b.draw());
  // Bullets
  bullets.forEach(b=>{ctx.save();ctx.shadowColor=b.color;ctx.shadowBlur=10;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.r||5,0,Math.PI*2);ctx.fill();ctx.restore();});
  // Heart drops
  heartDrops.forEach(h=>h.draw());
  // Throw stars in flight
  throwStarPr.forEach(s=>s.draw());
  // Spike rain
  if(spikeRainDrops.length>0){ctx.save();spikeRainDrops.forEach(d=>{ctx.shadowColor='#ff4444';ctx.shadowBlur=8;ctx.fillStyle='#ff6644';ctx.beginPath();ctx.moveTo(d.x,d.y+d.r*2);ctx.lineTo(d.x-d.r,d.y);ctx.lineTo(d.x+d.r,d.y);ctx.closePath();ctx.fill();});ctx.restore();}
  secretDoors.forEach(d=>d.draw());if(goal)goal.draw();
  drawLava();
  particles.forEach(p=>{if(p.world)p.draw(camera.x,camera.y);});
  // Player motion trail
  // Player drop shadow — oval beneath player, fades with height
  {
    const sx=player.x+player.width/2,sy=player.y+player.height;
    // Find ground distance (approx by scanning down through platforms)
    let groundY=sy+300;
    for(const p of platforms){if(p.x<sx&&p.x+p.width>sx&&p.y>sy&&p.y<groundY)groundY=p.y;}
    const dist=groundY-sy;const maxDist=220;
    if(dist<maxDist){
      const frac=1-dist/maxDist;
      const sw=Math.max(8,player.width*(.85+frac*.25));const sh=Math.max(3,8*frac);
      ctx.save();ctx.globalAlpha=frac*.38;ctx.shadowBlur=0;
      const sg=ctx.createRadialGradient(sx,groundY,0,sx,groundY,sw*.6);
      sg.addColorStop(0,'rgba(0,0,0,.7)');sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(sx,groundY,sw*.6,sh,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  // Coin magnet aura — animated arcs pulling toward player
  if(puMagnetActive){
    const mcx=player.x+player.width/2,mcy=player.y+player.height/2;
    ctx.save();ctx.globalAlpha=0.15+Math.sin(animTick*.15)*.08;ctx.strokeStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=10;ctx.lineWidth=1.5;
    for(let mi=0;mi<3;mi++){ctx.beginPath();ctx.arc(mcx,mcy,50+mi*22+(animTick*2.2+mi*40)%22,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  // Speed ghost trail
  jumpGhosts.forEach(g=>{
    const a=(g.life/g.maxLife)*(g.filled?0.45:0.28);
    ctx.save();ctx.globalAlpha=a;ctx.shadowColor=g.color;ctx.shadowBlur=g.filled?14:6;
    if(g.filled){ctx.fillStyle=g.color;ctx.beginPath();ctx.roundRect(g.x,g.y,g.w,g.h,4);ctx.fill();}
    else{ctx.strokeStyle=g.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(g.x,g.y,g.w,g.h,4);ctx.stroke();}
    ctx.restore();
  });
  // Speed-based trail color: fast = cyan/white, rage = red, normal = skin color
  const _trailSpeed=Math.sqrt(player.velX**2+player.velY**2);
  const _trailCol=rageMode?'#ff4400':speedPortalLeft>0?'#ffff00':_trailSpeed>10?'#ffffff':_trailSpeed>7?'#00ffff':SKINS[selectedSkin].color;
  playerTrail.forEach((pt,pi)=>{
    const a=(pi+1)/playerTrail.length*.3;
    const r=5*(pi+1)/playerTrail.length;
    ctx.save();ctx.globalAlpha=a;ctx.shadowColor=_trailCol;ctx.shadowBlur=10;
    ctx.fillStyle=_trailCol;ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  });
  // Speed lines (world space)
  if(Math.abs(player.velX)>3.5){
    const spd=Math.min(1,(Math.abs(player.velX)-3.5)/5.5);
    ctx.save();
    for(let sl=0;sl<10;sl++){
      const lx=player.x+player.width*.5;
      const ly=player.y+4+sl*2.2;
      const len=(20+(Math.sin(animTick*.28+sl*1.9)*.5+.5)*40)*spd;
      ctx.globalAlpha=(0.07+sl*.009)*spd*(1-sl*.07);
      ctx.strokeStyle=player.color;ctx.lineWidth=.9;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx-player.facing*len,ly);ctx.stroke();
    }
    ctx.restore();
  }
  // Rage Mode glow around player
  if(rageMode){
    const rageAlpha=(0.4+Math.sin(animTick*.25)*.3)*(rageModeLeft/210);
    const rageR=18+Math.sin(animTick*.18)*5;
    ctx.save();
    ctx.shadowColor='#ff3300';ctx.shadowBlur=30;
    ctx.globalAlpha=rageAlpha;
    const rg=ctx.createRadialGradient(player.x+player.width/2,player.y+player.height/2,0,player.x+player.width/2,player.y+player.height/2,rageR+14);
    rg.addColorStop(0,'rgba(255,80,0,.7)');rg.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=rg;ctx.beginPath();ctx.arc(player.x+player.width/2,player.y+player.height/2,rageR+14,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Rage sparks
    if(animTick%4===0)particles.push(new Particle(player.x+player.width/2+(Math.random()-.5)*18,player.y+(Math.random())*player.height,'#ff4400',(Math.random()-.5)*2,-1.5-Math.random()*2,18,3,true,'spark'));
  }
  // Kill streak fire aura
  if(killStreak>=3){
    const _kcx=player.x+player.width/2,_kcy=player.y+player.height/2;
    ctx.save();ctx.globalAlpha=0.18+(killStreak>=5?.18:0)+Math.sin(animTick*.18)*.08;
    const _kaura=ctx.createRadialGradient(_kcx,_kcy,4,_kcx,_kcy,killStreak>=5?88:55);
    _kaura.addColorStop(0,killStreak>=5?'#ff2200':'#ff8800');_kaura.addColorStop(1,'transparent');
    ctx.fillStyle=_kaura;ctx.beginPath();ctx.arc(_kcx,_kcy,killStreak>=5?88:55,0,Math.PI*2);ctx.fill();
    if(animTick%4===0){particles.push(new Particle(_kcx+(Math.random()-.5)*24,_kcy+(Math.random()-.5)*24,killStreak>=5?'#ff2200':'#ff8800',(Math.random()-.5)*2,-2-Math.random()*2,20,3+Math.random()*3,true,'circle'));}
    ctx.restore();
  }
  // Shield bubble aura
  if(shieldBubble>0){
    ctx.save();ctx.globalAlpha=0.22+Math.sin(animTick*.12)*.1;ctx.strokeStyle='#88ff44';ctx.shadowColor='#88ff44';ctx.shadowBlur=14;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(player.x+player.width/2,player.y+player.height/2,22+Math.sin(animTick*.2)*3,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;ctx.restore();
  }
  if(ghostPortalMode){ctx.save();ctx.globalAlpha=0.45+Math.sin(animTick*.15)*.2;}
  drawSprite(player.x,player.y);
  if(ghostPortalMode){ctx.restore();}
  ctx.restore();
  if(_portalFlip)ctx.restore();

  particles.forEach(p=>{if(!p.world)p.draw();});

  // Floating combo text (screen space)
  for(let fi=floatTexts.length-1;fi>=0;fi--){
    const ft=floatTexts[fi];ft.y-=0.75;ft.life--;
    if(ft.life<=0){floatTexts.splice(fi,1);continue;}
    const fa=Math.min(1,ft.life/(ft.maxLife*.32));
    ctx.save();ctx.globalAlpha=fa;ctx.fillStyle=ft.color;ctx.shadowColor=ft.color;ctx.shadowBlur=14;
    ctx.font='bold 11px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ft.text,ft.x,ft.y);ctx.restore();
  }

  // Void glitch effect
  if(gameState==='playing'&&currentLevel===4){
    if(Math.random()<.08){ctx.save();ctx.globalAlpha=.03;for(let sy=0;sy<H;sy+=4){ctx.fillStyle='#110022';ctx.fillRect(0,sy,W,2);}ctx.restore();}
    ctx.save();ctx.globalAlpha=.04+Math.sin(animTick*.07)*.02;const vd=ctx.createRadialGradient(0,0,0,0,0,200);vd.addColorStop(0,'#6600ff');vd.addColorStop(1,'transparent');ctx.fillStyle=vd;ctx.fillRect(0,0,200,200);ctx.restore();
  }
  // Time slow vignette
  if(timeSlowActive){
    ctx.save();const vg=ctx.createRadialGradient(W/2,H/2,H*.32,W/2,H/2,H*.85);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(40,40,130,.38)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  // Ghost overlay
  if(abilityActive&&SKINS[selectedSkin].ability==='ghost'){ctx.save();ctx.globalAlpha=.06+Math.sin(animTick*.1)*.04;ctx.fillStyle='#cc88ff';ctx.fillRect(0,0,W,H);ctx.restore();}
  // Invincible flash edges
  if(invincible>0&&Math.floor(invincible/8)%2===0){
    ctx.save();ctx.globalAlpha=.12;const ef=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.7);ef.addColorStop(0,'transparent');ef.addColorStop(1,player.color);ctx.fillStyle=ef;ctx.fillRect(0,0,W,H);ctx.restore();
  }

  // Lava proximity glow — screen edges pulse orange as lava gets close
  if(lavaRising&&gameState==='playing'){
    const lavaScreenY=lavaY-camera.y;
    const playerScreenY=player.y+player.height-camera.y;
    const proximity=lavaScreenY-playerScreenY;
    if(proximity<H){
      const intensity=Math.max(0,1-proximity/H)*.72*(0.68+Math.sin(animTick*.15)*.32);
      ctx.save();
      const lg=ctx.createLinearGradient(0,H*.35,0,H);
      lg.addColorStop(0,'transparent');lg.addColorStop(1,`rgba(255,55,0,${intensity})`);
      ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
  }
  // Last-life heartbeat vignette — double-beat red pulse at screen edges
  if(lives===1&&gameState==='playing'){
    const hbPhase=(animTick%50)/50;
    const hb1=Math.max(0,1-Math.abs(hbPhase*7-1));
    const hb2=Math.max(0,1-Math.abs(hbPhase*7-2.5))*.65;
    const hbIntensity=Math.max(hb1,hb2);
    if(hbIntensity>.01){
      ctx.save();
      const vg=ctx.createRadialGradient(W/2,H/2,H*.28,W/2,H/2,H*.88);
      vg.addColorStop(0,'transparent');vg.addColorStop(1,`rgba(210,0,20,${hbIntensity*.34})`);
      ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore();
    }
  }

  // Portal active overlays (screen space)
  if(gravityFlipped&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.07+Math.sin(animTick*.06)*.03;ctx.fillStyle='#4488ff';ctx.fillRect(0,0,W,H);ctx.restore();
    ctx.save();ctx.globalAlpha=0.72;ctx.fillStyle='#4488ff';ctx.shadowColor='#4488ff';ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText(`↕ GRAVITY FLIP ${Math.ceil(gravityFlipLeft/60)}s`,W-10,44);ctx.restore();
  }
  if(mirrorWorld&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.06+Math.sin(animTick*.07)*.03;ctx.fillStyle='#ff8800';ctx.fillRect(0,0,W,H);ctx.restore();
    ctx.save();ctx.globalAlpha=0.72;ctx.fillStyle='#ff8800';ctx.shadowColor='#ff8800';ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText(`↔ MIRROR ${Math.ceil(mirrorWorldLeft/60)}s`,W-10,56);ctx.restore();
  }
  if(ghostPortalMode&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.05+Math.sin(animTick*.09)*.03;ctx.fillStyle='#eeeeff';ctx.fillRect(0,0,W,H);ctx.restore();
    ctx.save();ctx.globalAlpha=0.72;ctx.fillStyle='#eeeeff';ctx.shadowColor='#eeeeff';ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText(`◌ PHASE ${Math.ceil(ghostPortalModeLeft/60)}s`,W-10,68);ctx.restore();
  }
  if(playerShrunk&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.72;ctx.fillStyle='#00ffdd';ctx.shadowColor='#00ffdd';ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText(`↓ SHRUNK ${Math.ceil(playerShrunkLeft/60)}s`,W-10,80);ctx.restore();
  }
  if(speedPortalLeft>0&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.72;ctx.fillStyle='#ffff00';ctx.shadowColor='#ffff00';ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText(`»» SPEED ${Math.ceil(speedPortalLeft/60)}s`,W-10,92);ctx.restore();
  }
  if(scorePortalLeft>0&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.72;ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText(`★ 5× SCORE ${Math.ceil(scorePortalLeft/60)}s`,W-10,104);ctx.restore();
  }
  drawHUD();
  if(gameState==='gameover')drawGameOver();
  else if(gameWon)drawWin();
  else if(gameState==='paused')drawPause();
  // Level complete flash
  if(levelCompleteFlash>0){
    ctx.save();ctx.globalAlpha=(levelCompleteFlash/35)*0.7;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);ctx.restore();
    levelCompleteFlash--;
  }
  // Arena intermission countdown banner
  if(gameMode==='arena'&&arenaIntermission&&gameState==='playing'){
    const cdSecs=Math.ceil((180-arenaIntermTimer)/60);
    ctx.save();ctx.globalAlpha=0.85;ctx.fillStyle='#110022';ctx.fillRect(0,H/2-36,W,72);ctx.globalAlpha=1;
    ctx.shadowColor='#ff4488';ctx.shadowBlur=20;ctx.fillStyle='#ff88cc';ctx.font='bold 14px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(`WAVE ${arenaWave} CLEAR!  NEXT WAVE IN ${cdSecs}...`,W/2,H/2);ctx.restore();
  }
  // Arena off-screen enemy danger arrows
  if(gameMode==='arena'&&gameState==='playing'&&!arenaIntermission){
    const arenaScreenMinY=ARENA_BASE_Y,arenaScreenMaxY=ARENA_BASE_Y+H;
    [...enemies,...bossEnemies].forEach(e=>{
      const ey=e.y-ARENA_BASE_Y; // screen y
      const ex=e.x;
      const inView=ey>55&&ey<H-30;
      if(inView)return;
      ctx.save();ctx.globalAlpha=0.7+Math.sin(animTick*.25)*.2;
      ctx.fillStyle=e.hp!==undefined?'#ff2200':'#ff4488';
      ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
      const arrowX=Math.max(30,Math.min(W-30,ex));
      const arrowY=ey<55?60:H-35;
      const dir=ey<55?-1:1;
      ctx.translate(arrowX,arrowY);
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-8,-14*dir);ctx.lineTo(8,-14*dir);ctx.closePath();ctx.fill();
      ctx.restore();
    });
  }
}

// ══════════════════════════════════════════
//  HUD (enhanced)
// ══════════════════════════════════════════
function drawHUD(){
  // Beat-pulse decay
  if(beatPulse>0)beatPulse=Math.max(0,beatPulse-.055);
  // Panel bg with beat glow
  ctx.save();
  const hudGrad=ctx.createLinearGradient(5,5,5,41);hudGrad.addColorStop(0,'rgba(0,8,28,.72)');hudGrad.addColorStop(1,'rgba(0,5,18,.58)');
  ctx.fillStyle=hudGrad;ctx.beginPath();ctx.roundRect(5,5,W-10,36,6);ctx.fill();
  // Beat-pulse border glow
  const bp=beatPulse;
  ctx.strokeStyle=bp>0?`rgba(${Math.round(bp*80)},${Math.round(200+bp*55)},255,${0.12+bp*.55})`:'rgba(0,200,255,.12)';
  ctx.lineWidth=bp>0?1.5+bp*2:.8;
  if(bp>0){ctx.shadowColor='#00ccff';ctx.shadowBlur=bp*22;}
  ctx.beginPath();ctx.roundRect(5,5,W-10,36,6);ctx.stroke();
  ctx.restore();

  if(heartFlash>0)heartFlash--;
  const HEART_X=16,HEART_Y=8,HEART_GAP=34;
  for(let i=0;i<MAX_LIVES;i++){
    const filled=i<lives;const isLost=i===lives&&heartFlash>0;
    const isLastLife=lives===1&&filled;
    const hbPulse=isLastLife?(1+Math.sin(animTick*.13)*.18):1;
    const scale=isLost?1+(heartFlash/90)*.55:hbPulse;
    const hx=HEART_X+i*HEART_GAP;const hy=HEART_Y+14;
    ctx.save();ctx.translate(hx,hy);ctx.scale(scale,scale);
    ctx.shadowColor=filled?'#ff2244':'#330011';
    ctx.shadowBlur=filled?(isLost?32+Math.sin(heartFlash*.3)*8:(isLastLife?18+Math.sin(animTick*.13)*10:14)):3;
    ctx.beginPath();ctx.moveTo(0,5);ctx.bezierCurveTo(-2.5,1,-11,-4,-11,-11);ctx.bezierCurveTo(-11,-19,0,-19,0,-13);ctx.bezierCurveTo(0,-19,11,-19,11,-11);ctx.bezierCurveTo(11,-4,2.5,1,0,5);ctx.closePath();
    if(filled){const hg=ctx.createRadialGradient(-2,-9,0,0,-4,14);hg.addColorStop(0,'#ff99bb');hg.addColorStop(.5,'#ff2244');hg.addColorStop(1,'#990022');ctx.fillStyle=hg;}
    else{ctx.fillStyle='#1a0811';}
    ctx.fill();
    if(filled){ctx.strokeStyle='rgba(255,160,185,.4)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(-3,-12,3,2.5,-.4,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  const col=coins.filter(c=>c.collected).length;
  ctx.save();ctx.shadowColor='#00ffff';ctx.shadowBlur=6;ctx.fillStyle='#00ccff';ctx.font='bold 9px Orbitron';ctx.textAlign='right';ctx.textBaseline='middle';
  if(gameMode==='story')ctx.fillText(`JMP:${player.jumpsLeft}  ◉${col}/${coins.length}  LVL:${currentLevel+1}/10`,W-220,23);
  else if(gameMode==='risingLava')ctx.fillText(`W${risingLavaWave}  HEIGHT:${score}m  ◉${col}  JMP:${player.jumpsLeft}`,W-260,23);
  else if(gameMode==='arena'){const aleft=enemies.length+bossEnemies.length;ctx.fillText(`⚔WAVE:${arenaWave}  KILLS:${aleft>0?aleft+' LEFT':'CLEAR!'}  SCR:${score}`,W-290,23);}
  else ctx.fillText(`SCORE:${score}  LVL:${level}  ◉${col}`,W-220,23);
  ctx.restore();

  if(coinFlash>0)coinFlash--;
  const fl=coinFlash>0;
  ctx.save();ctx.shadowColor='#FFD700';ctx.shadowBlur=fl?28:10;ctx.fillStyle=fl?'#FFFF88':'#FFD700';
  ctx.font=`bold ${fl?13:11}px Orbitron`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('◉ '+totalCoins,14,48);
  if(fl){ctx.globalAlpha=coinFlash/35;ctx.fillStyle='#FFD700';ctx.font='bold 10px Orbitron';ctx.fillText('+1',72,38);}
  ctx.restore();
  // Deathless streak badge (endless mode)
  if(deathlessStreak>0&&gameMode==='endless'){
    ctx.save();ctx.globalAlpha=0.72+Math.sin(animTick*.17)*.22;
    ctx.fillStyle='#ffdd00';ctx.shadowColor='#ffaa00';ctx.shadowBlur=13;
    ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(`✨ FLAWLESS ×${deathlessStreak}`,105,48);ctx.restore();
  }
  // Arena mode: wave progress bar below HUD
  if(gameMode==='arena'&&gameState==='playing'){
    const totalEnemies=arenaEnemiesLeft;const remaining=enemies.length+bossEnemies.length;
    const barW=400,barH=8,barX=W/2-200,barY=46;
    ctx.save();
    ctx.fillStyle='rgba(0,6,20,.75)';ctx.beginPath();ctx.roundRect(barX-2,barY-2,barW+4,barH+4,4);ctx.fill();
    // Wave kill progress
    if(arenaIntermission){
      // Intermission: countdown bar
      const prog=arenaIntermTimer/180;
      ctx.fillStyle='#ff44aa';ctx.beginPath();ctx.roundRect(barX,barY,barW*prog,barH,3);ctx.fill();
      ctx.fillStyle='rgba(255,100,180,.6)';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('NEXT WAVE SPAWNING...',W/2,barY+barH/2);
    } else {
      const killed=Math.max(0,totalEnemies-remaining);const prog=totalEnemies>0?killed/totalEnemies:0;
      const barGrad=ctx.createLinearGradient(barX,0,barX+barW,0);barGrad.addColorStop(0,'#ff4488');barGrad.addColorStop(1,'#ff8844');
      ctx.fillStyle='rgba(40,0,20,.5)';ctx.fillRect(barX,barY,barW,barH);
      ctx.fillStyle=barGrad;ctx.beginPath();ctx.roundRect(barX,barY,barW*prog,barH,3);ctx.fill();
      ctx.shadowColor='#ff4488';ctx.shadowBlur=8;
      ctx.strokeStyle='rgba(255,68,136,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(barX,barY,barW,barH,3);ctx.stroke();
      ctx.fillStyle='#ffbbcc';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(`WAVE ${arenaWave} — ${remaining} ENEMY${remaining===1?'':'S'} LEFT`,W/2,barY+barH/2);
    }
    ctx.restore();
  }

  // Save/Reset/Pause buttons
  ctx.fillStyle='rgba(0,120,55,.9)';ctx.beginPath();ctx.roundRect(W-230,40,78,22,4);ctx.fill();
  ctx.fillStyle='#aaffcc';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SAVE [CTRL+S]',W-191,52);
  ctx.fillStyle='rgba(140,10,10,.9)';ctx.beginPath();ctx.roundRect(W-146,40,75,22,4);ctx.fill();ctx.fillStyle='#ffaaaa';ctx.fillText('HARD RESET',W-109,52);
  // Pause button
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=8;
  ctx.fillStyle='rgba(0,20,60,.9)';ctx.beginPath();ctx.roundRect(W-66,40,58,22,4);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W-66,40,58,22,4);ctx.stroke();
  ctx.fillStyle='#88ccff';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⏸ ESC',W-37,52);ctx.restore();
  // Rage indicator
  if(rageMode){
    const ri=rageModeLeft/210;
    ctx.save();ctx.shadowColor='#ff4400';ctx.shadowBlur=16+Math.sin(animTick*.25)*6;
    ctx.fillStyle=`rgba(255,80,0,${0.55+Math.sin(animTick*.22)*.25})`;ctx.font='bold 10px Orbitron';
    ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`😡 RAGE ${Math.ceil(rageModeLeft/60)}s`,14,60);
    ctx.fillStyle='rgba(255,80,0,.3)';ctx.beginPath();ctx.roundRect(14,70,120*ri,5,3);ctx.fill();ctx.restore();
  }
  // Lucky coins indicator
  if(luckyCoins){
    const lcy=rageMode?82:60;
    ctx.save();ctx.globalAlpha=0.8+Math.sin(animTick*.12)*.18;ctx.shadowColor='#FFD700';ctx.shadowBlur=10;
    ctx.fillStyle='#FFD700';ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('⭐ LUCKY COINS 2×',14,lcy);ctx.restore();
  }

  // Lava warning (enhanced)
  if(lavaRising){
    const ly=lavaY-camera.y;const danger=ly<H+250&&ly>-50;
    if(danger){
      ctx.save();const pulse=.4+Math.sin(animTick*.18)*.3;const danger2=ly<H*.6;
      ctx.globalAlpha=pulse*(danger2?1.3:.7);
      const warnGrad=ctx.createLinearGradient(0,H-14,0,H);warnGrad.addColorStop(0,'transparent');warnGrad.addColorStop(1,'rgba(255,60,0,.85)');
      ctx.fillStyle=warnGrad;ctx.fillRect(0,H-14,W,14);
      ctx.fillStyle='rgba(255,90,0,.95)';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.shadowColor='#FF6600';ctx.shadowBlur=18;ctx.fillText('⚠ LAVA RISING ⚠',W/2,H-10);ctx.restore();
    }
  }
  if(onIce){ctx.save();ctx.globalAlpha=.75;ctx.fillStyle='#88ddff';ctx.shadowColor='#88ddff';ctx.shadowBlur=10;ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('ICE PHYSICS',14,60);ctx.restore();}
  if(onSticky){ctx.save();ctx.globalAlpha=.8;ctx.fillStyle='#aaff44';ctx.shadowColor='#88ff44';ctx.shadowBlur=10;ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('STICKY x0.28 SPD',14,onIce?76:60);ctx.restore();}
  if(onConveyor){ctx.save();ctx.globalAlpha=.8;ctx.fillStyle=conveyorDir>0?'#ffaa22':'#22aaff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';let _cy=60;if(onIce)_cy+=16;if(onSticky)_cy+=16;ctx.fillText((conveyorDir>0?'▶ CONVEYOR RIGHT':'◀ CONVEYOR LEFT'),14,_cy);ctx.restore();}
  if(puSpeedActive){ctx.save();ctx.globalAlpha=.85+Math.sin(animTick*.2)*.12;ctx.fillStyle='#00ffff';ctx.shadowColor='#00ffff';ctx.shadowBlur=12;ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('SPEED BOOST x1.65  ['+Math.ceil(puSpeedLeft/60)+'s]',14,(onIce||onSticky)?88:60);ctx.restore();}
  {let _hy=60;if(onIce)_hy+=16;if(onSticky)_hy+=16;if(puSpeedActive)_hy+=16;
    if(puMagnetActive){ctx.save();ctx.globalAlpha=.88+Math.sin(animTick*.18)*.1;ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=12;ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('⭐ MAGNET  ['+Math.ceil(puMagnetLeft/60)+'s]',14,_hy);ctx.restore();_hy+=16;}
    if(puScoreMult){ctx.save();ctx.globalAlpha=.88+Math.sin(animTick*.22)*.1;ctx.fillStyle='#FF88FF';ctx.shadowColor='#FF88FF';ctx.shadowBlur=12;ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('× SCORE ×2  ['+Math.ceil(puScoreMultLeft/60)+'s]',14,_hy);ctx.restore();}
  }
  // Kill combo display
  if(killStreak>=2&&killStreakTimer>0){
    const kco=Math.min(1,killStreakTimer/120);const kcc=killStreak>=5?'#FF00FF':killStreak>=3?'#FF8800':'#FFD700';
    ctx.save();ctx.globalAlpha=kco*(0.8+Math.sin(animTick*.3)*.2);ctx.fillStyle=kcc;ctx.shadowColor=kcc;ctx.shadowBlur=18;
    ctx.font=`bold ${10+Math.min(killStreak,6)}px Orbitron`;ctx.textAlign='right';ctx.textBaseline='top';
    ctx.fillText((killStreak>=5?'💀':'⚡')+' STREAK ×'+killStreak,W-12,60);ctx.restore();
  }
  // Wall slide indicator
  if((onWallLeft||onWallRight)&&!player.onGround){
    ctx.save();ctx.globalAlpha=.7+Math.sin(animTick*.25)*.2;ctx.fillStyle='#aaeeff';ctx.shadowColor='#aaeeff';ctx.shadowBlur=10;
    ctx.font='bold 8px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText((onWallRight?'▶':'◀')+' WALL',14,76);ctx.restore();
  }
  // Endless random event display
  if(endlessEvent&&endlessEventLeft>0){
    const ef=Math.min(1,endlessEventLeft/60);const ecol=endlessEvent==='coinFrenzy'?'#FFD700':endlessEvent==='freezeWave'?'#88eeff':'#ffff44';
    ctx.save();ctx.globalAlpha=ef*(0.75+Math.sin(animTick*.2)*.2);ctx.fillStyle=ecol;ctx.shadowColor=ecol;ctx.shadowBlur=16;
    ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='top';
    const evtLabel=endlessEvent==='coinFrenzy'?'🌟 COIN FRENZY ×3':endlessEvent==='freezeWave'?'❄ FREEZE WAVE':endlessEvent==='speedRush'?'⚡ SPEED RUSH':'';
    ctx.fillText(evtLabel+'  ['+Math.ceil(endlessEventLeft/60)+'s]',W/2,60);ctx.restore();
  }
  // Speedrun timer
  if(showTimer&&gameState==='playing'){
    const ts2=levelTimer/60;const tsStr=Math.floor(ts2/60)+':'+(ts2%60).toFixed(2).padStart(5,'0');
    ctx.save();ctx.globalAlpha=0.7;ctx.fillStyle='#aaffcc';ctx.shadowColor='#00ffcc';ctx.shadowBlur=8;
    ctx.font='bold 10px Orbitron';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText('T '+tsStr,W-12,76);ctx.restore();
  }
  // Shield bubble count
  if(shieldBubble>0&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.85;ctx.fillStyle='#88ff44';ctx.shadowColor='#88ff44';ctx.shadowBlur=10;
    ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(`BUBBLE x${shieldBubble}`,14,60);ctx.restore();
  }
  // Throw star count
  if(gameState==='playing'){
    ctx.save();ctx.globalAlpha=throwStarCount>0?0.85:0.35;ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=throwStarCount>0?10:0;
    ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(`[E] STARS:${throwStarCount}`,14,72);ctx.restore();
  }
  // Death count (session)
  if(deathCount>0&&gameState==='playing'){
    ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle='#ff6666';ctx.font='bold 8px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(`DEATHS:${deathCount}`,14,84);ctx.restore();
  }
  // Last rank
  if(levelRank&&gameState==='playing'){
    const rankCol=levelRank==='S'?'#FFD700':levelRank==='A'?'#00FF88':levelRank==='B'?'#00CCFF':levelRank==='C'?'#FF8800':'#FF4444';
    ctx.save();ctx.globalAlpha=0.75;ctx.fillStyle=rankCol;ctx.shadowColor=rankCol;ctx.shadowBlur=10;
    ctx.font='bold 10px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(`RANK:${levelRank}`,14,96);ctx.restore();
  }
  // Weather label
  if(weatherType&&gameState==='playing'){
    const wlCol=weatherType==='rain'?'#88aaff':weatherType==='snow'?'#ddeeff':'#ff8800';
    const wlText=weatherType==='rain'?'RAIN':weatherType==='snow'?'SNOW':'EMBERS';
    ctx.save();ctx.globalAlpha=0.55;ctx.fillStyle=wlCol;ctx.font='bold 8px Orbitron';ctx.textAlign='right';ctx.textBaseline='bottom';
    ctx.fillText(wlText,W-12,H-12);ctx.restore();
  }

  // Mini-map (bottom-left, clear of HUD text)
  const mmW=120,mmH=48,mmX=8,mmY=H-mmH-8;
  ctx.save();
  ctx.fillStyle='rgba(0,5,22,.88)';ctx.beginPath();ctx.roundRect(mmX,mmY,mmW,mmH,5);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.45)';ctx.lineWidth=1;ctx.shadowColor='#0088ff';ctx.shadowBlur=6;ctx.beginPath();ctx.roundRect(mmX,mmY,mmW,mmH,5);ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(0,180,255,.35)';ctx.font='6px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('MAP',mmX+3,mmY+2);
  ctx.globalAlpha=.28;ctx.fillStyle='#4488aa';
  platforms.forEach(p=>{const mpx=mmX+4+(p.x/WORLD_W)*(mmW-8);const mpy=mmY+10+(p.y/WORLD_H)*(mmH-14);ctx.fillRect(mpx,mpy,Math.max(2,(p.width/WORLD_W)*(mmW-8)),1.5);});
  movingPlatforms.forEach(p=>{const mpx=mmX+4+(p.x/WORLD_W)*(mmW-8);const mpy=mmY+10+(p.y/WORLD_H)*(mmH-14);ctx.fillStyle='#88ccff';ctx.fillRect(mpx,mpy,Math.max(2,(p.width/WORLD_W)*(mmW-8)),1.5);});
  ctx.globalAlpha=.85;
  if(lavaRising){const lmpy=mmY+10+(lavaY/WORLD_H)*(mmH-14);if(lmpy<mmY+mmH-2){ctx.fillStyle='rgba(255,80,0,.75)';ctx.fillRect(mmX+4,Math.max(lmpy,mmY+10),mmW-8,mmY+mmH-2-Math.max(lmpy,mmY+10));}}
  enemies.forEach(e=>{const ex=mmX+4+(e.x/WORLD_W)*(mmW-8);const ey=mmY+10+(e.y/WORLD_H)*(mmH-14);ctx.fillStyle='#ff4444';ctx.shadowColor='#ff4444';ctx.shadowBlur=4;ctx.beginPath();ctx.arc(ex,ey,1.5,0,Math.PI*2);ctx.fill();});
  ctx.shadowBlur=0;
  if(goal){const gmpx=mmX+4+(goal.x/WORLD_W)*(mmW-8);const gmpy=mmY+10+(goal.y/WORLD_H)*(mmH-14);ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(gmpx,gmpy,2.5,0,Math.PI*2);ctx.fill();}
  const mpx=mmX+4+(player.x/WORLD_W)*(mmW-8);const mpy2=mmY+10+(player.y/WORLD_H)*(mmH-14);
  ctx.fillStyle=player.color;ctx.shadowColor=player.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(mpx,mpy2,3,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // Off-screen enemy arrows — triangles on screen edge pointing toward enemies
  if(gameState==='playing'&&enemies.length>0){
    const MARGIN=28,AR=9;
    enemies.forEach(e=>{
      const ex=e.x+e.width/2-camera.x,ey=e.y+e.height/2-camera.y;
      if(ex>MARGIN&&ex<W-MARGIN&&ey>MARGIN&&ey<H-MARGIN)return; // on-screen, skip
      const dx=ex-W/2,dy=ey-H/2;
      const angle=Math.atan2(dy,dx);
      const edgeX=Math.max(MARGIN,Math.min(W-MARGIN,W/2+Math.cos(angle)*400));
      const edgeY=Math.max(MARGIN+8,Math.min(H-MARGIN,H/2+Math.sin(angle)*300));
      ctx.save();
      ctx.translate(edgeX,edgeY);ctx.rotate(angle);
      ctx.globalAlpha=0.55+Math.sin(animTick*.18)*.25;
      ctx.shadowColor='#ff4444';ctx.shadowBlur=8;ctx.fillStyle='#ff4444';
      ctx.beginPath();ctx.moveTo(AR,0);ctx.lineTo(-AR,-AR*.6);ctx.lineTo(-AR,AR*.6);ctx.closePath();ctx.fill();
      ctx.restore();
    });
  }

  // Goal proximity glow — gold pulse on edges when near goal
  if(goal&&gameState==='playing'){
    const gdx=goal.x+18-player.x,gdy=goal.y+18-player.y;
    const gDist=Math.sqrt(gdx*gdx+gdy*gdy);
    if(gDist<500){
      const gi=Math.max(0,1-gDist/500)*(.45+Math.sin(animTick*.14)*.25);
      ctx.save();
      const gl=ctx.createRadialGradient(W/2,H/2,H*.4,W/2,H/2,H*.85);
      gl.addColorStop(0,'transparent');gl.addColorStop(1,`rgba(255,210,0,${gi*.4})`);
      ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
      ctx.shadowColor='#FFD700';ctx.shadowBlur=0;ctx.globalAlpha=gi*.8;
      ctx.fillStyle='#FFD700';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('GOAL ▶',W/2,H-22);ctx.restore();
    }
  }
}

// ══════════════════════════════════════════
//  CATNIP GARDEN MINI-GAME
// ══════════════════════════════════════════
function initCats(){
  catTick=0;
  const skCols=CAT_SKIN_DATA[activeCatSkin]?.cols||CAT_SKIN_DATA[0].cols;
  cats=[
    {x:155,y:185,hp:55,lastFood:null,sfc:0,state:'neutral',purrT:0,hissT:0,t:0,angry:false,angryT:0,name:'MOCHI',col:skCols[0],toyX:155,toyVX:1.3,swatT:0,favFood:'fish',petCooldown:0,feedAnim:0,feedAnimY:0,petAnim:0,playing:false,playT:0,playCooldown:0},
    {x:450,y:185,hp:55,lastFood:null,sfc:0,state:'neutral',purrT:0,hissT:0,t:0,angry:false,angryT:0,name:'BISCUIT',col:skCols[1],toyX:430,toyVX:-1.6,swatT:0,favFood:'catnip',petCooldown:0,feedAnim:0,feedAnimY:0,petAnim:0,playing:false,playT:0,playCooldown:0},
    {x:745,y:185,hp:55,lastFood:null,sfc:0,state:'neutral',purrT:0,hissT:0,t:0,angry:false,angryT:0,name:'LUNA',col:skCols[2],toyX:745,toyVX:1.0,swatT:0,favFood:'either',petCooldown:0,feedAnim:0,feedAnimY:0,petAnim:0,playing:false,playT:0,playCooldown:0},
  ];
}
function feedCat(i){
  const c=cats[i];
  if(catSelectedFood==='fish'){
    if(catFishStock<=0){playSFX('error');showNotif('NO FISH — BUY MORE IN CAT SHOP!','#ff4444');return;}
    catFishStock--;
  }else if(catSelectedFood==='catnip'){
    if(catNipStock<=0){playSFX('error');showNotif('NO CATNIP — BUY MORE IN CAT SHOP!','#ff4444');return;}
    catNipStock--;
  }else if(catSelectedFood==='milk'){
    if(catMilkStock<=0){playSFX('error');showNotif('NO MILK — BUY MORE IN CAT SHOP!','#ff4444');return;}
    catMilkStock--;
  }else{
    if(catTreatStock<=0){playSFX('error');showNotif('NO TREATS — BUY MORE IN CAT SHOP!','#ff4444');return;}
    catTreatStock--;
  }
  saveGame(true);
  if(c.lastFood===catSelectedFood){c.sfc++;}else{c.lastFood=catSelectedFood;c.sfc=1;}
  if(c.sfc>=3){
    c.angry=true;c.angryT=260;c.hp=Math.max(0,c.hp-45);
    playSFX('error');showNotif(c.name+' IS BORED OF THAT!','#ff6600');
    c.feedAnim=50;c.feedAnimY=0;
  }else{
    const isFav=c.favFood===catSelectedFood||c.favFood==='either';
    const base=catSelectedFood==='fish'?22:catSelectedFood==='catnip'?38:catSelectedFood==='milk'?12:50;
    const bonus=isFav?10:0;
    c.hp=Math.min(100,c.hp+base+bonus);
    playSFX(catSelectedFood==='fish'||catSelectedFood==='milk'?'coin':'secretcoin');
    spawnBurst(c.x,c.y-20,'#ffaaff',12,5);
    c.feedAnim=60;c.feedAnimY=0;
    if(isFav)showNotif(c.name+' LOVES THIS! +'+(base+bonus)+' MOOD','#ffdd88');
    else showNotif(c.name+' +'+(base+bonus)+' MOOD','#ddaaff');
  }
}
function petCat(i){
  const c=cats[i];
  if(c.petCooldown>0){showNotif(c.name+' NEEDS A MOMENT...','#aaaaff');return;}
  c.hp=Math.min(100,c.hp+8);
  c.petCooldown=480;c.petAnim=40;
  playSFX('equip');
  spawnBurst(c.x,c.y-30,'#ff99cc',10,3);
  showNotif('✋ '+c.name+' PURRS! +8 MOOD','#ffaaff');
}
function playCat(i){
  const c=cats[i];
  if(c.playCooldown>0){showNotif(c.name+' IS TIRED...','#aaaaff');return;}
  if(c.state==='angry'){showNotif(c.name+' IS TOO ANGRY TO PLAY!','#ff6600');return;}
  c.playing=true;c.playT=150;c.playCooldown=360;
  c.hp=Math.min(100,c.hp+10);
  c.toyVX=(Math.random()>.5?1:-1)*(2.5+Math.random()*2);
  playSFX('doublejump');
  spawnBurst(c.x,c.y-30,'#ffdd44',14,4);
  showNotif('🎾 '+c.name+' IS PLAYING! +10 MOOD','#ffdd44');
}
function updateCats(){
  catTick++;
  cats.forEach(c=>{
    c.t++;
    if(c.angryT>0){c.angryT--;if(c.angryT===0)c.angry=false;}
    if(c.petCooldown>0)c.petCooldown--;
    if((c.playCooldown??0)>0)c.playCooldown--;
    if((c.playT??0)>0){c.playT--;if(c.playT===0)c.playing=false;}
    if(c.feedAnim>0){c.feedAnim--;c.feedAnimY-=1.1;}
    if(c.petAnim>0)c.petAnim--;
    // Mood decay — slow: -1 every 200 ticks (~3.3s at 60fps)
    if(catTick%200===0)c.hp=Math.max(0,c.hp-1);
    // State machine
    if(c.angry)c.state='angry';
    else if(c.playing)c.state='playing';
    else if(c.hp>=92)c.state='sleeping';
    else if(c.hp>=70)c.state='happy';
    else if(c.hp>=50)c.state='content';
    else if(c.hp<30)c.state='hissing';
    else c.state='neutral';
    // Purr reward (happy, sleeping & playing all give coins)
    if(c.state==='happy'||c.state==='sleeping'||c.state==='playing'){
      c.purrT++;
      if(c.purrT>=300){c.purrT=0;const earn=c.state==='sleeping'?5:c.state==='playing'?6:7;totalCoins+=earn;coinFlash=30;saveGame(true);showNotif(c.name+(c.state==='sleeping'?' ZZZ... +5 ◉':c.state==='playing'?' PLAYS! +6 ◉':' PURRS! +7 ◉'),'#ffaaff');}
    }else c.purrT=0;
    // Hiss penalty
    if(c.state==='hissing'){c.hissT++;if(c.hissT>=240){c.hissT=0;totalCoins=Math.max(0,totalCoins-3);coinFlash=35;saveGame(true);showNotif(c.name+' HISSES! -3 ◉','#ff4444');}}
    else c.hissT=0;
    // Toy animation
    const toySpeed=c.state==='playing'?3.5:c.state==='happy'?2.2:c.state==='angry'?0.4:c.state==='sleeping'?0:1.1;
    c.toyX+=c.toyVX*toySpeed;
    const cardL=c.x-68,cardR=c.x+68;
    if(c.toyX<cardL){c.toyX=cardL;c.toyVX=Math.abs(c.toyVX);}
    if(c.toyX>cardR){c.toyX=cardR;c.toyVX=-Math.abs(c.toyVX);}
    if(c.swatT>0)c.swatT--;
    if(Math.abs(c.toyX-c.x)<32&&c.swatT===0&&c.state!=='hissing'&&c.state!=='sleeping'){
      c.swatT=34;c.toyVX=(c.toyVX>0?1:-1)*(1.4+Math.random()*2);
    }
  });
}
function drawCatSprite(cx,cy,cat){
  const s=cat.state;const t=cat.t;
  const bobRate=s==='sleeping'?.018:.05;
  const bobAmp=s==='sleeping'?1.2:3;
  const bob=Math.sin(t*bobRate)*bobAmp;
  const bc=cat.col;
  const glowMap={happy:'#ffdd66',content:'#aaddff',neutral:'#8888bb',hissing:'#ff3300',angry:'#ff8800',sleeping:'#cc88ff',playing:'#ffee00'};
  const glowCol=glowMap[s]||'#8888bb';
  ctx.save();
  ctx.shadowColor=glowCol;ctx.shadowBlur=20+Math.sin(t*.07)*5;
  // Sleeping: draw lying-down body
  const by=cy+22+bob;
  if(s==='sleeping'){
    // Curled sleeping body — raised so head rests on top
    ctx.fillStyle=bc;ctx.beginPath();ctx.ellipse(cx,by+36,38,22,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx,by+36,38,22,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.ellipse(cx,by+38,20,12,0,0,Math.PI*2);ctx.fill();
    // Head resting — moved down so it connects to body
    const hy=cy+18+bob;
    ctx.shadowBlur=10;ctx.fillStyle=bc;ctx.beginPath();ctx.arc(cx-14,hy,23,0,Math.PI*2);ctx.fill();
    // Curled tail
    ctx.strokeStyle=bc;ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx+30,by+24);ctx.quadraticCurveTo(cx+52,by+10,cx+44,by+38);ctx.stroke();
    // Ears (small, flat)
    ctx.fillStyle=bc;ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(cx-27,hy-10);ctx.lineTo(cx-34,hy-28);ctx.lineTo(cx-15,hy-16);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(cx-3,hy-16);ctx.lineTo(cx-2,hy-34);ctx.lineTo(cx+10,hy-14);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,150,170,.4)';
    ctx.beginPath();ctx.moveTo(cx-26,hy-12);ctx.lineTo(cx-31,hy-25);ctx.lineTo(cx-16,hy-17);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(cx-4,hy-17);ctx.lineTo(cx-3,hy-30);ctx.lineTo(cx+7,hy-15);ctx.closePath();ctx.fill();
    // Closed eyes (— lines)
    ctx.strokeStyle='#333';ctx.lineWidth=2;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx-22,hy-1);ctx.lineTo(cx-14,hy-1);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-5,hy-1);ctx.lineTo(cx+3,hy-1);ctx.stroke();
    // Zzz bubbles
    ['z','z','Z'].forEach((z,zi)=>{
      const zx=cx-4+zi*8,zy=hy-28-zi*10;
      const za=.4+Math.sin(t*.04+zi)*.25;
      ctx.save();ctx.globalAlpha=za;ctx.fillStyle='#ccaaff';ctx.font=`bold ${8+zi*2}px Orbitron`;ctx.textAlign='center';ctx.fillText(z,zx,zy);ctx.restore();
    });
  }else{
    // Normal upright body — starts higher so it overlaps with head base
    ctx.fillStyle=bc;ctx.beginPath();ctx.roundRect(cx-26,by,52,56,13);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cx-26,by,52,56,13);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.ellipse(cx,by+32,16,18,0,0,Math.PI*2);ctx.fill();
    const hy=cy+bob;
    ctx.shadowColor=glowCol;ctx.shadowBlur=14;
    ctx.fillStyle=bc;ctx.beginPath();ctx.arc(cx,hy,29,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,hy,29,0,Math.PI*2);ctx.stroke();
    // Ears
    ctx.fillStyle=bc;ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(cx-20,hy-18);ctx.lineTo(cx-30,hy-45);ctx.lineTo(cx-8,hy-25);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(cx+20,hy-18);ctx.lineTo(cx+30,hy-45);ctx.lineTo(cx+8,hy-25);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,150,170,.45)';
    ctx.beginPath();ctx.moveTo(cx-19,hy-20);ctx.lineTo(cx-26,hy-40);ctx.lineTo(cx-10,hy-26);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(cx+19,hy-20);ctx.lineTo(cx+26,hy-40);ctx.lineTo(cx+10,hy-26);ctx.closePath();ctx.fill();
    // Eyes
    if(s==='happy'||s==='playing'){
      ctx.strokeStyle='#333';ctx.lineWidth=2.5;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(cx-11,hy-3,7,Math.PI+.3,Math.PI*2-.3);ctx.stroke();
      ctx.beginPath();ctx.arc(cx+11,hy-3,7,Math.PI+.3,Math.PI*2-.3);ctx.stroke();
      ctx.fillStyle=s==='playing'?'#ffee00':'#ffee66';ctx.font='8px sans-serif';ctx.textAlign='center';
      ctx.fillText(s==='playing'?'★':'✦',cx-11,hy-15);ctx.fillText(s==='playing'?'★':'✦',cx+11,hy-15);
      if(s==='playing'){
        // Rosy cheeks for playing
        ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#ff8888';
        ctx.beginPath();ctx.ellipse(cx-19,hy+4,7,4,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(cx+19,hy+4,7,4,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }
    }else if(s==='content'){
      // Gently narrowed eyes
      ctx.save();ctx.fillStyle='#333';
      ctx.beginPath();ctx.ellipse(cx-11,hy-2,6,4.5,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(cx+11,hy-2,6,4.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(cx-13,hy-4,1.8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+9,hy-4,1.8,0,Math.PI*2);ctx.fill();
      // Subtle top-lid droop
      ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(cx-11,hy-2,6.5,Math.PI+.5,Math.PI*2-.5);ctx.stroke();
      ctx.beginPath();ctx.arc(cx+11,hy-2,6.5,Math.PI+.5,Math.PI*2-.5);ctx.stroke();
      ctx.restore();
    }else if(s==='hissing'||s==='angry'){
      const ec=s==='angry'?'#ff4400':'#cc1100';
      ctx.fillStyle=ec;
      ctx.save();ctx.translate(cx-11,hy-2);ctx.rotate(.35);ctx.fillRect(-5,-3,10,6);ctx.restore();
      ctx.save();ctx.translate(cx+11,hy-2);ctx.rotate(-.35);ctx.fillRect(-5,-3,10,6);ctx.restore();
      ctx.fillStyle='#111';
      ctx.save();ctx.translate(cx-11,hy-2);ctx.fillRect(-1.5,-5,3,10);ctx.restore();
      ctx.save();ctx.translate(cx+11,hy-2);ctx.fillRect(-1.5,-5,3,10);ctx.restore();
    }else{
      ctx.fillStyle='#222';ctx.beginPath();ctx.arc(cx-11,hy-2,6,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx+11,hy-2,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.55)';
      ctx.beginPath();ctx.arc(cx-13,hy-4,2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx+9,hy-4,2,0,Math.PI*2);ctx.fill();
    }
    // Nose
    ctx.fillStyle='#ffaabb';ctx.beginPath();ctx.moveTo(cx,hy+7);ctx.lineTo(cx-4,hy+12);ctx.lineTo(cx+4,hy+12);ctx.closePath();ctx.fill();
    // Mouth
    ctx.strokeStyle='rgba(80,40,40,.8)';ctx.lineWidth=1.5;ctx.lineCap='round';
    if(s==='happy'||s==='content'){
      const smileD=s==='happy'?6:3;
      ctx.beginPath();ctx.moveTo(cx-6,hy+14);ctx.quadraticCurveTo(cx,hy+14+smileD,cx+6,hy+14);ctx.stroke();
    }else if(s==='hissing'||s==='angry'){
      ctx.beginPath();ctx.moveTo(cx-6,hy+18);ctx.quadraticCurveTo(cx,hy+12,cx+6,hy+18);ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillRect(cx-5,hy+12,4,5);ctx.fillRect(cx+1,hy+12,4,5);
    }else{
      ctx.beginPath();ctx.moveTo(cx-4,hy+14);ctx.lineTo(cx,hy+17);ctx.lineTo(cx+4,hy+14);ctx.stroke();
    }
    // Whiskers
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.8;
    [[cx-7,hy+9,cx-36,hy+5],[cx-7,hy+11,cx-36,hy+11],[cx-7,hy+13,cx-36,hy+17],
     [cx+7,hy+9,cx+36,hy+5],[cx+7,hy+11,cx+36,hy+11],[cx+7,hy+13,cx+36,hy+17]]
    .forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
    // Tail
    ctx.strokeStyle=bc;ctx.lineWidth=8;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx+26,by+42);ctx.quadraticCurveTo(cx+58,by+30,cx+52,by+8);ctx.stroke();
    ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath();ctx.moveTo(cx+26,by+42);ctx.quadraticCurveTo(cx+58,by+30,cx+52,by+8);ctx.stroke();
    // Paws
    ctx.fillStyle=bc;ctx.shadowBlur=0;
    ctx.beginPath();ctx.ellipse(cx-16,by+50,11,7,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx+16,by+50,11,7,0,0,Math.PI*2);ctx.fill();
    // Yarn ball toy
    const toyX=cat.toyX??cx;const toyY=by+66;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(toyX,toyY+9,9,3.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff88aa';ctx.shadowColor='#ff88aa';ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(toyX,toyY,8,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,160,200,.75)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(toyX-4,toyY-6);ctx.quadraticCurveTo(toyX+4,toyY,toyX-3,toyY+6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(toyX+4,toyY-6);ctx.quadraticCurveTo(toyX-4,toyY,toyX+3,toyY+6);ctx.stroke();
    ctx.restore();
    // Swat paw
    if((cat.swatT??0)>0){
      const prog=Math.sin(cat.swatT/34*Math.PI);
      const side=(cat.toyX??cx)<cx?-1:1;
      ctx.save();ctx.fillStyle=bc;ctx.shadowColor=glowCol;ctx.shadowBlur=8;
      ctx.beginPath();ctx.ellipse(cx+side*16,by+50+prog*19,11,7,side*.18*prog,0,Math.PI*2);ctx.fill();
      if(prog>0.55){ctx.strokeStyle=bc+'88';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.globalAlpha=.4;
        for(let ml=1;ml<=3;ml++){ctx.beginPath();ctx.moveTo(cx+side*16,by+44-ml*4);ctx.lineTo(cx+side*22,by+44-ml*4+2);ctx.stroke();}
      }
      ctx.restore();
    }
  }
  ctx.restore();
  // Pet anim — floating hearts
  if((cat.petAnim??0)>0){
    const pa=cat.petAnim/40;
    ctx.save();ctx.globalAlpha=pa;ctx.font='14px sans-serif';ctx.textAlign='center';
    ctx.fillText('💗',cx-10,cy-20-cat.petAnim*0.4);
    ctx.fillText('💗',cx+12,cy-28-cat.petAnim*0.3);
    ctx.restore();
  }
  // Feed anim — floating icon
  if((cat.feedAnim??0)>0){
    const fa=cat.feedAnim/60;
    ctx.save();ctx.globalAlpha=fa;ctx.font='16px sans-serif';ctx.textAlign='center';
    const fy=cy+(cat.feedAnimY??0);
    const foodIcon=cat.lastFood==='fish'?'🐟':cat.lastFood==='catnip'?'🌿':cat.lastFood==='milk'?'🥛':'🍖';
    ctx.fillText(foodIcon,cx,fy-10);
    ctx.restore();
  }
  // State label (below sprite)
  const labelY=cy+102+bob;
  if(s==='happy'){
    ctx.fillStyle='#ffdd88';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.fillText('purrr~',cx,labelY);
  }else if(s==='playing'){
    ctx.save();ctx.globalAlpha=0.7+Math.sin(t*.12)*.3;ctx.fillStyle='#ffee44';ctx.font='bold 10px Orbitron';ctx.textAlign='center';
    ctx.shadowColor='#ffee44';ctx.shadowBlur=10;ctx.fillText('PLAYING!',cx,labelY);ctx.restore();
  }else if(s==='sleeping'){
    ctx.save();ctx.globalAlpha=0.5+Math.sin(t*.03)*.3;ctx.fillStyle='#cc99ff';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.fillText('zzz~',cx,labelY+4);ctx.restore();
  }else if(s==='content'){
    ctx.fillStyle='#aaddff';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.fillText('~cozy~',cx,labelY);
  }else if(s==='hissing'){
    ctx.save();ctx.globalAlpha=.5+Math.sin(t*.25)*.5;ctx.fillStyle='#ff4422';ctx.font='bold 11px Orbitron';ctx.textAlign='center';
    ctx.fillText('HISSS!',cx,labelY);ctx.restore();
  }else if(s==='angry'){
    const msgs=['!!','>:C','NO MORE','BORED'];
    ctx.fillStyle='#ff7700';ctx.font='bold 10px Orbitron';ctx.textAlign='center';
    ctx.fillText(msgs[Math.floor(t/35)%msgs.length],cx,labelY);
  }
  // Fav food badge
  const favIcon=cat.favFood==='fish'?'🐟':cat.favFood==='catnip'?'🌿':'✨';
  ctx.save();ctx.globalAlpha=.65;ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(favIcon,cx+26,cy-10+bob);ctx.restore();
}
function drawCats(){
  // ── Garden background ─────────────────────────────────────────────────────
  // Sky gradient
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#0d0626');sky.addColorStop(.45,'#1a0840');sky.addColorStop(.75,'#0c2218');sky.addColorStop(1,'#0a1a0a');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Stars
  ctx.save();
  for(let si=0;si<60;si++){
    const sx=((si*137+si*si*11)%W),sy=((si*97+si*43)%(H*0.6));
    const sbr=0.3+Math.sin(animTick*.04+si)*.35;
    ctx.globalAlpha=sbr;ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(sx,sy,si%4===0?1.5:0.8,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Moon
  const moonX=820,moonY=55;
  ctx.save();ctx.shadowColor='#fff8cc';ctx.shadowBlur=40+Math.sin(animTick*.03)*8;
  ctx.fillStyle='#fffce8';ctx.beginPath();ctx.arc(moonX,moonY,30,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#ccccaa';ctx.beginPath();ctx.arc(moonX+8,moonY-4,22,0,Math.PI*2);ctx.fill();ctx.restore();
  // Clouds
  [[160,80,.7],[400,55,.55],[640,90,.6]].forEach(([cx2,cy2,al],ci)=>{
    const drift=Math.sin(animTick*.008+ci)*6;
    ctx.save();ctx.globalAlpha=al*.22;ctx.fillStyle='#ddeeff';
    ctx.beginPath();ctx.ellipse(cx2+drift,cy2,48,20,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx2+drift-24,cy2+6,28,15,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx2+drift+22,cy2+5,32,16,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
  // Ground strip (grass)
  const grassY=H-50;
  const gg=ctx.createLinearGradient(0,grassY,0,H);gg.addColorStop(0,'#1a4a1a');gg.addColorStop(1,'#0d2a0d');
  ctx.fillStyle=gg;ctx.fillRect(0,grassY,W,H-grassY);
  // Grass blades (decorative)
  ctx.save();ctx.strokeStyle='#2d7a2d';ctx.lineWidth=1.5;
  for(let gb=0;gb<60;gb++){
    const gx2=(gb*151)%W,gh=6+((gb*37)%14);const gsw=Math.sin(animTick*.025+gb*.4)*2;
    ctx.beginPath();ctx.moveTo(gx2,grassY);ctx.quadraticCurveTo(gx2+gsw,grassY-gh/2,gx2+gsw*1.5,grassY-gh);ctx.stroke();
  }
  ctx.restore();
  // Flowers
  [[80,grassY-4,'#ff88cc'],[220,grassY-5,'#ffee44'],[380,grassY-3,'#ff66aa'],[530,grassY-5,'#88ffcc'],
   [650,grassY-4,'#ffaa55'],[800,grassY-3,'#cc88ff']].forEach(([fx,fy,fc])=>{
    const fbl=Math.sin(animTick*.03+fx*.01)*1.5;
    ctx.save();ctx.shadowColor=fc;ctx.shadowBlur=8+fbl;
    ctx.fillStyle=fc;ctx.beginPath();ctx.arc(fx,fy,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffff99';ctx.beginPath();ctx.arc(fx,fy,1.8,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
  // Fireflies
  for(let ff=0;ff<8;ff++){
    const ffx=((ff*173+animTick*.3+ff*animTick*.02)%W);
    const ffy=H*0.4+Math.sin(animTick*.02+ff*1.1)*60;
    const ffa=0.3+Math.sin(animTick*.06+ff*0.9)*.4;
    ctx.save();ctx.globalAlpha=ffa;ctx.fillStyle='#aaff66';ctx.shadowColor='#88ff44';ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(ffx,ffy,2,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  // Title
  ctx.save();ctx.shadowColor='#ffaaff';ctx.shadowBlur=22;
  ctx.fillStyle='#ffccff';ctx.font='bold 22px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('CATNIP GARDEN 🌿',W/2,34);ctx.restore();
  ctx.fillStyle='rgba(200,160,255,.5)';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('KEEP CATS HAPPY · FAV FOOD = BONUS · SLEEPING = BLISS · PET FOR +8 MOOD',W/2,54);
  // Cat cards
  cats.forEach((c,i)=>{
    const cardX=c.x-82;const cardW=166;
    const stateGlow={happy:'rgba(255,210,60,.18)',content:'rgba(100,160,255,.14)',neutral:'rgba(90,90,170,.1)',hissing:'rgba(255,50,10,.18)',angry:'rgba(255,110,0,.22)',sleeping:'rgba(180,100,255,.18)'}[c.state]||'rgba(90,90,170,.1)';
    // Card
    ctx.save();
    ctx.fillStyle='rgba(14,5,28,.92)';ctx.beginPath();ctx.roundRect(cardX,68,cardW,386,10);ctx.fill();
    ctx.fillStyle=stateGlow;ctx.beginPath();ctx.roundRect(cardX,68,cardW,386,10);ctx.fill();
    // Animated state border
    const bCol={happy:'rgba(255,210,60,.5)',content:'rgba(100,180,255,.4)',neutral:'rgba(130,100,200,.25)',hissing:'rgba(255,50,10,.5)',angry:'rgba(255,130,0,.5)',sleeping:'rgba(180,100,255,.45)',playing:'rgba(255,230,0,.5)'}[c.state]||'rgba(130,100,200,.25)';
    ctx.strokeStyle=bCol;ctx.lineWidth=c.state==='playing'?2.5:1.5;ctx.beginPath();ctx.roundRect(cardX,68,cardW,386,10);ctx.stroke();
    ctx.restore();
    // Cat name + fav food icon
    const favIcon=c.favFood==='fish'?'🐟':c.favFood==='catnip'?'🌿':'✨';
    ctx.fillStyle='rgba(255,215,255,.75)';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(c.name+' '+favIcon,c.x,82);
    // Cat sprite
    drawCatSprite(c.x,155,c);
    // Happiness bar
    const barY=310;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.roundRect(cardX+8,barY,150,11,4);ctx.fill();
    const hpCol=c.hp>=92?'#cc88ff':c.hp>=70?'#77ee33':c.hp>=50?'#44ccff':c.hp>=30?'#ffdd33':'#ff3322';
    const hpG=ctx.createLinearGradient(cardX+8,barY,cardX+158,barY+11);hpG.addColorStop(0,hpCol);hpG.addColorStop(1,'rgba(255,255,255,.18)');
    ctx.fillStyle=hpG;ctx.beginPath();ctx.roundRect(cardX+8,barY,Math.max(0,c.hp/100*150),11,4);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.38)';ctx.font='6px Orbitron';ctx.textAlign='center';
    ctx.fillText('MOOD '+Math.round(c.hp)+'%',c.x,barY+21);
    // Purr/sleep progress bar
    if((c.state==='happy'||c.state==='sleeping')&&c.purrT>0){
      const pp=c.purrT/300;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.roundRect(cardX+8,barY+27,150,6,3);ctx.fill();
      const purG=ctx.createLinearGradient(cardX+8,barY+27,cardX+158,barY+33);purG.addColorStop(0,c.state==='sleeping'?'#cc88ff':'#ffaabb');purG.addColorStop(1,c.state==='sleeping'?'#aa66ff':'#ff66aa');
      ctx.fillStyle=purG;ctx.beginPath();ctx.roundRect(cardX+8,barY+27,pp*150,6,3);ctx.fill();
      ctx.fillStyle='rgba(255,180,220,.7)';ctx.font='6px Orbitron';ctx.textAlign='center';
      ctx.fillText(c.state==='sleeping'?'+5 ◉ soon':'+7 ◉ soon',c.x,barY+43);
    }
    // Feed button
    ctx.save();
    const btnY=358;const hasFood=catSelectedFood==='fish'?catFishStock>0:catNipStock>0;
    const isFavFeed=c.favFood===catSelectedFood||c.favFood==='either';
    ctx.shadowColor=hasFood?'#cc88ff':'#334';ctx.shadowBlur=hasFood?12:3;
    ctx.fillStyle=hasFood?'rgba(70,25,110,.92)':'rgba(20,18,30,.8)';ctx.beginPath();ctx.roundRect(cardX+8,btnY,150,28,7);ctx.fill();
    ctx.strokeStyle=hasFood?(isFavFeed?'rgba(255,220,80,.6)':'rgba(180,120,255,.35)'):'rgba(70,55,90,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cardX+8,btnY,150,28,7);ctx.stroke();
    ctx.fillStyle=hasFood?'#ddaaff':'#554466';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    const foodLabel=catSelectedFood==='fish'?'FEED FISH':'FEED CATNIP';
    ctx.fillText(foodLabel+(isFavFeed?'  ★':'')+(hasFood?' ('+(catSelectedFood==='fish'?catFishStock:catNipStock)+')':''),c.x,btnY+14);
    ctx.restore();
    // Pet button
    const petY=392;const petRdy=c.petCooldown<=0;
    ctx.save();
    ctx.shadowColor=petRdy?'#ff99cc':'#334';ctx.shadowBlur=petRdy?10:2;
    ctx.fillStyle=petRdy?'rgba(110,30,70,.88)':'rgba(20,15,28,.7)';ctx.beginPath();ctx.roundRect(cardX+8,petY,150,28,7);ctx.fill();
    ctx.strokeStyle=petRdy?'rgba(255,140,180,.45)':'rgba(60,45,70,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cardX+8,petY,150,28,7);ctx.stroke();
    ctx.fillStyle=petRdy?'#ffbbdd':'#443355';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    if(petRdy){ctx.fillText('✋ PET  (+8 MOOD)',c.x,petY+14);}
    else{
      const cdSec=Math.ceil(c.petCooldown/60);
      // Pet cooldown bar
      const pbar=(1-c.petCooldown/480)*150;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.roundRect(cardX+8,petY,150,28,7);ctx.fill();
      ctx.fillStyle='rgba(255,100,160,.25)';ctx.beginPath();ctx.roundRect(cardX+8,petY,pbar,28,7);ctx.fill();
      ctx.fillStyle='#664466';ctx.fillText('PET COOLDOWN  '+cdSec+'s',c.x,petY+14);
    }
    ctx.restore();
    // Play button
    const playY=426;const playRdy=(c.playCooldown??0)<=0&&c.state!=='angry';
    ctx.save();
    ctx.shadowColor=c.state==='playing'?'#ffee00':playRdy?'#ffdd44':'#334';ctx.shadowBlur=c.state==='playing'?18:playRdy?10:2;
    ctx.fillStyle=c.state==='playing'?'rgba(100,80,0,.95)':playRdy?'rgba(90,70,0,.88)':'rgba(20,15,28,.7)';
    ctx.beginPath();ctx.roundRect(cardX+8,playY,150,28,7);ctx.fill();
    ctx.strokeStyle=c.state==='playing'?'#ffee00':playRdy?'rgba(255,210,60,.5)':'rgba(60,45,70,.3)';
    ctx.lineWidth=c.state==='playing'?2:1;ctx.beginPath();ctx.roundRect(cardX+8,playY,150,28,7);ctx.stroke();
    ctx.fillStyle=c.state==='playing'?'#ffff88':playRdy?'#ffdd88':'#554433';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    if(c.state==='playing'){ctx.fillText('🎾 PLAYING!',c.x,playY+14);}
    else if(playRdy){ctx.fillText('🎾 PLAY  (+10 MOOD)',c.x,playY+14);}
    else if(c.state==='angry'){ctx.fillStyle='#664444';ctx.fillText('TOO ANGRY TO PLAY',c.x,playY+14);}
    else{
      const pcdSec=Math.ceil(c.playCooldown/60);
      const plbar=(1-c.playCooldown/360)*150;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.roundRect(cardX+8,playY,150,28,7);ctx.fill();
      ctx.fillStyle='rgba(200,180,0,.2)';ctx.beginPath();ctx.roundRect(cardX+8,playY,plbar,28,7);ctx.fill();
      ctx.fillStyle='#665533';ctx.fillText('PLAY COOLDOWN  '+pcdSec+'s',c.x,playY+14);
    }
    ctx.restore();
  });
  // Food selector (4 types)
  const selY=462;
  const foods=[
    {key:'fish',icon:'🐟',label:'FISH',stock:catFishStock,col:'#00ccff',bg:'rgba(0,70,130,.9)',sel:'rgba(14,14,30,.8)'},
    {key:'catnip',icon:'🌿',label:'CATNIP',stock:catNipStock,col:'#77ff44',bg:'rgba(20,80,12,.9)',sel:'rgba(14,14,30,.8)'},
    {key:'milk',icon:'🥛',label:'MILK',stock:catMilkStock,col:'#ddeeff',bg:'rgba(20,50,80,.9)',sel:'rgba(14,14,30,.8)'},
    {key:'treat',icon:'🍖',label:'TREAT',stock:catTreatStock,col:'#ffaa44',bg:'rgba(90,40,0,.9)',sel:'rgba(14,14,30,.8)'},
  ];
  const selW=200,selGap=6,selStart=(W-foods.length*(selW+selGap)+selGap)/2;
  foods.forEach((f,fi)=>{
    const fx=selStart+fi*(selW+selGap);const isSel=catSelectedFood===f.key;
    ctx.save();
    ctx.shadowColor=isSel?f.col:'#222';ctx.shadowBlur=isSel?14:3;
    ctx.fillStyle=isSel?f.bg:f.sel;ctx.beginPath();ctx.roundRect(fx,selY,selW,38,7);ctx.fill();
    if(isSel){ctx.strokeStyle=f.col;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(fx,selY,selW,38,7);ctx.stroke();}
    ctx.fillStyle=isSel?f.col:'#446688';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(f.icon+' '+f.label+'  ['+f.stock+']',fx+selW/2,selY+19);ctx.restore();
  });
  // Hint
  ctx.fillStyle='rgba(160,120,240,.38)';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('SAME FOOD 3× = ANGRY · FAV FOOD (★) GIVES BONUS · PET/PLAY FOR FREE MOOD',W/2,508);
  // Coins
  ctx.save();ctx.shadowColor='#FFD700';ctx.shadowBlur=14;ctx.fillStyle='#FFD700';ctx.font='bold 14px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('COINS: '+totalCoins,14,36);ctx.restore();
  // Back button
  ctx.save();ctx.shadowColor='#cc1111';ctx.shadowBlur=10;ctx.fillStyle='rgba(150,10,10,.9)';ctx.beginPath();ctx.roundRect(10,8,80,38,6);ctx.fill();ctx.restore();
  ctx.fillStyle='#ffaaaa';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BACK',50,29);
  // CAT SHOP button
  ctx.save();ctx.shadowColor='#ffaa44';ctx.shadowBlur=14;ctx.fillStyle='rgba(110,55,0,.95)';ctx.beginPath();ctx.roundRect(W-106,8,96,38,6);ctx.fill();
  ctx.strokeStyle='#ffaa44';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W-106,8,96,38,6);ctx.stroke();ctx.restore();
  ctx.fillStyle='#ffcc88';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CAT SHOP',W-58,27);
}

// ══════════════════════════════════════════
//  CAT SHOP
// ══════════════════════════════════════════
function drawCatShop(){
  ctx.fillStyle='#06020f';ctx.fillRect(0,0,W,H);
  // Subtle grid
  ctx.save();ctx.globalAlpha=.03;
  for(let gy=0;gy<H;gy+=22)for(let gx=0;gx<W;gx+=22){ctx.fillStyle='#ffaa44';ctx.fillRect(gx,gy,11,11);}
  ctx.restore();
  // Title
  ctx.save();ctx.shadowColor='#ffcc44';ctx.shadowBlur=28;
  ctx.fillStyle='#ffe088';ctx.font='bold 22px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('CAT SHOP',W/2,32);ctx.restore();
  ctx.fillStyle='rgba(255,200,130,.4)';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('BUY FOOD SUPPLIES AND UNLOCK CAT THEMES',W/2,52);
  // Coins display
  ctx.save();ctx.shadowColor='#FFD700';ctx.shadowBlur=14;ctx.fillStyle='#FFD700';ctx.font='bold 14px Orbitron';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText('COINS: '+totalCoins,W-14,32);ctx.restore();
  // Back button
  ctx.save();ctx.shadowColor='#cc1111';ctx.shadowBlur=10;ctx.fillStyle='rgba(150,10,10,.9)';ctx.beginPath();ctx.roundRect(10,8,80,38,6);ctx.fill();ctx.restore();
  ctx.fillStyle='#ffaaaa';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BACK',50,27);

  // ── FOOD SUPPLIES section ──────────────────────────────────────────────────
  ctx.save();ctx.fillStyle='rgba(255,170,60,.6)';ctx.font='bold 10px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('FOOD SUPPLIES',22,78);ctx.restore();
  ctx.strokeStyle='rgba(255,170,60,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(22,88);ctx.lineTo(W-22,88);ctx.stroke();

  // Food cards data: [x, y, bg, stroke, nameCol, descCol, icon, name, desc1, desc2, stock, cost, buyCol, buyStroke, textCol]
  const shopFoods=[
    {x:22,y:96,bg:'rgba(0,40,80,.8)',bdr:'rgba(0,180,255,.25)',nc:'#aaeeff',dc:'rgba(140,220,255,.6)',icon:'🐟',name:'FISH BUNDLE x10',d1:'Each fish feeds +22 happiness',d2:null,stock:catFishStock,cost:15,qty:10,canBuyCol:'rgba(0,80,160,.9)',canBuyBdr:'#44ccff',canBuyTxt:'#aaeeff'},
    {x:462,y:96,bg:'rgba(15,50,5,.8)',bdr:'rgba(100,255,80,.2)',nc:'#aaffaa',dc:'rgba(150,255,120,.6)',icon:'🌿',name:'CATNIP BUNDLE x10',d1:'Each catnip feeds +38 happiness',d2:'(potent!)',stock:catNipStock,cost:22,qty:10,canBuyCol:'rgba(20,90,10,.9)',canBuyBdr:'#88ff44',canBuyTxt:'#aaffaa'},
    {x:22,y:186,bg:'rgba(5,20,50,.8)',bdr:'rgba(120,180,255,.2)',nc:'#ccddff',dc:'rgba(160,200,255,.6)',icon:'🥛',name:'MILK BUNDLE x10',d1:'Each milk feeds +12 happiness',d2:'Great for kittens!',stock:catMilkStock,cost:8,qty:10,canBuyCol:'rgba(10,40,100,.9)',canBuyBdr:'#88aaff',canBuyTxt:'#ccddff'},
    {x:462,y:186,bg:'rgba(60,20,0,.8)',bdr:'rgba(255,150,50,.2)',nc:'#ffcc88',dc:'rgba(255,180,100,.6)',icon:'🍖',name:'MEATY TREATS x5',d1:'Each treat feeds +50 happiness',d2:'Use sparingly!',stock:catTreatStock,cost:35,qty:5,canBuyCol:'rgba(120,50,0,.9)',canBuyBdr:'#ff9944',canBuyTxt:'#ffcc88'},
  ];
  shopFoods.forEach(sf=>{
    const cw=416,ch=74;
    ctx.save();ctx.fillStyle=sf.bg;ctx.beginPath();ctx.roundRect(sf.x,sf.y,cw,ch,8);ctx.fill();
    ctx.strokeStyle=sf.bdr;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(sf.x,sf.y,cw,ch,8);ctx.stroke();ctx.restore();
    ctx.save();ctx.font='bold 11px Orbitron';ctx.fillStyle=sf.nc;ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(sf.icon+' '+sf.name,sf.x+14,sf.y+18);
    ctx.font='7px Orbitron';ctx.fillStyle=sf.dc;
    ctx.fillText(sf.d1,sf.x+14,sf.y+34);
    if(sf.d2)ctx.fillText(sf.d2,sf.x+14,sf.y+46);
    ctx.fillText('In stock: '+sf.stock,sf.x+14,sf.y+58);ctx.restore();
    const canBuy=totalCoins>=sf.cost;
    ctx.save();ctx.shadowColor=canBuy?sf.canBuyBdr:'#333';ctx.shadowBlur=canBuy?10:0;
    ctx.fillStyle=canBuy?sf.canBuyCol:'rgba(30,30,50,.7)';ctx.beginPath();ctx.roundRect(sf.x+cw-76,sf.y+8,68,38,6);ctx.fill();
    ctx.strokeStyle=canBuy?sf.canBuyBdr:'rgba(60,60,100,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(sf.x+cw-76,sf.y+8,68,38,6);ctx.stroke();ctx.restore();
    ctx.fillStyle=canBuy?sf.canBuyTxt:'#445566';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('BUY',sf.x+cw-76+34,sf.y+21);ctx.fillText(sf.cost+' COINS',sf.x+cw-76+34,sf.y+35);
  });

  // ── CAT THEMES section ─────────────────────────────────────────────────────
  ctx.save();ctx.fillStyle='rgba(255,170,255,.6)';ctx.font='bold 10px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('CAT THEMES',22,280);ctx.restore();
  ctx.strokeStyle='rgba(255,150,255,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(22,290);ctx.lineTo(W-22,290);ctx.stroke();

  const skinCardW=160,skinCardH=200,skinGap=20;
  const skinStartX=(W-CAT_SKIN_DATA.length*(skinCardW+skinGap)+skinGap)/2;
  CAT_SKIN_DATA.forEach((sk,i)=>{
    const cx2=skinStartX+i*(skinCardW+skinGap);const cy2=298;
    const isActive=activeCatSkin===i;const isOwned=unlockedCatSkins.includes(i);
    // Card bg
    ctx.save();
    if(isActive){ctx.shadowColor='#ffcc44';ctx.shadowBlur=18;}
    ctx.fillStyle=isActive?'rgba(60,40,5,.95)':'rgba(18,10,30,.85)';ctx.beginPath();ctx.roundRect(cx2,cy2,skinCardW,skinCardH,8);ctx.fill();
    ctx.strokeStyle=isActive?'#ffcc44':isOwned?'rgba(180,130,255,.4)':'rgba(80,70,100,.3)';ctx.lineWidth=isActive?2:1;ctx.beginPath();ctx.roundRect(cx2,cy2,skinCardW,skinCardH,8);ctx.stroke();ctx.restore();
    // Theme name
    ctx.fillStyle=isActive?'#ffe088':isOwned?'#ccaaff':'rgba(140,120,170,.7)';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(sk.name,cx2+skinCardW/2,cy2+16);
    // Show 3 mini cat sprites (one per color)
    sk.cols.forEach((col,ci)=>{
      const previewCX=cx2+27+ci*38;const previewCY=cy2+60;
      const fakeCat={col,state:'neutral',t:animTick+ci*40,favFood:'fish',toyX:previewCX,swatT:0,petAnim:0,feedAnim:0,lastFood:null,playing:false};
      ctx.save();ctx.translate(previewCX,previewCY);ctx.scale(0.28,0.28);ctx.translate(-previewCX,-previewCY);
      drawCatSprite(previewCX,previewCY,fakeCat);
      ctx.restore();
      const names=['MOCHI','BISC','LUNA'];
      ctx.fillStyle='rgba(200,180,255,.55)';ctx.font='5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(names[ci],previewCX,cy2+82);
    });
    // Description
    ctx.fillStyle='rgba(180,160,220,.5)';ctx.font='6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(sk.desc,cx2+skinCardW/2,cy2+92);
    // Buy / Active / Owned button
    const btnY=cy2+skinCardH-44;
    if(isActive){
      ctx.save();ctx.fillStyle='rgba(100,70,0,.8)';ctx.beginPath();ctx.roundRect(cx2+10,btnY,skinCardW-20,32,6);ctx.fill();ctx.restore();
      ctx.fillStyle='#ffee88';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('EQUIPPED',cx2+skinCardW/2,btnY+16);
    } else if(isOwned){
      ctx.save();ctx.fillStyle='rgba(20,50,20,.85)';ctx.beginPath();ctx.roundRect(cx2+10,btnY,skinCardW-20,32,6);ctx.fill();
      ctx.strokeStyle='rgba(100,220,80,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cx2+10,btnY,skinCardW-20,32,6);ctx.stroke();ctx.restore();
      ctx.fillStyle='#aaffaa';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('EQUIP',cx2+skinCardW/2,btnY+16);
    } else {
      const canAfford=totalCoins>=sk.cost;
      ctx.save();ctx.shadowColor=canAfford?'#ffaa44':'#333';ctx.shadowBlur=canAfford?8:0;
      ctx.fillStyle=canAfford?'rgba(100,50,0,.9)':'rgba(30,25,40,.8)';ctx.beginPath();ctx.roundRect(cx2+10,btnY,skinCardW-20,32,6);ctx.fill();
      ctx.strokeStyle=canAfford?'#ffaa44':'rgba(70,60,90,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(cx2+10,btnY,skinCardW-20,32,6);ctx.stroke();ctx.restore();
      ctx.fillStyle=canAfford?'#ffdd88':'#665555';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(sk.cost===0?'FREE':'BUY '+sk.cost+' COINS',cx2+skinCardW/2,btnY+16);
    }
  });
}

// ══════════════════════════════════════════
//  STORY MAP
// ══════════════════════════════════════════
function drawStoryMap(){
  // Background
  ctx.fillStyle='rgba(0,3,18,.96)';ctx.fillRect(0,0,W,H);
  // Ambient grid
  ctx.save();ctx.globalAlpha=.07;ctx.strokeStyle='#0044aa';ctx.lineWidth=.5;
  for(let gx=0;gx<W;gx+=40){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
  for(let gy=0;gy<H;gy+=40){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
  ctx.restore();

  // Title
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=30+Math.sin(animTick*.05)*8;
  ctx.fillStyle='#00eeff';ctx.font='bold 28px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('STORY MODE',W/2,36);ctx.restore();
  ctx.save();ctx.fillStyle='rgba(0,200,255,.45)';ctx.font='8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('SELECT A LEVEL · GOLD = COMPLETED · LOCK = NOT YET REACHED',W/2,62);ctx.restore();

  // Back button
  ctx.save();ctx.fillStyle='rgba(0,40,80,.9)';ctx.beginPath();ctx.roundRect(8,8,105,38,6);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8,8,105,38,6);ctx.stroke();
  ctx.fillStyle='#88ccff';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('← MENU',60,27);ctx.restore();

  // Node layout: row 1 = levels 1-5, row 2 = levels 6-10 (right to left for snake)
  const LEVEL_META=[
    {name:'SPACE',     col:'#44aaff'},
    {name:'FOREST',    col:'#44ee66'},
    {name:'ICE WORLD', col:'#44ddff'},
    {name:'INFERNO',   col:'#ff6600'},
    {name:'THE VOID',  col:'#ee00ff'},
    {name:'DEEP SPACE',col:'#6688ff'},
    {name:'STORM ZONE',col:'#88ddff'},
    {name:'MOLTEN CORE',col:'#ff4400'},
    {name:'NULL VOID II',col:'#cc00ff'},
    {name:'THE ABYSS', col:'#ff0088'},
  ];
  const smNodes=[
    {lv:0,nx:90, ny:230},{lv:1,nx:225,ny:230},{lv:2,nx:360,ny:230},
    {lv:3,nx:495,ny:230},{lv:4,nx:630,ny:230},
    {lv:5,nx:630,ny:400},{lv:6,nx:495,ny:400},{lv:7,nx:360,ny:400},
    {lv:8,nx:225,ny:400},{lv:9,nx:90, ny:400},
  ];

  // Draw connector lines first (behind nodes)
  ctx.save();ctx.lineWidth=3;ctx.setLineDash([8,6]);
  const lineSegs=[
    [0,1],[1,2],[2,3],[3,4], // row 1
    [4,5],                   // vertical drop
    [5,6],[6,7],[7,8],[8,9], // row 2
  ];
  lineSegs.forEach(([ai,bi])=>{
    const a=smNodes[ai],b=smNodes[bi];
    const aDone=completedLevels.includes(a.lv);
    const bUnlocked=b.lv===0||completedLevels.includes(b.lv-1);
    ctx.strokeStyle=aDone?'rgba(255,215,0,.6)':bUnlocked?'rgba(0,200,255,.4)':'rgba(80,80,100,.3)';
    ctx.shadowColor=aDone?'#FFD700':bUnlocked?'#00ccff':'transparent';ctx.shadowBlur=aDone?8:0;
    ctx.beginPath();ctx.moveTo(a.nx,a.ny);ctx.lineTo(b.nx,b.ny);ctx.stroke();
  });
  ctx.setLineDash([]);ctx.restore();

  // Draw nodes
  smNodes.forEach(({lv,nx,ny})=>{
    const done=completedLevels.includes(lv);
    const unlocked=lv===0||completedLevels.includes(lv-1);
    const meta=LEVEL_META[lv];
    const pulse=Math.sin(animTick*.08+lv*.7)*.5;
    const nr=38; // node radius

    ctx.save();
    if(done){
      ctx.shadowColor='#FFD700';ctx.shadowBlur=22+pulse*8;
      const g=ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
      g.addColorStop(0,'#ffe066');g.addColorStop(.6,'#cc8800');g.addColorStop(1,'#4d3200');
      ctx.fillStyle=g;
    }else if(unlocked){
      ctx.shadowColor=meta.col;ctx.shadowBlur=16+pulse*6;
      const g=ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
      g.addColorStop(0,meta.col+'cc');g.addColorStop(.6,meta.col+'55');g.addColorStop(1,'#001122');
      ctx.fillStyle=g;
    }else{
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(20,25,40,.9)';
    }
    ctx.beginPath();ctx.arc(nx,ny,nr,0,Math.PI*2);ctx.fill();
    // Border
    ctx.strokeStyle=done?'#FFD700':unlocked?meta.col:'rgba(60,70,90,.8)';
    ctx.lineWidth=done?2.5:unlocked?2:1;
    ctx.beginPath();ctx.arc(nx,ny,nr,0,Math.PI*2);ctx.stroke();
    ctx.restore();

    // Level number
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    if(done){
      ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=10;
      ctx.font='bold 16px Orbitron';ctx.fillText(lv+1,nx,ny-7);
      ctx.font='bold 14px sans-serif';ctx.fillText('★',nx,ny+10);
    }else if(unlocked){
      ctx.fillStyle='#fff';ctx.shadowColor=meta.col;ctx.shadowBlur=8;
      ctx.font='bold 18px Orbitron';ctx.fillText(lv+1,nx,ny-4);
      ctx.font='bold 8px Orbitron';ctx.fillStyle=meta.col;ctx.shadowBlur=0;ctx.fillText('▶ PLAY',nx,ny+13);
    }else{
      ctx.fillStyle='rgba(120,130,150,.7)';ctx.font='bold 18px Orbitron';ctx.fillText(lv+1,nx,ny-4);
      ctx.font='16px sans-serif';ctx.fillStyle='rgba(120,130,160,.5)';ctx.fillText('🔒',nx,ny+10);
    }
    ctx.restore();

    // Level name below node
    ctx.save();ctx.textAlign='center';ctx.textBaseline='top';
    ctx.font='7px Orbitron';
    ctx.fillStyle=done?'#ccaa44':unlocked?meta.col+'cc':'rgba(80,90,110,.7)';
    ctx.fillText(meta.name,nx,ny+nr+6);ctx.restore();
  });

  // Progress counter bottom-right
  const doneCount=completedLevels.length;
  ctx.save();ctx.fillStyle='rgba(0,10,30,.85)';ctx.beginPath();ctx.roundRect(W-180,H-48,172,40,8);ctx.fill();
  ctx.fillStyle='rgba(0,200,255,.5)';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(`PROGRESS: ${doneCount}/10 WORLDS`,W-94,H-36);
  ctx.fillStyle='rgba(0,180,255,.35)';ctx.beginPath();ctx.roundRect(W-175,H-25,164,12,4);ctx.fill();
  ctx.fillStyle='rgba(0,220,255,.75)';ctx.beginPath();ctx.roundRect(W-175,H-25,Math.max(0,164*doneCount/10),12,4);ctx.fill();
  ctx.restore();
}

// ══════════════════════════════════════════
//  HOME SCREEN
// ══════════════════════════════════════════
function drawPause(){
  // Dim the game world behind
  ctx.save();ctx.fillStyle='rgba(0,3,15,.72)';ctx.fillRect(0,0,W,H);ctx.restore();
  // Panel
  const px=W/2-160,py=H/2-160,pw=320,ph=320;
  ctx.save();
  ctx.shadowColor='#00ccff';ctx.shadowBlur=40;
  ctx.fillStyle='rgba(0,8,28,.96)';ctx.beginPath();ctx.roundRect(px,py,pw,ph,14);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.45)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(px,py,pw,ph,14);ctx.stroke();
  ctx.restore();
  // Title
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=20;
  ctx.fillStyle='#00ccff';ctx.font='bold 22px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('⏸ PAUSED',W/2,py+44);ctx.restore();
  // Divider
  ctx.save();ctx.strokeStyle='rgba(0,180,255,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+24,py+68);ctx.lineTo(px+pw-24,py+68);ctx.stroke();ctx.restore();
  // Buttons
  const btns=[
    {label:'▶ RESUME',y:py+98,col:'#44ff88',bg:'rgba(0,60,30,.9)',border:'#44ff88'},
    {label:'⚙ SETTINGS',y:py+164,col:'#88ccff',bg:'rgba(0,20,60,.9)',border:'#4488ff'},
    {label:'🏠 EXIT TO MENU',y:py+230,col:'#ffaaaa',bg:'rgba(50,0,0,.9)',border:'#ff4444'},
  ];
  btns.forEach(b=>{
    ctx.save();ctx.shadowColor=b.border;ctx.shadowBlur=12;
    ctx.fillStyle=b.bg;ctx.beginPath();ctx.roundRect(px+28,b.y,pw-56,46,8);ctx.fill();
    ctx.strokeStyle=b.border+'88';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(px+28,b.y,pw-56,46,8);ctx.stroke();
    ctx.fillStyle=b.col;ctx.font='bold 12px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b.label,W/2,b.y+23);ctx.restore();
  });
  // ESC hint
  ctx.save();ctx.fillStyle='rgba(100,160,220,.4)';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('ESC — RESUME',W/2,py+ph-18);ctx.restore();
}

function drawSettings(){
  shopParts.forEach(p=>p.draw());
  ctx.fillStyle='rgba(0,3,15,.88)';ctx.fillRect(0,0,W,H);
  // Title
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=30;
  ctx.fillStyle='#00ccff';ctx.font='bold 26px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('⚙ SETTINGS',W/2,52);ctx.restore();
  // Difficulty section header
  ctx.fillStyle='rgba(120,180,255,.7)';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('— DIFFICULTY —',W/2,90);
  // Difficulty buttons
  const diffs=[
    {id:'easy',label:'EASY',color:'#44ff88',desc:'5 LIVES · EASIER ENEMIES · SCORE ×0.75'},
    {id:'medium',label:'MEDIUM',color:'#ffdd44',desc:'3 LIVES · BALANCED · SCORE ×1'},
    {id:'hard',label:'HARD',color:'#ff7722',desc:'2 LIVES · FASTER ENEMIES · SCORE ×1.5'},
    {id:'hardcore',label:'HARDCORE',color:'#ff2244',desc:'1 LIFE · BRUTAL · SCORE ×2.5 · TRUE GAME OVER'},
  ];
  diffs.forEach((d,i)=>{
    const bx=W/2-438+i*222,by=106,bw=208,bh=88;
    const active=difficulty===d.id;
    ctx.save();
    if(active){ctx.shadowColor=d.color;ctx.shadowBlur=22;}
    ctx.fillStyle=active?d.color+'28':'rgba(0,8,30,.75)';
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,9);ctx.fill();
    ctx.strokeStyle=active?d.color:'rgba(80,130,180,.28)';ctx.lineWidth=active?2:1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,9);ctx.stroke();
    ctx.fillStyle=active?d.color:'rgba(160,200,230,.55)';
    ctx.font=`bold 15px Orbitron`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(d.label,bx+bw/2,by+30);
    ctx.fillStyle='rgba(160,200,230,.5)';ctx.font='7px Orbitron';
    ctx.fillText(d.desc,bx+bw/2,by+52);
    if(active){ctx.fillStyle=d.color;ctx.font='bold 9px Orbitron';ctx.fillText('▶ ACTIVE',bx+bw/2,by+70);}
    ctx.restore();
  });
  // Music toggle
  const mb={x:W/2-228,y:214,w:210,h:50};
  ctx.save();
  ctx.fillStyle=musicOn?'rgba(0,70,35,.85)':'rgba(40,10,10,.85)';
  ctx.beginPath();ctx.roundRect(mb.x,mb.y,mb.w,mb.h,8);ctx.fill();
  ctx.strokeStyle=musicOn?'#44ff88':'#ff4444';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(mb.x,mb.y,mb.w,mb.h,8);ctx.stroke();
  ctx.fillStyle=musicOn?'#44ff88':'#ff6666';ctx.font='bold 12px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('🎵 MUSIC: '+(musicOn?'ON':'OFF'),mb.x+mb.w/2,mb.y+mb.h/2);ctx.restore();
  // SFX toggle
  const sb={x:W/2+18,y:214,w:210,h:50};
  ctx.save();
  ctx.fillStyle=sfxOn?'rgba(0,70,35,.85)':'rgba(40,10,10,.85)';
  ctx.beginPath();ctx.roundRect(sb.x,sb.y,sb.w,sb.h,8);ctx.fill();
  ctx.strokeStyle=sfxOn?'#44ff88':'#ff4444';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(sb.x,sb.y,sb.w,sb.h,8);ctx.stroke();
  ctx.fillStyle=sfxOn?'#44ff88':'#ff6666';ctx.font='bold 12px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('🔊 SFX: '+(sfxOn?'ON':'OFF'),sb.x+sb.w/2,sb.y+sb.h/2);ctx.restore();
  // Best scores header
  ctx.fillStyle='rgba(120,180,255,.7)';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('— BEST SCORES —',W/2,288);
  // Score cards
  [{key:'story',label:'STORY MODE',color:'#FFD700'},{key:'endless',label:'ENDLESS',color:'#FF5555'},{key:'risingLava',label:'RISING LAVA',color:'#FF6622'}].forEach((m,i)=>{
    const bx=W/2-290+i*204,by=304,bw=186,bh=64;
    ctx.save();
    ctx.fillStyle='rgba(0,5,25,.75)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7);ctx.fill();
    ctx.strokeStyle=m.color+'44';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7);ctx.stroke();
    ctx.shadowColor=m.color;ctx.shadowBlur=10;ctx.fillStyle=m.color;ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(m.label,bx+bw/2,by+20);
    ctx.shadowBlur=0;ctx.fillStyle='rgba(220,240,255,.9)';ctx.font='bold 20px Orbitron';
    ctx.fillText(bestScores[m.key]||0,bx+bw/2,by+46);
    ctx.restore();
  });
  // Tips
  ctx.save();ctx.fillStyle='rgba(0,5,25,.65)';ctx.beginPath();ctx.roundRect(W/2-300,386,600,40,6);ctx.fill();
  ctx.fillStyle='rgba(120,180,255,.5)';ctx.font='8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('HARDCORE MODE has no endless restart — game over means starting over',W/2,400);
  ctx.fillText('Higher difficulty = more score · Unlock best scores by playing each mode',W/2,414);
  ctx.restore();
  // Bottom row: RESET DATA | BACK | EXIT APP
  // RESET DATA button
  ctx.save();ctx.shadowColor='#ff2244';ctx.shadowBlur=10;ctx.fillStyle='rgba(60,0,10,.9)';ctx.beginPath();ctx.roundRect(W/2-310,446,160,48,9);ctx.fill();
  ctx.strokeStyle='rgba(255,50,80,.45)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W/2-310,446,160,48,9);ctx.stroke();
  ctx.fillStyle='#ff8899';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('⚠ RESET DATA',W/2-230,470);ctx.restore();
  // BACK button
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=14;
  ctx.fillStyle='rgba(0,25,70,.9)';ctx.beginPath();ctx.roundRect(W/2-72,446,144,48,9);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W/2-72,446,144,48,9);ctx.stroke();
  ctx.fillStyle='#88ddff';ctx.font='bold 12px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('◀ BACK',W/2,470);ctx.restore();
  // EXIT APP button
  ctx.save();ctx.shadowColor='#884400';ctx.shadowBlur=10;ctx.fillStyle='rgba(40,14,0,.9)';ctx.beginPath();ctx.roundRect(W/2+150,446,160,48,9);ctx.fill();
  ctx.strokeStyle='rgba(200,100,30,.45)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W/2+150,446,160,48,9);ctx.stroke();
  ctx.fillStyle='#ffcc88';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('✕ EXIT APP',W/2+230,470);ctx.restore();
}

// ══════════════════════════════════════════
//  CHANGELOG
// ══════════════════════════════════════════
function drawChangelog(){
  shopParts.forEach(p=>p.draw());
  ctx.fillStyle='rgba(0,3,18,.96)';ctx.fillRect(0,0,W,H);
  // Title
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=28;ctx.fillStyle='#00ccff';
  ctx.font='bold 24px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('CHANGELOG',W/2,34);ctx.restore();
  ctx.save();ctx.fillStyle='rgba(0,180,255,.25)';ctx.fillRect(0,54,W,1);ctx.restore();

  const log=[
    {ver:'v1.6',col:'#ff44ff',date:'2026',title:'Portals, Arena Mode & Editor Overhaul',items:[
      '8 portal types: gravity flip, mirror world, shrink, ghost, speed boost, score x2, coin storm, bounce',
      'Arena Mode — endless wave survival with inter-wave intermissions and score multipliers',
      'Boss enemies: multi-HP, homing bullet attacks, per-boss HP bar in HUD',
      'Laser beams: configurable interval, instant-kill hazard across any axis',
      'Destructible crates: stand on top or headbutt from below to break, drops coins',
      'Level editor overhaul — 6 palette categories: BLKS / HZRD / ITEM / SPEC / ZONE / PORT',
      'Editor: place portals (8 types), warp gates (4 pairs), bosses, lasers, crates',
      'Speed ghost trail — dense colored afterimages while dashing, rage mode, or speed portal active',
      'Weather effects: rain, snow, embers — varies by level background',
      'Shield bubble: absorbs one hit before breaking, visual bubble effect',
      'Throw stars (E key): 5 per level, homing projectile, kills enemies',
      'Arena wave progress bar: tracks kills to advance, intermission countdown',
      'Off-screen enemy arrows: red/pink arrows at screen edge pointing to unseen enemies',
      'Home screen redesigned as 2×2 mode button grid — no UI overlap',
    ]},
    {ver:'v1.5',col:'#ff8844',date:'2026',title:'Movement, Combat & Events Update',items:[
      'Wall jump & wall slide — cling to walls, gain upward momentum on jump-off',
      'Double-tap dash — tap direction twice to dash; dash trail particles',
      'Kill streak combo system — consecutive kills multiply score, on-screen multiplier display',
      'New powerups: Freeze (stuns all enemies), Coin Shower, Nuke (screen clear), Shield Bubble',
      'Endless events: Spike Rain, Gold Rush (2× coins), Meteor Strike (falling boulders)',
      'Level rank system — S/A/B/C/D grade shown on level clear based on deaths & time',
      'Checkpoint save mid-level — respawn at last checkpoint flag instead of start',
      'Deathless streak bonus: extra coins for completing levels without dying',
      'Minimap — small HUD overlay showing platforms and player position',
      'Music visualizer — HUD bars pulse to the beat during gameplay',
    ]},
    {ver:'v1.4',col:'#FFD700',date:'2026',title:'Story Map & Difficulty Update',items:[
      'Story map screen — all 10 levels visible, locked/unlocked/completed states',
      '5 new story levels: Deep Space, Storm Zone, Molten Core, Null Void II, The Abyss',
      'Difficulty now affects story mode: enemy speed, lava speed & score multipliers',
      'Player drop shadow, off-screen enemy arrows, goal proximity gold glow',
      'Offline coin bonus (1 coin/2min away) + daily login reward (+15 coins)',
      'Jump afterimage ghosts, coin shower on goal, story mode checkpoints',
    ]},
    {ver:'v1.3',col:'#FF6B6B',date:'2025',title:'NEON PLATFORMER — App Release',items:[
      'Packaged as Electron desktop app with custom cube icon installer',
      'Renamed from NEON DASH ULTRA to NEON PLATFORMER',
      'Pause menu (ESC) with Resume / Settings / Exit to Menu',
      'Rage mode: hit → 3.5 sec speed boost, kill enemies on contact',
      'Lucky coins: random 2× coin value events in endless mode',
    ]},
    {ver:'v1.2',col:'#44ff88',date:'2025',title:'Settings & Difficulty Modes',items:[
      'Settings screen: Easy / Medium / Hard / Hardcore difficulty',
      'Best score tracking per mode, score multipliers per difficulty',
      'Touch controls: arrows only appear on first screen touch',
      'SFX toggle, save/load difficulty preference',
    ]},
    {ver:'v1.1',col:'#aa88ff',date:'2025',title:'Editor, Rising Lava & Cats',items:[
      'Level editor with password lock (📐 bottom right)',
      'Rising lava survival mode with spring pads & double jump',
      'Secret cat companion system (🐾 bottom left)',
      'Shop with 16 unique skins, each with its own ability',
    ]},
    {ver:'v1.0',col:'#88ccff',date:'2025',title:'Initial Release',items:[
      '5 story worlds: Space, Forest, Ice, Inferno, The Void',
      'Endless mode with procedurally generated levels',
      'Triple jump, ice physics, kill bricks, secret rooms',
      'Minimap, particle effects, coin system',
    ]},
  ];

  let gy=68;
  log.forEach((entry,ei)=>{
    // Version header bar
    ctx.save();
    ctx.fillStyle='rgba(0,8,28,.85)';ctx.beginPath();ctx.roundRect(18,gy,W-36,22,4);ctx.fill();
    ctx.shadowColor=entry.col;ctx.shadowBlur=10;
    ctx.fillStyle=entry.col;ctx.font='bold 11px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(entry.ver,30,gy+11);
    ctx.shadowBlur=0;ctx.fillStyle='rgba(220,240,255,.75)';ctx.font='bold 10px Orbitron';
    ctx.fillText(entry.title,90,gy+11);
    ctx.fillStyle='rgba(140,180,220,.4)';ctx.textAlign='right';ctx.font='8px Orbitron';
    ctx.fillText(entry.date,W-26,gy+11);
    ctx.restore();
    gy+=24;
    // Bullet items
    entry.items.forEach(item=>{
      ctx.save();ctx.fillStyle=entry.col+'55';ctx.font='8px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText('▸',30,gy+7);
      ctx.fillStyle='rgba(190,220,255,.7)';ctx.font='8px Orbitron';
      ctx.fillText(item,42,gy+7);
      ctx.restore();
      gy+=15;
    });
    gy+=5; // gap between versions
  });

  // Back button
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=14;
  ctx.fillStyle='rgba(0,25,70,.9)';ctx.beginPath();ctx.roundRect(W/2-72,536,144,36,8);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W/2-72,536,144,36,8);ctx.stroke();
  ctx.fillStyle='#88ddff';ctx.font='bold 11px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('◀ BACK',W/2,554);ctx.restore();
}

function drawHome(){
  shopParts.forEach(p=>p.draw());
  ctx.fillStyle='rgba(0,3,15,.52)';ctx.fillRect(0,0,W,H);
  const tp=Math.sin(animTick*.035)*8;
  ctx.save();
  ctx.shadowColor='#0088ff';ctx.shadowBlur=55+tp*2;
  ctx.fillStyle=`hsl(${200+Math.sin(animTick*.02)*15},100%,65%)`;
  ctx.font='bold 52px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('NEON',W/2,88+tp*.2);
  ctx.shadowColor='#FF6B6B';ctx.shadowBlur=30;ctx.fillStyle='#FF6B6B';
  ctx.font='bold 42px Orbitron';ctx.fillText('PLATFORMER',W/2,138+tp*.15);
  ctx.restore();

  ctx.save();ctx.fillStyle='rgba(120,180,255,.6)';ctx.font='8px Orbitron';ctx.textAlign='center';
  ctx.fillText('10 WORLDS · RISING LAVA · 16 UNIQUE SKINS · SECRET ROOMS · ICE PHYSICS',W/2,168);ctx.restore();
  // Difficulty badge
  ctx.save();const dc=diffColor();ctx.shadowColor=dc;ctx.shadowBlur=12;
  ctx.fillStyle='rgba(0,5,20,.8)';ctx.beginPath();ctx.roundRect(W/2-55,178,110,22,11);ctx.fill();
  ctx.strokeStyle=dc;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W/2-55,178,110,22,11);ctx.stroke();
  ctx.fillStyle=dc;ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(difficulty.toUpperCase()+' MODE',W/2,189);ctx.restore();

  ctx.save();ctx.fillStyle='rgba(0,8,30,.7)';ctx.beginPath();ctx.roundRect(W/2-330,240,660,26,4);ctx.fill();
  ctx.fillStyle='rgba(100,200,255,.6)';ctx.font='9px Orbitron';ctx.textAlign='center';
  ctx.fillText('ARROWS/A-D: MOVE  ·  UP/W: JUMP (TRIPLE)  ·  Z: ABILITY  ·  ENTER: RESTART  ·  ESC: MENU',W/2,253);ctx.restore();

  ctx.save();ctx.fillStyle='rgba(0,5,25,.78)';ctx.beginPath();ctx.roundRect(W/2-345,276,690,62,8);ctx.fill();
  const linfo=[{n:'SPACE',c:'#44aaff'},{n:'FOREST',c:'#44ee66'},{n:'AURORA ICE',c:'#44ddff'},{n:'INFERNO',c:'#ff6600'},{n:'THE VOID',c:'#ee00ff'}];
  linfo.forEach((l,i)=>{
    const lx=W/2-295+i*158;
    ctx.save();ctx.shadowColor=l.c;ctx.shadowBlur=12;ctx.fillStyle=l.c;ctx.font='bold 9px Orbitron';ctx.textAlign='center';
    ctx.fillText(`LV ${i+1}`,lx,296);ctx.fillStyle=l.c;ctx.globalAlpha=.85;ctx.fillText(l.n,lx,312);ctx.restore();
    if(i<4){ctx.fillStyle='rgba(255,255,255,.18)';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('›',lx+79,306);}
  });
  ctx.restore();

  // ── Home screen music visualizer (animated frequency bars) ──
  ctx.save();
  const vizBars=28,vizX=14,vizY=343,vizW=W-28,vizH=26,barW=Math.floor(vizW/vizBars)-1;
  // Gradient palette cycling across bars
  const vizColors=['#00eeff','#00aaff','#aa44ff','#ff44cc','#ff4488','#ffaa00','#44ff88'];
  ctx.globalAlpha=0.72;
  for(let i=0;i<vizBars;i++){
    // Each bar has its own sine frequency so they feel like real spectrum bands
    const phase=animTick*(.018+i*.003)+i*.7;
    const noise=Math.sin(phase)*0.5+Math.sin(phase*2.3+1.1)*0.3+Math.sin(phase*0.7-0.4)*0.2;
    const h=Math.max(3,(noise+1)*0.5*vizH*0.95);
    const ci=Math.floor((i/vizBars)*vizColors.length);
    const col=vizColors[ci%vizColors.length];
    ctx.shadowColor=col;ctx.shadowBlur=6;
    ctx.fillStyle=col;
    ctx.beginPath();ctx.roundRect(vizX+i*(barW+1),vizY+vizH-h,barW,h,2);ctx.fill();
  }
  ctx.restore();
  // ── Mode buttons: 2×2 grid, no overlap, y=378-506 ──────────────────────────
  const _MB=[
    {x:12,y:378,w:436,h:60,label:'STORY',sub:'10 WORLDS · STORY MAP',col:'#FFD700',g0:'#cc9900',g1:'#FFD700',mode:'story'},
    {x:456,y:378,w:432,h:60,label:'ENDLESS',sub:'INFINITE · PROC-GEN LEVELS',col:'#FF5555',g0:'#cc2222',g1:'#FF5555',mode:'endless'},
    {x:12,y:446,w:436,h:60,label:'🌋 RISING LAVA',sub:'DOUBLE JUMP · SPRING PADS · SURVIVE',col:'#FF4500',g0:'#7a1800',g1:'#FF4400',mode:'risingLava'},
    {x:456,y:446,w:432,h:60,label:'⚔ ARENA MODE',sub:'WAVE SURVIVAL · BOSSES · POWERUPS',col:'#ff4488',g0:'#550022',g1:'#cc1155',mode:'arena'},
  ];
  _MB.forEach((b,bi)=>{
    ctx.save();ctx.shadowColor=b.col;ctx.shadowBlur=20+Math.sin(animTick*.06+bi)*5;
    const _g=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);
    _g.addColorStop(0,b.g0);_g.addColorStop(.5,b.g1);_g.addColorStop(1,b.g0);
    ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,10);ctx.fill();
    ctx.strokeStyle=b.col+'66';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,10);ctx.stroke();
    const textCol=b.col==='#FFD700'?'#1a0e00':'#ffffff';
    ctx.fillStyle=textCol;ctx.font='bold 15px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b.label,b.x+b.w/2,b.y+b.h/2-9);
    ctx.fillStyle=b.col==='#FFD700'?'rgba(0,0,0,.45)':b.col+'aa';
    ctx.font='bold 7px Orbitron';ctx.fillText(b.sub,b.x+b.w/2,b.y+b.h/2+10);
    if(bestScores[b.mode]>0){
      ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='bold 6px Orbitron';
      ctx.fillText('BEST: '+bestScores[b.mode],b.x+b.w/2,b.y+b.h-8);
    }
    ctx.restore();
  });

  // Shop button — top right
  ctx.save();ctx.shadowColor='#aa44ff';ctx.shadowBlur=18;
  const shg=ctx.createLinearGradient(W-123,8,W-8,58);shg.addColorStop(0,'#550099');shg.addColorStop(1,'#8822cc');
  ctx.fillStyle=shg;ctx.beginPath();ctx.roundRect(W-123,8,115,46,8);ctx.fill();
  ctx.strokeStyle='rgba(180,80,255,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W-123,8,115,46,8);ctx.stroke();
  ctx.fillStyle='#ddaaff';ctx.font='bold 11px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎨 SHOP',W-66,32);ctx.restore();

  // Coin counter — top left
  ctx.save();ctx.shadowColor='#FFD700';ctx.shadowBlur=14;ctx.fillStyle='#FFD700';ctx.font='bold 18px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('◉ '+totalCoins,14,36);ctx.restore();
  // Settings button
  ctx.save();ctx.shadowColor='#00aaff';ctx.shadowBlur=12;ctx.fillStyle='rgba(0,18,55,.92)';ctx.beginPath();ctx.roundRect(8,54,138,34,7);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(8,54,138,34,7);ctx.stroke();
  ctx.fillStyle='#88ccff';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚙ SETTINGS',77,71);ctx.restore();

  // ── Bottom strip: tips + level editor button (y=512-580, no overlap) ────────
  ctx.save();ctx.fillStyle='rgba(0,4,20,.75)';ctx.fillRect(0,510,W,70);ctx.restore();
  ctx.save();ctx.fillStyle='rgba(130,190,255,.55)';ctx.font='8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('EACH SKIN HAS A UNIQUE ABILITY · TRIPLE JUMP · WALL JUMP · DOUBLE-TAP DASH · BOSS FIGHTS',W/2,526);
  ctx.fillText('ICE PHYSICS · RISING LAVA · ARENA WAVES · LEVEL EDITOR · SECRET ROOMS · PORTAL TYPES',W/2,542);
  ctx.restore();
  // Level Editor button — bottom right inside the tip strip
  ctx.save();ctx.shadowColor='#00ccff';ctx.shadowBlur=12+Math.sin(animTick*.05)*4;
  const edBtnX=W-164,edBtnY=H-36,edBtnW=156,edBtnH=30;
  const edg=ctx.createLinearGradient(edBtnX,edBtnY,edBtnX+edBtnW,edBtnY+edBtnH);
  edg.addColorStop(0,'#002244');edg.addColorStop(.5,'#004488');edg.addColorStop(1,'#002244');
  ctx.fillStyle=edg;ctx.beginPath();ctx.roundRect(edBtnX,edBtnY,edBtnW,edBtnH,8);ctx.fill();
  ctx.strokeStyle='rgba(0,200,255,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(edBtnX,edBtnY,edBtnW,edBtnH,8);ctx.stroke();
  ctx.fillStyle='#88ddff';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('📐 LEVEL EDITOR',edBtnX+edBtnW/2,edBtnY+edBtnH/2);ctx.restore();

  // Paw print secret button — bottom-left corner
  ctx.save();
  const pawPulse=.55+Math.sin(animTick*.05)*.2;
  ctx.globalAlpha=pawPulse;
  ctx.shadowColor='#ffaaff';ctx.shadowBlur=12+Math.sin(animTick*.05)*6;
  ctx.font='22px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('🐾',10,H-14);
  ctx.restore();
  // Version label + changelog button — bottom centre
  ctx.save();
  ctx.fillStyle='rgba(80,140,200,.55)';ctx.font='8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('NEON PLATFORMER  '+VERSION,W/2-34,H-10);
  ctx.fillStyle='rgba(0,180,255,.18)';ctx.beginPath();ctx.roundRect(W/2+46,H-20,74,18,5);ctx.fill();
  ctx.strokeStyle='rgba(0,180,255,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W/2+46,H-20,74,18,5);ctx.stroke();
  ctx.fillStyle='rgba(140,210,255,.8)';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('CHANGELOG',W/2+83,H-11);
  ctx.restore();
}

// ══════════════════════════════════════════
//  SHOP (GD-style)
// ══════════════════════════════════════════
function skinRarity(sk){
  if(sk.cost===0)  return{t:'STARTER',  c:'#aaaaaa',g:'rgba(60,60,80,.8)',  bg:'#101018'};
  if(sk.cost<=250) return{t:'BASIC',    c:'#4499ff',g:'rgba(10,38,120,.8)',  bg:'#080d20'};
  if(sk.cost<=600) return{t:'RARE',     c:'#33dd66',g:'rgba(8,78,28,.8)',    bg:'#060f0a'};
  if(sk.cost<=1100)return{t:'EPIC',     c:'#bb44ff',g:'rgba(60,0,108,.8)',   bg:'#0e0418'};
  return             {t:'LEGENDARY',c:'#FFD700',g:'rgba(120,55,0,.8)',   bg:'#140c00'};
}
function drawShop(){
  shopParts.forEach(p=>p.draw());
  ctx.fillStyle='rgba(2,3,14,.97)';ctx.fillRect(0,0,W,H);
  // Animated GD-style background shapes
  ctx.save();
  for(let i=0;i<26;i++){
    const t2=animTick*.006+i*.54;
    const sx=((i*131+animTick*.16)%(W+80))-40;const sy=((i*97+animTick*.09)%(H+80))-40;
    const sr=8+((i*19)%18);
    ctx.globalAlpha=.022+((i*13)%9)*.003;ctx.fillStyle=`hsl(${220+i*14},65%,62%)`;
    ctx.save();ctx.translate(sx,sy);ctx.rotate(t2);
    if(i%3===0){ctx.beginPath();ctx.moveTo(0,-sr);ctx.lineTo(sr,0);ctx.lineTo(0,sr);ctx.lineTo(-sr,0);ctx.closePath();ctx.fill();}
    else if(i%3===1){ctx.beginPath();ctx.roundRect(-sr*.5,-sr*.5,sr,sr,3);ctx.fill();}
    else{ctx.beginPath();ctx.arc(0,0,sr*.55,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  ctx.restore();
  // Header bar
  const hbg=ctx.createLinearGradient(0,0,0,62);hbg.addColorStop(0,'#0a1025');hbg.addColorStop(1,'#050810');
  ctx.fillStyle=hbg;ctx.fillRect(0,0,W,62);
  ctx.strokeStyle='rgba(100,150,255,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,62);ctx.lineTo(W,62);ctx.stroke();
  ctx.save();ctx.shadowColor='#cc1111';ctx.shadowBlur=12;ctx.fillStyle='rgba(160,10,10,.92)';ctx.beginPath();ctx.roundRect(10,10,82,42,6);ctx.fill();ctx.restore();
  ctx.fillStyle='#ffaaaa';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('← BACK',51,31);
  ctx.fillStyle='rgba(0,130,60,.9)';ctx.beginPath();ctx.roundRect(W-120,10,110,42,6);ctx.fill();ctx.fillStyle='#aaffcc';ctx.fillText('💾 SAVE',W-65,31);
  const tg=ctx.createLinearGradient(W/2-180,10,W/2+180,52);
  tg.addColorStop(0,'#ff88cc');tg.addColorStop(.35,'#ffdd66');tg.addColorStop(.65,'#66ddff');tg.addColorStop(1,'#aa66ff');
  ctx.save();ctx.shadowColor='#aa44ff';ctx.shadowBlur=22;ctx.fillStyle=tg;ctx.font='bold 22px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ICON SHOP',W/2,31);ctx.restore();
  ctx.save();ctx.shadowColor='#FFD700';ctx.shadowBlur=14;ctx.fillStyle='#FFD700';ctx.font='bold 14px Orbitron';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText('◉ '+totalCoins,W-138,31);ctx.restore();
  // Featured cat skin offer (5% chance)
  if(catShopOffer!==null){
    const osk=SKINS[catShopOffer];const fx=570,fy=68,fw=320,fh=118;
    ctx.save();
    // Animated gold border glow
    ctx.shadowColor='#FFD700';ctx.shadowBlur=16+Math.sin(animTick*.09)*8;
    const fbg=ctx.createLinearGradient(fx,fy,fx+fw,fy+fh);fbg.addColorStop(0,'#1a0e00');fbg.addColorStop(1,'#0a0800');
    ctx.fillStyle=fbg;ctx.beginPath();ctx.roundRect(fx,fy,fw,fh,8);ctx.fill();
    ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(fx,fy,fw,fh,8);ctx.stroke();
    ctx.restore();
    // "FEATURED" badge
    ctx.save();ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=10;
    ctx.font='bold 9px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('⭐ FEATURED CAT SKIN — 5% RARE OFFER!',fx+8,fy+7);ctx.restore();
    // Mini cat sprite preview
    ctx.save();ctx.translate(fx+50,fy+68);ctx.shadowColor=osk.color;ctx.shadowBlur=14;
    const osz=13;
    ctx.fillStyle=osk.color;ctx.beginPath();ctx.roundRect(-osz*.7,-osz*.25,osz*1.4,osz*0.9,4);ctx.fill();
    ctx.beginPath();ctx.arc(0,-osz*.28,osz*.62,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=lighten(osk.color,20);
    ctx.beginPath();ctx.moveTo(-osz*.5,-osz*.7);ctx.lineTo(-osz*.15,-osz*1.25);ctx.lineTo(osz*.15,-osz*.7);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(osz*.1,-osz*.7);ctx.lineTo(osz*.45,-osz*1.25);ctx.lineTo(osz*.75,-osz*.7);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ff99cc';ctx.beginPath();ctx.arc(-osz*.18,-osz*1.0,osz*.12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(osz*.42,-osz*1.0,osz*.12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-osz*.3,-osz*.3,osz*.2,osz*.22,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(osz*.3,-osz*.3,osz*.2,osz*.22,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-osz*.3,-osz*.3,osz*.12,osz*.13,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(osz*.3,-osz*.3,osz*.12,osz*.13,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Info
    ctx.fillStyle=osk.color;ctx.font='bold 11px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(osk.name+' 🐱',fx+78,fy+26);
    ctx.fillStyle='rgba(180,200,230,.7)';ctx.font='7px Orbitron';ctx.fillText('SPD×'+osk.spd.toFixed(2)+'  JMP×'+osk.jmp.toFixed(2)+'  [Z] '+osk.abilityName,fx+78,fy+44);
    ctx.fillStyle='rgba(140,160,200,.55)';ctx.font='6px Orbitron';ctx.fillText(osk.abilityDesc,fx+78,fy+57);
    const ofOwned=unlockedSkins.includes(catShopOffer),ofCanBuy=!ofOwned&&totalCoins>=osk.cost;
    if(ofOwned){
      ctx.save();ctx.fillStyle='rgba(0,200,80,.2)';ctx.beginPath();ctx.roundRect(fx+78,fy+68,110,28,4);ctx.fill();
      ctx.fillStyle='#aaffcc';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.fillText('✓ ALREADY OWNED',fx+133,fy+82);ctx.restore();
    }else{
      ctx.save();ctx.shadowColor=ofCanBuy?'#FFD700':'#333';ctx.shadowBlur=ofCanBuy?10:0;
      ctx.fillStyle=ofCanBuy?'#FFD700':'rgba(40,30,0,.85)';ctx.beginPath();ctx.roundRect(fx+78,fy+68,110,28,4);ctx.fill();
      ctx.fillStyle=ofCanBuy?'#000':'#666';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.fillText(ofCanBuy?'◉ '+osk.cost+' — BUY NOW':'◉ '+osk.cost+' NEEDED',fx+133,fy+82);ctx.restore();
    }
    // Dismiss ✕
    ctx.save();ctx.fillStyle='rgba(180,60,60,.75)';ctx.beginPath();ctx.roundRect(fx+fw-28,fy+4,24,20,4);ctx.fill();
    ctx.fillStyle='#ffaaaa';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✕',fx+fw-16,fy+14);ctx.restore();
  }
  // Skin cards (scrollable, 4 cols × rows)
  ctx.save();ctx.beginPath();ctx.rect(0,62,W,H-62);ctx.clip();
  SKINS.forEach((sk,i)=>{
    const col=i%4,row=Math.floor(i/4);const bx=14+col*224,by=100+row*148-shopScroll;
    if(by+140<62||by>H)return;
    const anim=shopCardAnims[i];
    const hp=anim.hoverProgress;
    const owned=unlockedSkins.includes(i),isSel=selectedSkin===i,canBuy=!owned&&totalCoins>=sk.cost;
    const rar=skinRarity(sk);

    // Card outer glow (rarity colored)
    if(isSel||hp>0.1){
      ctx.save();ctx.shadowColor=rar.c;ctx.shadowBlur=(isSel?28:14)*Math.max(hp,.3);
      ctx.strokeStyle=rar.c;ctx.lineWidth=isSel?2.5:1.5;ctx.globalAlpha=isSel?.9:.3+hp*.6;
      ctx.beginPath();ctx.roundRect(bx-2,by-2,214,144,10);ctx.stroke();ctx.restore();
    }

    // Rarity gradient card bg
    const cg=ctx.createLinearGradient(bx,by,bx,by+140);
    cg.addColorStop(0,rar.g);cg.addColorStop(1,rar.bg);
    ctx.fillStyle=cg;ctx.beginPath();ctx.roundRect(bx,by,210,140,8);ctx.fill();
    if(hp>0.05){ctx.save();ctx.globalAlpha=hp*.07;ctx.fillStyle=rar.c;ctx.beginPath();ctx.roundRect(bx,by,210,140,8);ctx.fill();ctx.restore();}

    // Rarity top stripe
    ctx.save();ctx.fillStyle=rar.c;ctx.globalAlpha=.85;ctx.beginPath();ctx.roundRect(bx,by,210,4,[8,8,0,0]);ctx.fill();ctx.restore();

    // Spotlight glow behind sprite
    ctx.save();const spl=ctx.createRadialGradient(bx+52,by+62,2,bx+52,by+62,36);spl.addColorStop(0,sk.color+'44');spl.addColorStop(1,'transparent');ctx.fillStyle=spl;ctx.fillRect(bx+14,by+12,78,100);ctx.restore();

    // Mini sprite
    ctx.save();ctx.translate(bx+52,by+62);ctx.shadowColor=sk.color;ctx.shadowBlur=18;ctx.fillStyle=sk.color;
    const sz=15;
    if(sk.shape==='diamond'){
      const g2=ctx.createLinearGradient(0,-sz,0,sz);g2.addColorStop(0,lighten(sk.color,50));g2.addColorStop(1,sk.color);ctx.fillStyle=g2;
      ctx.beginPath();ctx.moveTo(0,-sz);ctx.lineTo(sz,0);ctx.lineTo(0,sz);ctx.lineTo(-sz,0);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.moveTo(0,-sz);ctx.lineTo(sz,0);ctx.lineTo(0,-2);ctx.closePath();ctx.fill();
    }else if(sk.shape==='ghost'){
      const gb=ctx.createRadialGradient(-2,-4,0,0,0,sz);gb.addColorStop(0,lighten(sk.color,40));gb.addColorStop(1,sk.color+'aa');ctx.fillStyle=gb;ctx.globalAlpha=.92;
      ctx.beginPath();ctx.arc(0,-4,sz,Math.PI,0);ctx.lineTo(sz,sz*.7);ctx.quadraticCurveTo(sz*.5,sz*.3,0,sz*.4);ctx.quadraticCurveTo(-sz*.5,sz*.3,-sz,sz*.7);ctx.closePath();ctx.fill();
    }else if(sk.shape==='crown'){
      ctx.beginPath();ctx.roundRect(-sz,-sz*.3,sz*2,sz*.9,3);ctx.fill();ctx.fillStyle=lighten(sk.color,35);
      ctx.beginPath();ctx.moveTo(-sz,-sz*.3);ctx.lineTo(-sz,-sz);ctx.lineTo(-sz*.35,-sz*.4);ctx.lineTo(0,-sz);ctx.lineTo(sz*.35,-sz*.4);ctx.lineTo(sz,-sz);ctx.lineTo(sz,-sz*.3);ctx.closePath();ctx.fill();
      [[-sz*.5,-sz*.75],[0,-sz*.92],[sz*.5,-sz*.75]].forEach(([gx,gy])=>{ctx.fillStyle='#FF4444';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(gx,gy,2.5,0,Math.PI*2);ctx.fill();});
    }else if(sk.shape==='cat'){
      // Body
      ctx.fillStyle=sk.color;ctx.beginPath();ctx.roundRect(-sz*.7,-sz*.25,sz*1.4,sz*0.9,5);ctx.fill();
      // Head
      ctx.beginPath();ctx.arc(0,-sz*.28,sz*.62,0,Math.PI*2);ctx.fill();
      // Ears
      ctx.fillStyle=lighten(sk.color,20);
      ctx.beginPath();ctx.moveTo(-sz*.5,-sz*.7);ctx.lineTo(-sz*.15,-sz*1.25);ctx.lineTo(sz*.15,-sz*.7);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(sz*.1,-sz*.7);ctx.lineTo(sz*.45,-sz*1.25);ctx.lineTo(sz*.75,-sz*.7);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ff99cc';
      ctx.beginPath();ctx.moveTo(-sz*.42,-sz*.73);ctx.lineTo(-sz*.18,-sz*1.06);ctx.lineTo(sz*.06,-sz*.73);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(sz*.18,-sz*.73);ctx.lineTo(sz*.4,-sz*1.06);ctx.lineTo(sz*.62,-sz*.73);ctx.closePath();ctx.fill();
      // Tail
      ctx.save();ctx.strokeStyle=lighten(sk.color,20);ctx.lineWidth=2.5;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(sz*.65,sz*.35);ctx.quadraticCurveTo(sz*1.1,sz*.75,sz*.5,sz*.88);ctx.stroke();
      ctx.restore();
    }else{
      const g2=ctx.createLinearGradient(-sz,-sz,sz,sz);g2.addColorStop(0,lighten(sk.color,45));g2.addColorStop(1,sk.color);ctx.fillStyle=g2;
      ctx.beginPath();ctx.roundRect(-sz,-sz,sz*2,sz*2,3);ctx.fill();ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.roundRect(-sz,-sz,sz*2,sz*.9,3);ctx.fill();
    }
    ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-5,-1,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,-1,3.5,4.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-5,-1,2,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,-1,2,3,0,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // Lock overlay for unowned
    if(!owned){
      ctx.save();ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.roundRect(bx+14,by+12,78,100,6);ctx.fill();
      ctx.fillStyle='rgba(200,200,230,.6)';ctx.font='20px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🔒',bx+52,by+62);
      ctx.restore();
    }

    // Trail dots
    for(let t=0;t<4;t++){ctx.save();ctx.globalAlpha=(1-t/4)*.75;ctx.fillStyle=sk.trail[t%sk.trail.length];ctx.shadowColor=sk.trail[t%sk.trail.length];ctx.shadowBlur=7;const ts=5*(1-t/4);ctx.beginPath();ctx.arc(bx+52-(t+1)*10,by+62+Math.sin(anim.pulse+t*.5)*2.5,ts/2,0,Math.PI*2);ctx.fill();ctx.restore();}

    // Sparkles when selected
    if(isSel){
      for(let sp=0;sp<5;sp++){
        const sa=anim.pulse*1.3+sp*1.26;const sr2=22+Math.sin(anim.pulse*.7+sp)*8;
        const spx=bx+52+Math.cos(sa)*sr2,spy=by+62+Math.sin(sa)*sr2*.55;
        ctx.save();ctx.globalAlpha=.55+Math.sin(anim.pulse+sp)*0.3;ctx.fillStyle=rar.c;ctx.shadowColor=rar.c;ctx.shadowBlur=8;
        ctx.beginPath();ctx.arc(spx,spy,1.8,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }

    // Rarity badge pill — bottom of sprite area (clear of all info text)
    const bw2=rar.t.length*5.5+10;
    ctx.save();ctx.fillStyle=rar.c+'cc';ctx.shadowColor=rar.c;ctx.shadowBlur=5;ctx.beginPath();ctx.roundRect(bx+4,by+121,bw2,14,3);ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(rar.t,bx+4+bw2/2,by+128);ctx.restore();

    // Info panel (right of sprite)
    const rx=bx+100;
    // Skin name
    ctx.save();ctx.shadowColor=sk.color;ctx.shadowBlur=8;ctx.fillStyle=sk.color;ctx.font='bold 10px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.beginPath();ctx.rect(rx,by+6,108,14);ctx.clip();
    ctx.fillText(sk.name,rx,by+8);ctx.restore();
    // Stats row
    ctx.fillStyle='rgba(160,200,230,.7)';ctx.font='6px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('SPD×'+sk.spd.toFixed(2)+'  JMP×'+sk.jmp.toFixed(2),rx,by+24);
    // Ability tag pill
    ctx.save();ctx.fillStyle=rar.c+'33';ctx.strokeStyle=rar.c+'88';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(rx,by+35,108,13,4);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.rect(rx+2,by+35,104,13);ctx.clip();
    ctx.fillStyle=rar.c;ctx.font='6px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('[Z] '+sk.abilityName,rx+4,by+41);ctx.restore();
    // Ability desc (clipped to card width)
    ctx.save();ctx.beginPath();ctx.rect(rx,by+51,108,10);ctx.clip();
    ctx.fillStyle='rgba(130,160,195,.55)';ctx.font='6px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(sk.abilityDesc,rx,by+51);ctx.restore();
    ctx.fillStyle='rgba(120,140,180,.5)';ctx.font='6px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('CD: '+Math.round(sk.abilityCooldown/60)+'s',rx,by+63);

    // Cost / owned badge
    if(owned){
      ctx.save();ctx.fillStyle='rgba(0,200,80,.18)';ctx.beginPath();ctx.roundRect(rx,by+75,108,14,3);ctx.fill();
      ctx.fillStyle='rgba(100,255,150,.9)';ctx.font='bold 7px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('✓ OWNED',rx+4,by+82);ctx.restore();
    }else{
      ctx.save();ctx.globalAlpha=canBuy?1:.5;ctx.shadowColor=canBuy?'#FFD700':'#555';ctx.shadowBlur=canBuy?10:0;
      ctx.fillStyle=canBuy?'#FFD700':'#888';ctx.font='bold 10px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('◉ '+sk.cost,rx,by+75);ctx.restore();
    }

    // Equip / Buy button
    const btnY=by+108,btnW=108,btnH=26;
    if(owned){
      const btnGrad=ctx.createLinearGradient(rx,btnY,rx+btnW,btnY+btnH);
      if(isSel){btnGrad.addColorStop(0,rar.c);btnGrad.addColorStop(1,lighten(rar.c,20));}
      else{btnGrad.addColorStop(0,'rgba(40,40,65,.95)');btnGrad.addColorStop(1,'rgba(55,55,80,.95)');}
      ctx.save();if(isSel){ctx.shadowColor=rar.c;ctx.shadowBlur=14;}ctx.fillStyle=btnGrad;ctx.beginPath();ctx.roundRect(rx,btnY,btnW,btnH,5);ctx.fill();ctx.restore();
      ctx.fillStyle=isSel?'#000':'rgba(180,200,230,.8)';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(isSel?'✓ EQUIPPED':'EQUIP',rx+btnW/2,btnY+btnH/2);
    }else{
      ctx.save();if(canBuy){ctx.shadowColor=rar.c;ctx.shadowBlur=12;}ctx.fillStyle=canBuy?rar.c+'cc':'rgba(22,22,40,.92)';ctx.beginPath();ctx.roundRect(rx,btnY,btnW,btnH,5);ctx.fill();ctx.restore();
      ctx.fillStyle=canBuy?'#000':'#555';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(canBuy?'TAP TO BUY':'NEED MORE ◉',rx+btnW/2,btnY+btnH/2);
    }
  });
  ctx.restore();

  // Scroll bar
  const totalRows=Math.ceil(SKINS.length/4);const visH=H-62;const contentH=totalRows*148+38;
  if(contentH>visH){
    const sbH=Math.max(30,visH*visH/contentH);const sbY=62+(shopScroll/(contentH-visH))*(visH-sbH);
    ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#334';ctx.beginPath();ctx.roundRect(W-8,62,6,visH,3);ctx.fill();
    ctx.globalAlpha=.75;ctx.fillStyle='#88aaff';ctx.beginPath();ctx.roundRect(W-8,sbY,6,sbH,3);ctx.fill();ctx.restore();
  }
  // Footer hint
  ctx.save();ctx.globalAlpha=.38;ctx.fillStyle='#667';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('SCROLL TO SEE MORE  •  CLICK CARD TO EQUIP / BUY',W/2,H-3);ctx.restore();
}

// ══════════════════════════════════════════
//  GAME OVER / WIN
// ══════════════════════════════════════════
function drawGameOver(){
  ctx.save();
  // Glitchy dark overlay
  ctx.fillStyle='rgba(0,2,12,.90)';ctx.fillRect(0,0,W,H);
  // Scanline effect on gameover
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(0,sy,W,2);}
  ctx.restore();

  for(let gi=0;gi<3;gi++){
    ctx.save();const goff=(Math.random()-.5)*3;ctx.globalAlpha=gi===1?1:.4;
    ctx.shadowColor='#ff3333';ctx.shadowBlur=40+Math.sin(animTick*.08)*20;
    ctx.fillStyle=gi===0?'#ff0000':gi===1?'#ff4444':'#ff8888';
    ctx.font='bold 54px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('GAME OVER',W/2+goff,H/2-75+goff*.5);ctx.restore();
  }
  for(let i=0;i<MAX_LIVES;i++){
    const hx=W/2-((MAX_LIVES-1)*22)+i*44;const hy=H/2-18;
    ctx.save();ctx.translate(hx,hy);ctx.scale(1.9,1.9);
    ctx.shadowColor='#220000';ctx.shadowBlur=5;ctx.fillStyle='#1a0508';
    ctx.beginPath();ctx.moveTo(0,5);ctx.bezierCurveTo(-2.5,1,-11,-4,-11,-11);ctx.bezierCurveTo(-11,-19,0,-19,0,-13);ctx.bezierCurveTo(0,-19,11,-19,11,-11);ctx.bezierCurveTo(11,-4,2.5,1,0,5);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,0,0,.3)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-2,-14);ctx.lineTo(2,-8);ctx.lineTo(-1,-2);ctx.stroke();ctx.restore();
  }
  ctx.fillStyle='#88ccff';ctx.font='bold 17px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  if(gameMode==='risingLava')ctx.fillText('HEIGHT REACHED: '+score+'m',W/2,H/2+28);
  else if(gameMode==='arena')ctx.fillText('WAVE REACHED: '+arenaWave+'   SCORE: '+score,W/2,H/2+28);
  else ctx.fillText('SCORE: '+score+'   LEVEL: '+(gameMode==='story'?currentLevel+1:level),W/2,H/2+28);
  ctx.fillStyle='rgba(180,100,120,.75)';ctx.font='bold 10px Orbitron';
  ctx.fillText('ENTER — RETRY  ·  ANY OTHER KEY — MENU',W/2,H/2+65);
}

function drawWin(){
  ctx.save();ctx.fillStyle='rgba(0,2,12,.9)';ctx.fillRect(0,0,W,H);
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2+animTick*.01;const r=85+Math.sin(animTick*.05+i)*22;
    ctx.globalAlpha=.07;ctx.strokeStyle=`hsl(${i*26+animTick},100%,70%)`;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.lineTo(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r);ctx.stroke();
  }
  ctx.globalAlpha=1;ctx.shadowColor='#FFD700';ctx.shadowBlur=60+Math.sin(animTick*.08)*22;
  ctx.fillStyle='#FFD700';ctx.font='bold 58px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('YOU WIN! ★',W/2,H/2-28);
  ctx.fillStyle='#aaffcc';ctx.shadowBlur=12;ctx.font='15px Orbitron';ctx.fillText('ALL 10 WORLDS CONQUERED!',W/2,H/2+28);
  ctx.fillStyle='rgba(180,220,255,.5)';ctx.font='10px Orbitron';ctx.fillText('PRESS ESC TO RETURN TO MENU',W/2,H/2+66);
  ctx.restore();
}

// ══════════════════════════════════════════
//  EDITOR PASSWORD SCREEN
// ══════════════════════════════════════════
function drawEditorPw(){
  ctx.fillStyle='#030812';ctx.fillRect(0,0,W,H);
  // Hex grid background
  ctx.save();ctx.globalAlpha=.05;ctx.strokeStyle='#4488ff';ctx.lineWidth=.8;
  for(let gy=0;gy<H;gy+=38)for(let gx=0;gx<W+(gy%76===0?0:19);gx+=38){
    const ox=gy%76===0?0:19;ctx.beginPath();
    for(let k=0;k<6;k++){const a=k*Math.PI/3-Math.PI/6;const r=18;const nx=gx+ox+r*Math.cos(a),ny=gy+r*Math.sin(a);k===0?ctx.moveTo(nx,ny):ctx.lineTo(nx,ny);}
    ctx.closePath();ctx.stroke();
  }
  ctx.restore();
  const shakeX=editorPwError>0?Math.sin(editorPwError*.65)*9:0;
  const errCol='#ff4444';const okCol='#00ccff';const col=editorPwError>0?errCol:okCol;
  // Panel
  const pw=370,ph=310,px=W/2-pw/2+shakeX,py=H/2-ph/2;
  const pg=ctx.createLinearGradient(px,py,px,py+ph);
  pg.addColorStop(0,'#0b1a30');pg.addColorStop(1,'#050e1e');
  ctx.fillStyle=pg;ctx.beginPath();ctx.roundRect(px,py,pw,ph,14);ctx.fill();
  ctx.strokeStyle=col+'55';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(px,py,pw,ph,14);ctx.stroke();
  // Padlock icon
  const lx=W/2+shakeX,ly=py+80;
  ctx.save();ctx.shadowColor=col;ctx.shadowBlur=26;
  // Shackle arc
  ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.arc(lx,ly-18,22,Math.PI+.1,-.1);ctx.stroke();
  // Body
  ctx.fillStyle=editorPwError>0?'rgba(80,0,0,.9)':'rgba(0,25,75,.9)';
  ctx.beginPath();ctx.roundRect(lx-24,ly-2,48,38,8);ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(lx-24,ly-2,48,38,8);ctx.stroke();
  // Keyhole
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(lx,ly+12,7,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(lx-3.5,ly+12);ctx.lineTo(lx-3.5,ly+26);ctx.lineTo(lx+3.5,ly+26);ctx.lineTo(lx+3.5,ly+12);ctx.closePath();ctx.fill();
  ctx.restore();
  // Title
  ctx.save();ctx.shadowColor=col;ctx.shadowBlur=18;
  ctx.fillStyle=editorPwError>0?'#ff8888':'#88ddff';ctx.font='bold 15px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('LEVEL EDITOR',W/2+shakeX,py+148);ctx.restore();
  ctx.fillStyle=editorPwError>0?'rgba(255,80,80,.65)':'rgba(140,180,240,.5)';ctx.font='9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(editorPwError>0?'WRONG PASSWORD — TRY AGAIN':'ENTER PASSWORD TO CONTINUE',W/2+shakeX,py+170);
  // Input box
  const ibx=px+28,iby=py+188,ibw=pw-56,ibh=38;
  ctx.fillStyle='rgba(0,6,22,.9)';ctx.beginPath();ctx.roundRect(ibx,iby,ibw,ibh,7);ctx.fill();
  ctx.strokeStyle=editorPwError>0?errCol+'88':okCol+'55';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(ibx,iby,ibw,ibh,7);ctx.stroke();
  const disp='●'.repeat(editorPwStr.length)+(Math.floor(animTick/16)%2===0?'|':'');
  ctx.fillStyle=editorPwError>0?'#ff7777':'#aaddff';ctx.font='bold 15px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(disp||' ',ibx+ibw/2,iby+ibh/2);
  // Hint
  ctx.fillStyle='rgba(90,130,195,.4)';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('PRESS ENTER TO CONFIRM  ·  ESC TO CANCEL',W/2+shakeX,py+248);
}

// ══════════════════════════════════════════
//  LEVEL SELECT SCREEN
// ══════════════════════════════════════════
function drawLevelSelect(){
  ctx.fillStyle='#030810';ctx.fillRect(0,0,W,H);
  // Animated dot field
  ctx.save();
  for(let i=0;i<90;i++){
    const bx=((i*97+animTick*.25)%W+W)%W;const by=((i*137+animTick*.1)%H+H)%H;
    ctx.globalAlpha=.07;ctx.fillStyle='#4488ff';
    ctx.beginPath();ctx.arc(bx,by,1+((i*17)%3)*.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Header bar
  const hg=ctx.createLinearGradient(0,0,0,62);
  hg.addColorStop(0,'#0c1c3a');hg.addColorStop(1,'#060e20');
  ctx.fillStyle=hg;ctx.fillRect(0,0,W,62);
  ctx.strokeStyle='rgba(0,160,255,.18)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,62);ctx.lineTo(W,62);ctx.stroke();
  // Back button
  ctx.save();ctx.shadowColor='#5588ff';ctx.shadowBlur=8;
  ctx.fillStyle='rgba(0,20,70,.9)';ctx.beginPath();ctx.roundRect(8,10,82,42,6);ctx.fill();
  ctx.strokeStyle='rgba(85,136,255,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8,10,82,42,6);ctx.stroke();
  ctx.fillStyle='#88aaff';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('← BACK',49,31);ctx.restore();
  // Title
  ctx.save();
  ctx.shadowColor='#44aaff';ctx.shadowBlur=24;
  ctx.fillStyle='#ffffff';ctx.font='bold 24px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('MY LEVELS',W/2,31);ctx.restore();
  // NEW LEVEL button
  ctx.save();ctx.shadowColor='#00ffaa';ctx.shadowBlur=10+Math.sin(animTick*.07)*4;
  ctx.fillStyle='rgba(0,55,38,.95)';ctx.beginPath();ctx.roundRect(W-134,10,126,42,6);ctx.fill();
  ctx.strokeStyle='rgba(0,255,170,.45)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W-134,10,126,42,6);ctx.stroke();
  ctx.fillStyle='#00ffaa';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('+ NEW LEVEL',W-71,31);ctx.restore();
  // Level cards
  const levels=getAllLevels();
  const CH=82,CP=8,CY=70;
  const BW=68,BH=28;
  const visH=H-CY;
  // Clamp scroll
  const totalH=levels.length*(CH+CP);
  levelSelectScroll=Math.min(levelSelectScroll,Math.max(0,totalH-visH));
  ctx.save();ctx.beginPath();ctx.rect(0,CY,W,visH);ctx.clip();
  if(levels.length===0){
    ctx.fillStyle='rgba(100,150,255,.35)';ctx.font='14px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('NO SAVED LEVELS',W/2,CY+visH/2-18);
    ctx.fillStyle='rgba(100,150,255,.2)';ctx.font='9px Orbitron';
    ctx.fillText('Click  + NEW LEVEL  to start building!',W/2,CY+visH/2+14);
  }else{
    levels.forEach((lev,i)=>{
      const cy=CY+i*(CH+CP)-levelSelectScroll;
      if(cy+CH<CY||cy>H)return;
      // Card body
      const cg=ctx.createLinearGradient(8,cy,W-8,cy+CH);
      cg.addColorStop(0,'#0d1e38');cg.addColorStop(1,'#091424');
      ctx.fillStyle=cg;ctx.beginPath();ctx.roundRect(8,cy,W-16,CH,8);ctx.fill();
      // Colored left accent
      const hue=(i*53+200)%360;
      ctx.fillStyle=`hsl(${hue},65%,55%)`;ctx.beginPath();ctx.roundRect(8,cy,4,CH,4);ctx.fill();
      // Outer border
      ctx.strokeStyle=`hsla(${hue},50%,45%,.35)`;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8,cy,W-16,CH,8);ctx.stroke();
      // Level name
      ctx.fillStyle='#ddeeff';ctx.font='bold 13px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText((lev.name||'Unnamed').substring(0,22),22,cy+22);
      // Stats row
      const objCount=(lev.objs||[]).length;
      const hasGoal=!!lev.goal;
      const dt=lev.modified?new Date(lev.modified).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}):'?';
      ctx.fillStyle='rgba(120,165,215,.6)';ctx.font='8px Orbitron';ctx.textBaseline='middle';
      ctx.fillText(`${objCount} OBJECTS  ·  ${hasGoal?'✓ GOAL SET':'NO GOAL'}  ·  ${dt}`,22,cy+46);
      // Buttons
      const bsy=cy+(CH-BH)/2;
      // DEL
      ctx.save();ctx.shadowColor='#ff4444';ctx.shadowBlur=5;
      ctx.fillStyle='rgba(70,0,0,.9)';ctx.beginPath();ctx.roundRect(W-BW-16,bsy,BW,BH,5);ctx.fill();
      ctx.strokeStyle='rgba(255,60,60,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W-BW-16,bsy,BW,BH,5);ctx.stroke();
      ctx.fillStyle='#ff6666';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('DELETE',W-BW/2-16,bsy+BH/2);ctx.restore();
      // EDIT
      ctx.save();ctx.shadowColor='#4488ff';ctx.shadowBlur=5;
      ctx.fillStyle='rgba(0,18,75,.9)';ctx.beginPath();ctx.roundRect(W-BW*2-24,bsy,BW,BH,5);ctx.fill();
      ctx.strokeStyle='rgba(60,120,255,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W-BW*2-24,bsy,BW,BH,5);ctx.stroke();
      ctx.fillStyle='#88aaff';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('✏ EDIT',W-BW*1.5-24,bsy+BH/2);ctx.restore();
      // PLAY
      ctx.save();ctx.shadowColor='#00ff88';ctx.shadowBlur=5;
      ctx.fillStyle='rgba(0,55,28,.9)';ctx.beginPath();ctx.roundRect(W-BW*3-32,bsy,BW,BH,5);ctx.fill();
      ctx.strokeStyle='rgba(0,220,120,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W-BW*3-32,bsy,BW,BH,5);ctx.stroke();
      ctx.fillStyle='#44ff88';ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('▶ PLAY',W-BW*2.5-32,bsy+BH/2);ctx.restore();
    });
  }
  ctx.restore();
  // Scroll bar
  if(totalH>visH&&levels.length>0){
    const barH=Math.max(28,visH*(visH/totalH));
    const barY=CY+levelSelectScroll/Math.max(1,totalH-visH)*(visH-barH);
    ctx.fillStyle='rgba(80,130,255,.3)';ctx.beginPath();ctx.roundRect(W-5,barY,3,barH,2);ctx.fill();
  }
}

// ══════════════════════════════════════════
//  LEVEL EDITOR DRAW  (GD-style)
// ══════════════════════════════════════════
function drawEditor(){
  // Canvas background
  ctx.fillStyle='#050e1a';ctx.fillRect(0,0,W,H);

  // --- GRID (viewport, screen-space) ---
  ctx.save();ctx.beginPath();ctx.rect(0,ED_TOP,ED_VW,ED_VH);ctx.clip();
  ctx.globalAlpha=.09;ctx.strokeStyle='#1a3a6a';ctx.lineWidth=.5;
  const gox=camera.x%EDITOR_GRID,goy=camera.y%EDITOR_GRID;
  for(let gx=0;gx<=ED_VW;gx+=EDITOR_GRID){ctx.beginPath();ctx.moveTo(gx-gox,ED_TOP);ctx.lineTo(gx-gox,ED_TOP+ED_VH);ctx.stroke();}
  for(let gy=0;gy<=ED_VH;gy+=EDITOR_GRID){ctx.beginPath();ctx.moveTo(0,ED_TOP+gy-goy);ctx.lineTo(ED_VW,ED_TOP+gy-goy);ctx.stroke();}
  ctx.restore();

  // --- WORLD OBJECTS (world-space, clipped) ---
  ctx.save();ctx.beginPath();ctx.rect(0,ED_TOP,ED_VW,ED_VH);ctx.clip();
  ctx.translate(-camera.x,-camera.y+ED_TOP);

  // World boundary (red = full world, cyan = size guide)
  ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ff4444';ctx.lineWidth=2;
  ctx.setLineDash([10,5]);ctx.strokeRect(0,0,WORLD_W,WORLD_H);ctx.setLineDash([]);ctx.restore();
  const sz=WORLD_SIZES[editorSizeIdx];
  ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle='#00ffcc';ctx.lineWidth=1.5;
  ctx.setLineDash([6,6]);ctx.strokeRect(0,0,sz.w,sz.h);ctx.setLineDash([]);ctx.restore();

  // Placed objects
  editorObjs.forEach(o=>{
    ctx.save();
    switch(o.type){
      case 'platform':{
        const g=ctx.createLinearGradient(o.x,o.y,o.x,o.y+(o.h||18));
        g.addColorStop(0,'#a06840');g.addColorStop(1,'#6a3e18');
        ctx.fillStyle=g;ctx.fillRect(o.x,o.y,o.w,o.h||18);
        ctx.strokeStyle='#d4926a';ctx.lineWidth=1;ctx.strokeRect(o.x,o.y,o.w,o.h||18);
        break;}
      case 'movingPlatform':{
        const g=ctx.createLinearGradient(o.x,o.y,o.x,o.y+(o.h||18));
        g.addColorStop(0,'#30a030');g.addColorStop(1,'#186018');
        ctx.fillStyle=g;ctx.fillRect(o.x,o.y,o.w||90,o.h||18);
        ctx.strokeStyle='#66ee66';ctx.lineWidth=1;ctx.strokeRect(o.x,o.y,o.w||90,o.h||18);
        ctx.globalAlpha=.14;ctx.setLineDash([6,4]);ctx.strokeStyle='#88ff88';
        ctx.strokeRect(o.minX??o.x-100,o.y,(o.maxX??o.x+100)-(o.minX??o.x-100),o.h||18);
        ctx.setLineDash([]);ctx.globalAlpha=1;break;}
      case 'enemy':
        ctx.fillStyle='#cc1111';ctx.shadowColor='#ff3333';ctx.shadowBlur=6;
        ctx.beginPath();ctx.roundRect(o.x,o.y,28,28,4);ctx.fill();
        ctx.shadowBlur=0;ctx.strokeStyle='#ff5555';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(o.x,o.y,28,28,4);ctx.stroke();
        ctx.fillStyle='#fff';ctx.font='bold 10px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('E',o.x+14,o.y+14);break;
      case 'spike':
        ctx.fillStyle='#ff7700';ctx.strokeStyle='#ffaa44';ctx.lineWidth=1;
        for(let si=0;si<(o.count||1);si++){
          ctx.beginPath();ctx.moveTo(o.x+si*24,o.y+24);ctx.lineTo(o.x+si*24+12,o.y);ctx.lineTo(o.x+si*24+24,o.y+24);ctx.closePath();ctx.fill();ctx.stroke();
        }break;
      case 'coin':
        ctx.fillStyle=o.secret?'#ff44ff':'#FFD700';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;
        ctx.beginPath();ctx.arc(o.x,o.y,8,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.strokeStyle=o.secret?'#cc00cc':'#aa7700';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(o.x,o.y,8,0,Math.PI*2);ctx.stroke();break;
      case 'spring':
        ctx.fillStyle='#00ffaa';ctx.fillRect(o.x,o.y,60,16);
        ctx.strokeStyle='#00cc88';ctx.lineWidth=1;ctx.strokeRect(o.x,o.y,60,16);
        ctx.fillStyle='#003322';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('SPR',o.x+30,o.y+9);break;
      case 'killbrick':{
        const g=ctx.createLinearGradient(o.x,o.y,o.x,o.y+(o.h||20));
        g.addColorStop(0,'#880000');g.addColorStop(1,'#3a0000');
        ctx.fillStyle=g;ctx.fillRect(o.x,o.y,o.w||60,o.h||20);
        ctx.strokeStyle='#ff2222';ctx.lineWidth=2;ctx.strokeRect(o.x,o.y,o.w||60,o.h||20);
        ctx.strokeStyle='rgba(255,0,0,.4)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(o.x+4,o.y+4);ctx.lineTo(o.x+(o.w||60)-4,o.y+(o.h||20)-4);ctx.stroke();
        ctx.beginPath();ctx.moveTo(o.x+(o.w||60)-4,o.y+4);ctx.lineTo(o.x+4,o.y+(o.h||20)-4);ctx.stroke();
        break;}
      case 'iceZone':
        ctx.globalAlpha=.3;ctx.fillStyle='#88ddff';ctx.fillRect(o.x,o.y,o.w,o.h||20);
        ctx.globalAlpha=1;ctx.strokeStyle='#88ddff';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
        ctx.strokeRect(o.x,o.y,o.w,o.h||20);ctx.setLineDash([]);
        ctx.fillStyle='#88ddff';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('ICE',o.x+o.w/2,o.y+(o.h||20)/2);break;
      case 'powerup':{
        const pcols={speedBoost:'#00ffff',shield:'#4488ff',extraJump:'#44ff88',invincibility:'#ffdd00',coinMagnet:'#FFD700',scoreMult:'#FF88FF'};
        const pshort={speedBoost:'SPD',shield:'SHD',extraJump:'JMP',invincibility:'INV',coinMagnet:'MAG',scoreMult:'×2'};
        const pc=pcols[o.puType||'speedBoost']||'#ffffff';
        ctx.shadowColor=pc;ctx.shadowBlur=10;
        ctx.fillStyle=pc+'99';ctx.beginPath();ctx.arc(o.x+14,o.y+14,13,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.strokeStyle=pc;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(o.x+14,o.y+14,13,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#fff';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(pshort[o.puType||'speedBoost']||'PU',o.x+14,o.y+14);break;}
      case 'tpPad':{
        ctx.shadowColor='#cc44ff';ctx.shadowBlur=10;
        const tpg=ctx.createLinearGradient(o.x,o.y,o.x,o.y+12);
        tpg.addColorStop(0,'#aa22ee');tpg.addColorStop(1,'#44006a');
        ctx.fillStyle=tpg;ctx.beginPath();ctx.roundRect(o.x,o.y,60,12,4);ctx.fill();
        ctx.strokeStyle='#ee88ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(o.x,o.y,60,12,4);ctx.stroke();
        ctx.shadowBlur=0;ctx.fillStyle='#ffddff';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('TP PAD',o.x+30,o.y+6);break;}
      case 'stickyPad':{
        const spg=ctx.createLinearGradient(o.x,o.y,o.x,o.y+14);
        spg.addColorStop(0,'#55bb00');spg.addColorStop(1,'#224400');
        ctx.fillStyle=spg;ctx.beginPath();ctx.roundRect(o.x,o.y,o.w||80,14,5);ctx.fill();
        ctx.strokeStyle='#aaff44';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(o.x,o.y,o.w||80,14,5);ctx.stroke();
        ctx.fillStyle='rgba(190,255,80,.9)';ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('STICKY',o.x+(o.w||80)/2,o.y+7);break;}
      case 'crate':{
        ctx.shadowColor='#cc8833';ctx.shadowBlur=8;
        const crg=ctx.createLinearGradient(o.x,o.y,o.x,o.y+32);
        crg.addColorStop(0,'#c8843a');crg.addColorStop(1,'#5a3200');
        ctx.fillStyle=crg;ctx.beginPath();ctx.roundRect(o.x,o.y,32,32,3);ctx.fill();
        ctx.strokeStyle='#ffcc88';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(o.x,o.y,32,32,3);ctx.stroke();
        ctx.globalAlpha=0.3;ctx.strokeStyle='#3a1a00';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(o.x+8,o.y+2);ctx.lineTo(o.x+8,o.y+30);ctx.stroke();
        ctx.beginPath();ctx.moveTo(o.x+24,o.y+2);ctx.lineTo(o.x+24,o.y+30);ctx.stroke();
        ctx.beginPath();ctx.moveTo(o.x+2,o.y+16);ctx.lineTo(o.x+30,o.y+16);ctx.stroke();
        ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle='#ffdd99';ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('BOX',o.x+16,o.y+22);break;}
      case 'conveyZone':
        ctx.globalAlpha=.28;ctx.fillStyle=o.dir>0?'#ffaa22':'#22aaff';ctx.fillRect(o.x,o.y,o.w,o.h||24);
        ctx.globalAlpha=1;ctx.strokeStyle=o.dir>0?'#ffaa22':'#22aaff';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
        ctx.strokeRect(o.x,o.y,o.w,o.h||24);ctx.setLineDash([]);
        ctx.fillStyle=o.dir>0?'#ffcc66':'#66ccff';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText((o.dir>0?'▶ ':'◀ ')+'BELT',o.x+o.w/2,o.y+(o.h||24)/2);break;
      case 'portal':{
        const pColMap={gravity:'#44aaff',mirror:'#ff44cc',shrink:'#ffaa22',ghost:'#aaffaa',speed:'#ffff00',score:'#ff88ff',coinStorm:'#FFD700',bounce:'#ff6644'};
        const pc2=pColMap[o.portalType||'gravity']||'#44aaff';
        ctx.shadowColor=pc2;ctx.shadowBlur=14;
        ctx.strokeStyle=pc2;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(o.x+20,o.y+30,12,25,0,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle=pc2+'44';ctx.beginPath();ctx.ellipse(o.x+20,o.y+30,12,25,0,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.fillStyle=pc2;ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText((o.portalType||'gravity').toUpperCase().slice(0,5),o.x+20,o.y+55);break;}
      case 'warpGate':{
        const wc=o.color||'#ff44ff';
        ctx.shadowColor=wc;ctx.shadowBlur=12;
        const wg=ctx.createLinearGradient(o.x,o.y,o.x,o.y+66);
        wg.addColorStop(0,wc+'88');wg.addColorStop(0.5,wc+'cc');wg.addColorStop(1,wc+'44');
        ctx.fillStyle=wg;ctx.beginPath();ctx.roundRect(o.x,o.y,44,66,8);ctx.fill();
        ctx.strokeStyle=wc;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(o.x,o.y,44,66,8);ctx.stroke();
        ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('WARP',o.x+22,o.y+28);ctx.fillText('#'+o.pairId,o.x+22,o.y+42);break;}
      case 'laser':{
        const lx1=o.x,ly1=o.y,lx2=o.x2??o.x+200,ly2=o.y2??o.y;
        ctx.shadowColor='#ff6644';ctx.shadowBlur=8;
        ctx.strokeStyle='#ff3300';ctx.lineWidth=3;ctx.setLineDash([8,4]);
        ctx.beginPath();ctx.moveTo(lx1,ly1);ctx.lineTo(lx2,ly2);ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle='#ff884422';ctx.lineWidth=12;
        ctx.beginPath();ctx.moveTo(lx1,ly1);ctx.lineTo(lx2,ly2);ctx.stroke();
        ctx.shadowBlur=0;ctx.fillStyle='#ff8866';ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='bottom';
        ctx.fillText('LASER ('+o.interval+'f)',((lx1+lx2)/2),Math.min(ly1,ly2)-2);break;}
      case 'boss':{
        const bw=56,bh=56;
        ctx.shadowColor='#ff2200';ctx.shadowBlur=18;
        const bg=ctx.createLinearGradient(o.x,o.y,o.x,o.y+bh);
        bg.addColorStop(0,'#880000');bg.addColorStop(1,'#330000');
        ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(o.x,o.y,bw,bh,6);ctx.fill();
        ctx.strokeStyle='#ff4400';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(o.x,o.y,bw,bh,6);ctx.stroke();
        // HP bar
        ctx.fillStyle='#440000';ctx.fillRect(o.x,o.y-8,bw,5);
        ctx.fillStyle='#ff2200';ctx.fillRect(o.x,o.y-8,bw*(o.hp||3)/5,5);
        ctx.shadowBlur=0;ctx.fillStyle='#ffaaaa';ctx.font='bold 7px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('BOSS',o.x+bw/2,o.y+bh/2-4);
        ctx.font='bold 5px Orbitron';ctx.fillText('HP:'+(o.hp||3),o.x+bw/2,o.y+bh/2+8);break;}
    }
    ctx.restore();
  });

  // Goal star
  if(editorGoalPos){
    ctx.save();ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=22;
    drawStarShape(editorGoalPos.x+18,editorGoalPos.y+18,22,9,5);ctx.fill();ctx.restore();
  }

  // Spawn marker
  ctx.save();ctx.fillStyle=SKINS[selectedSkin].color;ctx.shadowColor=SKINS[selectedSkin].color;ctx.shadowBlur=16;ctx.globalAlpha=.9;
  ctx.beginPath();ctx.roundRect(editorSpawn.x,editorSpawn.y,28,28,4);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='bold 9px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('P',editorSpawn.x+14,editorSpawn.y+14);ctx.restore();

  // Drag preview
  if(editorDrag){
    const px=Math.min(editorDrag.sx,editorDrag.cx),py=Math.min(editorDrag.sy,editorDrag.cy);
    const pw=Math.max(EDITOR_GRID,Math.abs(editorDrag.cx-editorDrag.sx));
    const ph=editorTool==='killbrick'?20:editorTool==='iceZone'?Math.max(EDITOR_GRID,Math.abs(editorDrag.cy-editorDrag.sy)||24):18;
    const previewCol=editorTool==='platform'?'#a06840':editorTool==='movingPlatform'?'#30a030':editorTool==='iceZone'?'#88ddff':'#880000';
    ctx.save();ctx.globalAlpha=.45;ctx.fillStyle=previewCol;
    ctx.fillRect(px,py,pw,ph);
    ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.strokeRect(px,py,pw,ph);ctx.setLineDash([]);ctx.restore();
  }
  ctx.restore(); // end clip+translate

  // Size guide label (screen space, top-left of viewport)
  {const sz2=WORLD_SIZES[editorSizeIdx];
  ctx.save();ctx.globalAlpha=.7;ctx.fillStyle='#00ffcc';ctx.font='bold 8px Orbitron';ctx.textAlign='left';ctx.textBaseline='top';ctx.shadowColor='#00ffcc';ctx.shadowBlur=6;
  ctx.fillText('WORLD: '+sz2.label+' '+sz2.w+'×'+sz2.h,4,ED_TOP+3);ctx.restore();}

  // --- SEPARATOR LINES ---
  ctx.strokeStyle='rgba(0,200,255,.12)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,ED_TOP);ctx.lineTo(W,ED_TOP);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ED_VW,ED_TOP);ctx.lineTo(ED_VW,H);ctx.stroke();

  // --- TOP BAR ---
  const tbg=ctx.createLinearGradient(0,0,0,ED_TOP);
  tbg.addColorStop(0,'#0c1830');tbg.addColorStop(1,'#070f20');
  ctx.fillStyle=tbg;ctx.fillRect(0,0,W,ED_TOP);

  function edBtn(label,bx,by,bw,bh,col,active){
    col=col||'#00ccff';
    ctx.save();
    if(active){ctx.shadowColor=col;ctx.shadowBlur=10;}
    ctx.fillStyle=active?col+'44':'rgba(0,14,38,.88)';
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,5);ctx.fill();
    ctx.strokeStyle=active?col:'rgba(0,160,220,.25)';ctx.lineWidth=active?1.5:1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,5);ctx.stroke();
    ctx.fillStyle=active?col:'rgba(190,220,255,.8)';
    ctx.font='bold 8px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(label,bx+bw/2,by+bh/2);ctx.restore();
  }

  edBtn('← LEVELS',6,6,82,32,'#5588ff');

  // Level name / rename area
  const saveX=W-ED_RIGHT-186,nameX=96,nameW=saveX-nameX-8;
  ctx.save();
  if(editorRenaming){
    ctx.shadowColor='#00ccff';ctx.shadowBlur=8;
    ctx.fillStyle='rgba(0,18,55,.95)';ctx.beginPath();ctx.roundRect(nameX,6,nameW,32,5);ctx.fill();
    ctx.strokeStyle='#00ccff';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(nameX,6,nameW,32,5);ctx.stroke();
    const disp=editorRenameStr+(Math.floor(animTick/16)%2===0?'|':'');
    ctx.fillStyle='#00ffff';ctx.font='bold 11px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(disp,nameX+10,22);
    ctx.fillStyle='rgba(0,200,255,.4)';ctx.font='7px Orbitron';ctx.textAlign='right';
    ctx.fillText('ENTER = CONFIRM',nameX+nameW-8,22);
  }else{
    ctx.fillStyle='rgba(0,12,35,.7)';ctx.beginPath();ctx.roundRect(nameX,6,nameW,32,5);ctx.fill();
    ctx.strokeStyle='rgba(80,130,220,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(nameX,6,nameW,32,5);ctx.stroke();
    ctx.fillStyle='#aaccff';ctx.font='bold 11px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(editorLevelName,nameX+10,22);
    ctx.fillStyle='rgba(100,150,255,.4)';ctx.font='7px Orbitron';ctx.textAlign='right';
    ctx.fillText('✎',nameX+nameW-8,22);
  }
  ctx.restore();

  edBtn('💾 SAVE',saveX,6,82,32,'#00ffcc');
  edBtn('▶ TEST',W-ED_RIGHT-96,6,88,32,'#44ff88');

  // --- RIGHT PANEL ---
  const rpx=ED_VW;
  ctx.fillStyle='#070e1c';ctx.fillRect(rpx,ED_TOP,ED_RIGHT,ED_VH);

  // Category tabs — auto-fit 6 tabs in 116px panel
  const catTabW=Math.floor(ED_RIGHT/EDITOR_PALETTE.length);
  const catColors=['#cc9966','#ff5555','#FFD700','#88ddff','#44ffcc','#4488ff'];
  EDITOR_PALETTE.forEach((cat,i)=>{
    const tx=rpx+i*catTabW,ty=ED_TOP;const active=editorCategory===i;
    ctx.save();
    if(active){ctx.shadowColor=catColors[i%catColors.length];ctx.shadowBlur=8;}
    ctx.fillStyle=active?catColors[i%catColors.length]+'44':'rgba(0,6,18,.88)';
    ctx.fillRect(tx,ty,catTabW,30);
    ctx.strokeStyle=active?catColors[i%catColors.length]:'rgba(80,130,200,.18)';ctx.lineWidth=1;
    ctx.strokeRect(tx,ty,catTabW,30);
    ctx.fillStyle=active?catColors[i%catColors.length]:'rgba(130,170,220,.55)';
    ctx.font='bold 5px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(cat.label,tx+catTabW/2,ty+15);ctx.restore();
  });

  // Tool buttons for current category
  const curCat=EDITOR_PALETTE[editorCategory];
  curCat.tools.forEach((tool,i)=>{
    const ty=ED_TOP+30+i*44;const col=curCat.colors[i]||'#88aaff';
    const active=editorTool===tool;
    ctx.save();
    if(active){ctx.shadowColor=col;ctx.shadowBlur=10;}
    ctx.fillStyle=active?col+'2a':'rgba(0,8,22,.8)';
    ctx.beginPath();ctx.roundRect(rpx+2,ty+2,ED_RIGHT-4,40,4);ctx.fill();
    ctx.strokeStyle=active?col:'rgba(70,120,190,.2)';ctx.lineWidth=active?1.5:1;
    ctx.beginPath();ctx.roundRect(rpx+2,ty+2,ED_RIGHT-4,40,4);ctx.stroke();
    // Color swatch
    ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(rpx+8,ty+11,14,18,3);ctx.fill();
    // Label
    ctx.fillStyle=active?col:'rgba(170,205,255,.75)';
    ctx.font='bold 7px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    const _puShort={speedBoost:'SPD',shield:'SHD',extraJump:'JMP',invincibility:'INV',coinMagnet:'MAG',scoreMult:'×2'};
    const lbl=tool==='powerup'?(active?(_puShort[editorPowerupType]||'PU')+' (click=cycle)':'POWERUP'):tool==='conveyZone'?(active?(editorConveyDir>0?'BELT▶':'◀BELT'):'CONVEYOR'):tool==='portal'?(active?editorPortalType.toUpperCase().slice(0,6):'PORTAL'):tool==='warpGate'?(active?'PAIR #'+editorWarpPairId:'WARP GATE'):EDITOR_TOOL_LABELS[tool]||tool;
    ctx.fillText(lbl,rpx+28,ty+22);ctx.restore();
  });

  // ── Settings panel (always visible below tool buttons) ───────────────────
  const settY=ED_TOP+30+4*44+5;
  function settBtn(label,bx,by,bw,bh,active,col){
    col=col||'#00ccff';ctx.save();
    if(active){ctx.shadowColor=col;ctx.shadowBlur=6;}
    ctx.fillStyle=active?col+'55':'rgba(0,10,30,.85)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,3);ctx.fill();
    ctx.strokeStyle=active?col:'rgba(60,120,200,.3)';ctx.lineWidth=active?1.5:1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,3);ctx.stroke();
    ctx.fillStyle=active?col:'rgba(150,190,255,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(label,bx+bw/2,by+bh/2);ctx.restore();
  }
  ctx.strokeStyle='rgba(0,200,255,.18)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(rpx+4,settY);ctx.lineTo(rpx+ED_RIGHT-4,settY);ctx.stroke();
  if(editorTool==='powerup'){
    // ── Powerup type selector ────────────────────────────────
    ctx.fillStyle='rgba(170,255,170,.55)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ PU TYPE ─',rpx+58,settY+8);
    const ptypes=[{t:'speedBoost',l:'SPD',c:'#00ffff'},{t:'shield',l:'SHD',c:'#4488ff'},{t:'extraJump',l:'JMP',c:'#44ff88'},{t:'invincibility',l:'INV',c:'#ffdd00'},{t:'coinMagnet',l:'MAG',c:'#FFD700'},{t:'scoreMult',l:'×2',c:'#FF88FF'}];
    ptypes.forEach((pt,i)=>{
      const bx=rpx+4+(i%2)*57;const by=settY+16+Math.floor(i/2)*30;
      settBtn(pt.l,bx,by,53,24,editorPowerupType===pt.t,pt.c);
    });
  } else if(editorTool==='movingPlatform'){
    // ── Moving platform range/speed ──────────────────────────
    ctx.fillStyle='rgba(136,255,136,.55)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ MOVE PLT ─',rpx+58,settY+8);
    ctx.fillStyle='rgba(150,190,255,.7)';ctx.font='bold 6px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('RANGE:',rpx+4,settY+25);
    settBtn('◄',rpx+46,settY+17,18,14,false,'#88aaff');
    ctx.fillStyle='#aaddff';ctx.font='bold 7px Orbitron';ctx.textAlign='center';
    ctx.fillText(editorMovePlatRange,rpx+76,settY+25);
    settBtn('►',rpx+92,settY+17,18,14,false,'#88aaff');
    ctx.fillStyle='rgba(150,190,255,.7)';ctx.font='bold 6px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('SPEED:',rpx+4,settY+45);
    settBtn('◄',rpx+46,settY+37,18,14,false,'#ffaa44');
    ctx.fillStyle='#ffcc88';ctx.font='bold 7px Orbitron';ctx.textAlign='center';
    ctx.fillText(editorMovePlatSpd.toFixed(1),rpx+76,settY+45);
    settBtn('►',rpx+92,settY+37,18,14,false,'#ffaa44');
  } else if(editorTool==='conveyZone'){
    // ── Conveyor zone direction ───────────────────────────────
    ctx.fillStyle='rgba(255,170,34,.65)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ BELT DIR ─',rpx+58,settY+8);
    settBtn('◀ LEFT',rpx+4,settY+18,54,22,editorConveyDir===-1,'#22aaff');
    settBtn('RIGHT ▶',rpx+62,settY+18,54,22,editorConveyDir===1,'#ffaa22');
  } else if(editorTool==='portal'){
    // ── Portal type selector ──────────────────────────────────
    ctx.fillStyle='rgba(68,136,255,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ PORTAL TYPE ─',rpx+58,settY+8);
    const ptypes2=[{t:'gravity',l:'GRAV',c:'#44aaff'},{t:'mirror',l:'MIRR',c:'#ff44cc'},{t:'shrink',l:'SHNK',c:'#ffaa22'},{t:'ghost',l:'GHST',c:'#aaffaa'},{t:'speed',l:'SPD',c:'#ffff00'},{t:'score',l:'SCOR',c:'#ff88ff'},{t:'coinStorm',l:'COIN',c:'#FFD700'},{t:'bounce',l:'BNC',c:'#ff6644'}];
    ptypes2.forEach((pt,i)=>{
      const bx=rpx+4+(i%2)*57;const by=settY+16+Math.floor(i/2)*24;
      settBtn(pt.l,bx,by,52,20,editorPortalType===pt.t,pt.c);
    });
  } else if(editorTool==='warpGate'){
    // ── Warp pair selector ────────────────────────────────────
    ctx.fillStyle='rgba(255,68,255,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ WARP PAIR ─',rpx+58,settY+8);
    ['#ff44ff','#44ffff','#ffff44','#ff8800'].forEach((wc,i)=>{
      const bx=rpx+4+(i%2)*57;const by=settY+18+Math.floor(i/2)*30;
      settBtn('PAIR '+i,bx,by,52,24,editorWarpPairId===i,wc);
    });
    ctx.fillStyle='rgba(200,180,255,.6)';ctx.font='bold 5px Orbitron';ctx.textAlign='center';
    ctx.fillText('Place 2 same-pair gates',rpx+58,settY+86);
  } else if(editorTool==='boss'){
    // ── Boss HP selector ─────────────────────────────────────
    ctx.fillStyle='rgba(255,68,0,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ BOSS HP ─',rpx+58,settY+8);
    settBtn('◄',rpx+8,settY+18,24,22,false,'#ff8888');
    ctx.fillStyle='#ffcccc';ctx.font='bold 12px Orbitron';ctx.textAlign='center';
    ctx.fillText(editorBossHp,rpx+58,settY+30);
    settBtn('►',rpx+82,settY+18,24,22,false,'#ff8888');
    ctx.fillStyle='rgba(200,150,150,.6)';ctx.font='bold 5px Orbitron';ctx.textAlign='center';
    ctx.fillText('(max 8)',rpx+58,settY+52);
  } else if(editorTool==='laser'){
    // ── Laser interval selector ───────────────────────────────
    ctx.fillStyle='rgba(255,102,68,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ LASER INTERVAL ─',rpx+58,settY+8);
    settBtn('◄',rpx+8,settY+18,24,22,false,'#ff8866');
    ctx.fillStyle='#ffcc99';ctx.font='bold 10px Orbitron';ctx.textAlign='center';
    ctx.fillText(editorLaserInterval+'f',rpx+58,settY+30);
    settBtn('►',rpx+82,settY+18,24,22,false,'#ff8866');
    ctx.fillStyle='rgba(200,160,140,.6)';ctx.font='bold 5px Orbitron';ctx.textAlign='center';
    ctx.fillText('frames on/off',rpx+58,settY+52);
  } else if(editorTool==='platform'){
    // ── Platform style selector ───────────────────────────────
    ctx.fillStyle='rgba(200,150,100,.8)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ PLT STYLE ─',rpx+58,settY+8);
    const pstyleColors={stone:'#cc9966',ice:'#88ddff',grass:'#44cc44',lava:'#ff6622',void:'#cc44ff',cyber:'#00ffee'};
    PLATFORM_STYLES.forEach((ps,i)=>{
      const bx=rpx+4+(i%2)*57;const by=settY+16+Math.floor(i/2)*24;
      settBtn(ps.toUpperCase(),bx,by,52,20,editorPlatformStyle===ps,pstyleColors[ps]||'#aaaaaa');
    });
  } else {
    // ── Default: LAVA / MUSIC / SIZE ─────────────────────────
    ctx.fillStyle='rgba(0,180,255,.45)';ctx.font='bold 6px Orbitron';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('─ SETTINGS ─',rpx+58,settY+8);
    // LAVA row
    ctx.fillStyle='rgba(150,190,255,.7)';ctx.font='bold 6px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('LAVA:',rpx+4,settY+21);
    settBtn('OFF',rpx+36,settY+14,27,14,!editorLavaRise,'#88aaff');
    settBtn('ON',rpx+66,settY+14,30,14,editorLavaRise,'#ff6644');
    // LAVA SPD row
    ctx.fillStyle='rgba(150,190,255,.7)';ctx.fillText('SPD:',rpx+4,settY+41);
    settBtn('▼',rpx+40,settY+34,18,14,false,'#ff8855');
    ctx.fillStyle=editorLavaRise?'#ff8855':'rgba(100,100,100,.5)';ctx.font='bold 7px Orbitron';ctx.textAlign='center';
    ctx.fillText(editorLavaSpd.toFixed(2),rpx+67,settY+41);
    settBtn('▲',rpx+78,settY+34,18,14,false,'#ff8855');
    // MUSIC row
    ctx.fillStyle='rgba(150,190,255,.7)';ctx.font='bold 6px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('MUSIC:',rpx+4,settY+61);
    settBtn('◄',rpx+6,settY+54,18,14,false,'#ffaa00');
    const tname=(THEME_NAMES[editorMusicIdx]||'?').substring(0,6);
    ctx.fillStyle='#ffaa00';ctx.font='bold 5px Orbitron';ctx.textAlign='center';
    ctx.fillText(tname,rpx+63,settY+61);
    settBtn('►',rpx+94,settY+54,18,14,false,'#ffaa00');
    // SIZE row
    ctx.fillStyle='rgba(150,190,255,.7)';ctx.font='bold 6px Orbitron';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('SIZE:',rpx+4,settY+81);
    settBtn('◄',rpx+6,settY+74,18,14,false,'#88aaff');
    ctx.fillStyle='#88aaff';ctx.font='bold 6px Orbitron';ctx.textAlign='center';
    ctx.fillText(WORLD_SIZES[editorSizeIdx].label,rpx+63,settY+81);
    settBtn('►',rpx+94,settY+74,18,14,false,'#88aaff');
  }

  // Panel footer stats
  ctx.fillStyle='rgba(80,130,200,.4)';ctx.font='7px Orbitron';ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.fillText(`OBJ: ${editorObjs.length}`,rpx+58,H-6);
  ctx.fillText(`${Math.round(camera.x)},${Math.round(camera.y)}`,rpx+58,H-17);
  ctx.fillStyle='rgba(80,130,200,.25)';ctx.font='6px Orbitron';
  ctx.fillText('R-DRAG:PAN  SCROLL:ZOOM',rpx+58,H-28);
}

// ══════════════════════════════════════════
//  LOOP
// ══════════════════════════════════════════
function loop(){update();draw();requestAnimationFrame(loop);}
loop();

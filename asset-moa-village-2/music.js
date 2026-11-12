(function(){
 'use strict';
 const tracks=[
  [72,76,79,83,81,79,76,74,72,76,79,84,83,79,76,74,69,72,76,81,79,76,74,72,74,77,81,84,83,79,76,72],
  [76,79,83,86,84,81,79,76,74,77,81,84,83,81,77,74,72,76,79,83,81,79,76,72,74,77,81,86,84,81,77,74],
  [79,83,86,88,86,83,79,76,77,81,84,86,84,81,77,74,76,79,83,88,86,83,79,76,74,77,81,84,83,79,76,72]
 ];
 let ctx=null,timer=null,track=0,step=0,enabled=true;const button=document.querySelector('#musicToggle');
 function label(){button.textContent=enabled?'🎵':'🔇';button.setAttribute('aria-label',enabled?'배경음악 끄기':'배경음악 켜기');button.title=enabled?'배경음악 끄기':'배경음악 켜기';button.setAttribute('aria-pressed',String(enabled))}
 function tone(note,when,volume){const freq=440*Math.pow(2,(note-69)/12),gain=ctx.createGain(),a=ctx.createOscillator(),b=ctx.createOscillator(),mix=ctx.createGain();a.type='sine';b.type='sine';a.frequency.value=freq;b.frequency.value=freq*2.76;mix.gain.value=.17;gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(volume,when+.01);gain.gain.exponentialRampToValueAtTime(.0001,when+1.1);a.connect(gain);b.connect(mix);mix.connect(gain);gain.connect(ctx.destination);a.start(when);b.start(when);a.stop(when+1.15);b.stop(when+1.15)}
 function tick(){if(!enabled||!ctx||ctx.state!=='running')return;let now=ctx.currentTime;let n=tracks[track][step];tone(n,now,.028);if(step%4===0)tone(n-24,now,.012);step++;if(step>=tracks[track].length){step=0;track=(track+1)%tracks.length}}
 function start(){if(!enabled)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx=ctx||new A();if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(!timer){tick();timer=setInterval(tick,300)}}catch{}}
 button.addEventListener('click',()=>{enabled=!enabled;label();if(enabled)start()});document.querySelector('#start').addEventListener('click',start);document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else if(enabled)ctx.resume().catch(()=>{})});label();
})();


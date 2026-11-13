(function(){
 'use strict';
 // 새로운 탐험 선율. 32마디, 128 BPM = 정확히 60초.
 const bpm=128,eighth=60/bpm/2,loopSteps=256;
 const bars=[
  [[76,2],[71,1],[67,1],[71,2],[74,2]],
  [[76,2],[79,1],[78,1],[76,2],[74,2]],
  [[71,2],[74,1],[79,1],[78,2],[74,2]],
  [[69,2],[66,1],[69,1],[74,2],[71,2]],
  [[76,2],[79,1],[83,1],[81,2],[79,2]],
  [[76,2],[79,1],[76,1],[74,2],[72,2]],
  [[69,2],[72,1],[76,1],[74,2],[71,2]],
  [[71,2],[75,1],[78,1],[76,4]]
 ];
 const chords=[[40,[55,59,64]],[36,[55,60,64]],[43,[55,59,62]],[38,[54,57,62]],[40,[55,59,64]],[36,[55,60,64]],[45,[57,60,64]],[35,[54,59,63]]];
 const melody=Array(64).fill(null);bars.forEach((bar,i)=>{let p=i*8;bar.forEach(([note,len])=>{melody[p]={note,len};p+=len});if(p!==(i+1)*8)throw Error('Invalid music bar')});
 let ctx=null,master=null,timer=null,nextTime=0,step=0,enabled=true,started=false;const button=document.querySelector('#musicToggle');
 function label(){button.textContent=enabled?'🎵':'🔇';button.setAttribute('aria-label',enabled?'배경음악 끄기':'배경음악 켜기');button.title=enabled?'배경음악 끄기':'배경음악 켜기';button.setAttribute('aria-pressed',String(enabled))}
 const freq=n=>440*Math.pow(2,(n-69)/12);
 function tone(note,at,level,duration,type='sine',attack=.015){let gain=ctx.createGain(),o=ctx.createOscillator();o.type=type;o.frequency.value=freq(note);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(level,at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(gain);gain.connect(master);o.start(at);o.stop(at+duration+.02)}
 function pad(notes,at){notes.forEach((n,i)=>{let o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=freq(n);o.detune.value=(i-1)*3;filter.type='lowpass';filter.frequency.value=800;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.014,at+.32);g.gain.setValueAtTime(.014,at+1.45);g.gain.exponentialRampToValueAtTime(.0001,at+2.05);o.connect(filter);filter.connect(g);g.connect(master);o.start(at);o.stop(at+2.1)})}
 function playStep(k,at){let beat=k%8,bar=Math.floor(k/8)%8,section=Math.floor(k/64),event=melody[k%64],ch=chords[bar];if(event){tone(event.note,at,.062,Math.min(1.4,event.len*eighth+.55),'triangle');tone(event.note+12,at,.014,.7,'sine')}if(beat===0){pad(ch[1],at);tone(ch[0],at,.065,1.1,'triangle',.035)}if(beat===4)tone(ch[0]+7,at,.035,.9,'triangle',.04);if(beat===2||beat===6)tone(ch[1][(bar+section)%3]+12,at,.015,.65,'sine')}
 function schedule(){if(!ctx||ctx.state!=='running'||!enabled)return;if(nextTime<ctx.currentTime-.25)nextTime=ctx.currentTime+.02;while(nextTime<ctx.currentTime+.18){playStep(step,nextTime);step=(step+1)%loopSteps;nextTime+=eighth}}
 function stopTimer(){if(timer){clearInterval(timer);timer=null}}
 function start(){if(!enabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!ctx){ctx=new Audio();master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination)}started=true;master.gain.setTargetAtTime(.65,ctx.currentTime,.03);const ready=ctx.state!=='running'?ctx.resume():Promise.resolve();ready.then(()=>{if(!enabled||document.hidden)return;nextTime=ctx.currentTime+.04;if(!timer){schedule();timer=setInterval(schedule,75)}}).catch(()=>{})}catch{}}
 button.addEventListener('click',()=>{enabled=!enabled;label();if(enabled)start();else{stopTimer();if(master)master.gain.setTargetAtTime(0,ctx.currentTime,.02)}});document.querySelector('#start').addEventListener('click',start);document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden){stopTimer();ctx.suspend().catch(()=>{})}else if(enabled&&started)start()});label();
})();


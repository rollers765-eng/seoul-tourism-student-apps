(function(){
 'use strict';
 // 전통 민요의 선율을 바탕으로 한 32마디 오르골 편곡 (약 53초).
 const bpm=145,eighth=60/bpm/2,loopSteps=256;
 // 8분음표 단위: 음정, 길이. 각 줄은 네 박자 한 마디다.
 const bars=[
  [[76,2],[71,1],[72,1],[74,2],[72,1],[71,1]],
  [[69,2],[69,1],[72,1],[76,2],[74,1],[72,1]],
  [[71,3],[72,1],[74,2],[76,2]],
  [[72,2],[69,2],[69,4]],
  [[74,2],[77,1],[81,1],[79,2],[77,1],[76,1]],
  [[72,2],[76,1],[74,1],[72,2],[71,1],[72,1]],
  [[74,2],[76,2],[72,2],[69,2]],
  [[69,8]]
 ];
 const chords=[[40,[64,68,71]],[45,[64,69,72]],[40,[64,68,71]],[45,[64,69,72]],[38,[62,65,69]],[36,[60,64,67]],[40,[64,68,71]],[45,[64,69,72]]];
 const melody=Array.from({length:64},()=>null);bars.forEach((bar,i)=>{let p=i*8;bar.forEach(([note,len])=>{melody[p]={note,len};p+=len});if(p!==(i+1)*8)throw Error('Invalid music bar')});
 let ctx=null,master=null,noise=null,timer=null,nextTime=0,step=0,enabled=true,started=false;const button=document.querySelector('#musicToggle');
 function label(){button.textContent=enabled?'🎵':'🔇';button.setAttribute('aria-label',enabled?'배경음악 끄기':'배경음악 켜기');button.title=enabled?'배경음악 끄기':'배경음악 켜기';button.setAttribute('aria-pressed',String(enabled))}
 function freq(note){return 440*Math.pow(2,(note-69)/12)}
 function bell(note,at,level,duration){let gain=ctx.createGain(),main=ctx.createOscillator(),over=ctx.createOscillator(),mix=ctx.createGain();main.type='sine';over.type='sine';main.frequency.value=freq(note);over.frequency.value=freq(note)*2.76;mix.gain.value=.16;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(level,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);main.connect(gain);over.connect(mix);mix.connect(gain);gain.connect(master);main.start(at);over.start(at);main.stop(at+duration+.02);over.stop(at+duration+.02)}
 function bass(note,at){let o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(freq(note),at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.055,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.3);o.connect(g);g.connect(master);o.start(at);o.stop(at+.32)}
 function hat(at){let s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=6500;g.gain.setValueAtTime(.016,at);g.gain.exponentialRampToValueAtTime(.0001,at+.055);s.connect(f);f.connect(g);g.connect(master);s.start(at);s.stop(at+.06)}
 function playStep(k,at){let beat=k%8,bar=Math.floor(k/8)%8,section=Math.floor(k/64),event=melody[k%64],ch=chords[bar];if(event)bell(event.note+(section===2?12:0),at,.075,Math.min(1.3,event.len*eighth+.35));if(beat%4===0)bass(ch[0],at);if(beat%4===2)ch[1].forEach(n=>bell(n,at,.019,.23));if(beat%2===0||section===3)hat(at)}
 function schedule(){if(!ctx||ctx.state!=='running'||!enabled)return;if(nextTime<ctx.currentTime-.25)nextTime=ctx.currentTime+.02;while(nextTime<ctx.currentTime+.18){playStep(step,nextTime);step=(step+1)%loopSteps;nextTime+=eighth}}
 function stopTimer(){if(timer){clearInterval(timer);timer=null}}
 function start(){if(!enabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!ctx){ctx=new Audio();master=ctx.createGain();master.gain.value=.7;master.connect(ctx.destination);noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.07),ctx.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1}started=true;master.gain.setTargetAtTime(.7,ctx.currentTime,.03);const ready=ctx.state==='suspended'?ctx.resume():Promise.resolve();ready.then(()=>{if(!enabled||document.hidden)return;nextTime=ctx.currentTime+.04;if(!timer){schedule();timer=setInterval(schedule,75)}}).catch(()=>{})}catch{}}
 button.addEventListener('click',()=>{enabled=!enabled;label();if(enabled)start();else{stopTimer();if(master)master.gain.setTargetAtTime(0,ctx.currentTime,.02)}});
 document.querySelector('#start').addEventListener('click',start);
 document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden){stopTimer();ctx.suspend().catch(()=>{})}else if(enabled&&started)start()});label();
})();


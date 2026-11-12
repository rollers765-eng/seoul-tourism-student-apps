(function(){
 'use strict';
 const paths={greet:'greeting-child-v2.wav',journal:'journal-child-v2.wav'},raw={},decoded={};let context=null,resumeTask=Promise.resolve(),lastNotice=0;
 for(const [key,path] of Object.entries(paths))raw[key]=fetch(path).then(r=>{if(!r.ok)throw Error('audio download');return r.arrayBuffer()}).catch(()=>null);
 // 입장하거나 버튼을 누르는 바로 그 순간에 오디오를 활성화한다.
 function unlock(){try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;context=context||new AudioCtx();resumeTask=context.state!=='running'?context.resume():Promise.resolve();resumeTask.catch(()=>{});return context}catch{return null}}
 function notice(){if(Date.now()-lastNotice<4000)return;lastNotice=Date.now();let el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent='음성을 재생하지 못했어요. 기기 음량과 무음 설정을 확인해 주세요.';document.body.appendChild(el);setTimeout(()=>el.remove(),3500)}
 function fallback(path){try{let audio=new Audio(path),p=audio.play();if(p&&p.catch)p.catch(notice)}catch{notice()}}
 function load(ctx,name){if(!decoded[name])decoded[name]=raw[name].then(data=>{if(!data)throw Error('audio download');return ctx.decodeAudioData(data.slice(0))}).catch(error=>{delete decoded[name];throw error});return decoded[name]}
 document.querySelector('#start').addEventListener('pointerdown',()=>{let ctx=unlock();if(ctx)for(const name of Object.keys(paths))load(ctx,name).catch(()=>{})});
 window.villageVoice={play(name){if(!paths[name])return;let ctx=unlock();if(!ctx){fallback(paths[name]);return}Promise.all([load(ctx,name),resumeTask]).then(([buffer])=>{let source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=1.4;source.connect(gain);gain.connect(ctx.destination);source.start(0)}).catch(()=>fallback(paths[name]))}};
})();


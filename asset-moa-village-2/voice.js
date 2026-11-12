(function(){
 'use strict';
 const clips={greet:new Audio('greeting-supertonic3.wav'),journal:new Audio('journal-supertonic3.wav')};
 Object.values(clips).forEach(audio=>{audio.preload='auto'});
 window.villageVoice={play(name){let audio=clips[name];if(!audio)return;try{audio.pause();audio.currentTime=0;let result=audio.play();if(result&&typeof result.catch==='function')result.catch(()=>{})}catch{}}};
})();


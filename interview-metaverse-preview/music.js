(function(root){'use strict';
function create(){let ctx,gain,timer,enabled=false,inCafe=false,duck=false,index=0,track=0;const tunes=[[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46],[440,523.25,659.25,523.25,392,493.88,587.33,493.88]];
function silence(){if(timer){clearInterval(timer);timer=null;}if(gain&&ctx)gain.gain.setTargetAtTime(0,ctx.currentTime,.12);}
function note(){if(!ctx||!enabled||duck)return;const now=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=tunes[track][index++%8];g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+1.1);o.connect(g);g.connect(gain);o.start(now);o.stop(now+1.15);}
function sync(){if(!enabled||duck){silence();return;}if(!ctx)return;gain.gain.setTargetAtTime(.35,ctx.currentTime,.2);if(!timer){note();timer=setInterval(note,650);}}
return {async toggle(){enabled=!enabled;if(enabled){const C=root.AudioContext||root.webkitAudioContext;if(!C){enabled=false;return false;}try{if(!ctx){ctx=new C();gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);}await ctx.resume();}catch(e){enabled=false;return false;}}sync();return enabled;},setCafe(v){inCafe=v;sync();},setDucked(v){duck=v;sync();},next(){track=(track+1)%tunes.length;index=0;return track?'별빛 산책':'노을빛 오르골';},isEnabled(){return enabled;}};}
const api={create};if(typeof module!=='undefined')module.exports=api;root.InterviewMusic=api;
})(typeof window==='undefined'?globalThis:window);


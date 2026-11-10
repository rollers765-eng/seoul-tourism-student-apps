(function(root){'use strict';
function create(options={}){
 const starts=[[-2,0],[0,1.8],[2,-.7]];
 const balls=starts.map(([x,z])=>({x,z,vx:0,vz:0}));let score=0,entered=null,reminded=false;
 const game={balls,get score(){return score},visit(inside,time){if(!inside){entered=null;reminded=false;return}if(entered===null)entered=time;if(!reminded&&time-entered>=120000){reminded=true;options.onReminder?.()}},update(dt,player,now){dt=Math.max(0,Math.min(.2,dt));for(let i=0;i<balls.length;i++){const b=balls[i],dx=b.x-player.x,dz=b.z-player.z,dist=Math.hypot(dx,dz);if(dist<.75&&Number.isFinite(player.dx)&&Math.hypot(player.dx,player.dz)>.001){const length=Math.hypot(player.dx,player.dz);b.vx=player.dx/length*3.5;b.vz=player.dz/length*3.5;}b.x+=b.vx*dt;b.z+=b.vz*dt;const drag=Math.pow(.18,dt);b.vx*=drag;b.vz*=drag;if(Math.abs(b.x)>6.8){b.x=Math.sign(b.x)*6.8;b.vx*=-.5;}if(Math.abs(b.z)>6){if(Math.abs(b.x)<1.4){score++;options.onGoal?.(score,{x:b.x,z:b.z},now);[b.x,b.z]=starts[i];b.vx=b.vz=0;}else{b.z=Math.sign(b.z)*6;b.vz*=-.5;}}}}};return game;
}
const api={create};if(typeof module!=='undefined')module.exports=api;root.InterviewFutsal=api;
})(typeof window==='undefined'?globalThis:window);

(function(root){'use strict';
const clampZoom=n=>Math.max(.65,Math.min(1.55,n));
const pinchZoom=(initial,start,current)=>clampZoom(initial*start/Math.max(1,current));
const timerDuration=(seconds,delta)=>Math.max(10,Math.min(300,seconds+delta));
const api={clampZoom,pinchZoom,timerDuration};if(typeof module!=='undefined')module.exports=api;root.InterviewExperience=api;
})(typeof window==='undefined'?globalThis:window);

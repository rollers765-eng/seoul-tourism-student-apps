(function(root){'use strict';
const clampZoom=n=>Math.max(.65,Math.min(1.55,n));
const pinchZoom=(initial,start,current)=>clampZoom(initial*start/Math.max(1,current));
const zoomByStep=(zoom,direction)=>clampZoom(zoom*(direction==='in'?.8:1.25));
const viewportZoom=(width,height)=>{const ratio=Math.max(1,width)/Math.max(1,height);return 1+Math.max(0,Math.min(.5,(.8-ratio)*1.2));};
const timerDuration=(seconds,delta)=>Math.max(10,Math.min(300,seconds+delta));
const api={clampZoom,pinchZoom,zoomByStep,viewportZoom,timerDuration};if(typeof module!=='undefined')module.exports=api;root.InterviewExperience=api;
})(typeof window==='undefined'?globalThis:window);

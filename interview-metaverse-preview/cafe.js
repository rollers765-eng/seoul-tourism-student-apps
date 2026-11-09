(function(root){'use strict';
const stars=[{x:-3.8,z:-.5},{x:0,z:3.3},{x:3.8,z:-.5}];
function create({onPrompt,onStar}){const found=new Set();let entered=null,last=null;return {update(zone,x,z,now){if(zone!=='cafezone'){entered=null;last=null;return;}for(let i=0;i<stars.length;i++)if(!found.has(i)&&Math.hypot(x-stars[i].x,z-stars[i].z)<.85){found.add(i);onStar(i,found.size);}if(Math.hypot(x,z+1)>4.5){entered=null;last=null;return;}if(entered===null)entered=now;if(now-entered>=3000&&(last===null||now-last>=60000)){last=now;onPrompt();}},count(){return found.size;}};}
const api={create,stars};if(typeof module!=='undefined')module.exports=api;root.InterviewCafe=api;
})(typeof window==='undefined'?globalThis:window);

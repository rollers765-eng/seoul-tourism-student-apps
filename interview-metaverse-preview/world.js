(function(root){
'use strict';
const centers={lobby:0,cafe:-15,tour:-30,cook:-45,cafezone:15};
function zoneAt(x){let best='lobby',d=Infinity;for(const [key,c] of Object.entries(centers)){const n=Math.abs(x-c);if(n<d){best=key;d=n;}}return best;}
function nearestSeat(zone,x,z){let seats=[];if(['cafe','tour','cook'].includes(zone)){seats=[...[-5,-3.85,-2.7].map(x=>({type:'waiting',x,z:2.4})),...[-3,-1.5,0,1.5,3].map(x=>({type:'interview',x,z:-2.4}))];}else if(zone==='cafezone'){seats=[[-5,-4],[0,3.8],[5,-4],[-5,3.8],[5,3.8],[-3,-1],[3,-1],[0,-4.4],[0,2.2]].map(([x,z])=>({type:'rest',x,z}));}else if(zone==='lobby'){seats=[-4.2,4.2].flatMap(x=>[-2.2,-1,.2,1.4].map(z=>({type:'rest',x,z})));}
let best=null,dist=1.05;for(const s of seats){const d=Math.hypot(x-s.x,z-s.z);if(d<dist){best=s;dist=d;}}return best;}
function stepToward(from,to,speed){const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);if(d<=speed||d===0)return {x:to.x,z:to.z,arrived:true};return {x:from.x+dx/d*speed,z:from.z+dz/d*speed,arrived:false};}
function gait(time,amount,run){if(!amount)return {left:0,right:0};const a=Math.sin(time*(run?.016:.011))*(run?.75:.43)*amount;return {left:a,right:-a};}
function blocked(x,z,peers=[]){
 const rect=(cx,cz,w,d)=>Math.abs(x-cx)<w/2+.25&&Math.abs(z-cz)<d/2+.25;
 for(const zone of ['cafe','tour','cook']){const o=centers[zone];
  if(rect(o-5,0,4.7,.18)||rect(o+5,0,4.7,.18)||rect(o-7.45,-3.5,.16,6.6)||rect(o+7.45,-3.5,.16,6.6)||rect(o,-6.8,15,.18)||rect(o,-4.8,7,1.2)||rect(o+3,2.4,.65,.65))return true;
  for(const dx of [-3,-1.5,0,1.5,3])if(rect(o+dx,-2.4,.9,.8))return true;
  for(const dx of [-5,-3.85,-2.7])if(rect(o+dx,2.4,.9,.8))return true;
 }
 for(const o of [centers.lobby,centers.cafezone])if(rect(o,-6.8,15,.18))return true;
 if(rect(0,-3.4,4.4,1)||rect(0,1.8,1.35,1.35)||rect(15,-1,1,1))return true;
 return peers.some(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.hypot(x-p.x,z-p.z)<.68);
}
function entrancePath(zone,from){const x=centers[zone];return [{x:from.x,z:3.35},{x,z:3.35},{x,z:.8,action:'entrance'}];}
function interviewSeatPath(zone){return [{x:centers[zone],z:-1.45,action:'seat'}];}
function spawn(zone){return {x:centers[zone],z:5.3};}
function canMove(from,to,peers=[]){if(blocked(to.x,to.z,[]))return false;return !peers.some(p=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;const before=Math.hypot(from.x-p.x,from.z-p.z),after=Math.hypot(to.x-p.x,to.z-p.z);return after<.68 && !(before<.68 && after>before);});}
const api={centers,zoneAt,nearestSeat,stepToward,gait,blocked,spawn,canMove,entrancePath,interviewSeatPath};if(typeof module!=='undefined')module.exports=api;root.InterviewWorld=api;
})(typeof window==='undefined'?globalThis:window);


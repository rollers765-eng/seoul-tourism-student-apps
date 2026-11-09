(function(root){
'use strict';
const centers={lobby:0,cafe:-24,tour:-48,cook:-72,cafezone:24};
function zoneAt(x){let best='lobby',d=Infinity;for(const [key,c] of Object.entries(centers)){const n=Math.abs(x-c);if(n<d){best=key;d=n;}}return best;}
function nearestSeat(zone,x,z){let seats=[];if(['cafe','tour','cook'].includes(zone)){seats=[...[-1.15,0,1.15].map(x=>({type:'waiting',x,z:3})),...[-3,-1.5,0,1.5,3].map(x=>({type:'interview',x,z:-1.8}))];}else if(zone==='cafezone'){seats=[{type:'rest',x:-4,z:1},{type:'rest',x:4,z:1}];}else if(zone==='lobby'){seats=[{type:'rest',x:-4,z:-1},{type:'rest',x:4,z:-1}];}
let best=null,dist=1.05;for(const s of seats){const d=Math.hypot(x-s.x,z-s.z);if(d<dist){best=s;dist=d;}}return best;}
function stepToward(from,to,speed){const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);if(d<=speed||d===0)return {x:to.x,z:to.z,arrived:true};return {x:from.x+dx/d*speed,z:from.z+dz/d*speed,arrived:false};}
function gait(time,amount,run){if(!amount)return {left:0,right:0};const a=Math.sin(time*(run?.016:.011))*(run?.75:.43)*amount;return {left:a,right:-a};}
const api={centers,zoneAt,nearestSeat,stepToward,gait};if(typeof module!=='undefined')module.exports=api;root.InterviewWorld=api;
})(typeof window==='undefined'?globalThis:window);

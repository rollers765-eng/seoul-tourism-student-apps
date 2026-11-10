(function(root){
'use strict';
const centers={lobby:0,cafe:-15,tour:-30,cook:-45,cafezone:15,futsal:-60,laser:-74.3};
const layout={interviewDeskZ:-7.2,interviewSeatZ:-2.4,benchSeats:[[-2.8,-3.4],[2.8,-3.4],[-2.8,1.4],[2.8,1.4]],sofaSeats:[[-5,-4],[0,5],[5,-4],[-5,3.8],[5,3.8]]};
function zoneAt(x){let best='lobby',d=Infinity;for(const [key,c] of Object.entries(centers)){const n=Math.abs(x-c);if(n<d){best=key;d=n;}}return best;}
function nearestSeat(zone,x,z){let seats=[];if(['cafe','tour','cook'].includes(zone)){seats=[...[-5,-3.85,-2.7].map(x=>({type:'waiting',x,z:2.4})),...[-3,-1.5,0,1.5,3].map(x=>({type:'interview',x,z:-2.4}))];}else if(zone==='cafezone'){seats=[...layout.sofaSeats.map(([x,z])=>({type:'rest',x,z,rotation:Math.PI})),...layout.benchSeats.map(([x,z])=>({type:'rest',x,z,rotation:Math.atan2(-x,-(z+1))}))];}else if(zone==='lobby'){seats=[...[-4.2,4.2].flatMap(x=>[-2.2,-1,.2,1.4].map(z=>({type:'rest',x,z,facing:x<0?'east':'west'}))),...Array.from({length:3},(_,i)=>({type:'rest',x:Math.cos(i*Math.PI*2/3)*1.7,z:1.8+Math.sin(i*Math.PI*2/3)*1.5}))];}
let best=null,dist=1.05;for(const s of seats){const d=Math.hypot(x-s.x,z-s.z);if(d<dist){best=s;dist=d;}}return best;}
function stepToward(from,to,speed){const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);if(d<=speed||d===0)return {x:to.x,z:to.z,arrived:true};return {x:from.x+dx/d*speed,z:from.z+dz/d*speed,arrived:false};}
function gait(time,amount,run){if(!amount)return {left:0,right:0};const a=Math.sin(time*(run?.016:.011))*(run?.75:.43)*amount;return {left:a,right:-a};}
function surfaceAt(x,z){const inBox=(cx,cz,w,d)=>Math.abs(x-cx)<=w/2&&Math.abs(z-cz)<=d/2;let height=0;const add=(cx,cz,w,d,h)=>{if(inBox(cx,cz,w,d))height=Math.max(height,h)};for(const zone of ['cafe','tour','cook']){const o=centers[zone];add(o,layout.interviewDeskZ,7,1.2,.77);for(const dx of [-3,-1.5,0,1.5,3])add(o+dx,-2.4,.9,.8,.45);for(const dx of [-5,-3.85,-2.7])add(o+dx,2.4,.9,.8,.45);}add(0,-3.4,4.4,1,1.1);add(0,1.8,1.35,1.35,.5);for(const x of [-4.2,4.2])for(const z of [-2.2,-1,.2,1.4])add(x,z,.8,.9,.45);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;add(Math.cos(a)*1.7,1.8+Math.sin(a)*1.5,.86,.86,.43);}for(const [x,z] of layout.sofaSeats){add(centers.cafezone+x,z,1.5,.9,.48);add(centers.cafezone+x,z-1.05,1.5,.7,.75);}for(const [x,z] of layout.benchSeats)add(centers.cafezone+x,z,1.5,.8,.45);add(centers.futsal,2,14.6,13.5,.65);add(centers.laser,1.5,14,14,.65);return height;}
function canStartDeskJump(zone,x,z,y,running){return !!running&&['cafe','tour','cook'].includes(zone)&&y>=.7&&Math.abs(x-centers[zone])<=3.5&&Math.abs(z-layout.interviewDeskZ)<=.6;}
function blocked(x,z,peers=[],height=0,deskJump=false,ignoreChair=null){
 const rect=(cx,cz,w,d)=>Math.abs(x-cx)<w/2+.25&&Math.abs(z-cz)<d/2+.25;
 for(const zone of ['cafe','tour','cook']){const o=centers[zone];
  if(rect(o-5,0,4.7,.18)||rect(o+5,0,4.7,.18)||(rect(o-7.45,-4.5,.16,9)&&!(deskJump&&height>=2.8&&zone!=='cook'))||(rect(o+7.45,-4.5,.16,9)&&!(deskJump&&height>=2.8&&zone!=='cafe'))||rect(o,-9.2,15,.18)||(height<.77&&rect(o,layout.interviewDeskZ,7,1.2))||rect(o+3,2.4,.65,.65))return true;
  for(const dx of [-3,-1.5,0,1.5,3])if(height<.45&&!(ignoreChair&&ignoreChair.zone===zone&&ignoreChair.x===dx&&ignoreChair.z===-2.4)&&rect(o+dx,-2.4,.9,.8))return true;
  for(const dx of [-5,-3.85,-2.7])if(height<.45&&!(ignoreChair&&ignoreChair.zone===zone&&ignoreChair.x===dx&&ignoreChair.z===2.4)&&rect(o+dx,2.4,.9,.8))return true;
 }
 for(const o of [centers.lobby,centers.cafezone])if(rect(o,-6.8,15,.18))return true;
 if((height<1.1&&rect(0,-3.4,4.4,1))||(height<.5&&rect(0,1.8,1.35,1.35))||rect(15,-1,1,1))return true;
 if(x<centers.futsal+7&&x>centers.futsal-7&&z< -4.3)return true;
 if(Math.abs(x-(centers.futsal-7))<.32&&Math.abs(z-2)>1.3&&z> -4.7&&z<8.7)return true;
 if(height<.43)for(let i=0;i<3;i++){const a=i*Math.PI*2/3;if(rect(Math.cos(a)*1.7,1.8+Math.sin(a)*1.5,.86,.86))return true;}
 if(height<.45){for(const cx of [-4.2,4.2])for(const cz of [-2.2,-1,.2,1.4])if(rect(cx,cz,.8,.9))return true;for(const [cx,cz] of layout.benchSeats)if(rect(centers.cafezone+cx,cz,1.5,.8))return true;for(const [cx,cz] of layout.sofaSeats)if(rect(centers.cafezone+cx,cz,1.5,.9))return true;}
 if(height<.75)for(const [cx,cz] of layout.sofaSeats)if(rect(centers.cafezone+cx,cz-1.05,1.5,.7))return true;
 return peers.some(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.hypot(x-p.x,z-p.z)<.68);
}
function entrancePath(zone,from){const x=centers[zone];return [{x:from.x,z:3.35},{x,z:3.35},{x,z:.8,action:'entrance'}];}
function interviewSeatPath(zone){return [{x:centers[zone],z:-1.45,action:'seat'}];}
function shouldBlockEntrance(zone,localX,fromZ,toZ,invitedRoom){return ['cafe','tour','cook'].includes(zone)&&invitedRoom!==zone&&Math.abs(localX)<2.4&&fromZ>.35&&toZ<=.35;}
function routeToInterviewSeat(zone,from,peers=[]){
 if(!['cafe','tour','cook'].includes(zone)||!from||!Number.isFinite(from.x)||!Number.isFinite(from.z))return null;
 const origin=centers[zone],step=.25,minX=origin-7,maxX=origin+7,minZ=-8.5,maxZ=5.75;
 const gx=x=>Math.round((x-origin)/step),gz=z=>Math.round(z/step),pos=(x,z)=>({x:origin+x*step,z:z*step}),key=(x,z)=>x+','+z;
 const safePeers=peers.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.hypot(from.x-p.x,from.z-p.z)>=.68);
 function clearLine(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05));let prev=a;for(let i=1;i<=n;i++){const next={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n};if(!canMove(prev,next,safePeers))return false;prev=next;}return true;}
 const starts=[];for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){const x=gx(from.x)+dx,z=gz(from.z)+dz,p=pos(x,z);if(!blocked(p.x,p.z,safePeers)&&clearLine(from,p))starts.push({x,z,d:Math.hypot(p.x-from.x,p.z-from.z)});}starts.sort((a,b)=>a.d-b.d);if(!starts.length)return null;
 const seats=[-3,-1.5,0,1.5,3].map(x=>({x,z:layout.interviewSeatZ})).sort((a,b)=>Math.hypot(origin+a.x-from.x,a.z-from.z)-Math.hypot(origin+b.x-from.x,b.z-from.z));
 for(const seat of seats){const target={x:origin+seat.x,z:seat.z+.95};if(blocked(target.x,target.z,safePeers)||safePeers.some(p=>Math.hypot(p.x-(origin+seat.x),p.z-seat.z)<1))continue;const goal={x:gx(target.x),z:gz(target.z)},goalPos=pos(goal.x,goal.z);if(blocked(goalPos.x,goalPos.z,safePeers)||!clearLine(goalPos,target))continue;
 const start=starts[0],startKey=key(start.x,start.z),open=[{x:start.x,z:start.z,g:0,f:Math.abs(start.x-goal.x)+Math.abs(start.z-goal.z)}],scores=new Map([[startKey,0]]),parents=new Map();let found=null;
 while(open.length){open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur.x,cur.z);if(cur.g!==scores.get(ck))continue;if(cur.x===goal.x&&cur.z===goal.z){found=ck;break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cur.x+dx,z=cur.z+dz,p=pos(x,z),nk=key(x,z),g=cur.g+1;if(p.x<minX||p.x>maxX||p.z<minZ||p.z>maxZ||blocked(p.x,p.z,safePeers)||g>=(scores.get(nk)??Infinity))continue;scores.set(nk,g);parents.set(nk,ck);open.push({x,z,g,f:g+Math.abs(x-goal.x)+Math.abs(z-goal.z)});}}
 if(!found)continue;const raw=[];for(let k=found;k;k=parents.get(k)){const [x,z]=k.split(',').map(Number);raw.push(pos(x,z));if(k===startKey)break;}raw.reverse();raw.push(target);
 const waypoints=[];let here=from,i=0;while(i<raw.length){let j=raw.length-1;while(j>i&&!clearLine(here,raw[j]))j--;waypoints.push(raw[j]);here=raw[j];i=j+1;}if(waypoints.length){waypoints[waypoints.length-1]={...waypoints[waypoints.length-1],action:'seat',seat};return {seat,waypoints};}
 }return null;
}
function wanderTarget(home,index){const angle=index*2.399;return {x:home.x+Math.cos(angle)*.65,z:home.z+Math.sin(angle)*.65};}
function spawn(zone){return {x:centers[zone]+(zone==='cafezone'?2.4:0),z:5.3};}
function canMove(from,to,peers=[],height=0,deskJump=false){if(blocked(to.x,to.z,[],height,deskJump)){let escape=false;for(const zone of ['cafe','tour','cook']){const origin=centers[zone];for(const [xs,z] of [[[-3,-1.5,0,1.5,3],-2.4],[[-5,-3.85,-2.7],2.4]])for(const x of xs){const cx=origin+x;if(Math.abs(from.x-cx)<.7&&Math.abs(from.z-z)<.65&&Math.hypot(to.x-cx,to.z-z)>Math.hypot(from.x-cx,from.z-z)+1e-7&&!blocked(to.x,to.z,[],height,deskJump,{zone,x,z}))escape=true;}}if(!escape)return false;}return !peers.some(p=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;const before=Math.hypot(from.x-p.x,from.z-p.z),after=Math.hypot(to.x-p.x,to.z-p.z);return after<.68 && !(before<.68 && after>before);});}
const api={centers,layout,zoneAt,nearestSeat,stepToward,gait,blocked,surfaceAt,canStartDeskJump,spawn,canMove,entrancePath,interviewSeatPath,routeToInterviewSeat,shouldBlockEntrance,wanderTarget};if(typeof module!=='undefined')module.exports=api;root.InterviewWorld=api;
})(typeof window==='undefined'?globalThis:window);

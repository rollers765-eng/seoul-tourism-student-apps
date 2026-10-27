(function(root){
 const stages=['accounts','elements','situations'];
 function initial(){return {version:1,stages:[],completed:[],best:{}};}
 function restore(raw){try{const x=JSON.parse(raw);if(x?.version!==1)return initial();return {version:1,stages:stages.filter(s=>x.stages?.includes(s)),completed:[1,2,3].filter(n=>x.completed?.includes(n)),best:Object.fromEntries([1,2,3].filter(n=>Number.isFinite(x.best?.[n])).map(n=>[n,x.best[n]]))};}catch{return initial();}}
 function record(state,event){
  const next=restore(JSON.stringify(state)),part=event?.part,m=event?.metrics||{};if(![1,2,3].includes(part))return next;
  if(part===1&&event.kind==='stage'&&stages.includes(m.stage))next.stages=[...new Set([...next.stages,m.stage])];
  if(next.stages.length===3&&!next.completed.includes(1))next.completed.push(1);
  if(part>1&&event.kind==='complete'&&!next.completed.includes(part))next.completed.push(part);
  if(['stage','complete'].includes(event.kind)&&Number.isFinite(m.score)&&m.score>=0)next.best[part]=Math.max(next.best[part]||0,m.score);
  next.completed.sort();return next;
 }
 function context(state){return {type:'bungae:context',nickname:'복습학생',tokenIdentity:'bungae-practice-local',progress:{stages:state.stages,completed:state.completed,unlocked:3}};}
 const api={initial,restore,record,context};root.BungaePractice=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

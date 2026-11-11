(function(root){
 const RESPAWN_MS=180000;
 function canCollect(times,id,now){return Number.isFinite(now)&&typeof id==='string'&&now>=(Number(times?.[id])||0)}
 function collect(state,id,now){if(!state.treasureTimes||typeof state.treasureTimes!=='object')state.treasureTimes={};if(!canCollect(state.treasureTimes,id,now))return false;state.treasureTimes[id]=now+RESPAWN_MS;state.gems=(Number(state.gems)||0)+1;return true}
 function gemInSwing(dx,dz){return Number.isFinite(dx)&&Number.isFinite(dz)&&Math.hypot(dx,dz)<=1.8}
 const api={RESPAWN_MS,canCollect,collect,gemInSwing};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.VillageGame=api;
})(typeof window!=='undefined'?window:globalThis);

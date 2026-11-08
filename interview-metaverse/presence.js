(function(root){
'use strict';
const rooms=new Set(['lobby','cafe','tour','cook','cafezone']);
function sanitizePeer(p){if(!p||!rooms.has(p.room)||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>7||Math.abs(p.z)>7)return null;return {room:p.room,x:p.x,z:p.z};}
function sanitizeReaction(text){return ['응원해요!','함께 힘내요!','반가워요!'].includes(text)?text:null;}
function startPresence(options){
  if(!root.supabase||!root.supabase.createClient){options.onStatus('offline');return null;}
  let channel,connected=false,current=null,stopped=false;
  try{
    const client=root.supabase.createClient(options.url,options.key);
    channel=client.channel('sths-world-v1',{config:{presence:{key:options.id}}});
    channel.on('presence',{event:'sync'},()=>{
      const peers={};const state=channel.presenceState();
      for(const [id,values] of Object.entries(state)){if(id===options.id||!Array.isArray(values))continue;const p=sanitizePeer(values[values.length-1]);if(p)peers[id]=p;}
      options.onPeers(peers);
    });
    channel.on('broadcast',{event:'cheer'},({payload})=>{const message=sanitizeReaction(payload?.message);if(message&&rooms.has(payload?.room)&&typeof options.onReaction==='function')options.onReaction({room:payload.room,message});});
    channel.subscribe(async status=>{connected=status==='SUBSCRIBED';options.onStatus(connected?'online':'offline');if(connected&&current)await channel.track(current);});
    const interval=setInterval(async()=>{if(stopped||!connected)return;const p=sanitizePeer(options.getPosition());if(p&&JSON.stringify(p)!==JSON.stringify(current)){current=p;try{await channel.track(p)}catch(e){options.onStatus('offline')}}},2500);
    return {async cheer(room,message){if(!connected||!rooms.has(room)||!sanitizeReaction(message))return false;try{return await channel.send({type:'broadcast',event:'cheer',payload:{room,message}})==='ok';}catch(e){return false;}},stop(){stopped=true;clearInterval(interval);try{client.removeChannel(channel)}catch(e){}}};
  }catch(e){options.onStatus('offline');return null;}
}
const api={sanitizePeer,sanitizeReaction,startPresence};if(typeof module!=='undefined')module.exports=api;root.InterviewPresence=api;
})(typeof window==='undefined'?globalThis:window);

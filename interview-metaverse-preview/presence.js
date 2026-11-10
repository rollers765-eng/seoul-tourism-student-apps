(function(root){
'use strict';
const rooms=new Set(['lobby','cafe','tour','cook','cafezone','futsal']);
function sanitizePeer(p){if(!p||!rooms.has(p.room)||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>12.1||p.z< -9.1||p.z>7)return null;const result={room:p.room,x:Math.round(p.x*100)/100,z:Math.round(p.z*100)/100};if(typeof p.sitting==='boolean')result.sitting=p.sitting;if(Number.isFinite(p.y)&&p.y>=0&&p.y<=4)result.y=Math.round(p.y*100)/100;return result;}
function sanitizeReaction(text){return ['응원해요!','함께 힘내요!','반가워요!','사랑합니다!'].includes(text)?text:null;}
function startPresence(options){
  if(!root.supabase||!root.supabase.createClient){options.onStatus('offline');return null;}
  let channel,connected=false,stopped=false,current=null,lastTracked=null,lastTrackTime=0,peers=Object.create(null),presenceSignatures=Object.create(null);
  try{
    const client=root.supabase.createClient(options.url,options.key);
    channel=client.channel(options.topic||'sths-world-v1',{config:{presence:{key:options.id},broadcast:{ack:true}}});
    channel.on('presence',{event:'sync'},()=>{
      const next=Object.create(null),signatures=Object.create(null),state=channel.presenceState();
      for(const [id,values] of Object.entries(state)){if(id===options.id||!Array.isArray(values))continue;const p=sanitizePeer(values[values.length-1]);if(p){const signature=JSON.stringify(p);signatures[id]=signature;next[id]=signature===presenceSignatures[id]&&peers[id]?peers[id]:p;}}
      presenceSignatures=signatures;peers=next;options.onPeers({...peers});
    });
    channel.on('broadcast',{event:'position'},({payload})=>{const id=payload?.sender,p=sanitizePeer(payload?.position);if(typeof id!=='string'||id===options.id||!peers[id]||!p)return;peers[id]=p;options.onPeers({...peers});});
    channel.on('broadcast',{event:'cheer'},({payload})=>{const message=sanitizeReaction(payload?.message);const sender=typeof payload?.sender==='string'&&payload.sender.length<=80?payload.sender:'';if(message&&rooms.has(payload?.room)&&typeof options.onReaction==='function')options.onReaction({room:payload.room,message,sender});});
    channel.subscribe(async status=>{connected=status==='SUBSCRIBED';options.onStatus(connected?'online':'offline');if(!connected){peers=Object.create(null);presenceSignatures=Object.create(null);options.onPeers({});return;}const p=sanitizePeer(options.getPosition());if(!p)return;current=p;lastTrackTime=Date.now();try{const result=await channel.track(p);if(result==='ok'){lastTracked=p;}else options.onStatus('offline');}catch(e){options.onStatus('offline');}});
    const interval=setInterval(async()=>{if(stopped||!connected)return;const p=sanitizePeer(options.getPosition());if(!p)return;const changed=JSON.stringify(p)!==JSON.stringify(current);if(changed){current=p;try{await channel.send({type:'broadcast',event:'position',payload:{sender:options.id,position:p}});}catch(e){options.onStatus('offline');}}if(Date.now()-lastTrackTime>=12500&&JSON.stringify(p)!==JSON.stringify(lastTracked)){lastTrackTime=Date.now();try{const result=await channel.track(p);if(result==='ok')lastTracked=p;else options.onStatus('offline');}catch(e){options.onStatus('offline');}}},2000);
    return {async cheer(room,message){if(!connected||!rooms.has(room)||!sanitizeReaction(message))return false;try{return await channel.send({type:'broadcast',event:'cheer',payload:{room,message,sender:options.id}})==='ok';}catch(e){return false;}},stop(){stopped=true;clearInterval(interval);try{client.removeChannel(channel)}catch(e){}}};
  }catch(e){options.onStatus('offline');return null;}
}
const api={sanitizePeer,sanitizeReaction,startPresence};if(typeof module!=='undefined')module.exports=api;root.InterviewPresence=api;
})(typeof window==='undefined'?globalThis:window);

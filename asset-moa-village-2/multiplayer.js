(function(){
 'use strict';
 const count=document.querySelector('#onlineCount'),greet=document.querySelector('#greetAction'),API=window.VILLAGE_BOARD;
 let channel=null,client=null,id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),nickname='',ready=false,heartbeat=null;
 function status(s){count.textContent=s}
 function goodbye(){if(heartbeat)clearInterval(heartbeat);heartbeat=null;ready=false;if(channel){channel.untrack();client.removeChannel(channel);channel=null}window.villagePeers?.([]);status('👥 연결 안 됨')}
 function sendPosition(){if(!ready||!channel)return;const p=window.villageLocalPosition?.();if(p)channel.send({type:'broadcast',event:'position',payload:{id,x:p.x,z:p.z,r:p.r}})}
 window.joinVillage=function(name){nickname=name;goodbye();if(!window.supabase||!API){status('👥 연결 실패');return}try{client=client||window.supabase.createClient(API.url,API.key);channel=client.channel('moa-village2-v1',{config:{presence:{key:id},broadcast:{self:false}}});let current=channel;
 current.on('presence',{event:'sync'},()=>{if(channel!==current)return;let all=Object.entries(current.presenceState()).flatMap(([key,list])=>list.map(p=>({id:key,name:p.name,x:p.x,z:p.z}))).filter(p=>typeof p.name==='string'&&/^[가-힣a-zA-Z0-9 ]{2,10}$/.test(p.name));status('👥 '+all.length+'명 접속');window.villagePeers?.(all.filter(p=>p.id!==id))});
 current.on('broadcast',{event:'position'},({payload:p})=>{if(p&&p.id!==id&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=21&&Math.abs(p.z)<=21&&Number.isFinite(p.r))window.villagePeerMove?.(p)});
 current.on('broadcast',{event:'greet'},({payload:p})=>{if(p&&p.id!==id)window.villagePeerGreet?.(p.id)});
 current.subscribe(async s=>{if(channel!==current)return;if(s==='SUBSCRIBED'){ready=true;let p=window.villageLocalPosition?.()||{x:0,z:6};await current.track({name:nickname,x:p.x,z:p.z});if(channel!==current)return;sendPosition();if(heartbeat)clearInterval(heartbeat);heartbeat=setInterval(sendPosition,650)}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s)){ready=false;status('👥 연결 중...')}});
 }catch{status('👥 연결 실패')}};
 window.leaveVillage=goodbye;
 function doGreet(){if(window.villagePause)return;window.villageLocalGreet?.();if(channel&&ready)channel.send({type:'broadcast',event:'greet',payload:{id}});try{let u=new SpeechSynthesisUtterance('사랑합니다');u.lang='ko-KR';u.pitch=1.25;window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}catch{}}
 greet.addEventListener('pointerdown',e=>{e.preventDefault();doGreet()});greet.addEventListener('click',e=>{if(e.detail===0)doGreet()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(channel)goodbye()}else if(nickname&&document.querySelector('#welcome').hidden)window.joinVillage(nickname)});
 window.addEventListener('pagehide',goodbye);
})();


(()=>{'use strict';
 const $=id=>document.getElementById(id),P=window.BungaePractice,KEY='bungae:practice:v1',titles=['계정과목 탐험','분개 트레이닝','분개 마스터의 전당'];let state=P.initial(),active=0;
 try{state=P.restore(localStorage.getItem(KEY));}catch{$('storageStatus').textContent='브라우저 저장을 사용할 수 없어 이번 화면에서만 복습합니다.';}
 function render(){$('growth').textContent=`완료 배지 ${state.completed.length}/3`;for(const part of [1,2,3])$('result'+part).textContent=(state.completed.includes(part)?'🏅 완주 기록 있음':'언제든 자유롭게 도전')+(state.best[part]!==undefined?` · 최고 ${state.best[part]}점`:'');}
 function fit(){if(active)window.BungaeViewport.fitPlayer($('player'),$('playerHeader'),$('appFrame'),window.visualViewport,window.innerHeight);}
 function send(){if(active)$('appFrame').contentWindow?.postMessage(P.context(state),location.origin);}
 function open(part){active=part;$('main').hidden=true;$('player').hidden=false;$('playerTitle').textContent=titles[part-1];$('appFrame').src=`play/${part}/`;document.body.style.overflow='hidden';fit();}
 function close(){active=0;$('appFrame').src='about:blank';$('player').hidden=true;$('main').hidden=false;document.body.style.overflow='';render();document.querySelector(`[data-part]`)?.focus();}
 window.addEventListener('message',message=>{
  if(!active||message.origin!==location.origin||message.source!==$('appFrame').contentWindow)return;
  const data=message.data;if(data?.type==='bungae:ready'){send();return;}
  if(data?.type!=='bungae:event'||data.event?.part!==active||typeof data.event.id!=='string')return;
  state=P.record(state,data.event);try{localStorage.setItem(KEY,JSON.stringify(state));$('storageStatus').textContent='이 브라우저에 복습 진도를 저장했어요.';}catch{$('storageStatus').textContent='저장 공간을 사용할 수 없어 이번 화면에서만 진도가 유지됩니다.';}
  $('appFrame').contentWindow.postMessage({type:'bungae:ack',id:data.event.id},location.origin);
 });
 document.querySelectorAll('[data-part]').forEach(button=>button.addEventListener('click',()=>open(Number(button.dataset.part))));$('closePlayer').addEventListener('click',close);$('appFrame').addEventListener('load',send);
 window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe($('playerHeader'));
 render();const part=Number(new URLSearchParams(location.search).get('part'));if([1,2,3].includes(part)){history.replaceState(null,'','./');open(part);}
})();

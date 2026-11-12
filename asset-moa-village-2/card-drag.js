(function(){
 'use strict';
 window.installCardDrag=function(card,targets,drop){
  let pointer=null,ghost=null,startX=0,startY=0,hover=null,suppress=false;
  function clearHover(){if(hover)hover.classList.remove('drag-over');hover=null}
  function targetAt(x,y){const hit=document.elementFromPoint(x,y);return targets.find(t=>hit&&(t===hit||t.contains(hit)))||null}
  function place(e){if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}clearHover();hover=targetAt(e.clientX,e.clientY);if(hover)hover.classList.add('drag-over')}
  function cleanup(){clearHover();if(ghost)ghost.remove();ghost=null;card.classList.remove('drag-source');pointer=null}
  card.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||pointer!==null||card.disabled)return;pointer=e.pointerId;startX=e.clientX;startY=e.clientY;card.setPointerCapture(pointer)});
  card.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;if(!ghost&&Math.hypot(e.clientX-startX,e.clientY-startY)>7){ghost=card.cloneNode(true);ghost.classList.add('drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.removeAttribute('id');ghost.style.width=card.getBoundingClientRect().width+'px';document.body.appendChild(ghost);card.classList.add('drag-source')}if(ghost){if(e.cancelable)e.preventDefault();place(e)}});
  card.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;if(ghost){const target=targetAt(e.clientX,e.clientY);suppress=true;setTimeout(()=>{suppress=false},500);if(target)drop(target,card.dataset.token)}cleanup()});
  card.addEventListener('pointercancel',e=>{if(pointer===e.pointerId)cleanup()});
  card.addEventListener('lostpointercapture',e=>{if(pointer===e.pointerId)cleanup()});
  card.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();e.stopImmediatePropagation()}},true);
 };
})();


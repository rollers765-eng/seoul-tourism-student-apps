(function(){
 'use strict';
 const controls='#joystick, #journalAction, #jumpAction, #greetAction, .move-access button';
 const active=()=>document.querySelector('#welcome').hidden&&document.querySelector('#modal').hidden;
 const onControl=target=>!!(target&&target.closest&&target.closest(controls));
 const touchesControl=e=>Array.from(e.touches||[]).some(t=>onControl(t.target));
 // The second finger may land on a different element from the first. Cancel the
 // browser gesture but leave pointer events and the world's own pinch handler intact.
 for(const type of ['touchstart','touchmove'])document.addEventListener(type,e=>{
  if(active()&&e.touches.length>1&&touchesControl(e)&&e.cancelable)e.preventDefault();
 },{passive:false,capture:true});
 document.addEventListener('touchend',e=>{
  if(active()&&onControl(e.target)&&e.cancelable)e.preventDefault();
 },{passive:false,capture:true});
 // iPad Safari also emits proprietary gesture events independently of touch-action.
 for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,e=>{
  if(active()&&e.cancelable)e.preventDefault();
 },{passive:false,capture:true});
})();


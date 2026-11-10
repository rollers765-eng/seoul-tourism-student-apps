(function(root){
function joystickVector(dx,dy,radius){if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return {x:0,z:0};const n=Math.hypot(dx,dy);if(n===0)return {x:0,z:0};const scale=Math.min(n/radius,1)/n;return {x:dx*scale,z:dy*scale};}
function canUseMovementKeys(target){return !target||(!target.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(target.tagName));}
function bindImmediateAction(button,action,{pointerEvents=('PointerEvent' in root),now=()=>Date.now()}={}){let suppressUntil=0;const touch=e=>{if(e.cancelable!==false)e.preventDefault();suppressUntil=now()+1000;action();};if(pointerEvents)button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')touch(e);});else button.addEventListener('touchstart',touch,{passive:false});button.addEventListener('click',e=>{if(e.detail!==0&&now()<suppressUntil)return;action();});}
function createMovementLatch(){let held=false;return {capture(x,z){held=!!(x||z);},block(x,z){if(!held)return false;if(!x&&!z){held=false;return false;}return true;}};}
const api={joystickVector,canUseMovementKeys,bindImmediateAction,createMovementLatch};if(typeof module!=='undefined')module.exports=api;root.InterviewControls=api;
})(typeof window==='undefined'?globalThis:window);

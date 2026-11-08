(function(root){
function joystickVector(dx,dy,radius){if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return {x:0,z:0};const n=Math.hypot(dx,dy);if(n===0)return {x:0,z:0};const scale=Math.min(n/radius,1)/n;return {x:dx*scale,z:dy*scale};}
function canUseMovementKeys(target){return !target||(!target.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(target.tagName));}
const api={joystickVector,canUseMovementKeys};if(typeof module!=='undefined')module.exports=api;root.InterviewControls=api;
})(typeof window==='undefined'?globalThis:window);

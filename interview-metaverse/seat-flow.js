(function(root){
function seatAt(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return null;if(Math.abs(x)<1&&Math.abs(z-3)<.85)return 'waiting';if(Math.abs(x)<1&&Math.abs(z+1.8)<.85)return 'interview';return null;}
const api={seatAt};if(typeof module!=='undefined')module.exports=api;root.InterviewSeatFlow=api;
})(typeof window==='undefined'?globalThis:window);

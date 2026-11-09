(function(root){'use strict';
const transitions={waiting:{sitWaiting:'approaching'},approaching:{ambassadorArrived:'invited'},invited:{enter:'entering'},entering:{entranceArrived:'greeting'},greeting:{greet:'ready'},ready:{sit:'walkingToSeat'},walkingToSeat:{seatArrived:'interview'}};
function next(state,event){return transitions[state]?.[event]||state;}
function target(room,x,z){const near=(a,b,r)=>Math.hypot(x-a,z-b)<r;if(room==='lobby'){if(near(0,-2.6,2.8))return 'information';if(near(3,-4.5,2.1))return 'ambassador';}if(room==='cafezone'){if(near(0,-1,3.2))return 'tree';if(near(-4,-4,2)||near(4,-4,2))return 'ambassador';}if(['cafe','tour','cook'].includes(room)&&near(3,2.4,2.2))return 'ambassador';return null;}
const api={next,target};if(typeof module!=='undefined')module.exports=api;root.InterviewFlow=api;
})(typeof window==='undefined'?globalThis:window);


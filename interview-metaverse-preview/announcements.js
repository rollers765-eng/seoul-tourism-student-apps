(function(root){'use strict';
const lines=['카페경영과 학생들 면접 대기장소로 이동해주세요.','관광서비스과 학생들 면접 대기장소로 이동해주세요.','외식조리과 학생들 면접 대기장소로 이동해주세요.'];
function create({canAnnounce,onAnnouncement,intervalMs=90000}){let timer=null,index=0;return {start(){if(timer!==null)return;timer=setInterval(()=>{if(!canAnnounce())return;onAnnouncement(lines[index]);index=(index+1)%lines.length;},intervalMs);},stop(){if(timer!==null){clearInterval(timer);timer=null;}}};}
const api={create,lines};if(typeof module!=='undefined')module.exports=api;root.InterviewAnnouncements=api;
})(typeof window==='undefined'?globalThis:window);

(function(root){
const questions=[
'본교 지원동기, 본인 성격의 장, 단점을 포함한 자기소개를 해주세요.(1분 이내)',
'지원학과 수업 중 가장 기대되는 과목은 무엇이며, 그 이유는 무엇인가요?',
'장래 희망 직업은 무엇이며, 그 직업을 선택한 이유는 무엇인가요?',
'중학교에서 기억에 남는 경험은 무엇이며, 그 활동에서 맡았던 역할은 무엇인가요?',
'친구와 갈등이 생겼던 경험을 소개해 주고, 어떻게 해결했는지 얘기해 주세요.',
'새로운 환경에 적응하는 본인만의 방법이 있나요?',
'힘든 일이 생겼을 때 주로 어떻게 극복하는 편인가요?',
'마지막으로 하고 싶은 말이 있나요?'];
function selectQuestions(random=Math.random){const pool=[1,2,3,4,5,6];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return [0,...pool.slice(0,3),7];}
function defaultSeconds(i){return i===0?60:90;}
const api={questions,selectQuestions,defaultSeconds}; if(typeof module!=='undefined')module.exports=api;root.InterviewQuestions=api;
})(typeof window==='undefined'?globalThis:window);


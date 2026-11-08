(function(root){
'use strict';
function validate(kind,nickname,message){
  if(!['감사','소망'].includes(kind))return '감사 또는 소망을 선택해 주세요.';
  if(!nickname.trim()||nickname.trim().length>16)return '별칭을 1~16자로 입력해 주세요.';
  if(!message.trim()||message.trim().length>150)return '메모를 1~150자로 입력해 주세요.';
  if(/(?:01[016789][ -]?\d{3,4}[ -]?\d{4})|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(nickname+' '+message))return '연락처나 이메일은 적지 말아 주세요.';
  return null;
}
function client(){if(!root.supabase)throw Error('서비스 연결을 확인해 주세요.');return root.supabase.createClient('https://tstjreubarmklckjhelv.supabase.co','sb_publishable_F3v2CpBvmOtrrHJkWe-fRw_Ia6hc1cN');}
async function list(){let {data,error}=await client().from('gratitude_notes').select('id,kind,nickname,message,created_at').order('created_at',{ascending:false}).limit(100);if(error)throw error;return data;}
async function submit(kind,nickname,message){let problem=validate(kind,nickname,message);if(problem)throw Error(problem);let {error}=await client().from('gratitude_notes').insert({kind,nickname:nickname.trim(),message:message.trim()});if(error)throw error;}
const api={validate,list,submit};if(typeof module!=='undefined')module.exports=api;root.Gratitude=api;
})(typeof window==='undefined'?globalThis:window);

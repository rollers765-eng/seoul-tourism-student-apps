(function(root){
  function remainingSeconds(deadline,now){return Math.max(0,Math.ceil((deadline-now)/1000));}
  const api={remainingSeconds};if(typeof module!=='undefined')module.exports=api;root.InterviewTimer=api;
})(typeof window==='undefined'?globalThis:window);

(function(root){
  function fitPlayer(player,header,frame,viewport,innerHeight){
    const height=viewport && Number.isFinite(viewport.height) ? viewport.height : innerHeight;
    const top=viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
    player.style.height=Math.max(0,height)+'px';
    player.style.top=top+'px';
    player.style.bottom='auto';
    frame.style.height=Math.max(0,height-header.getBoundingClientRect().height)+'px';
  }
  root.BungaeViewport={fitPlayer};
  if(typeof module!=='undefined')module.exports={fitPlayer};
})(typeof window!=='undefined'?window:globalThis);

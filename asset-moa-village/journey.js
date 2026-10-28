(function(g){
function next(ids,done){for(const i of ids)for(let l of [0,1,3,4,2]){let id=`${i}-${l}`;if(!done[id])return id}return null}
function complete(ids,done){return next(ids,done)===null}
function fragments(groups,done){return groups.filter(ids=>complete(ids,done)).length}
const api={next,complete,fragments};if(typeof module!=='undefined')module.exports=api;g.Journey=api;
})(typeof window!=='undefined'?window:globalThis);


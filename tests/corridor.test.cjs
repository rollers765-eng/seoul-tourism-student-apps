const test=require('node:test'),assert=require('node:assert/strict'),W=require('../interview-metaverse-preview/world.js');
test('면접교실에서 복도를 따라 풋살장과 사격실로 이동할 수 있다',()=>{for(let x=-51;x>=-79;x-=.2)assert.equal(W.blocked(x,7.8),false,`막힌 위치 ${x}`);assert.equal(W.zoneAt(-78),'laser');assert.equal(W.zoneAt(-60),'futsal');});
test('아래로 이동한 풋살장 바닥 높이는 코트에서만 적용된다',()=>{assert.equal(W.surfaceAt(-60,2),.65);assert.equal(W.surfaceAt(-60,9),0)});

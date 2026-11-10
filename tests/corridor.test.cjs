const test=require('node:test'),assert=require('node:assert/strict'),W=require('../interview-metaverse-preview/world.js');
test('풋살장 왼쪽 출입구를 통과해 사격실로 걸어갈 수 있다',()=>{for(let x=W.centers.futsal-5;x>=W.centers.futsal-8;x-=.15)assert.equal(W.blocked(x,2),false,`막힌 위치 ${x}`);assert.equal(W.zoneAt(W.centers.laser),'laser');assert.equal(W.zoneAt(W.centers.futsal),'futsal');assert.ok(Math.abs((W.centers.laser+7)-(W.centers.futsal-7.3))<.1)});
test('출입구 밖 안전망은 통과할 수 없다',()=>{assert.equal(W.blocked(W.centers.futsal-7,5.5),true);assert.equal(W.blocked(W.centers.futsal-7,2),false)});

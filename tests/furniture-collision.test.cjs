const test=require('node:test'),assert=require('node:assert/strict'),W=require('../interview-metaverse-preview/world.js');
test('로비와 카페 의자는 걷기를 막고 점프로 올라갈 수 있다',()=>{for(const [x,z] of [[-4.2,-2.2],[W.centers.cafezone-5,-4],[W.centers.cafezone-2.8,-3.4]]){assert.equal(W.blocked(x,z,[],0),true);assert.equal(W.blocked(x,z,[],1.5),false);assert.ok(W.surfaceAt(x,z)>=.4)}});
test('풋살장 바닥은 높아진 위치에서 이동한다',()=>assert.ok(W.surfaceAt(W.centers.futsal,0)>=.5));

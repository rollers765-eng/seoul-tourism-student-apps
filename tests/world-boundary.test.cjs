const test=require('node:test'),assert=require('node:assert/strict'),W=require('../interview-metaverse-preview/world.js');
test('풋살장과 사격실 및 사이 통로의 바닥 밖으로 걸어 나갈 수 없다',()=>{for(const x of [W.centers.futsal,W.centers.laser,W.centers.futsal+9])for(const h of [0,.65,2])assert.equal(W.canMove({x,z:8.0},{x,z:8.4},[],h),false,`경계 ${x}, 높이 ${h}`)});
test('풋살장 출입구와 교실 통로는 계속 이동할 수 있다',()=>{const x=W.centers.futsal-7;assert.equal(W.canMove({x:x+.5,z:2},{x:x-.5,z:2},[],.65),true);assert.equal(W.blocked(W.centers.futsal+8,6.8,[],.65),false)});

const test=require('node:test'),assert=require('node:assert/strict'),W=require('../interview-metaverse-preview/world.js');
test('점프가 의자 높이에 이르면 의자 위로 올라갈 수 있다',()=>{const x=W.centers.cafe-3,z=-2.4;assert.equal(W.canMove({x:x,z:z+.9},{x,z},[],0),false);assert.equal(W.canMove({x:x,z:z+.9},{x,z},[],1),true);assert(W.surfaceAt(x,z)>=.4)});
test('점프로 책상 위에 착지할 수 있고 벽은 통과하지 않는다',()=>{const o=W.centers.cafe;assert(W.surfaceAt(o,-7.2)>=.7);assert.equal(W.canMove({x:o,z:-6.3},{x:o,z:-7.2},[],1),true);assert.equal(W.canMove({x:o-5,z:.6},{x:o-5,z:0},[],2),false)});
test('가구가 없는 바닥에는 착지 높이가 없다',()=>assert.equal(W.surfaceAt(0,5),0));

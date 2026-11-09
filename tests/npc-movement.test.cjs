const test=require('node:test'),assert=require('node:assert/strict');require('../interview-metaverse-preview/world.js');const W=global.InterviewWorld;
test('대기 NPC는 원래 위치에서 두 걸음 이내의 경로를 사용한다',()=>{const h={x:3,z:5};for(let i=0;i<20;i++){const p=W.wanderTarget(h,i);assert.ok(Math.hypot(p.x-h.x,p.z-h.z)<=.85);}});
test('걷는 NPC의 다리와 팔이 서로 반대로 움직인다',()=>{const g=W.gait(1000,1,false);assert.notEqual(g.left,0);assert.equal(g.left,-g.right);});


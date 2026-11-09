const test=require('node:test');const assert=require('node:assert/strict');require('../interview-metaverse-preview/world.js');const W=global.InterviewWorld;
test('로비 시작 지점에서 모든 방향으로 걸을 수 있다',()=>{const p=W.spawn('lobby');for(const [dx,dz] of [[.05,0],[-.05,0],[0,.05],[0,-.05]])assert.equal(W.canMove(p,{x:p.x+dx,z:p.z+dz},[]),true);});
test('겹쳐 접속한 방문자에게서 멀어지는 방향으로 빠져나온다',()=>{const p={x:0,z:5},peer={x:0,z:5};assert.equal(W.canMove(p,{x:.05,z:5},[peer]),true);assert.equal(W.canMove({x:.5,z:5},{x:.45,z:5},[peer]),false);});
test('모든 공간의 입장 위치가 장애물 밖이다',()=>{for(const room of Object.keys(W.centers)){const p=W.spawn(room);assert.equal(W.blocked(p.x,p.z),false,room);}});
test('감사나무 주변 나무 의자 네 곳에 앉을 수 있다',()=>{for(const [x,z] of [[-3,-1],[3,-1],[0,-4.4],[0,2.2]])assert.equal(W.nearestSeat('cafezone',x,z).type,'rest');});


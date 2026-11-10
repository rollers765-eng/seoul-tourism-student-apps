const test=require('node:test');const assert=require('node:assert/strict');require('../interview-metaverse-preview/world.js');const W=global.InterviewWorld;
test('면접교실은 같은 두꺼운 벽을 사이에 두고 이어진다',()=>{assert.equal(W.centers.cafe-W.centers.tour,15);assert.equal(W.centers.tour-W.centers.cook,15);});
test('카페의 여섯 공부 의자에 앉을 수 있다',()=>{for(const s of W.layout.studySeats)assert.equal(W.nearestSeat('cafezone',s.x,s.z).type,'rest');});

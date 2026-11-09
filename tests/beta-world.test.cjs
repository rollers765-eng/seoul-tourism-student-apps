const test=require('node:test');const assert=require('node:assert/strict');require('../interview-metaverse-preview/world.js');const W=global.InterviewWorld;
test('면접교실은 같은 두꺼운 벽을 사이에 두고 이어진다',()=>{assert.equal(W.centers.cafe-W.centers.tour,15);assert.equal(W.centers.tour-W.centers.cook,15);});
test('카페의 다섯 소파에 앉을 수 있다',()=>{for(const [x,z] of [[-5,-4],[0,5],[5,-4],[-5,3.8],[5,3.8]])assert.equal(W.nearestSeat('cafezone',x,z).type,'rest');});


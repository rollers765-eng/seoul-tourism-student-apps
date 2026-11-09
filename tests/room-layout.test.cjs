const test=require('node:test'),assert=require('node:assert/strict');require('../interview-metaverse-preview/world.js');const W=global.InterviewWorld;
test('면접 책상과 지원자 의자 사이를 기존의 두 배로 넓힌다',()=>{assert.ok(Math.abs(Math.abs(W.layout.interviewDeskZ-W.layout.interviewSeatZ)-4.8)<1e-9);});
test('로비 대기 의자는 서로 마주 본다',()=>{assert.equal(W.nearestSeat('lobby',-4.2,-1).facing,'east');assert.equal(W.nearestSeat('lobby',4.2,-1).facing,'west');});
test('나무 주변 네 개의 대각선 벤치에 앉을 수 있다',()=>{for(const [x,z] of [[-2.8,-3.4],[2.8,-3.4],[-2.8,1.4],[2.8,1.4]])assert.equal(W.nearestSeat('cafezone',x,z).type,'rest');});


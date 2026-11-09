const test=require('node:test');const assert=require('node:assert/strict');
require('../interview-metaverse-preview/flow.js');const F=global.InterviewFlow;
test('면접은 선배 안내, 인사, 착석을 거쳐 시작한다',()=>{let s='waiting';for(const e of ['sitWaiting','ambassadorArrived','enter','entranceArrived','greet','sit','seatArrived'])s=F.next(s,e);assert.equal(s,'interview');});
test('로비와 카페 대화는 가까운 대상에서만 열린다',()=>{assert.equal(F.target('lobby',0,-2.6),'information');assert.equal(F.target('cafezone',0,-1),'tree');assert.equal(F.target('lobby',6,5),null);});


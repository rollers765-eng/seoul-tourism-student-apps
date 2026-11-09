const test=require('node:test');const assert=require('node:assert/strict');
require('../interview-metaverse-preview/flow.js');const F=global.InterviewFlow;
test('면접은 안내, 인사, 착석 인사를 거쳐 시작한다',()=>{let s='waiting';s=F.next(s,'invite');assert.equal(s,'approach');assert.equal(F.next(s,'sit'),'approach');s=F.next(s,'arrived');s=F.next(s,'greet');assert.equal(s,'ready');s=F.next(s,'sit');assert.equal(s,'seated');assert.equal(F.next(s,'thanks'),'interview');});
test('로비와 카페 대화는 가까운 대상에서만 열린다',()=>{assert.equal(F.target('lobby',0,-2.6),'information');assert.equal(F.target('cafezone',0,-1),'tree');assert.equal(F.target('lobby',6,5),null);});


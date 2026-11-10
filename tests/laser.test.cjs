const test=require('node:test'),assert=require('node:assert/strict'),L=require('../interview-metaverse-preview/laser.js');
test('제한 시간 안에 활성 표적을 맞히면 점수가 오르고 종료된다',()=>{let finish=0;const g=L.create({duration:30000,onFinish:()=>finish++});g.start(1000);assert.equal(g.hit(0,1100),true);assert.equal(g.score,1);assert.equal(g.hit(0,1200),false);assert.equal(g.hit(1,1300),true);g.update(31000);assert.equal(finish,1);assert.equal(g.hit(2,32000),false);});
test('새 게임은 점수와 표적을 초기화한다',()=>{const g=L.create({});g.start(0);g.hit(0,1);g.start(5);assert.equal(g.score,0);assert.equal(g.target,0)});

const test=require('node:test'),assert=require('node:assert/strict'),L=require('../interview-metaverse-preview/laser.js');
test('사격대 근처에서만 조작하고 한 발마다 지정된 결과가 나온다',()=>{for(const [n,value] of [[0,10],[.26,9],[.51,8],[.76,0]]){const s=L.shoot({x:0,z:3.8},()=>n);assert.equal(s.value,value);assert.equal(s.lane,1);}assert.equal(L.shoot({x:0,z:6},()=>0),null);});
test('사로별 발사 위치를 구분한다',()=>{assert.equal(L.shoot({x:-3,z:3.8},()=>0).lane,0);assert.equal(L.shoot({x:3,z:3.8},()=>0).lane,2)});

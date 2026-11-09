const test=require('node:test'),assert=require('node:assert/strict'),E=require('../interview-metaverse-preview/experience.js');
test('화면 확대 축소 버튼은 범위를 넘지 않고 일관되게 움직인다',()=>{assert(E.zoomByStep(1,'in')<1);assert(E.zoomByStep(1,'out')>1);assert.equal(E.zoomByStep(.65,'in'),.65);assert.equal(E.zoomByStep(1.55,'out'),1.55)});
test('세로와 가로 화면에 맞춰 카메라 비율이 점진적으로 바뀐다',()=>{const portrait=E.viewportZoom(390,844),landscape=E.viewportZoom(844,390);assert(portrait>landscape);assert(landscape>=1&&portrait<=1.6);assert(Number.isFinite(E.viewportZoom(0,0)))});

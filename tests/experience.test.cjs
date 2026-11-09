const assert=require('assert');
const x=require('../interview-metaverse/experience.js');
assert.equal(x.clampZoom(0),.65);assert.equal(x.clampZoom(4),1.55);
assert.equal(x.pinchZoom(1,100,200),.65);assert.equal(x.pinchZoom(1,100,50),1.55);
assert.equal(x.timerDuration(90,10),100);assert.equal(x.timerDuration(300,10),300);
assert.equal(x.timerDuration(10,-10),10);
console.log('zoom limits, pinch and timer duration pass');

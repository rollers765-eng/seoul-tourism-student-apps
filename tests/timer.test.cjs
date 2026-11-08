const assert=require('node:assert/strict');
const {remainingSeconds}=require('../interview-metaverse/timer.js');
assert.equal(remainingSeconds(60000,0),60);
assert.equal(remainingSeconds(60000,10900),50);
assert.equal(remainingSeconds(60000,60000),0);
assert.equal(remainingSeconds(60000,90000),0);
console.log('countdown works independent of microphone');

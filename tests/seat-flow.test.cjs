const assert=require('node:assert/strict');
const {seatAt}=require('../interview-metaverse/seat-flow.js');
assert.equal(seatAt(0,3),'waiting');
assert.equal(seatAt(0,-1.8),'interview');
assert.equal(seatAt(5,5),null);
assert.equal(seatAt(NaN,3),null);
assert.equal(seatAt(4,-1.8),null);
console.log('waiting and interview seating zones pass');

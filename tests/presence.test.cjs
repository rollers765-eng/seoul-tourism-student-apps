const assert = require('node:assert/strict');
const {sanitizePeer} = require('../interview-metaverse/presence.js');
assert.equal(sanitizePeer({room:'unknown',x:0,z:0}), null);
assert.equal(sanitizePeer({room:'lobby',x:Infinity,z:0}), null);
assert.deepEqual(sanitizePeer({room:'cafe',x:1,z:2,nickname:'<img onerror=x>'}),{room:'cafe',x:1,z:2});
assert.equal(sanitizePeer({room:'tour',x:99,z:0}), null);
console.log('presence input validation pass');

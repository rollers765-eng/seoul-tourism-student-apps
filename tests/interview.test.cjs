const assert = require('node:assert/strict');
const {selectQuestions, defaultSeconds} = require('../interview-metaverse/questions.js');
for(let i=0;i<1000;i++){
  const qs=selectQuestions();
  assert.equal(qs.length,5); assert.equal(qs[0],0);
  assert.equal(new Set(qs).size,5);
  assert(qs.every(n=>n>=0 && n<8));
}
assert.equal(defaultSeconds(0),60);assert.equal(defaultSeconds(1),90);
console.log('question selection and timing pass');

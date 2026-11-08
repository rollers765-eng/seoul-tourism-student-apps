const assert=require('node:assert/strict');
const {validate}=require('../interview-metaverse/gratitude.js');
assert.equal(validate('감사','별빛','고마워요'),null);
assert.ok(validate('기타','별빛','고마워요'));
assert.ok(validate('감사',' ','고마워요'));
assert.ok(validate('소망','별빛',' '));
assert.ok(validate('감사','별빛','x'.repeat(151)));
assert.ok(validate('감사','별빛','연락처 010-1234-5678'));
console.log('gratitude validation pass');

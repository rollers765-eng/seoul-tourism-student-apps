const test = require('node:test');
const assert = require('node:assert/strict');
test('enabled background music plays in the lobby and can be muted', async () => {
  let notes = 0;
  class AudioContext {
    constructor(){this.currentTime=0;this.destination={};}
    createGain(){return {gain:{value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
    createOscillator(){return {frequency:{value:0},connect(){},start(){notes++},stop(){}};}
    async resume(){}
  }
  global.AudioContext=AudioContext;
  require('../interview-metaverse-preview/music.js');
  const music=global.InterviewMusic.create();
  assert.equal(await music.toggle(), true);
  assert.ok(notes > 0, 'a note plays in the lobby after enabling music');
  assert.equal(await music.toggle(), false);
  delete global.AudioContext;
});



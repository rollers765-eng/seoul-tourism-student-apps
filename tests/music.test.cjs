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

test('다섯 곡의 오르골이 자동으로 번갈아 재생된다',async t=>{t.mock.timers.enable({apis:['setInterval']});const changes=[];class AudioContext{constructor(){this.currentTime=0;this.destination={}}createGain(){return {gain:{value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}createOscillator(){return {frequency:{value:0},connect(){},start(){},stop(){}}}async resume(){}}global.AudioContext=AudioContext;const m=global.InterviewMusic.create({onTrackChange:name=>changes.push(name)});await m.toggle();t.mock.timers.tick(650*32*5);assert.equal(new Set(changes).size,5);assert.equal(changes[changes.length-1],'노을빛 오르골');await m.toggle();delete global.AudioContext;});

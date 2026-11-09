const assert=require('node:assert/strict');
class Param{constructor(){this.value=0}setTargetAtTime(){}setValueAtTime(){}exponentialRampToValueAtTime(){}}
let oscillatorCount=0;
class FakeAudio{constructor(){this.currentTime=0;this.destination={}}createGain(){return{gain:new Param(),connect(){}}}createOscillator(){oscillatorCount++;return{frequency:new Param(),connect(){},start(){},stop(){}}}async resume(){}}
global.AudioContext=FakeAudio;const m=require('../interview-metaverse/music.js').create();
(async()=>{assert.equal(await m.toggle(),true);assert.equal(oscillatorCount,0);m.setCafe(true);assert.equal(oscillatorCount,1);m.setDucked(true);m.setDucked(false);assert.equal(oscillatorCount,2);assert.equal(m.next(),'별빛 산책');assert.equal(await m.toggle(),false);console.log('music starts only in cafe after consent and pauses for speech');})().catch(e=>{console.error(e);process.exitCode=1});

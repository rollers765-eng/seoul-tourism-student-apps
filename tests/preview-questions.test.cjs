const test=require('node:test'),assert=require('node:assert/strict');
const {questions,selectQuestions}=require('../interview-metaverse-preview/questions.js');
test('마지막 발언 질문은 매번 다섯 번째에 한 번만 나온다',()=>{
  for(let i=0;i<1000;i++){
    const queue=selectQuestions();
    assert.equal(queue.length,5);
    assert.equal(queue[0],0);
    assert.equal(questions[queue[4]],'마지막으로 하고 싶은 말이 있나요?');
    assert.equal(new Set(queue).size,5);
    assert.ok(queue.slice(1,4).every(n=>n>=1&&n<=6));
  }
});


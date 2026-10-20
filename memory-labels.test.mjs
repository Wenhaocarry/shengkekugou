import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryLabel } from './web/memory-labels.js';

test('labels reflect recorded scenes, moods, dates and actual counts', () => {
  const m = { date:'2024-07-12', scenes:[], mood:'' };
  assert.equal(memoryLabel([]), '');
  assert.equal(memoryLabel([m]), '2024年的夏天');
  assert.equal(memoryLabel([{...m,date:'2024-12-01'}]), '2024年的冬天');
  assert.equal(memoryLabel(Array.from({length:6},()=>m)), '你为它记录过 6 次');
  assert.equal(memoryLabel([{...m,scenes:['下雨天']}]), '下雨天总会听');
  assert.equal(memoryLabel([{...m,scenes:['通勤路上']}]), '通勤路上的歌');
  assert.equal(memoryLabel([{...m,mood:'心动时刻'}]), '那阵子总是很心动');
  assert.equal(memoryLabel([{...m,mood:'今晚有点emo'}]), '深夜 emo 专属');
  assert.equal(memoryLabel([{...m,scenes:['第一次见面']}]), '第一次见你的那天');
  assert.equal(memoryLabel([m,{...m,scenes:['日落时分']}]), '日落时分的回忆');
});

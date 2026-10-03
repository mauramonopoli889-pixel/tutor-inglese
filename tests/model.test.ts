import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectErrors } from '../src/engine/checker';
import { composeSession } from '../src/engine/composer';
import { initialLearner, levelProgress, recordAttempt, recordReview, unitScore, type Learner } from '../src/engine/model';

const DAY = 864e5;
const t0 = new Date('2026-10-01T09:00:00Z');
const at = (days: number) => new Date(t0.getTime() + days * DAY);

function learner(): Learner {
  return { ...initialLearner(), profile: { name: 'Test', selfLevel: 0, reasons: [], situations: [], minutesPerDay: 15, difficulties: [], style: 'speak', startLevel: 'A0', goal: 'B2', createdAt: t0.toISOString() } };
}

test('finishing exercises alone never marks a unit as acquired', () => {
  let l = learner();
  for (let i = 0; i < 8; i++) {
    l = recordAttempt(l, { unitId: 'u-age', tier: 'recognize', correct: true }, t0);
    l = recordAttempt(l, { unitId: 'u-age', tier: 'guided', correct: true }, t0);
  }
  assert.equal(l.units['u-age'].status, 'learning');
  assert.ok(unitScore(l.units['u-age']) <= 60, 'no free production → capped at 60');
});

test('spaced recall + free use in context → acquired; a later failure → back to reinforce', () => {
  let l = learner();
  l = recordAttempt(l, { unitId: 'u-age', tier: 'guided', correct: true }, t0);
  l = recordAttempt(l, { unitId: 'u-age', tier: 'free', correct: true }, t0);
  l = recordReview(l, 'unit:u-age', { correct: true }, at(1));
  assert.equal(l.units['u-age'].status, 'consolidating');
  l = recordAttempt(l, { unitId: 'u-age', tier: 'free', correct: true }, at(3));
  l = recordReview(l, 'unit:u-age', { correct: true }, at(8));
  assert.equal(l.units['u-age'].status, 'mastered');
  assert.ok(levelProgress(l, 'A0') > 0);
  l = recordReview(l, 'unit:u-age', { correct: false }, at(30));
  assert.notEqual(l.units['u-age'].status, 'mastered');
  assert.equal(l.units['u-age'].lapsed, true);
});

test('an open error blocks mastery and is acquired after 3 correct days', () => {
  let l = learner();
  const [err] = detectErrors('I have 29 years');
  l = recordAttempt(l, { unitId: 'u-age', tier: 'guided', correct: false, errors: [err] }, t0);
  assert.equal(l.errors.AGE_WITH_HAVE.status, 'todo');
  assert.ok(l.cards['error:AGE_WITH_HAVE'], 'the error enters the review cycle');
  l = recordAttempt(l, { unitId: 'u-age', tier: 'free', correct: true }, at(1));
  assert.equal(l.errors.AGE_WITH_HAVE.status, 'improving');
  l = recordReview(l, 'error:AGE_WITH_HAVE', { correct: true }, at(2));
  l = recordReview(l, 'error:AGE_WITH_HAVE', { correct: true }, at(5));
  assert.equal(l.errors.AGE_WITH_HAVE.status, 'acquired');
});

test('streak counts days with real practice, not app opens', () => {
  let l = learner();
  l = recordAttempt(l, { tier: 'recognize', correct: false }, t0);
  assert.equal(l.stats.streak, 0);
  l = recordAttempt(l, { tier: 'recognize', correct: true }, t0);
  l = recordAttempt(l, { tier: 'recognize', correct: true }, at(1));
  assert.equal(l.stats.streak, 2);
  l = recordAttempt(l, { tier: 'recognize', correct: true }, at(4));
  assert.equal(l.stats.streak, 1);
});

test('composer: 15 minutes follows review → new → words → use', () => {
  const l = learner();
  const five = composeSession(l, 5, t0);
  assert.ok(!five.blocks.some((b) => b.kind === 'unit') || five.blocks.length === 2);
  const fifteen = composeSession(l, 15, t0);
  assert.deepEqual(fifteen.blocks.map((b) => b.kind), ['unit', 'words', 'use']);
  const serious = composeSession(l, 40, t0);
  assert.equal(serious.blocks.at(-1)!.kind, 'check');
});

test('composer puts due errors first in review', () => {
  let l = learner();
  l = recordAttempt(l, { unitId: 'u-hello', tier: 'guided', correct: true }, t0);
  l = recordAttempt(l, { unitId: 'u-age', tier: 'guided', correct: false, errors: detectErrors('I have 29 years') }, t0);
  const plan = composeSession(l, 15, at(2));
  const review = plan.blocks.find((b) => b.kind === 'review');
  assert.ok(review && review.kind === 'review');
  assert.equal(review.tasks[0].key, 'error:AGE_WITH_HAVE');
});

test('the very first 5-minute lesson teaches something new, not just a conversation', () => {
  const l = { ...initialLearner(), profile: { name: 'A', selfLevel: 0, reasons: [], situations: [], minutesPerDay: 5, difficulties: [], style: 'practice' as const, startLevel: 'A0' as const, goal: 'B2' as const, createdAt: new Date().toISOString() } };
  const plan = composeSession(l, 5);
  assert.ok(plan.blocks.some((b) => b.kind === 'unit'));
});

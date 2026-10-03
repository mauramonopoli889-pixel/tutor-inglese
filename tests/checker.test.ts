import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkExercise, detectErrors, gradeSentence } from '../src/engine/checker';
import { UNITS } from '../src/content/units';

const ids = (s: string) => detectErrors(s).map((e) => e.type.id);

test('detects the classic Italian errors and proposes a fix', () => {
  const age = detectErrors('I have 29 years.');
  assert.deepEqual(age.map((e) => e.type.id), ['AGE_WITH_HAVE']);
  assert.equal(age[0].fixed, 'I am 29 years old.');
  assert.ok(ids('I go yesterday at restaurant.').includes('PAST_IRREGULAR'));
  assert.ok(ids('I go yesterday at restaurant.').includes('GO_AT_PLACE'));
  assert.deepEqual(ids('is very good'), ['MISSING_SUBJECT']);
  assert.deepEqual(ids('I am teacher'), ['MISSING_ARTICLE_JOB']);
  assert.deepEqual(ids('She work in Milan'), ['THIRD_PERSON_S']);
  assert.deepEqual(ids('Does he works here?'), ['DOES_PLUS_S']);
  assert.deepEqual(ids('You like pizza?'), ['QUESTION_WITHOUT_DO']);
  assert.deepEqual(ids('I am agree'), ['BE_PLUS_VERB']);
  assert.deepEqual(ids('She can to swim'), ['CAN_TO']);
  assert.deepEqual(ids('There is two bars'), ['THERE_IS_PLURAL']);
  assert.deepEqual(ids('I want a apple'), ['A_AN']);
});

test('fixes read naturally', () => {
  const fix = (s: string) => detectErrors(s)[0].fixed;
  assert.equal(fix('She work in Milan'), 'She works in Milan');
  assert.equal(fix('Does he works here?'), 'Does he work here?');
  assert.equal(fix('You like pizza?'), 'Do you like pizza?');
  assert.equal(fix('I am agree'), 'I agree');
  assert.equal(fix('There is two bars'), 'there are two bars');
});

test('correct sentences raise no errors', () => {
  for (const s of ['I am 29 years old.', "It's very good.", 'I am a teacher.', 'She works in Milan.', 'Does he work here?', 'Do you like pizza?', 'I went to the restaurant yesterday.', 'She can swim.', 'There are two bars.', 'Is she at home?', 'Are you ready?', 'I want an apple.', 'Hi! My name is Maura.', "I'm from Bologna. I am Italian."]) {
    assert.deepEqual(ids(s), [], s);
  }
});

test('every model answer and accepted answer in the curriculum is error-free and accepted', () => {
  for (const u of UNITS) {
    assert.deepEqual(ids(u.use.model), [], `${u.id} use model`);
    for (const ex of u.exercises) {
      if (ex.kind === 'type') {
        for (const a of ex.accept) assert.ok(checkExercise(ex, a).correct, `${u.id}: ${a}`);
      }
      if (ex.kind === 'free') assert.ok(checkExercise(ex, ex.model).correct, `${u.id} free model: ${ex.model}`);
      if (ex.kind === 'order') {
        assert.ok(checkExercise(ex, ex.answer).correct, `${u.id} order`);
        assert.deepEqual(ex.words.join(' ').split(' ').sort(), ex.answer.split(' ').sort(), `${u.id} order words`);
      }
      if (ex.kind === 'choice') assert.ok(ex.answer < ex.options.length);
    }
  }
});

test('type answers accept contractions and one typo, reject wrong meaning', () => {
  const ex = UNITS.find((u) => u.id === 'u-age')!.exercises[1];
  assert.ok(checkExercise(ex, "I'm 29 years old").correct);
  assert.ok(checkExercise(ex, 'I am 29 yeras old').correct);
  const wrong = checkExercise(ex, 'I have 29 years');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errors[0].type.id, 'AGE_WITH_HAVE');
});

test('fixAll combines fixes into one natural sentence', () => {
  const g = gradeSentence('I go yesterday at restaurant.');
  assert.equal(g.better, 'I went yesterday to the restaurant.');
});

test('conversation grading: major, minor, ok', () => {
  assert.equal(gradeSentence('I go yesterday at this bar').grade, 'major');
  assert.equal(gradeSentence('is very good').grade, 'minor');
  assert.equal(gradeSentence('A cappuccino, please.').grade, 'ok');
});

test('a correction keeps the whole sentence and ignores non-age numbers', () => {
  assert.equal(gradeSentence('I have 30 years and I work in a office').better, 'I am 30 years old and I work in an office.');
  assert.ok(!detectErrors('I have 3 cats').some((e) => e.type.id === 'AGE_WITH_HAVE'));
});

import { ERROR_TYPES, ERROR_BY_ID } from '../content/errors';
import type { ErrorType, Exercise } from '../content/types';

export type DetectedError = {
  type: ErrorType;
  said: string;
  fixed: string | null;
};

export type CheckResult = {
  correct: boolean;
  /** The answer to show as "La forma corretta è". */
  expected: string;
  errors: DetectedError[];
  /** Right meaning, small slip (missing article, typo): accepted but flagged. */
  nearMiss?: boolean;
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:"“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Expands common contractions so "I'm" and "I am" compare equal. */
function expand(s: string): string {
  return s
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\b(you|we|they)'re\b/g, '$1 are')
    .replace(/\b(he|she|it|that|what|there|where)'s\b/g, '$1 is')
    .replace(/\bisn't\b/g, 'is not')
    .replace(/\baren't\b/g, 'are not')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bdoesn't\b/g, 'does not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bcan not\b/g, 'cannot')
    .replace(/\bi'd\b/g, 'i would');
}

export function sameSentence(a: string, b: string): boolean {
  return expand(normalize(a)) === expand(normalize(b));
}

/** Levenshtein distance, used to forgive one typo in longer answers. */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function detectErrors(sentence: string, only?: string[]): DetectedError[] {
  const text = normalize(sentence).replace(/ \?/g, '?');
  const asked = /\?\s*$/.test(sentence.trim()) ? text + '?' : text;
  const types = only ? only.map((id) => ERROR_BY_ID[id]).filter(Boolean) : ERROR_TYPES;
  const found: DetectedError[] = [];
  for (const type of types) {
    if (type.detect.some((src) => new RegExp(src, 'i').test(asked))) {
      const fixed = type.fix(sentence.trim());
      found.push({ type, said: sentence.trim(), fixed: fixed && !sameSentence(fixed, sentence) ? fixed : null });
    }
  }
  return found;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function display(answer: string): string {
  const s = capitalize(answer.trim());
  return /[.?!]$/.test(s) ? s : s + (/^(what|where|how|who|when|why|do|does|is|are|can)\b/i.test(s) ? '?' : '.');
}

export function checkExercise(ex: Exercise, answer: string | number): CheckResult {
  switch (ex.kind) {
    case 'choice': {
      const correct = answer === ex.answer;
      const said = typeof answer === 'number' ? ex.options[answer] ?? '' : String(answer);
      const full = ex.sentence ? ex.sentence.replace('___', said) : said;
      return { correct, expected: ex.sentence ? ex.sentence.replace('___', ex.options[ex.answer]) : ex.options[ex.answer], errors: correct ? [] : detectErrors(full) };
    }
    case 'order': {
      const correct = sameSentence(String(answer), ex.answer);
      return { correct, expected: ex.answer, errors: correct ? [] : detectErrors(String(answer)) };
    }
    case 'type': {
      const given = expand(normalize(String(answer)));
      const accepted = ex.accept.map((a) => expand(normalize(a)));
      const expected = display(ex.accept[0]);
      if (accepted.includes(given)) return { correct: true, expected, errors: [] };
      const errors = detectErrors(String(answer));
      const close = errors.length === 0 && accepted.some((a) => a.length > 8 && distance(a, given) <= (a.length >= 15 ? 2 : 1));
      if (close) return { correct: true, expected, errors: [], nearMiss: true };
      return { correct: false, expected, errors };
    }
    case 'free': {
      const errors = detectErrors(String(answer));
      const onTask = new RegExp(ex.pattern, 'i').test(normalize(String(answer)).replace(/ \?/g, '?'));
      const words = normalize(String(answer)).split(' ').filter(Boolean).length;
      return { correct: onTask && errors.length === 0 && words >= 2, expected: ex.model, errors };
    }
  }
}

export type SentenceGrade = 'major' | 'minor' | 'ok';

/** Grades a spoken or written sentence in conversation: 🔴 major, 🟡 minor, 🟢 ok. */
export function gradeSentence(sentence: string): { grade: SentenceGrade; errors: DetectedError[]; better: string | null } {
  const errors = detectErrors(sentence);
  const grade: SentenceGrade = errors.some((e) => e.type.severity === 'major') ? 'major' : errors.length ? 'minor' : 'ok';
  return { grade, errors, better: errors.length ? fixAll(sentence) : null };
}

/** Applies every applicable fix in turn, so "I go yesterday at restaurant" becomes one corrected sentence. */
export function fixAll(sentence: string): string | null {
  let current = sentence.trim();
  for (let pass = 0; pass < 3; pass++) {
    const found = detectErrors(current);
    if (!found.length) break;
    const next = found[0].type.fix(current);
    if (!next || next === current) break;
    current = next;
  }
  if (sameSentence(current, sentence)) return null;
  const s = current.charAt(0).toUpperCase() + current.slice(1);
  return /[.?!]$/.test(s) ? s : s + '.';
}

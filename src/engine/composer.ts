import { ERROR_BY_ID } from '../content/errors';
import type { Exercise, Unit } from '../content/types';
import { UNIT_BY_ID } from '../content/units';
import { VERB_BY_ID } from '../content/verbs';
import { WORDS, WORD_BY_ID } from '../content/vocab';
import { currentLevel, dueItems, nextUnit, unitProgress, type Learner } from './model';
import { parseKey, type ItemKey } from './srs';

export type ReviewTask = { key: ItemKey; label: string; exercise: Exercise };

export type Block =
  | { kind: 'review'; tasks: ReviewTask[] }
  | { kind: 'unit'; unitId: string }
  | { kind: 'words'; wordIds: string[] }
  | { kind: 'use'; unitId: string }
  | { kind: 'check'; unitId: string };

export type SessionPlan = { minutes: number; title: string; blocks: Block[]; outline: string[] };

export const TIME_OPTIONS = [
  { minutes: 5, label: 'Ho 5 minuti', detail: 'Ripasso e una mini-conversazione' },
  { minutes: 10, label: 'Ho 10 minuti', detail: 'Ripasso e un concetto nuovo piccolo' },
  { minutes: 15, label: '15 minuti', detail: '3 ripasso · 5 nuovo · 3 vocaboli · 4 conversazione' },
  { minutes: 20, label: 'Ho 20 minuti', detail: 'Più vocaboli e più conversazione' },
  { minutes: 40, label: 'Oggi voglio studiare seriamente', detail: '35-45 minuti con verifica finale' },
];

function seeded(n: number, salt: string): number {
  let h = n;
  for (const ch of salt) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function pick<T>(xs: T[], n: number, salt: string): T[] {
  return [...xs].sort((a, b) => seeded(xs.indexOf(a), salt) - seeded(xs.indexOf(b), salt)).slice(0, n);
}

/** A fresh exercise for an item due for review: never a bare flashcard, always inside a sentence or a choice. */
export function reviewExercise(l: Learner, key: ItemKey): ReviewTask | null {
  const { kind, id } = parseKey(key);
  const reps = l.cards[key]?.reps ?? 0;
  if (kind === 'unit') {
    const unit = UNIT_BY_ID[id];
    if (!unit) return null;
    const pool = unit.exercises.filter((e) => e.tier !== 'recognize');
    return { key, label: `Ripasso · ${unit.title}`, exercise: pool[reps % pool.length] ?? unit.exercises[0] };
  }
  if (kind === 'error') {
    const type = ERROR_BY_ID[id];
    return type ? { key, label: `Il tuo errore · ${type.title}`, exercise: type.drill } : null;
  }
  if (kind === 'word') {
    const w = WORD_BY_ID[id];
    if (!w) return null;
    if (reps % 2 === 0) {
      const others = pick(WORDS.filter((o) => o.topic === w.topic && o.id !== w.id), 2, id + reps).map((o) => o.it);
      const options = pick([w.it, ...others], 3, id);
      return { key, label: 'Ripasso · vocaboli', exercise: { kind: 'choice', tier: 'recognize', prompt: `Cosa vuol dire “${w.en}”?`, sentence: w.example.en, options, answer: options.indexOf(w.it) } };
    }
    return { key, label: 'Ripasso · vocaboli', exercise: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: w.example.it, accept: [w.example.en], placeholder: w.en.split(' / ')[0] + '…' } };
  }
  if (kind === 'verb') {
    const v = VERB_BY_ID[id];
    if (!v) return null;
    const step = reps % 3;
    if (step === 0) {
      const accept = v.past.split(' / ').map((p) => p.replace(/\s*\(.*\)/, ''));
      return { key, label: 'Ripasso · verbi', exercise: { kind: 'type', tier: 'guided', prompt: `Il passato di “${v.base}” (${v.it})`, accept, placeholder: 'Scrivi il passato' } };
    }
    if (step === 1 && v.base !== 'be' && v.base !== 'can') {
      const options = pick([v.third, v.base, `is ${v.base}`], 3, id);
      return { key, label: 'Ripasso · verbi', exercise: { kind: 'choice', tier: 'recognize', prompt: 'Completa', sentence: `My friend ___ every day. (${v.base})`, options, answer: options.indexOf(v.third) } };
    }
    return { key, label: 'Ripasso · verbi', exercise: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: v.examples[0].it, accept: [v.examples[0].en] } };
  }
  return null;
}

function wordsToLearn(l: Learner, n: number): string[] {
  const level = currentLevel(l);
  const fresh = WORDS.filter((w) => !l.cards[`word:${w.id}`]);
  const preferred = fresh.filter((w) => w.level === level || w.level === 'A0');
  return (preferred.length ? preferred : fresh).slice(0, n).map((w) => w.id);
}

/**
 * Builds today's lesson from the four queues: overdue review first (always), then the next concept,
 * words, and a real-use conversation on the concept of the day.
 */
export function composeSession(l: Learner, minutes: number, now = new Date()): SessionPlan {
  const due = dueItems(l, now);
  // Errors the learner is still making come first: that is where learning is stuck.
  const ordered = [...due.filter((k) => k.startsWith('error:')), ...due.filter((k) => !k.startsWith('error:'))];
  const reviewCount = minutes <= 5 ? 5 : minutes <= 10 ? 6 : minutes <= 20 ? 8 : 14;
  const tasks = ordered.slice(0, reviewCount).map((k) => reviewExercise(l, k)).filter((t): t is ReviewTask => !!t);

  const unit = nextUnit(l);
  const lastSeen = Object.entries(l.units)
    .filter(([, u]) => u.firstSeen)
    .sort((a, b) => (b[1].firstSeen ?? '').localeCompare(a[1].firstSeen ?? ''))[0]?.[0];
  // Too many open errors in one area: consolidate before adding something new.
  const openErrors = Object.values(l.errors).filter((e) => e.status === 'todo').length;
  // With 5 minutes, something new only when there is little to review (always true on day one).
  const canAddNew = !!unit && openErrors <= 3 && (minutes >= 10 || tasks.length < 3);

  const blocks: Block[] = [];
  const outline: string[] = [];
  if (tasks.length) {
    blocks.push({ kind: 'review', tasks });
    outline.push(`Ripasso · ${tasks.length} ${tasks.length === 1 ? 'elemento' : 'elementi'}`);
  }
  if (canAddNew && unit) {
    blocks.push({ kind: 'unit', unitId: unit.id });
    outline.push(`Nuovo · ${unit.title}`);
  }
  const wordCount = minutes >= 40 ? 6 : minutes >= 15 ? 4 : 0;
  const words = wordCount ? wordsToLearn(l, wordCount) : [];
  if (words.length) {
    blocks.push({ kind: 'words', wordIds: words });
    outline.push(`Vocaboli · ${words.length} parole nuove in frasi`);
  }
  const useUnit = canAddNew && unit ? unit.id : lastSeen ?? unit?.id;
  if (useUnit) {
    blocks.push({ kind: 'use', unitId: useUnit });
    outline.push('Conversazione · usalo nella vita reale');
  }
  if (minutes >= 40 && canAddNew && unit) {
    blocks.push({ kind: 'check', unitId: unit.id });
    outline.push('Mini-verifica finale');
  }
  if (!blocks.length && unit) {
    blocks.push({ kind: 'unit', unitId: unit.id }, { kind: 'use', unitId: unit.id });
    outline.push(`Nuovo · ${unit.title}`, 'Conversazione · usalo nella vita reale');
  }
  const title = canAddNew && unit ? unit.title : tasks.length ? 'Ripasso intelligente' : 'Allenamento';
  return { minutes, title, blocks, outline };
}

/** Which explanation to lead with, given how previous attempts went. */
export function explanationFor(l: Learner, unit: Unit): { text: string; changed: boolean } {
  const u = unitProgress(l, unit.id);
  if (u.strategy === 1) return { text: unit.compare ?? unit.help.simpler, changed: true };
  if (u.strategy === 2) return { text: unit.help.simpler, changed: true };
  return { text: unit.explain, changed: false };
}

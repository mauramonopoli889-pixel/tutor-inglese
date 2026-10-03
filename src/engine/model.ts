import { ERROR_BY_ID } from '../content/errors';
import { LEVELS, type Level, type Tier } from '../content/types';
import { UNITS, UNIT_BY_ID } from '../content/units';
import { VERBS } from '../content/verbs';
import { WORDS } from '../content/vocab';
import type { DetectedError } from './checker';
import { isDue, isLearned, newCard, review, type ItemKey, type StoredCard } from './srs';

export type Skill = 'grammar' | 'vocabulary' | 'listening' | 'speaking' | 'pronunciation' | 'writing';
export const SKILLS: Skill[] = ['grammar', 'vocabulary', 'listening', 'speaking', 'pronunciation', 'writing'];

export type LearningStyle = 'listen' | 'read' | 'practice' | 'speak';

export type Profile = {
  name: string;
  selfLevel: number;
  reasons: string[];
  situations: string[];
  minutesPerDay: number;
  difficulties: string[];
  style: LearningStyle;
  startLevel: Level;
  goal: Level;
  createdAt: string;
};

export type UnitStatus = 'new' | 'learning' | 'consolidating' | 'mastered';

export type UnitProgress = {
  status: UnitStatus;
  /** Recent results per tier: 1 right, 0.5 right with help, 0 wrong. */
  recognize: number[];
  guided: number[];
  free: number[];
  firstSeen?: string;
  lastOkReview?: string;
  freeUses: number;
  /** Lessons on this unit that ended below 60%: after two, the tutor changes explanation. */
  failSessions: number;
  /** Which explanation strategy to lead with next (0 = standard). */
  strategy: number;
  /** Was mastered, then forgotten: shown as "da rinforzare". */
  lapsed: boolean;
};

export type ErrorStatus = 'todo' | 'improving' | 'acquired';

export type ErrorRecord = {
  count: number;
  events: { said: string; fixed: string | null; date: string }[];
  hits: string[];
  correctDays: string[];
  status: ErrorStatus;
};

export type DayLog = { minutes: number; ok: number; total: number };

export type Stats = {
  days: Record<string, DayLog>;
  streak: number;
  lastStreakDay?: string;
  talkSeconds: number;
  longestTalkSeconds: number;
  conversations: number;
  sentencesOk: number;
  sentencesTotal: number;
};

export type Milestone = { id: string; title: string; date: string };
export type JournalEntry = { date: string; kind: 'conversation' | 'free'; text: string; seconds?: number };

export type Learner = {
  version: 1;
  profile: Profile | null;
  skills: Record<Skill, Level>;
  units: Record<string, UnitProgress>;
  errors: Record<string, ErrorRecord>;
  cards: Partial<Record<ItemKey, StoredCard>>;
  /** Times a word was used correctly in the learner's own sentences. */
  wordUses: Record<string, number>;
  stats: Stats;
  milestones: Milestone[];
  journal: JournalEntry[];
};

const RECENT = 8;
const DAY = 864e5;

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY;
}

export function initialLearner(): Learner {
  return {
    version: 1,
    profile: null,
    skills: { grammar: 'A0', vocabulary: 'A0', listening: 'A0', speaking: 'A0', pronunciation: 'A0', writing: 'A0' },
    units: {},
    errors: {},
    cards: {},
    wordUses: {},
    stats: { days: {}, streak: 0, talkSeconds: 0, longestTalkSeconds: 0, conversations: 0, sentencesOk: 0, sentencesTotal: 0 },
    milestones: [],
    journal: [],
  };
}

function emptyUnit(): UnitProgress {
  return { status: 'new', recognize: [], guided: [], free: [], freeUses: 0, failSessions: 0, strategy: 0, lapsed: false };
}

export function unitProgress(l: Learner, unitId: string): UnitProgress {
  return l.units[unitId] ?? emptyUnit();
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * 0-100. Recognition 30%, guided production 30%, free production 40%.
 * Without any successful free production the score cannot pass 60: recognising is never enough.
 */
export function unitScore(u: UnitProgress): number {
  if (u.status === 'mastered') return 100;
  const raw = 30 * mean(u.recognize) + 30 * mean(u.guided) + 40 * mean(u.free);
  const capped = u.freeUses === 0 ? Math.min(raw, 60) : raw;
  return Math.round(Math.min(capped, 90));
}

function hasActiveLinkedError(l: Learner, unitId: string): boolean {
  const unit = UNIT_BY_ID[unitId];
  return !!unit?.errorTypes.some((id) => l.errors[id]?.status === 'todo');
}

/** "Has this person really learned it?" Only spaced recall plus free use in context earns "acquisito". */
export function computeStatus(l: Learner, unitId: string, u: UnitProgress): UnitStatus {
  if (!u.firstSeen) return 'new';
  const lessonAccuracy = mean([...u.recognize, ...u.guided].slice(-RECENT));
  const reviewGap = u.lastOkReview ? daysBetween(u.firstSeen, u.lastOkReview) : 0;
  if (u.lastOkReview && reviewGap >= 7 && u.freeUses >= 2 && !hasActiveLinkedError(l, unitId)) return 'mastered';
  if (u.lastOkReview && reviewGap >= 1 && lessonAccuracy >= 0.8) return 'consolidating';
  return 'learning';
}

function withUnit(l: Learner, unitId: string, update: (u: UnitProgress) => UnitProgress): Learner {
  const before = unitProgress(l, unitId);
  const after = update({ ...before });
  const next = { ...l, units: { ...l.units, [unitId]: after } };
  const status = computeStatus(next, unitId, after);
  const lapsed = status === 'mastered' ? false : after.lapsed;
  next.units[unitId] = { ...after, status, lapsed };
  return next;
}

function push(xs: number[], v: number): number[] {
  return [...xs, v].slice(-RECENT);
}

function ensureCard(l: Learner, key: ItemKey, now: Date): Learner {
  if (l.cards[key]) return l;
  return { ...l, cards: { ...l.cards, [key]: newCard(now) } };
}

function logDay(l: Learner, now: Date, correct: boolean): Learner {
  const k = dayKey(now);
  const d = l.stats.days[k] ?? { minutes: 0, ok: 0, total: 0 };
  const days = { ...l.stats.days, [k]: { ...d, ok: d.ok + (correct ? 1 : 0), total: d.total + 1 } };
  let { streak, lastStreakDay } = l.stats;
  // A day counts for the streak only once something was actually done right, not for opening the app.
  if (correct && lastStreakDay !== k) {
    const yesterday = dayKey(new Date(now.getTime() - DAY));
    streak = lastStreakDay === yesterday ? streak + 1 : 1;
    lastStreakDay = k;
  }
  return { ...l, stats: { ...l.stats, days, streak, lastStreakDay } };
}

export function addError(l: Learner, err: DetectedError, now = new Date()): Learner {
  const id = err.type.id;
  const prev = l.errors[id] ?? { count: 0, events: [], hits: [], correctDays: [], status: 'todo' as ErrorStatus };
  const rec: ErrorRecord = {
    count: prev.count + 1,
    events: [{ said: err.said, fixed: err.fixed, date: now.toISOString() }, ...prev.events].slice(0, 5),
    hits: [now.toISOString(), ...prev.hits].slice(0, 20),
    correctDays: [],
    status: 'todo',
  };
  const next = { ...l, errors: { ...l.errors, [id]: rec } };
  return ensureCard(next, `error:${id}`, now);
}

/** A correct use of a rule the learner used to get wrong. Three different days → acquired. */
export function markCorrectUse(l: Learner, errorId: string, now = new Date()): Learner {
  const prev = l.errors[errorId];
  if (!prev) return l;
  const k = dayKey(now);
  const correctDays = prev.correctDays.includes(k) ? prev.correctDays : [...prev.correctDays, k];
  const status: ErrorStatus = correctDays.length >= 3 ? 'acquired' : 'improving';
  return { ...l, errors: { ...l.errors, [errorId]: { ...prev, correctDays, status } } };
}

export type AttemptInput = {
  unitId?: string;
  tier: Tier;
  correct: boolean;
  helped?: boolean;
  errors?: DetectedError[];
  /** Unit errors the exercise exercises (for "correct use" credit). */
  practisedErrors?: string[];
};

export function recordAttempt(l: Learner, a: AttemptInput, now = new Date()): Learner {
  let next = logDay(l, now, a.correct);
  for (const e of a.errors ?? []) next = addError(next, e, now);
  if (a.correct) {
    const linked = new Set([...(a.practisedErrors ?? []), ...(a.unitId ? UNIT_BY_ID[a.unitId]?.errorTypes ?? [] : [])]);
    for (const id of linked) next = markCorrectUse(next, id, now);
  }
  if (a.unitId) {
    const value = a.correct ? (a.helped ? 0.5 : 1) : 0;
    next = ensureCard(next, `unit:${a.unitId}`, now);
    next = withUnit(next, a.unitId, (u) => ({
      ...u,
      firstSeen: u.firstSeen ?? now.toISOString(),
      [a.tier]: push(u[a.tier], value),
      freeUses: u.freeUses + (a.tier === 'free' && a.correct ? 1 : 0),
    }));
  }
  return next;
}

/** Spaced review of any item. Wrong answers make it come back sooner; mastered units can lapse. */
export function recordReview(l: Learner, key: ItemKey, outcome: { correct: boolean; helped?: boolean; free?: boolean }, now = new Date()): Learner {
  let next = ensureCard(l, key, now);
  next = { ...next, cards: { ...next.cards, [key]: review(next.cards[key]!, outcome, now) } };
  next = logDay(next, now, outcome.correct);
  const [kind, id] = key.split(':') as [string, string];
  if (kind === 'unit') {
    next = withUnit(next, id, (u) => {
      if (!outcome.correct) return { ...u, lapsed: u.status === 'mastered' || u.lapsed, lastOkReview: u.status === 'mastered' ? undefined : u.lastOkReview, status: 'learning' };
      const firstSeen = u.firstSeen ?? now.toISOString();
      return daysBetween(firstSeen, now.toISOString()) >= 1 ? { ...u, firstSeen, lastOkReview: now.toISOString() } : { ...u, firstSeen };
    });
  }
  if (kind === 'error' && outcome.correct) next = markCorrectUse(next, id, now);
  return next;
}

/** First contact with a word or verb: it enters the review cycle. */
export function startItem(l: Learner, key: ItemKey, now = new Date()): Learner {
  return ensureCard(l, key, now);
}

export function recordWordUse(l: Learner, wordId: string): Learner {
  return { ...l, wordUses: { ...l.wordUses, [wordId]: (l.wordUses[wordId] ?? 0) + 1 } };
}

export function finishLesson(l: Learner, unitId: string, accuracy: number): Learner {
  if (accuracy >= 0.6) return l;
  return withUnit(l, unitId, (u) => {
    const failSessions = u.failSessions + 1;
    return { ...u, failSessions, strategy: failSessions >= 2 ? (u.strategy + 1) % 3 : u.strategy };
  });
}

export function addMinutes(l: Learner, minutes: number, now = new Date()): Learner {
  const k = dayKey(now);
  const d = l.stats.days[k] ?? { minutes: 0, ok: 0, total: 0 };
  return { ...l, stats: { ...l.stats, days: { ...l.stats.days, [k]: { ...d, minutes: d.minutes + minutes } } } };
}

export function recordConversation(l: Learner, c: { seconds: number; ok: number; total: number; sample?: string }, now = new Date()): Learner {
  const stats: Stats = {
    ...l.stats,
    talkSeconds: l.stats.talkSeconds + c.seconds,
    longestTalkSeconds: Math.max(l.stats.longestTalkSeconds, c.seconds),
    conversations: l.stats.conversations + 1,
    sentencesOk: l.stats.sentencesOk + c.ok,
    sentencesTotal: l.stats.sentencesTotal + c.total,
  };
  let next = addMinutes({ ...l, stats }, Math.max(1, Math.round(c.seconds / 60)), now);
  if (c.sample) next = { ...next, journal: [{ date: now.toISOString(), kind: 'conversation' as const, text: c.sample, seconds: c.seconds }, ...next.journal].slice(0, 50) };
  return awardMilestones(next, now);
}

const MILESTONES: { id: string; title: string; test: (l: Learner) => boolean }[] = [
  { id: 'first-conversation', title: 'Prima conversazione completa con il tutor', test: (l) => l.stats.conversations >= 1 },
  { id: 'talk-2min', title: 'Hai parlato 2 minuti di fila', test: (l) => l.stats.longestTalkSeconds >= 120 },
  { id: 'talk-4min', title: 'Hai sostenuto una conversazione di 4 minuti', test: (l) => l.stats.longestTalkSeconds >= 240 },
  { id: 'unit-mastered', title: 'Primo argomento davvero acquisito', test: (l) => Object.values(l.units).some((u) => u.status === 'mastered') },
  { id: 'error-fixed', title: 'Hai corretto un errore che facevi spesso', test: (l) => Object.values(l.errors).some((e) => e.status === 'acquired') },
  { id: 'words-50', title: '50 parole che sai usare', test: (l) => wordsKnown(l) >= 50 },
];

export function awardMilestones(l: Learner, now = new Date()): Learner {
  const have = new Set(l.milestones.map((m) => m.id));
  const fresh = MILESTONES.filter((m) => !have.has(m.id) && m.test(l)).map((m) => ({ id: m.id, title: m.title, date: now.toISOString() }));
  return fresh.length ? { ...l, milestones: [...l.milestones, ...fresh] } : l;
}

// ---- Read models used by the screens ----

export function wordsKnown(l: Learner): number {
  return WORDS.filter((w) => {
    const c = l.cards[`word:${w.id}`];
    return c && (isLearned(c) || (l.wordUses[w.id] ?? 0) > 0);
  }).length;
}

export function verbsKnown(l: Learner): number {
  return VERBS.filter((v) => {
    const c = l.cards[`verb:${v.id}`];
    return c && isLearned(c);
  }).length;
}

export function unitsAt(level: Level) {
  return UNITS.filter((u) => u.level === level);
}

/** Percent of a CEFR level actually mastered (verified), not lessons opened. */
export function levelProgress(l: Learner, level: Level): number {
  const units = unitsAt(level);
  if (!units.length) return 0;
  return Math.round(mean(units.map((u) => unitScore(unitProgress(l, u.id)))));
}

export function currentLevel(l: Learner): Level {
  const start = l.profile?.startLevel ?? 'A0';
  for (const lvl of LEVELS.slice(LEVELS.indexOf(start))) {
    if (!unitsAt(lvl).length || levelProgress(l, lvl) < 85) return lvl;
  }
  return start;
}

export function nextUnit(l: Learner) {
  // Units below the placement level count as already known for prerequisites, but stay available in Allenati.
  const startIdx = LEVELS.indexOf(l.profile?.startLevel ?? 'A0');
  const atOrAbove = UNITS.filter((u) => LEVELS.indexOf(u.level) >= startIdx);
  const candidates = atOrAbove.length ? atOrAbove : UNITS;
  const ready = (prereq: string) => unitProgress(l, prereq).status !== 'new' || LEVELS.indexOf(UNIT_BY_ID[prereq].level) < startIdx;
  return (
    candidates.find((u) => unitProgress(l, u.id).status === 'new' && u.prereq.every(ready)) ??
    candidates.find((u) => unitProgress(l, u.id).status === 'learning') ??
    null
  );
}

export function dueItems(l: Learner, now = new Date()): ItemKey[] {
  return (Object.entries(l.cards) as [ItemKey, StoredCard][])
    .filter(([, c]) => isDue(c, now))
    .sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime())
    .map(([k]) => k);
}

export function activeErrors(l: Learner) {
  return Object.entries(l.errors)
    .filter(([id]) => ERROR_BY_ID[id])
    .map(([id, rec]) => ({ id, rec, type: ERROR_BY_ID[id] }))
    .sort((a, b) => {
      const order = { todo: 0, improving: 1, acquired: 2 } as const;
      return order[a.rec.status] - order[b.rec.status] || recentCount(b.rec) - recentCount(a.rec);
    });
}

export function recentCount(rec: ErrorRecord, now = new Date()): number {
  return rec.hits.filter((h) => now.getTime() - new Date(h).getTime() <= 30 * DAY).length;
}

export function weekMinutes(l: Learner, now = new Date()): number {
  let total = 0;
  for (let i = 0; i < 7; i++) total += l.stats.days[dayKey(new Date(now.getTime() - i * DAY))]?.minutes ?? 0;
  return total;
}

export function weeklyGoalPct(l: Learner, now = new Date()): number {
  const goal = (l.profile?.minutesPerDay ?? 15) * 5;
  return Math.min(100, Math.round((weekMinutes(l, now) / goal) * 100));
}

/** One line in the tutor's voice: "I know exactly where you are. Let's continue from here." */
export function tutorMessage(l: Learner, now = new Date()): string {
  const err = activeErrors(l).find((e) => e.rec.status === 'todo');
  const due = dueItems(l, now).length;
  const next = nextUnit(l);
  if (err) return `L’ultima volta hai sbagliato “${err.type.title.toLowerCase()}”. Lo ripassiamo per primo${next ? `, poi andiamo avanti con ${next.title.toLowerCase()}` : ''}.`;
  if (due > 0) return `Hai ${due} ${due === 1 ? 'cosa' : 'cose'} da ripassare prima che ti sfuggano. Poi continuiamo${next ? ` con ${next.title.toLowerCase()}` : ''}.`;
  if (next) return `So esattamente a che punto sei. Oggi: ${next.title.toLowerCase()}.`;
  return 'Hai completato il percorso disponibile. Allenati nelle conversazioni per consolidare.';
}

/** A concrete before/after line, only from real data. */
export function realProgress(l: Learner): string | null {
  const created = l.profile?.createdAt;
  if (!created) return null;
  const days = Math.max(1, Math.round((Date.now() - new Date(created).getTime()) / DAY));
  const mastered = Object.values(l.units).filter((u) => u.status === 'mastered').length;
  const talk = Math.round(l.stats.longestTalkSeconds / 60);
  if (l.stats.longestTalkSeconds >= 60) return `${days} giorni fa hai iniziato da ${l.profile!.startLevel}. Oggi hai sostenuto una conversazione di ${talk} ${talk === 1 ? 'minuto' : 'minuti'}.`;
  if (mastered > 0) return `In ${days} ${days === 1 ? 'giorno' : 'giorni'} hai acquisito davvero ${mastered} ${mastered === 1 ? 'argomento' : 'argomenti'}, verificati a distanza di giorni.`;
  if (wordsKnown(l) > 0) return `Sai già usare ${wordsKnown(l)} parole in frasi tue.`;
  return null;
}

/** Skill estimate shown on the path screen, mixing the placement result with what the learner has proven since. */
export function skillPercent(l: Learner, skill: Skill): number {
  const lvl = currentLevel(l);
  const units = unitsAt(lvl);
  switch (skill) {
    case 'grammar':
      return levelProgress(l, lvl);
    case 'vocabulary':
      return Math.min(100, Math.round((wordsKnown(l) / Math.max(1, WORDS.filter((w) => w.level === lvl).length)) * 100));
    case 'speaking':
      return Math.min(100, Math.round(mean(units.map((u) => mean(unitProgress(l, u.id).free))) * 100));
    case 'writing':
      return Math.min(100, Math.round(mean(units.map((u) => mean(unitProgress(l, u.id).guided))) * 100));
    case 'listening':
      return Math.min(100, Math.round(mean(units.map((u) => mean(unitProgress(l, u.id).recognize))) * 100));
    case 'pronunciation':
      return l.stats.sentencesTotal ? Math.round((l.stats.sentencesOk / l.stats.sentencesTotal) * 100) : 0;
  }
}

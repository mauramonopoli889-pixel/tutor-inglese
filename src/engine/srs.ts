import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

/** One review item: a word, verb, grammar unit, error type or sound. Keys look like "word:w-cibo-water". */
export type ItemKind = 'unit' | 'word' | 'verb' | 'error';
export type ItemKey = `${ItemKind}:${string}`;

/** JSON-safe card (dates as ISO strings) so it survives AsyncStorage. */
export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };

const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: true });

function toStored(card: Card): StoredCard {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review ? card.last_review.toISOString() : undefined };
}

function fromStored(card: StoredCard): Card {
  return { ...card, due: new Date(card.due), last_review: card.last_review ? new Date(card.last_review) : undefined };
}

export function newCard(now = new Date()): StoredCard {
  return toStored(createEmptyCard(now));
}

/**
 * Records one recall attempt. Wrong → Again (comes back soon); right with help → Hard;
 * right → Good; right, fast and in free production → Easy.
 */
export function review(card: StoredCard, outcome: { correct: boolean; helped?: boolean; free?: boolean }, now = new Date()): StoredCard {
  const grade: Grade = !outcome.correct ? Rating.Again : outcome.helped ? Rating.Hard : outcome.free ? Rating.Easy : Rating.Good;
  return toStored(scheduler.next(fromStored(card), now, grade).card);
}

export function isDue(card: StoredCard, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

/** Days the learner is expected to remember this item for. */
export function stabilityDays(card: StoredCard): number {
  return card.stability;
}

export function isLearned(card: StoredCard): boolean {
  return card.state === State.Review && card.lapses < card.reps;
}

export function parseKey(key: ItemKey): { kind: ItemKind; id: string } {
  const i = key.indexOf(':');
  return { kind: key.slice(0, i) as ItemKind, id: key.slice(i + 1) };
}

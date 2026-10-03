import type { Learner } from '../engine/model';
import { isDue, isLearned, type ItemKey } from '../engine/srs';

export type ItemState = { label: string; tone: 'muted' | 'amber' | 'violet' | 'mint' };

/** How well an item is known, from the review schedule and real use, never from views. */
export function itemState(l: Learner, key: ItemKey, uses = 0): ItemState {
  const card = l.cards[key];
  if (!card) return { label: 'nuova', tone: 'muted' };
  if (isLearned(card) && uses > 0) return { label: 'la sai usare', tone: 'mint' };
  if (isLearned(card)) return { label: 'la ricordi', tone: 'mint' };
  if (isDue(card)) return { label: 'da ripassare', tone: 'amber' };
  return { label: 'in ripasso', tone: 'violet' };
}

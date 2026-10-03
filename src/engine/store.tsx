import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UNIT_BY_ID } from '../content/units';
import { WORD_BY_ID } from '../content/vocab';
import { activeErrors, currentLevel, initialLearner, unitProgress, type Learner } from './model';

const KEY = 'tutor.learner.v1';

type Store = {
  ready: boolean;
  learner: Learner;
  update: (fn: (l: Learner) => Learner) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner>(initialLearner);
  const [ready, setReady] = useState(false);
  const latest = useRef(learner);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Learner;
          if (saved.version === 1) {
            latest.current = saved;
            setLearner(saved);
          }
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (l: Learner) => Learner) => {
    const next = fn(latest.current);
    latest.current = next;
    setLearner(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    const fresh = initialLearner();
    latest.current = fresh;
    setLearner(fresh);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  const value = useMemo(() => ({ ready, learner, update, reset }), [ready, learner, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearner(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLearner outside LearnerProvider');
  return ctx;
}

/** Compact briefing sent to the AI tutor: what it should know, never the raw database. */
export function learnerBrief(l: Learner): string {
  const p = l.profile;
  const errors = activeErrors(l)
    .filter((e) => e.rec.status !== 'acquired')
    .slice(0, 5)
    .map((e) => e.type.title);
  const learning = Object.keys(l.units)
    .filter((id) => unitProgress(l, id).status === 'learning' || unitProgress(l, id).status === 'consolidating')
    .map((id) => UNIT_BY_ID[id]?.title)
    .filter(Boolean);
  const words = Object.keys(l.cards)
    .filter((k) => k.startsWith('word:'))
    .slice(-20)
    .map((k) => WORD_BY_ID[k.slice(5)]?.en)
    .filter(Boolean);
  return [
    p ? `Name: ${p.name || 'not given'}. Wants English for: ${p.reasons.join(', ') || 'general'}. Situations: ${p.situations.join(', ') || 'everyday'}. Difficulties: ${p.difficulties.join(', ') || 'none stated'}.` : '',
    `Current level: ${currentLevel(l)}.`,
    learning.length ? `Currently learning: ${learning.join(', ')}.` : '',
    errors.length ? `Frequent mistakes to watch: ${errors.join(', ')}.` : '',
    words.length ? `Recent words to reuse: ${words.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

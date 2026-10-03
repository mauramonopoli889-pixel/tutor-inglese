export type Level = 'A0' | 'A1' | 'A2' | 'B1' | 'B2';
export const LEVELS: Level[] = ['A0', 'A1', 'A2', 'B1', 'B2'];

/** How deep the exercise makes the learner work; drives the mastery score. */
export type Tier = 'recognize' | 'guided' | 'free';

export type Exercise =
  | { kind: 'choice'; tier: 'recognize'; prompt: string; sentence?: string; options: string[]; answer: number; why?: string }
  | { kind: 'type'; tier: 'guided' | 'free'; prompt: string; sentence?: string; accept: string[]; placeholder?: string; why?: string }
  | { kind: 'order'; tier: 'guided'; prompt: string; words: string[]; answer: string; why?: string }
  /** Open answer: correct when it matches `pattern` and no error detector fires. */
  | { kind: 'free'; tier: 'free'; prompt: string; pattern: string; model: string; placeholder?: string };

export type Example = { en: string; it: string; note?: string };

export type Unit = {
  id: string;
  level: Level;
  title: string;
  /** "Posso..." descriptor shown once the unit is mastered. */
  can: string;
  prereq: string[];
  explain: string;
  compare?: string;
  schema?: { en: string; it: string }[];
  examples: Example[];
  exercises: Exercise[];
  /** Real-life use: a tutor question the learner answers freely. */
  use: { tutor: string; it: string; pattern: string; model: string };
  errorTypes: string[];
  help: { simpler: string; example: Example; italian: string };
  why?: string;
};

export type ErrorType = {
  id: string;
  title: string;
  rule: string;
  /** Regex sources tested against the lower-cased learner sentence. */
  detect: string[];
  severity: 'major' | 'minor';
  explain: string;
  examples: string[];
  fix: (sentence: string) => string | null;
  drill: Exercise;
};

export type Word = {
  id: string;
  en: string;
  it: string;
  ipa: string;
  say: string;
  level: Level;
  topic: string;
  example: Example;
  context: string;
};

export type Verb = {
  id: string;
  base: string;
  it: string;
  ipa: string;
  third: string;
  past: string;
  participle: string;
  irregular: boolean;
  level: Level;
  examples: Example[];
};

export type ScenarioTurn = {
  tutor: string;
  it: string;
  /** Learner reply is on-task if it matches this regex; otherwise the tutor helps. */
  expect: string;
  suggestions: string[];
  hint: string;
};

export type Scenario = {
  id: string;
  emoji: string;
  title: string;
  level: Level;
  role: string;
  mission: string;
  turns: ScenarioTurn[];
  closing: string;
};

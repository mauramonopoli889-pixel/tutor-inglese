import { gradeSentence, normalize, type SentenceGrade } from '../engine/checker';
import { FREE_TALK_PROMPTS } from '../content/scenarios';
import type { Scenario, Unit } from '../content/types';

export type ChatTurn = { role: 'tutor' | 'learner'; text: string; it?: string };
export type Correction = { said: string; better: string; why: string; grade: Exclude<SentenceGrade, 'ok'> };
export type TutorReply = {
  reply: string;
  it: string;
  corrections: Correction[];
  missionComplete: boolean;
  /** Errors from the local detector, used for "I miei errori" whichever tutor answered. */
  local: ReturnType<typeof gradeSentence>;
};

// Set EXPO_PUBLIC_TUTOR_API_URL to the server in /server to talk with Claude.
// Without it the app works fully offline with the scripted tutor below.
const API = process.env.EXPO_PUBLIC_TUTOR_API_URL?.replace(/\/$/, '');

export const aiAvailable = !!API;

async function post<T>(path: string, body: unknown): Promise<T | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function localCorrections(text: string, g: ReturnType<typeof gradeSentence>): Correction[] {
  if (g.grade === 'ok' || !g.better) return [];
  return [{ said: text, better: g.better, why: g.errors.map((e) => e.type.explain).join(' '), grade: g.grade }];
}

type ConverseInput = {
  scenario: Scenario | null;
  history: ChatTurn[];
  level: string;
  brief: string;
  learnerName?: string;
};

/** Next tutor line. Tries Claude via the server; falls back to the scripted scenario so the app never blocks. */
export async function converse(input: ConverseInput): Promise<TutorReply> {
  const last = [...input.history].reverse().find((t) => t.role === 'learner')?.text ?? '';
  const local = gradeSentence(last);
  const remote = await post<{ reply: string; replyItalian: string; corrections: Correction[]; missionComplete: boolean }>('/api/converse', {
    level: input.level,
    brief: input.brief,
    learnerName: input.learnerName,
    scenario: input.scenario ? { title: input.scenario.title, role: input.scenario.role, mission: input.scenario.mission } : null,
    history: input.history.map(({ role, text }) => ({ role, text })),
  });
  if (remote) return { reply: remote.reply, it: remote.replyItalian, corrections: remote.corrections, missionComplete: remote.missionComplete, local };
  return { ...offlineReply(input, last), corrections: localCorrections(last, local), local };
}

function offlineReply(input: ConverseInput, last: string): { reply: string; it: string; missionComplete: boolean } {
  const learnerTurns = input.history.filter((t) => t.role === 'learner').length;
  if (!input.scenario) {
    const next = FREE_TALK_PROMPTS[learnerTurns % FREE_TALK_PROMPTS.length];
    const ack = acknowledge(last);
    return { reply: `${ack} ${next.tutor}`.trim(), it: next.it, missionComplete: false };
  }
  const turns = input.scenario.turns;
  const step = scenarioStep(input.scenario, input.history);
  const current = turns[step];
  // Off-task or Italian: help instead of moving on, as a person would.
  if (!new RegExp(current.expect, 'i').test(normalize(last))) {
    return { reply: `Sorry? ${current.tutor} You can say: “${current.suggestions[0]}”`, it: `Scusa? ${current.it} ${current.hint}`, missionComplete: false };
  }
  if (step + 1 >= turns.length) return { reply: input.scenario.closing, it: 'Missione completata!', missionComplete: true };
  const next = turns[step + 1];
  return { reply: next.tutor, it: next.it, missionComplete: false };
}

/** Index of the scenario line the tutor last asked (help messages repeat it without advancing). */
function scenarioStep(scenario: Scenario, history: ChatTurn[]): number {
  let step = 0;
  history.forEach((t) => {
    if (t.role !== 'tutor') return;
    const i = scenario.turns.findIndex((turn) => turn.tutor === t.text);
    if (i > step) step = i;
  });
  return step;
}

function acknowledge(text: string): string {
  const t = normalize(text);
  if (!t) return '';
  if (/\b(good|great|fine|happy|well|love|like)\b/.test(t)) return 'That sounds nice!';
  if (/\b(tired|bad|sad|not)\b/.test(t)) return 'Oh, I see.';
  return 'Interesting!';
}

/** Opening line for a conversation. */
export function opening(scenario: Scenario | null): ChatTurn {
  if (scenario) return { role: 'tutor', text: scenario.turns[0].tutor, it: scenario.turns[0].it };
  return { role: 'tutor', text: FREE_TALK_PROMPTS[0].tutor, it: FREE_TALK_PROMPTS[0].it };
}

export function suggestionsFor(scenario: Scenario | null, history: ChatTurn[]): string[] {
  if (!scenario) return [];
  const lastTutor = [...history].reverse().find((t) => t.role === 'tutor');
  if (lastTutor && lastTutor.text === scenario.closing) return [];
  return scenario.turns[scenarioStep(scenario, history)]?.suggestions ?? [];
}

export type HelpMode = 'simpler' | 'example' | 'italian';

/** "Aiutami": AI rewrite when online, the unit's own alternative explanations offline. */
export async function explainAgain(unit: Unit, mode: HelpMode, level: string, interests: string[]): Promise<{ text: string; exampleEn?: string; exampleIt?: string }> {
  const remote = await post<{ text: string; exampleEn: string; exampleIt: string }>('/api/explain', {
    level, unitTitle: unit.title, explanation: unit.explain, mode, tried: [unit.explain], interests,
  });
  if (remote) return remote;
  if (mode === 'simpler') return { text: unit.help.simpler };
  if (mode === 'example') return { text: unit.help.example.it, exampleEn: unit.help.example.en, exampleIt: unit.help.example.it };
  return { text: unit.help.italian };
}


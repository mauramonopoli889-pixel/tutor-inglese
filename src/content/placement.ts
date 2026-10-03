import type { Level } from './types';

export type PlacementItem = {
  id: string;
  level: Level;
  skill: 'vocabulary' | 'grammar' | 'reading' | 'listening';
  prompt: string;
  /** Text read aloud for listening items. */
  audio?: string;
  sentence?: string;
  options: string[];
  answer: number;
};

// Ordered from easiest to hardest. The test walks up while answers are right and stops two misses into a band.
export const PLACEMENT: PlacementItem[] = [
  { id: 'p1', level: 'A0', skill: 'vocabulary', prompt: 'Cosa vuol dire “Good morning”?', options: ['Buonanotte', 'Buongiorno', 'Arrivederci'], answer: 1 },
  { id: 'p2', level: 'A0', skill: 'grammar', prompt: 'Completa', sentence: 'I ___ Italian.', options: ['is', 'am', 'are'], answer: 1 },
  { id: 'p3', level: 'A0', skill: 'listening', prompt: 'Ascolta e scegli il numero', audio: 'Thirteen', options: ['30', '13', '3'], answer: 1 },
  { id: 'p4', level: 'A0', skill: 'grammar', prompt: 'Come si dice “Ho 29 anni”?', options: ['I have 29 years.', 'I am 29 years old.', "I'm having 29."], answer: 1 },
  { id: 'p5', level: 'A1', skill: 'grammar', prompt: 'Completa', sentence: 'She ___ in a bank.', options: ['work', 'works', 'is work'], answer: 1 },
  { id: 'p6', level: 'A1', skill: 'vocabulary', prompt: 'Al ristorante, “the bill” è…', options: ['il menù', 'il conto', 'il tavolo'], answer: 1 },
  { id: 'p7', level: 'A1', skill: 'listening', prompt: 'Ascolta: cosa chiede?', audio: 'Excuse me, is there a pharmacy near here?', options: ['Dov’è la stazione', 'Se c’è una farmacia vicino', 'Quanto costa'], answer: 1 },
  { id: 'p8', level: 'A1', skill: 'grammar', prompt: 'Qual è la domanda corretta?', options: ['You like coffee?', 'Do you like coffee?', 'Like you coffee?'], answer: 1 },
  { id: 'p9', level: 'A2', skill: 'grammar', prompt: 'Completa', sentence: 'Yesterday we ___ to the beach.', options: ['go', 'went', 'have gone'], answer: 1 },
  { id: 'p10', level: 'A2', skill: 'reading', prompt: '“I usually take the bus, but today I’m walking.” Oggi la persona…', options: ['prende l’autobus', 'va a piedi', 'resta a casa'], answer: 1 },
  { id: 'p11', level: 'A2', skill: 'grammar', prompt: 'Completa', sentence: 'This film is ___ than the book.', options: ['more good', 'better', 'gooder'], answer: 1 },
  { id: 'p12', level: 'B1', skill: 'grammar', prompt: 'Completa', sentence: "I ___ in Milan since 2019.", options: ['live', 'have lived', 'am living'], answer: 1 },
  { id: 'p13', level: 'B1', skill: 'grammar', prompt: 'Completa', sentence: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'will stay', 'would stay'], answer: 1 },
  { id: 'p14', level: 'B1', skill: 'vocabulary', prompt: '“I ran out of milk” vuol dire…', options: ['Ho finito il latte', 'Ho versato il latte', 'Sono corsa a comprare il latte'], answer: 0 },
];

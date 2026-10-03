import type { Level, Verb } from './types';

type Row = [base: string, it: string, ipa: string, past: string, participle: string, level: Level, exEn: string, exIt: string];

// Ordered by usefulness: the first ones carry most everyday conversation.
const RAW: Row[] = [
  ['be', 'essere', '/biː/', 'was / were', 'been', 'A0', "I'm at home.", 'Sono a casa.'],
  ['have', 'avere', '/hæv/', 'had', 'had', 'A0', 'I have two children.', 'Ho due figli.'],
  ['do', 'fare (azioni)', '/duː/', 'did', 'done', 'A0', 'What do you do?', 'Che lavoro fai?'],
  ['go', 'andare', '/ɡəʊ/', 'went', 'gone', 'A0', 'I go to work by bus.', 'Vado al lavoro in autobus.'],
  ['like', 'piacere', '/laɪk/', 'liked', 'liked', 'A0', 'I like Italian food.', 'Mi piace il cibo italiano.'],
  ['want', 'volere', '/wɒnt/', 'wanted', 'wanted', 'A0', 'I want a coffee.', 'Voglio un caffè.'],
  ['live', 'vivere, abitare', '/lɪv/', 'lived', 'lived', 'A0', 'We live in Florence.', 'Viviamo a Firenze.'],
  ['work', 'lavorare', '/wɜːk/', 'worked', 'worked', 'A0', 'She works in a hospital.', 'Lavora in ospedale.'],
  ['speak', 'parlare', '/spiːk/', 'spoke', 'spoken', 'A0', 'Do you speak Italian?', 'Parli italiano?'],
  ['eat', 'mangiare', '/iːt/', 'ate', 'eaten', 'A0', 'We eat at 8.', 'Mangiamo alle 8.'],
  ['drink', 'bere', '/drɪŋk/', 'drank', 'drunk', 'A0', "I don't drink coffee.", 'Non bevo caffè.'],
  ['can', 'potere, sapere', '/kæn/', 'could', '—', 'A1', 'Can you help me?', 'Puoi aiutarmi?'],
  ['make', 'fare (creare)', '/meɪk/', 'made', 'made', 'A1', 'I make dinner every evening.', 'Preparo la cena ogni sera.'],
  ['get', 'ottenere, prendere, arrivare', '/ɡet/', 'got', 'got', 'A1', 'I get up at 7.', 'Mi alzo alle 7.'],
  ['take', 'prendere', '/teɪk/', 'took', 'taken', 'A1', 'I take the train.', 'Prendo il treno.'],
  ['come', 'venire', '/kʌm/', 'came', 'come', 'A1', 'Can you come tonight?', 'Puoi venire stasera?'],
  ['see', 'vedere', '/siː/', 'saw', 'seen', 'A1', 'I saw a good film.', 'Ho visto un bel film.'],
  ['know', 'sapere, conoscere', '/nəʊ/', 'knew', 'known', 'A1', "I don't know.", 'Non lo so.'],
  ['think', 'pensare', '/θɪŋk/', 'thought', 'thought', 'A1', 'I think it’s a good idea.', 'Penso che sia una buona idea.'],
  ['say', 'dire', '/seɪ/', 'said', 'said', 'A1', 'What did you say?', 'Cosa hai detto?'],
  ['tell', 'dire (a qualcuno), raccontare', '/tel/', 'told', 'told', 'A1', 'Tell me about your day.', 'Raccontami la tua giornata.'],
  ['buy', 'comprare', '/baɪ/', 'bought', 'bought', 'A1', 'I bought a new phone.', 'Ho comprato un telefono nuovo.'],
  ['pay', 'pagare', '/peɪ/', 'paid', 'paid', 'A1', 'Can I pay by card?', 'Posso pagare con la carta?'],
  ['meet', 'incontrare', '/miːt/', 'met', 'met', 'A1', 'We met in Rome.', 'Ci siamo conosciuti a Roma.'],
  ['sleep', 'dormire', '/sliːp/', 'slept', 'slept', 'A1', 'I slept badly.', 'Ho dormito male.'],
  ['write', 'scrivere', '/raɪt/', 'wrote', 'written', 'A1', 'I wrote an email.', 'Ho scritto un’email.'],
  ['read', 'leggere', '/riːd/', 'read (/red/)', 'read (/red/)', 'A1', 'I read every night.', 'Leggo ogni sera.'],
  ['understand', 'capire', '/ˌʌn.dəˈstænd/', 'understood', 'understood', 'A1', "Sorry, I don't understand.", 'Scusa, non capisco.'],
  ['need', 'avere bisogno', '/niːd/', 'needed', 'needed', 'A1', 'I need a taxi.', 'Ho bisogno di un taxi.'],
  ['study', 'studiare', '/ˈstʌd.i/', 'studied', 'studied', 'A1', 'She studies English.', 'Studia inglese.'],
  ['watch', 'guardare', '/wɒtʃ/', 'watched', 'watched', 'A1', 'We watched a series.', 'Abbiamo guardato una serie.'],
  ['cook', 'cucinare', '/kʊk/', 'cooked', 'cooked', 'A1', 'My husband cooks well.', 'Mio marito cucina bene.'],
];

function third(base: string): string {
  if (base === 'be') return 'is';
  if (base === 'have') return 'has';
  if (base === 'can') return 'can';
  if (base === 'do' || base === 'go') return base + 'es';
  if (/(s|sh|ch|x|z)$/.test(base)) return base + 'es';
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
  return base + 's';
}

export const VERBS: Verb[] = RAW.map(([base, it, ipa, past, participle, level, exEn, exIt]) => ({
  id: `v-${base}`,
  base, it, ipa, past, participle, level,
  third: third(base),
  irregular: !past.endsWith('ed'),
  examples: [{ en: exEn, it: exIt }],
}));

export const VERB_BY_ID: Record<string, Verb> = Object.fromEntries(VERBS.map((v) => [v.id, v]));

import type { ErrorType } from './types';

const JOBS = 'teacher|doctor|student|engineer|nurse|waiter|waitress|lawyer|designer|developer|manager|cook|chef|driver|architect|artist|accountant';
const BASE_VERBS = 'work|live|like|love|go|have|do|play|want|eat|drink|speak|study|read|watch|need|know|come|make|get|take|start|finish|cook|walk|run|sleep|wake|teach|write|listen';
const IRREGULAR_PAST: Record<string, string> = {
  go: 'went', eat: 'ate', have: 'had', do: 'did', see: 'saw', make: 'made', get: 'got', take: 'took',
  come: 'came', buy: 'bought', drink: 'drank', meet: 'met', sleep: 'slept', write: 'wrote', read: 'read',
};

function thirdPerson(verb: string): string {
  if (verb === 'have') return 'has';
  if (verb === 'do' || verb === 'go') return verb + 'es';
  if (/(s|sh|ch|x|z)$/.test(verb)) return verb + 'es';
  if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + 'ies';
  return verb + 's';
}


export const ERROR_TYPES: ErrorType[] = [
  {
    id: 'AGE_WITH_HAVE',
    title: "L'età con “to be”",
    rule: 'u-age',
    detect: ['\\b(i|you|he|she|we|they|it|my \\w+)\\s+(have|has)\\s+\\d+(\\s+years?\\b|\\s*[.!?]?$)'],
    severity: 'major',
    explain: 'In italiano diciamo “avere 29 anni”, in inglese l’età si dice con to be (essere): I am 29 years old.',
    examples: ['I am 29 years old.', 'You are 29 years old.', 'She is 29 years old.'],
    fix: (s) => {
      const re = /\b(i|you|he|she|we|they|it|my \w+)\s+(have|has)\s+(\d+)(?=\s+years?\b|\s*[.!?]?$)(\s+years?)?(\s+old)?/i;
      if (!re.test(s)) return null;
      // Rewrite only the age clause, keeping the rest of the sentence.
      return s.replace(re, (_all, who: string, _have, n: string) => {
        const subj = who.toLowerCase();
        const be = subj === 'i' ? 'am' : ['you', 'we', 'they'].includes(subj) ? 'are' : 'is';
        return `${subj === 'i' ? 'I' : who} ${be} ${n} years old`;
      });
    },
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Mio fratello ha 35 anni.', accept: ['my brother is 35 years old', "my brother's 35 years old", 'my brother is 35', "my brother's 35"], placeholder: 'My brother…' },
  },
  {
    id: 'MISSING_SUBJECT',
    title: 'Il soggetto obbligatorio',
    rule: 'u-be-positive',
    detect: ['^(is|am|are|was|were)\\b(?!\\s+(you|he|she|it|we|they|there|this|that|i)\\b)'],
    severity: 'minor',
    explain: 'In italiano possiamo dire solo “è bello”. In inglese il soggetto serve sempre, anche quando è “it”: It is nice.',
    examples: ["It's very good.", 'She is Italian.', 'It is late.'],
    fix: (s) => {
      const m = s.match(/^(is|am|are|was|were)\b(.*)$/i);
      if (!m) return null;
      const verb = m[1].toLowerCase();
      const subj = verb === 'am' ? 'I' : verb === 'are' || verb === 'were' ? 'They' : 'It';
      return `${subj} ${verb}${m[2]}`;
    },
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'È molto buono.', accept: ['it is very good', "it's very good"], placeholder: 'It…' },
  },
  {
    id: 'MISSING_ARTICLE_JOB',
    title: "L'articolo con le professioni",
    rule: 'u-articles',
    detect: [`\\b(am|is|are|i'm|he's|she's|you're)\\s+(${JOBS})\\b`],
    severity: 'minor',
    explain: 'In italiano “sono insegnante”, in inglese serve l’articolo: I am a teacher. Davanti a vocale si usa an: an engineer.',
    examples: ['I am a teacher.', 'She is an engineer.', 'He is a doctor.'],
    fix: (s) => s.replace(new RegExp(`\\b(am|is|are|i'm|he's|she's|you're)\\s+(${JOBS})\\b`, 'i'), (_m, be, job) => `${be} ${/^[aeiou]/i.test(job) ? 'an' : 'a'} ${job}`),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Sono un’architetta.', accept: ['i am an architect', "i'm an architect"], placeholder: 'I am…' },
  },
  {
    id: 'A_AN',
    title: 'A oppure an',
    rule: 'u-articles',
    detect: ['\\ba\\s+(apple|orange|egg|hour|umbrella|engineer|architect|office|idea|email|artist|accountant|old|interesting|english|italian|american)\\b', '\\ban\\s+(book|car|cat|dog|house|pen|teacher|doctor|banana|cappuccino|coffee|good|big|small|nice|university)\\b'],
    severity: 'minor',
    explain: 'Si usa an davanti a un suono vocalico (an apple, an hour) e a davanti a un suono consonantico (a book, a university).',
    examples: ['an apple', 'an hour', 'a book', 'a university'],
    fix: (s) => s
      .replace(/\ba\s+(apple|orange|egg|hour|umbrella|engineer|architect|office|idea|email|artist|accountant|old|interesting|english|italian|american)\b/gi, 'an $1')
      .replace(/\ban\s+(book|car|cat|dog|house|pen|teacher|doctor|banana|cappuccino|coffee|good|big|small|nice|university)\b/gi, 'a $1'),
    drill: { kind: 'choice', tier: 'recognize', prompt: 'Scegli l’articolo giusto', sentence: 'I eat ___ orange every day.', options: ['a', 'an'], answer: 1 },
  },
  {
    id: 'THIRD_PERSON_S',
    title: 'La -s della terza persona',
    rule: 'u-present-simple',
    detect: [`(?<!\\b(does|doesn't|did|didn't|can|can't|will|won't|should|must)\\s)\\b(he|she|it|my (mother|father|mum|dad|brother|sister|friend|boss))\\s+(${BASE_VERBS})\\b`],
    severity: 'minor',
    explain: 'Al presente, con he, she e it il verbo prende una -s: I work, ma she works. È l’unica persona che cambia.',
    examples: ['She works in Milan.', 'He likes pizza.', 'It has a garden.'],
    fix: (s) => s.replace(new RegExp(`(?<!\\b(?:does|doesn't|did|didn't|can|can't|will|won't|should|must)\\s)\\b(he|she|it|my (?:mother|father|mum|dad|brother|sister|friend|boss))\\s+(${BASE_VERBS})\\b`, 'i'), (_m, subj, verb) => `${subj} ${thirdPerson(verb.toLowerCase())}`),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Mia sorella lavora a Roma.', accept: ['my sister works in rome'], placeholder: 'My sister…' },
  },
  {
    id: 'DOES_PLUS_S',
    title: 'Dopo does/doesn’t il verbo è base',
    rule: 'u-present-questions',
    detect: ["\\b(does|doesn't|does not)\\s+(he|she|it)?\\s*\\w+s\\b(?<!\\bis)", "\\b(he|she|it)\\s+don't\\b"],
    severity: 'minor',
    explain: 'La -s va una volta sola: se c’è does (o doesn’t) il verbo resta base. She doesn’t work. Does he like…? E con he/she/it si usa doesn’t, non don’t.',
    examples: ["She doesn't work on Sunday.", 'Does he like coffee?'],
    fix: (s) => s
      .replace(/\b(he|she|it)\s+don't\b/i, "$1 doesn't")
      .replace(/\b(does|doesn't|does not)(\s+(?:he|she|it))?\s+(\w+?)(es|s)\b/i, (_m, d, subj = '', verb, end) => {
        const base = end === 'es' && /(sh|ch|x|o)$/.test(verb) ? verb : verb + (end === 'es' ? 'e' : '');
        return `${d}${subj} ${base.replace(/ie$/, 'y')}`;
      }),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Lei non beve caffè.', accept: ["she doesn't drink coffee", 'she does not drink coffee'], placeholder: 'She…' },
  },
  {
    id: 'QUESTION_WITHOUT_DO',
    title: 'Le domande con do/does',
    rule: 'u-present-questions',
    detect: [`^(you|we|they|he|she)\\s+(${BASE_VERBS}|likes|works|lives|wants|has)\\b.*\\?$`],
    severity: 'minor',
    explain: 'In italiano basta l’intonazione (“Ti piace?”). In inglese la domanda al presente comincia con do (o does con he/she/it): Do you like pizza?',
    examples: ['Do you like pizza?', 'Does she work here?'],
    fix: (s) => {
      const m = s.match(/^(you|we|they|he|she)\s+(\w+)(.*)\?$/i);
      if (!m) return null;
      const third = /^(he|she)$/i.test(m[1]);
      const verb = third ? m[2].replace(/ies$/, 'y').replace(/(sh|ch|x|o)es$/, '$1').replace(/s$/, '').replace(/^ha$/, 'have') : m[2];
      return `${third ? 'Does' : 'Do'} ${m[1].toLowerCase()} ${verb}${m[3]}?`;
    },
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Ti piace il tè?', accept: ['do you like tea', 'do you like tea?'], placeholder: 'Do…' },
  },
  {
    id: 'BE_PLUS_VERB',
    title: 'Niente “am” davanti ai verbi',
    rule: 'u-present-simple',
    detect: [`\\b(i am|i'm|you are|he is|she is|we are|they are)\\s+(${BASE_VERBS}|agree)\\b`],
    severity: 'major',
    explain: 'Am/is/are servono per “essere”. Con gli altri verbi al presente semplice non si usano: I work (non I am work), I agree (non I am agree).',
    examples: ['I work in an office.', 'I agree with you.', 'They live in Turin.'],
    fix: (s) => s.replace(new RegExp(`\\b(i am|i'm|you are|he is|she is|we are|they are)\\s+(${BASE_VERBS}|agree)\\b`, 'i'), (_m, be: string, verb: string) => {
      const subj = be.replace(/\s*(am|is|are)$|'m$/i, '');
      return `${subj} ${/^(he|she)$/i.test(subj) ? thirdPerson(verb.toLowerCase()) : verb}`;
    }),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Lavoro in banca.', accept: ['i work in a bank', 'i work at a bank'], placeholder: 'I…' },
  },
  {
    id: 'CAN_TO',
    title: 'Can senza “to”',
    rule: 'u-can',
    detect: ["\\b(can|can't|cannot)\\s+to\\b", '\\bcan\\s+\\w+s\\b(?<!\\bis)(?<!\\bdoes)'],
    severity: 'minor',
    explain: 'Dopo can il verbo è sempre base, senza to e senza -s: I can swim, she can drive.',
    examples: ['I can swim.', 'She can speak English.', "We can't come."],
    fix: (s) => s.replace(/\b(can|can't|cannot)\s+to\s+/i, '$1 ').replace(/\b(can)\s+(\w+?)s\b/i, '$1 $2'),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Lei sa nuotare.', accept: ['she can swim'], placeholder: 'She…' },
  },
  {
    id: 'THERE_IS_PLURAL',
    title: 'There is / there are',
    rule: 'u-there-is',
    detect: ["\\b(there is|there's)\\s+(two|three|four|five|six|many|some|\\d+)\\s+\\w+s\\b", '\\bthere are\\s+(a|an|one)\\b'],
    severity: 'minor',
    explain: 'There is con una cosa sola (there is a bar), there are con più cose (there are two bars).',
    examples: ['There is a bank near here.', 'There are three bedrooms.'],
    fix: (s) => s.replace(/\b(there is|there's)\s+(two|three|four|five|six|many|some|\d+)/i, 'there are $2').replace(/\bthere are\s+(a|an|one)\b/i, 'there is $1'),
    drill: { kind: 'choice', tier: 'recognize', prompt: 'Completa', sentence: '___ two supermarkets in my street.', options: ['There is', 'There are'], answer: 1 },
  },
  {
    id: 'PAST_IRREGULAR',
    title: 'Il passato dei verbi irregolari',
    rule: 'u-past-intro',
    detect: [`\\b(i|you|he|she|we|they)\\s+(${Object.keys(IRREGULAR_PAST).join('|')})\\b.*\\b(yesterday|last (night|week|year|month|summer|weekend)|ago)\\b`, `\\b(yesterday|last (night|week|year|summer|weekend))\\b.*\\b(i|you|he|she|we|they)\\s+(${Object.keys(IRREGULAR_PAST).join('|')})\\b`],
    severity: 'major',
    explain: 'Per un’azione finita nel passato (yesterday, last week…) si usa il passato. Molti verbi comuni sono irregolari: go → went, eat → ate, have → had.',
    examples: ['I went to the restaurant yesterday.', 'We ate pizza last night.', 'She had a meeting.'],
    fix: (s) => s.replace(new RegExp(`\\b(i|you|he|she|we|they)\\s+(${Object.keys(IRREGULAR_PAST).join('|')})\\b`, 'i'), (_m, subj, verb: string) => `${subj} ${IRREGULAR_PAST[verb.toLowerCase()]}`),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Ieri sono andata al cinema.', accept: ['yesterday i went to the cinema', 'i went to the cinema yesterday', 'i went to the movies yesterday', 'yesterday i went to the movies'], placeholder: 'Yesterday…' },
  },
  {
    id: 'GO_AT_PLACE',
    title: '“Go to the…”, non “go at”',
    rule: 'u-prepositions',
    detect: ['\\b(go|goes|went|going)\\s+(at|in)\\s+(the\\s+)?(restaurant|cinema|bar|office|school|gym|supermarket|station|airport|bank|beach|park|hotel)\\b', '\\b(go|goes|went|going)\\s+to\\s+(restaurant|cinema|bar|supermarket|station|airport|bank|beach|park|hotel|gym)\\b', '\\b(go|goes|went|going)\\b.*\\b(at|in)\\s+(restaurant|cinema|bar|supermarket|station|airport|bank|beach|park|gym)\\b'],
    severity: 'minor',
    explain: 'Con i verbi di movimento si usa to: go to the cinema. Con i luoghi specifici serve anche the.',
    examples: ['I go to the gym on Mondays.', 'We went to the beach.'],
    fix: (s) => s
      .replace(/\b(go|goes|went|going)\s+(?:at|in)\s+(?:the\s+)?(\w+)/i, '$1 to the $2')
      .replace(/\b(go|goes|went|going)\s+to\s+(restaurant|cinema|bar|supermarket|station|airport|bank|beach|park|hotel|gym)\b/i, '$1 to the $2')
      .replace(/\b(go|goes|went|going)\b(.*)\b(?:at|in)\s+(restaurant|cinema|bar|supermarket|station|airport|bank|beach|park|gym)\b/i, '$1$2to the $3'),
    drill: { kind: 'type', tier: 'guided', prompt: 'Traduci in inglese', sentence: 'Vado in palestra il lunedì.', accept: ['i go to the gym on monday', 'i go to the gym on mondays'], placeholder: 'I go…' },
  },
];

export const ERROR_BY_ID: Record<string, ErrorType> = Object.fromEntries(ERROR_TYPES.map((e) => [e.id, e]));


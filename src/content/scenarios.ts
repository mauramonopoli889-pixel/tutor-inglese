import type { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'bar', emoji: '☕', title: 'Ordina al bar', level: 'A0', role: 'barista',
    mission: 'Ordina da bere e da mangiare, chiedi quanto costa e paga.',
    turns: [
      { tutor: 'Hi! What can I get you?', it: 'Ciao! Cosa ti preparo?', expect: '\\b(coffee|cappuccino|tea|water|espresso|latte|juice|please|can i|i want|i would|i\'d)\\b', suggestions: ['A cappuccino, please.', 'Can I have a tea, please?'], hint: 'Di’ cosa vuoi + please.' },
      { tutor: 'Sure! Anything to eat?', it: 'Certo! Qualcosa da mangiare?', expect: '\\b(yes|no|croissant|cake|sandwich|muffin|cookie|nothing|thanks|please)\\b', suggestions: ['Yes, a croissant, please.', 'No, thank you.'], hint: 'Rispondi yes o no, poi cosa vuoi.' },
      { tutor: 'To have here or to take away?', it: 'Da consumare qui o da portare via?', expect: '\\b(here|take away|takeaway|to go)\\b', suggestions: ['To have here, please.', 'Take away, please.'], hint: 'Here = qui, take away = da portare via.' },
      { tutor: "Great. That's 4 euros 50.", it: 'Perfetto. Sono 4 euro e 50.', expect: '\\b(here|card|cash|thank|thanks|pay)\\b', suggestions: ['Here you are. Thank you!', 'Can I pay by card?'], hint: 'Here you are = ecco a lei.' },
    ],
    closing: 'Thank you, have a nice day! 😊',
  },
  {
    id: 'meet', emoji: '👋', title: 'Conosci una persona nuova', level: 'A0', role: 'una nuova amica, Emma',
    mission: 'Presentati, di’ da dove vieni e che lavoro fai, fai almeno una domanda.',
    turns: [
      { tutor: "Hi! I'm Emma. What's your name?", it: 'Ciao! Sono Emma. Come ti chiami?', expect: "\\b(my name is|i'm|i am|name)\\b", suggestions: ["Hi Emma! I'm Maura.", 'My name is Maura. Nice to meet you.'], hint: "I'm + il tuo nome." },
      { tutor: 'Nice to meet you! Where are you from?', it: 'Piacere! Di dove sei?', expect: "\\b(from|italy|italian|i'm|i am|i live)\\b", suggestions: ["I'm from Italy.", "I'm from Milan. And you?"], hint: "I'm from + città o paese." },
      { tutor: "Oh, lovely! I'm from Dublin. What do you do?", it: 'Che bello! Io sono di Dublino. Che lavoro fai?', expect: "\\b(i'm a|i am a|i'm an|i am an|i work|student|job|teacher|designer)\\b", suggestions: ["I'm a designer.", 'I work in an office.'], hint: "I'm a + lavoro, oppure I work in…" },
      { tutor: 'Interesting! Do you like your job?', it: 'Interessante! Ti piace il tuo lavoro?', expect: "\\b(yes|no|i do|i don't|like|love)\\b", suggestions: ['Yes, I do. And you?', "Not really. It's very busy."], hint: 'Yes, I do / No, I don’t.' },
    ],
    closing: 'It was really nice to meet you. See you soon!',
  },
  {
    id: 'restaurant', emoji: '🍝', title: 'Al ristorante', level: 'A1', role: 'cameriere',
    mission: 'Chiedi un tavolo, ordina un piatto e una bevanda, chiedi il conto.',
    turns: [
      { tutor: 'Good evening! Do you have a booking?', it: 'Buonasera! Avete una prenotazione?', expect: "\\b(yes|no|booking|table|for (two|one|three|four|\\d))\\b", suggestions: ['No, we don’t. A table for two, please.', 'Yes, for two people. The name is Rossi.'], hint: 'A table for two, please.' },
      { tutor: 'Perfect, follow me. Are you ready to order?', it: 'Perfetto, seguitemi. Siete pronti per ordinare?', expect: "\\b(i'd like|i would like|i'll have|can i have|please|pasta|pizza|salad|fish|steak|soup)\\b", suggestions: ["I'd like the pasta, please.", "Can I have the fish, please?"], hint: "I'd like… = vorrei…" },
      { tutor: 'And to drink?', it: 'E da bere?', expect: "\\b(water|wine|beer|coke|juice|please|nothing)\\b", suggestions: ['Still water, please.', 'A glass of red wine, please.'], hint: 'Still = naturale, sparkling = frizzante.' },
      { tutor: 'Here you are. Is everything OK?', it: 'Ecco a voi. Va tutto bene?', expect: "\\b(yes|delicious|good|great|bill|check|perfect|thank)\\b", suggestions: ["Yes, it's delicious! Can I have the bill, please?", 'Everything is great, thanks.'], hint: 'Can I have the bill, please?' },
    ],
    closing: 'Thank you! Have a lovely evening.',
  },
  {
    id: 'hotel', emoji: '🏨', title: 'Check-in in hotel', level: 'A1', role: 'receptionist',
    mission: 'Fai il check-in, chiedi della colazione e del Wi-Fi.',
    turns: [
      { tutor: 'Good afternoon! How can I help you?', it: 'Buon pomeriggio! Come posso aiutarla?', expect: "\\b(booking|reservation|check in|check-in|room|name)\\b", suggestions: ['Hi, I have a booking. My name is Bianchi.', "I'd like to check in, please."], hint: 'I have a booking = ho una prenotazione.' },
      { tutor: 'Yes, two nights. Can I see your passport, please?', it: 'Sì, due notti. Posso vedere il passaporto?', expect: "\\b(here|yes|sure|of course|passport|id)\\b", suggestions: ['Sure, here you are.', 'Yes, of course.'], hint: 'Here you are = ecco a lei.' },
      { tutor: "Thank you. You're in room 214. Any questions?", it: 'Grazie. È nella camera 214. Domande?', expect: "\\b(breakfast|wi-?fi|what time|password|is there|where)\\b", suggestions: ['What time is breakfast?', "What's the Wi-Fi password?"], hint: 'What time is…? = A che ora è…?' },
      { tutor: 'Breakfast is from 7 to 10, and the Wi-Fi password is on your key card.', it: 'La colazione è dalle 7 alle 10, la password del Wi-Fi è sulla chiave.', expect: "\\b(thank|thanks|great|perfect|ok)\\b", suggestions: ['Perfect, thank you very much!', 'Great, thanks!'], hint: 'Ringrazia.' },
    ],
    closing: 'Enjoy your stay!',
  },
  {
    id: 'airport', emoji: '✈️', title: 'In aeroporto', level: 'A1', role: 'addetta al check-in',
    mission: 'Fai il check-in del bagaglio e chiedi il gate.',
    turns: [
      { tutor: 'Hello! Where are you flying to today?', it: 'Salve! Dove vola oggi?', expect: "\\b(to|london|new york|dublin|i'm flying|i am flying|going)\\b", suggestions: ["I'm flying to London.", 'To Dublin.'], hint: "I'm flying to + città." },
      { tutor: 'Do you have any luggage to check in?', it: 'Ha bagagli da imbarcare?', expect: "\\b(yes|no|one|bag|suitcase|luggage|only)\\b", suggestions: ['Yes, one suitcase.', 'No, only hand luggage.'], hint: 'Suitcase = valigia. Hand luggage = bagaglio a mano.' },
      { tutor: 'Window or aisle seat?', it: 'Posto finestrino o corridoio?', expect: "\\b(window|aisle|please|doesn't matter)\\b", suggestions: ['Window, please.', 'Aisle, please.'], hint: 'Window = finestrino, aisle (si legge “ail”) = corridoio.' },
      { tutor: 'Here is your boarding pass.', it: 'Ecco la sua carta d’imbarco.', expect: "\\b(gate|what time|boarding|where|thank)\\b", suggestions: ['Thank you. Which gate is it?', 'What time is boarding?'], hint: 'Which gate…? = Quale gate…?' },
    ],
    closing: 'Gate B12, boarding at 9:40. Have a good flight!',
  },
  {
    id: 'shopping', emoji: '🛍', title: 'Fai shopping', level: 'A1', role: 'commessa',
    mission: 'Chiedi una taglia, prova un capo e chiedi il prezzo.',
    turns: [
      { tutor: 'Hi there! Can I help you?', it: 'Salve! Posso aiutarla?', expect: "\\b(yes|looking|i'm looking|i want|i need|just looking|jacket|shirt|shoes|dress)\\b", suggestions: ["Yes, I'm looking for a jacket.", "I'm just looking, thanks."], hint: "I'm looking for… = sto cercando…" },
      { tutor: 'What size are you?', it: 'Che taglia porta?', expect: "\\b(small|medium|large|size|s|m|l|\\d+)\\b", suggestions: ["I'm a medium.", 'Size 40, please.'], hint: "I'm a small / medium / large." },
      { tutor: 'Here you are. Do you want to try it on?', it: 'Ecco. Vuole provarlo?', expect: "\\b(yes|no|please|try|where)\\b", suggestions: ['Yes, please. Where is the fitting room?', 'No, thanks.'], hint: 'Fitting room = camerino.' },
      { tutor: 'How is it?', it: 'Come va?', expect: "\\b(how much|price|cost|good|perfect|big|small|nice|take)\\b", suggestions: ["It's perfect. How much is it?", "It's too big. Do you have a smaller size?"], hint: 'How much is it? = Quanto costa?' },
    ],
    closing: "It's 59 euros. Thank you, see you soon!",
  },
];

export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

/** “Parla con me”: open conversation prompts the offline tutor rotates through. */
export const FREE_TALK_PROMPTS: { tutor: string; it: string }[] = [
  { tutor: 'Hi! How are you today?', it: 'Ciao! Come stai oggi?' },
  { tutor: 'What did you do this morning?', it: 'Cosa hai fatto stamattina?' },
  { tutor: 'Tell me about your job or your studies.', it: 'Parlami del tuo lavoro o dei tuoi studi.' },
  { tutor: 'What do you like doing at the weekend?', it: 'Cosa ti piace fare nel weekend?' },
  { tutor: 'What is your favourite food?', it: 'Qual è il tuo cibo preferito?' },
  { tutor: 'Where do you want to travel next?', it: 'Dove vorresti viaggiare la prossima volta?' },
  { tutor: 'Why do you want to learn English?', it: 'Perché vuoi imparare l’inglese?' },
];

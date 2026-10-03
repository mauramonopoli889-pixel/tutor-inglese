import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Bar, Button, Card, Hero, Option, Row, Screen, SpeakButton, T, TopBar, TutorSays, speak } from '../components/ui';
import { PLACEMENT, type PlacementItem } from '../content/placement';
import { LEVELS, type Level } from '../content/types';
import { initialLearner, type LearningStyle, type Profile, type Skill } from '../engine/model';
import { useLearner } from '../engine/store';
import { fonts, space, useTheme } from '../theme/tokens';

type Question = { key: keyof Answers; title: string; options: string[]; multi?: boolean };
type Answers = { self: number[]; reasons: number[]; situations: number[]; minutes: number[]; difficulties: number[]; style: number[] };

const QUESTIONS: Question[] = [
  { key: 'self', title: 'Quanto pensi di conoscere l’inglese?', options: ['Parto da zero', 'Qualche parola', 'Capisco frasi semplici', 'Me la cavo', 'Abbastanza bene'] },
  { key: 'reasons', title: 'Perché vuoi impararlo?', options: ['Lavoro', 'Viaggi', 'Studio', 'Trasferirmi all’estero', 'Film e serie', 'Per me stessa/o'], multi: true },
  { key: 'situations', title: 'In quali situazioni vorresti usarlo?', options: ['Riunioni ed email', 'Ristoranti e bar', 'Aeroporto e hotel', 'Telefonate', 'Amici stranieri', 'Colloqui di lavoro'], multi: true },
  { key: 'minutes', title: 'Quanto tempo puoi dedicare ogni giorno?', options: ['5 minuti', '10 minuti', '15 minuti', '20 minuti o più'] },
  { key: 'difficulties', title: 'Cosa ti mette più in difficoltà?', options: ['Parlare', 'Capire quando parlano', 'La grammatica', 'Ricordare le parole', 'La pronuncia', 'Scrivere', 'Mi blocco per l’ansia'], multi: true },
  { key: 'style', title: 'Come preferisci imparare?', options: ['Ascoltando', 'Leggendo', 'Facendo esercizi', 'Parlando'] },
];

const MINUTES = [5, 10, 15, 20];
const STYLES: LearningStyle[] = ['listen', 'read', 'practice', 'speak'];
const GOALS: { level: Level; label: string }[] = [
  { level: 'A2', label: 'Me la cavo in viaggio e nelle situazioni di tutti i giorni' },
  { level: 'B1', label: 'Parlo di tutto in modo semplice' },
  { level: 'B2', label: 'Sostengo una conversazione senza andare nel panico' },
];

type Step = 'welcome' | 'name' | 'question' | 'start' | 'test' | 'result' | 'goal';

export default function Onboarding() {
  const c = useTheme();
  const { update } = useLearner();
  const [step, setStep] = useState<Step>('welcome');
  const [q, setQ] = useState(0);
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Answers>({ self: [], reasons: [], situations: [], minutes: [], difficulties: [], style: [] });
  const [level, setLevel] = useState<Level>('A0');
  const [skills, setSkills] = useState<Record<Skill, Level>>(initialLearner().skills);
  const [goal, setGoal] = useState<Level>('B2');

  const question = QUESTIONS[q];
  const selected = answers[question.key];

  const pick = (i: number) => {
    const cur = answers[question.key];
    const next = question.multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i];
    setAnswers({ ...answers, [question.key]: next });
  };

  const finish = (startLevel: Level, est: Record<Skill, Level>) => {
    const pickLabels = (key: keyof Answers) => answers[key].map((i) => QUESTIONS.find((x) => x.key === key)!.options[i]);
    const profile: Profile = {
      name: name.trim(),
      selfLevel: answers.self[0] ?? 0,
      reasons: pickLabels('reasons'),
      situations: pickLabels('situations'),
      minutesPerDay: MINUTES[answers.minutes[0] ?? 2],
      difficulties: pickLabels('difficulties'),
      style: STYLES[answers.style[0] ?? 3],
      startLevel,
      goal,
      createdAt: new Date().toISOString(),
    };
    update((l) => ({ ...l, profile, skills: est }));
    router.replace({ pathname: '/sessione', params: { minutes: '5', first: '1' } });
  };

  if (step === 'welcome') {
    return (
      <Screen footer={<Button label="Iniziamo" onPress={() => setStep('name')} />}>
        <Hero>
          <View style={{ height: 120 }} />
          <T v="eyebrow" color={c.sun}>Il tuo insegnante personale</T>
          <T v="display" color={c.heroText}>Da “non so parlare inglese” a una conversazione vera.</T>
        </Hero>
        <T>Ti faccio qualche domanda per conoscerti, poi capiamo insieme da dove partire. Ogni lezione sarà costruita su di te.</T>
        <T v="muted">Niente punti per entrare ogni giorno: qui conta solo quello che impari davvero.</T>
      </Screen>
    );
  }

  if (step === 'name') {
    return (
      <Screen footer={<Button label="Continua" onPress={() => setStep('question')} />}>
        <TopBar progress={5} onBack={() => setStep('welcome')} />
        <T v="h1">Come ti chiami?</T>
        <T v="muted">Il tutor ti chiamerà così. Puoi lasciarlo vuoto.</T>
        <TextInput value={name} onChangeText={setName} placeholder="Il tuo nome" placeholderTextColor={c.muted} style={{ fontFamily: fonts.bodyMedium, fontSize: 18, color: c.ink, backgroundColor: c.card, borderColor: c.line, borderWidth: 2, borderRadius: 16, padding: 14 }} />
      </Screen>
    );
  }

  if (step === 'question') {
    return (
      <Screen
        footer={
          <Button
            label="Continua"
            disabled={!selected.length}
            onPress={() => (q < QUESTIONS.length - 1 ? setQ(q + 1) : setStep('start'))}
          />
        }
      >
        <TopBar progress={((q + 2) / (QUESTIONS.length + 2)) * 100} onBack={() => (q ? setQ(q - 1) : setStep('name'))} />
        <T v="eyebrow">Domanda {q + 1} di {QUESTIONS.length}{question.multi ? ' · puoi sceglierne più di una' : ''}</T>
        <T v="h1">{question.title}</T>
        <View style={{ gap: space.s }}>
          {question.options.map((o, i) => (
            <Option key={o} label={o} selected={selected.includes(i)} onPress={() => pick(i)} />
          ))}
        </View>
      </Screen>
    );
  }

  if (step === 'start') {
    return (
      <Screen>
        <TopBar progress={95} onBack={() => setStep('question')} />
        <T v="h1">Come vuoi partire?</T>
        <T v="muted">Il test dura pochi minuti e si adatta alle tue risposte. Puoi sempre rispondere “Non lo so”: tirare a indovinare falserebbe il risultato.</T>
        <Option label="Fai il test" sub="Scopriamo il tuo livello reale" onPress={() => setStep('test')} />
        <Option
          label="Parto da zero"
          sub="Iniziamo dalle basi, senza dare nulla per scontato"
          onPress={() => {
            setLevel('A0');
            setStep('goal');
          }}
        />
      </Screen>
    );
  }

  if (step === 'test') {
    return (
      <PlacementTest
        selfLevel={answers.self[0] ?? 0}
        onBack={() => setStep('start')}
        onDone={(lvl, est) => {
          setLevel(lvl);
          setSkills(est);
          setStep('result');
        }}
      />
    );
  }

  if (step === 'result') {
    const labels: Record<Skill, string> = { vocabulary: 'Vocabolario', grammar: 'Grammatica', listening: 'Ascolto', speaking: 'Parlato', pronunciation: 'Pronuncia', writing: 'Scrittura' };
    return (
      <Screen footer={<Button label="Imposta l’obiettivo" onPress={() => setStep('goal')} />}>
        <T v="eyebrow">Il tuo livello reale</T>
        <Row>
          <T v="big">{level}</T>
          <T v="muted" style={{ flex: 1 }}>
            {level === 'A0' ? 'Partiamo dalle basi, con calma e senza dare nulla per scontato.' : 'Capisci più di quanto pensi. Ora lo trasformiamo in parlato.'}
          </T>
        </Row>
        {LEVELS.indexOf(level) > 1 ? <T v="muted">Questa prima versione dell’app copre A0 e A1: partiamo dal ripasso veloce di A1 e dalle conversazioni, mentre arrivano i contenuti dei livelli successivi.</T> : null}
        <Card>
          {(Object.keys(labels) as Skill[]).map((s) => (
            <Row key={s}>
              <T v="small" style={{ width: 100 }}>{labels[s]}</T>
              <View style={{ flex: 1 }}>
                <Bar pct={((LEVELS.indexOf(skills[s]) + 1) / LEVELS.length) * 100} height={8} />
              </View>
              <T v="muted">{skills[s]}</T>
            </Row>
          ))}
        </Card>
        <T v="muted">Parlato e pronuncia li misuriamo meglio nelle prime conversazioni.</T>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Fai la prima mini-lezione" onPress={() => finish(LEVELS.indexOf(level) > 1 ? 'A1' : level, level === 'A0' ? initialLearner().skills : skills)} />}>
      <TopBar progress={100} onBack={() => setStep('start')} />
      <T v="h1">Dove vuoi arrivare?</T>
      <View style={{ gap: space.s }}>
        {GOALS.map((g) => (
          <Option key={g.level} label={g.level} sub={g.label} selected={goal === g.level} onPress={() => setGoal(g.level)} />
        ))}
      </View>
      <Hero>
        <T v="eyebrow" color={c.sun}>Il tuo piano</T>
        <T color={c.heroText}>
          Da {level} a {goal}, {MINUTES[answers.minutes[0] ?? 2]} minuti al giorno: circa {estimateMonths(level, goal, MINUTES[answers.minutes[0] ?? 2])} mesi. Aggiorno la stima ogni settimana in base a quanto impari davvero.
        </T>
      </Hero>
    </Screen>
  );
}

/** Rough guided-learning hours per CEFR step, scaled by daily minutes. Shown as an estimate, updated later. */
function estimateMonths(from: Level, to: Level, minutes: number): number {
  const hours = [80, 100, 180, 200, 0];
  let total = 0;
  for (let i = LEVELS.indexOf(from); i < LEVELS.indexOf(to); i++) total += hours[i];
  return Math.max(1, Math.round(total / ((minutes * 30) / 60)));
}

function PlacementTest({ selfLevel, onBack, onDone }: { selfLevel: number; onBack: () => void; onDone: (level: Level, skills: Record<Skill, Level>) => void }) {
  const c = useTheme();
  // Confident learners skip the A0 items; they count as right.
  const startIdx = selfLevel >= 3 ? PLACEMENT.findIndex((p) => p.level === 'A1') : 0;
  const [i, setI] = useState(startIdx);
  const [results, setResults] = useState<{ item: PlacementItem; ok: boolean }[]>(
    PLACEMENT.slice(0, startIdx).map((item) => ({ item, ok: true })),
  );
  const [picked, setPicked] = useState<number | null>(null);
  const item = PLACEMENT[i];

  const evaluate = (all: { item: PlacementItem; ok: boolean }[]) => {
    // Highest band answered at ≥75% is "known"; the learner works on the next one.
    let known = -1;
    for (const [idx, lvl] of LEVELS.entries()) {
      const band = all.filter((r) => r.item.level === lvl);
      if (!band.length || band.filter((r) => r.ok).length / band.length < 0.75) break;
      known = idx;
    }
    const level = LEVELS[Math.min(known + 1, LEVELS.length - 1)];
    const skillOf = (s: PlacementItem['skill']): Level => {
      const rs = all.filter((r) => r.item.skill === s);
      const acc = rs.length ? rs.filter((r) => r.ok).length / rs.length : 0.5;
      return acc < 0.5 && level !== 'A0' ? LEVELS[LEVELS.indexOf(level) - 1] : level;
    };
    const below = level === 'A0' ? 'A0' : LEVELS[LEVELS.indexOf(level) - 1];
    onDone(level, { vocabulary: skillOf('vocabulary'), grammar: skillOf('grammar'), listening: skillOf('listening'), speaking: below, pronunciation: below, writing: skillOf('reading') });
  };

  const answer = (choice: number | null) => {
    const ok = choice === item.answer;
    const all = [...results, { item, ok }];
    setResults(all);
    setPicked(null);
    const missesInBand = all.filter((r) => r.item.level === item.level && !r.ok).length;
    const next = i + 1;
    if (next >= PLACEMENT.length || missesInBand >= 2) return evaluate(all);
    setI(next);
  };

  return (
    <Screen footer={<Button label="Non lo so" kind="ghost" onPress={() => answer(null)} />}>
      <TopBar progress={((i + 1) / PLACEMENT.length) * 100} onBack={onBack} />
      <T v="eyebrow">Test iniziale · domanda {results.length + 1}</T>
      <T v="h1">{item.prompt}</T>
      {item.audio ? (
        <Card onPress={() => speak(item.audio!, true)}>
          <Row>
            <SpeakButton text={item.audio} slow />
            <T>Tocca per ascoltare (puoi riascoltare)</T>
          </Row>
        </Card>
      ) : null}
      {item.sentence ? (
        <Card>
          <T v="h2">{item.sentence}</T>
        </Card>
      ) : null}
      <View style={{ gap: space.s }}>
        {item.options.map((o, idx) => (
          <Option key={o} label={o} en={/^[A-Z“"]/.test(o) && /[a-z]{3}/.test(o) && !/[àèìòù’]/.test(o)} selected={picked === idx} onPress={() => { setPicked(idx); setTimeout(() => answer(idx), 180); }} />
        ))}
      </View>
      <T v="muted" style={{ color: c.muted }}>Nessuna domanda ha un limite di tempo.</T>
    </Screen>
  );
}

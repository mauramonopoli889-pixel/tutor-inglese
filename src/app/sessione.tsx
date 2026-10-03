import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Practice, type AttemptResult } from '../components/Practice';
import { Button, Card, Hero, Row, Screen, SpeakButton, T, Tag, TopBar, TutorSays, speak } from '../components/ui';
import { ERROR_BY_ID } from '../content/errors';
import type { Exercise, Tier } from '../content/types';
import { UNITS, UNIT_BY_ID } from '../content/units';
import { VERBS } from '../content/verbs';
import { WORD_BY_ID } from '../content/vocab';
import { composeSession, explanationFor, reviewExercise, type SessionPlan } from '../engine/composer';
import { addError, addMinutes, awardMilestones, currentLevel, finishLesson, recordAttempt, recordReview, recordWordUse, startItem, unitProgress, unitScore, type Learner } from '../engine/model';
import type { ItemKey } from '../engine/srs';
import { useLearner } from '../engine/store';
import { statusLabel } from '../components/labels';
import { space, useTheme } from '../theme/tokens';

type Step =
  | { type: 'intro' }
  | { type: 'explain'; unitId: string }
  | { type: 'show'; unitId: string }
  | { type: 'exercise'; exercise: Exercise; unitId?: string; key?: ItemKey; label?: string; wordId?: string }
  | { type: 'word'; wordId: string }
  | { type: 'use'; unitId: string }
  | { type: 'summary' };

function wordExercise(wordId: string): Exercise {
  const w = WORD_BY_ID[wordId];
  const head = w.en.split(' / ')[0];
  return { kind: 'free', tier: 'free', prompt: `Usa “${head}” in una frase tua`, pattern: `\\b${head.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, model: w.example.en, placeholder: w.example.en.replace(new RegExp(head, 'i'), '…') };
}

function stepsFor(plan: SessionPlan): Step[] {
  const steps: Step[] = [{ type: 'intro' }];
  for (const b of plan.blocks) {
    if (b.kind === 'review') b.tasks.forEach((t) => steps.push({ type: 'exercise', exercise: t.exercise, key: t.key, label: t.label, unitId: t.key.startsWith('unit:') ? t.key.slice(5) : undefined }));
    if (b.kind === 'unit') {
      const unit = UNIT_BY_ID[b.unitId];
      steps.push({ type: 'explain', unitId: unit.id }, { type: 'show', unitId: unit.id });
      unit.exercises.forEach((e) => steps.push({ type: 'exercise', exercise: e, unitId: unit.id, label: unit.title }));
    }
    if (b.kind === 'words') b.wordIds.forEach((id) => steps.push({ type: 'word', wordId: id }, { type: 'exercise', exercise: wordExercise(id), wordId: id, label: 'Vocaboli' }));
    if (b.kind === 'use') steps.push({ type: 'use', unitId: b.unitId });
    if (b.kind === 'check') {
      const unit = UNIT_BY_ID[b.unitId];
      unit.exercises.filter((e) => e.tier !== 'recognize').slice(-3).forEach((e) => steps.push({ type: 'exercise', exercise: e, unitId: unit.id, label: 'Mini-verifica' }));
    }
  }
  steps.push({ type: 'summary' });
  return steps;
}

/** A periodic test mixing every skill seen so far. */
function testPlan(l: Learner): SessionPlan & { steps: Step[] } {
  const seen = UNITS.filter((u) => unitProgress(l, u.id).firstSeen);
  const units = seen.length ? seen : UNITS.slice(0, 3);
  const steps: Step[] = [{ type: 'intro' }];
  units.slice(-5).forEach((u) => {
    const pool = u.exercises.filter((e) => e.tier !== 'recognize');
    steps.push({ type: 'exercise', exercise: pool[pool.length - 1], unitId: u.id, label: `Grammatica · ${u.title}` });
  });
  Object.keys(l.cards).filter((k) => k.startsWith('word:') || k.startsWith('verb:')).slice(0, 4).forEach((k) => {
    const t = reviewExercise(l, k as ItemKey);
    if (t) steps.push({ type: 'exercise', exercise: t.exercise, key: t.key, label: t.key.startsWith('word') ? 'Vocabolario' : 'Verbi' });
  });
  if (!Object.keys(l.cards).some((k) => k.startsWith('verb:'))) {
    const v = VERBS[3];
    steps.push({ type: 'exercise', exercise: { kind: 'type', tier: 'guided', prompt: `Il passato di “${v.base}”`, accept: [v.past] }, label: 'Verbi' });
  }
  steps.push({ type: 'use', unitId: units[units.length - 1].id }, { type: 'summary' });
  return { minutes: 15, title: 'Verifica', blocks: [], outline: ['Grammatica', 'Vocabolario e verbi', 'Conversazione'], steps };
}

export default function Session() {
  const c = useTheme();
  const params = useLocalSearchParams<{ minutes?: string; mode?: string; first?: string; unit?: string; error?: string }>();
  const { learner, update } = useLearner();
  const started = useRef(Date.now());
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<{ correct: boolean; unitId?: string; label?: string }[]>([]);

  // The plan is fixed when the session opens, so answers during the session don't reshuffle it.
  const { plan, steps } = useMemo(() => {
    if (params.mode === 'test') {
      const t = testPlan(learner);
      return { plan: t as SessionPlan, steps: t.steps };
    }
    if (params.unit && UNIT_BY_ID[params.unit]) {
      const p: SessionPlan = { minutes: 10, title: UNIT_BY_ID[params.unit].title, blocks: [{ kind: 'unit', unitId: params.unit }, { kind: 'use', unitId: params.unit }], outline: ['Spiegazione ed esempi', 'Esercizi', 'Usalo in una conversazione'] };
      return { plan: p, steps: stepsFor(p) };
    }
    if (params.error && ERROR_BY_ID[params.error]) {
      const type = ERROR_BY_ID[params.error];
      const unit = UNIT_BY_ID[type.rule];
      const s: Step[] = [{ type: 'intro' }, { type: 'exercise', exercise: type.drill, key: `error:${type.id}`, label: type.title }];
      unit?.exercises.filter((e) => e.tier !== 'recognize').forEach((e) => s.push({ type: 'exercise', exercise: e, unitId: unit.id, label: type.title }));
      if (unit) s.push({ type: 'use', unitId: unit.id });
      s.push({ type: 'summary' });
      return { plan: { minutes: 5, title: type.title, blocks: [], outline: ['Esercizi mirati sul tuo errore', 'Usalo in una frase tua'] } as SessionPlan, steps: s };
    }
    if (params.mode === 'review') {
      const p = composeSession(learner, 5);
      const reviewOnly: SessionPlan = { ...p, title: 'Ripasso intelligente', blocks: p.blocks.filter((b) => b.kind === 'review') };
      return { plan: reviewOnly, steps: stepsFor(reviewOnly) };
    }
    const p = composeSession(learner, Number(params.minutes ?? 15));
    return { plan: p, steps: stepsFor(p) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = steps[index];
  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const level = currentLevel(learner);
  const interests = learner.profile?.reasons ?? [];

  const onAttempt = (s: Extract<Step, { type: 'exercise' }>, r: AttemptResult) => {
    setLog((xs) => [...xs, { correct: r.correct, unitId: s.unitId, label: s.label }]);
    update((l) => {
      let n = l;
      if (r.drillFor) return recordReview(n, `error:${r.drillFor}`, { correct: r.correct, helped: r.helped });
      if (s.key) {
        n = recordReview(n, s.key, { correct: r.correct, helped: r.helped, free: r.exercise.tier === 'free' });
        for (const e of r.errors) n = addError(n, e);
        return n;
      }
      if (s.wordId) {
        n = startItem(n, `word:${s.wordId}`);
        n = recordAttempt(n, { tier: 'free', correct: r.correct, helped: r.helped, errors: r.errors });
        return r.correct ? recordWordUse(n, s.wordId) : n;
      }
      return recordAttempt(n, { unitId: s.unitId, tier: r.exercise.tier as Tier, correct: r.correct, helped: r.helped, errors: r.errors });
    });
  };

  // Save time and per-unit outcome once, when the summary appears.
  const saved = useRef(false);
  useEffect(() => {
    if (step?.type !== 'summary' || saved.current) return;
    saved.current = true;
    const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    update((l) => {
      let n = addMinutes(l, minutes);
      const byUnit = new Map<string, boolean[]>();
      log.forEach((e) => e.unitId && byUnit.set(e.unitId, [...(byUnit.get(e.unitId) ?? []), e.correct]));
      byUnit.forEach((rs, id) => (n = finishLesson(n, id, rs.filter(Boolean).length / rs.length)));
      return awardMilestones(n);
    });
  }, [step, log, update]);

  if (!step) return null;
  const progress = (index / (steps.length - 1)) * 100;

  if (step.type === 'intro') {
    return (
      <Screen footer={<Button label="Iniziamo" onPress={next} />}>
        <TopBar title="" />
        <T v="eyebrow">{params.first ? 'La tua prima mini-lezione' : params.mode === 'test' ? 'Verifica' : `Oggi facciamo ${plan.minutes} minuti insieme`}</T>
        <T v="display">{params.first ? 'Good morning! ☀️' : plan.title}</T>
        {params.mode === 'test' ? <T>Non solo quiz: grammatica, vocaboli, scrittura e una risposta libera al tutor. Alla fine vediamo su cosa lavorare adesso.</T> : null}
        <Card>
          {plan.outline.map((o, i) => (
            <Row key={o}>
              <T v="h3" color={c.primary}>{i + 1}</T>
              <T style={{ flex: 1 }}>{o}</T>
            </Row>
          ))}
        </Card>
        {steps.length <= 2 ? <T v="muted">Niente da ripassare per ora: torna più tardi o inizia una lezione nuova.</T> : null}
      </Screen>
    );
  }

  if (step.type === 'explain') {
    const unit = UNIT_BY_ID[step.unitId];
    const { text, changed } = explanationFor(learner, unit);
    return (
      <Screen footer={<Button label="Fammi vedere degli esempi" onPress={next} />}>
        <TopBar progress={progress} />
        <T v="eyebrow">Spiega · {unit.level}</T>
        <T v="h1">{unit.title}</T>
        {changed ? <Tag label="L’ultima volta non ha funzionato: proviamo in un altro modo" tone="violet" /> : null}
        <TutorSays>{text}</TutorSays>
        {unit.compare && !changed ? (
          <Card tone="soft">
            <T v="eyebrow">Italiano e inglese</T>
            <T>{unit.compare}</T>
          </Card>
        ) : null}
        {unit.schema ? (
          <Card>
            {unit.schema.map((r) => (
              <Row key={r.en} style={{ borderBottomColor: c.line, borderBottomWidth: 1, paddingVertical: 6 }}>
                <T v="en" color={c.sky} style={{ flex: 1.2 }}>{r.en}</T>
                <T v="muted" style={{ flex: 1 }}>{r.it}</T>
              </Row>
            ))}
          </Card>
        ) : null}
      </Screen>
    );
  }

  if (step.type === 'show') {
    const unit = UNIT_BY_ID[step.unitId];
    return (
      <Screen footer={<Button label="Fammi provare" onPress={next} />}>
        <TopBar progress={progress} />
        <T v="eyebrow">Mostra</T>
        <T v="h1">Guarda come si usa</T>
        {unit.examples.map((e, i) => (
          <Card key={e.en}>
            <Row>
              <View style={{ flex: 1 }}>
                <T v="en">{e.en}</T>
                <T v="muted">{e.it}</T>
              </View>
              <SpeakButton text={e.en} slow={level === 'A0'} />
            </Row>
            {e.note ? <T v="small" color={c.violet}>{e.note}</T> : null}
            {i === 0 && learner.profile?.style === 'listen' ? <AutoSpeak text={e.en} /> : null}
          </Card>
        ))}
        {unit.why ? (
          <Card tone="violet">
            <T v="eyebrow">Perché funziona così?</T>
            <T v="small">{unit.why}</T>
          </Card>
        ) : null}
      </Screen>
    );
  }

  if (step.type === 'word') {
    const w = WORD_BY_ID[step.wordId];
    return (
      <Screen footer={<Button label="Usala in una frase" onPress={next} />}>
        <TopBar progress={progress} />
        <T v="eyebrow">Vocaboli · nuova parola</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T v="big">{w.en}</T>
            <T v="muted">{w.ipa} · “{w.say}”</T>
          </View>
          <SpeakButton text={w.en} />
        </Row>
        <Card><T v="h3">{w.it}</T></Card>
        <Card>
          <Row>
            <T v="en" style={{ flex: 1 }}>{w.example.en}</T>
            <SpeakButton text={w.example.en} />
          </Row>
          <T v="muted">{w.example.it}</T>
        </Card>
        {w.context ? <Card tone="violet"><T v="eyebrow">Contesto</T><T v="small">{w.context}</T></Card> : null}
      </Screen>
    );
  }

  if (step.type === 'use') {
    const unit = UNIT_BY_ID[step.unitId];
    const exercise: Exercise = { kind: 'free', tier: 'free', prompt: 'Usalo nella vita reale · rispondi al tutor', pattern: unit.use.pattern, model: unit.use.model, placeholder: 'Rispondi in inglese…' };
    return (
      <Screen>
        <TopBar progress={progress} />
        <TutorSays>
          <Row>
            <T v="en" style={{ flex: 1 }}>{unit.use.tutor}</T>
            <SpeakButton text={unit.use.tutor} slow={level === 'A0'} />
          </Row>
          <T v="muted">{unit.use.it}</T>
        </TutorSays>
        <Practice
          key={index}
          exercise={exercise}
          unit={unit}
          level={level}
          interests={interests}
          onAttempt={(r) => onAttempt({ type: 'exercise', exercise, unitId: unit.id }, r)}
          onDone={next}
        />
      </Screen>
    );
  }

  if (step.type === 'exercise') {
    const unit = step.unitId ? UNIT_BY_ID[step.unitId] : undefined;
    return (
      <Screen>
        <TopBar progress={progress} />
        {step.label ? <T v="eyebrow" color={c.violet}>{step.label}</T> : null}
        <Practice key={index} exercise={step.exercise} unit={unit} level={level} interests={interests} onAttempt={(r) => onAttempt(step, r)} onDone={next} />
      </Screen>
    );
  }

  return <Summary plan={plan} log={log} test={params.mode === 'test'} first={!!params.first} />;
}

function AutoSpeak({ text }: { text: string }) {
  useEffect(() => {
    const t = setTimeout(() => speak(text, true), 400);
    return () => clearTimeout(t);
  }, [text]);
  return null;
}

function Summary({ plan, log, test, first }: { plan: SessionPlan; log: { correct: boolean; unitId?: string; label?: string }[]; test: boolean; first: boolean }) {
  const c = useTheme();
  const { learner } = useLearner();
  const right = log.filter((x) => x.correct).length;
  const units = [...new Set(log.map((x) => x.unitId).filter(Boolean))] as string[];
  const weak = units.filter((id) => {
    const rs = log.filter((x) => x.unitId === id);
    return rs.filter((x) => x.correct).length / rs.length < 0.7;
  });
  const openErrors = Object.entries(learner.errors).filter(([, e]) => e.status === 'todo').map(([id]) => ERROR_BY_ID[id]?.title).filter(Boolean);
  const focus = [...weak.map((id) => UNIT_BY_ID[id].title), ...openErrors].slice(0, 3);

  return (
    <Screen footer={<Button label="Torna a Oggi" onPress={() => router.replace('/')} />}>
      <Hero>
        <T v="eyebrow" color={c.sun}>{test ? 'Verifica completata' : 'Sessione completata'}</T>
        <T v="h1" color={c.heroText}>{log.length ? `${right} su ${log.length} risposte giuste` : 'Ben fatto'}</T>
      </Hero>
      {test ? (
        <Card>
          <T v="h3">Il tuo livello attuale: {currentLevel(learner)}</T>
          {units.map((id) => (
            <Row key={id}>
              <T v="small" style={{ flex: 1 }}>{UNIT_BY_ID[id].title}</T>
              <T v="muted">{unitScore(unitProgress(learner, id))}/100</T>
            </Row>
          ))}
        </Card>
      ) : null}
      <Card>
        <T v="h3">Cosa hai fatto</T>
        {units.map((id) => (
          <T key={id}>✓ {UNIT_BY_ID[id].title}: <T v="muted">{statusLabel(unitProgress(learner, id).status)}</T></T>
        ))}
        {!units.length ? <T>✓ {plan.title}</T> : null}
      </Card>
      <Card tone="violet">
        <T v="h3">{test ? 'Su cosa lavoriamo adesso' : 'Cosa torna nei prossimi giorni'}</T>
        {focus.length ? focus.map((f) => <T key={f}>🔁 {f}</T>) : <T>Le cose di oggi tornano nel ripasso, sempre meno spesso se le ricordi.</T>}
        {test && focus.length ? <T v="muted">Il percorso dei prossimi giorni mette queste priorità per prime.</T> : null}
      </Card>
      {first ? <T v="muted">Domani il tutor partirà da qui: da quello che ricordi e da quello che hai sbagliato oggi.</T> : null}
    </Screen>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { explainAgain, type HelpMode } from '../ai/tutor';
import type { Exercise, Unit } from '../content/types';
import { checkExercise, type CheckResult, type DetectedError } from '../engine/checker';
import { fonts, space, useTheme } from '../theme/tokens';
import { Button, Card, Option, Row, SpeakButton, T, Tag, tap } from './ui';

export type AttemptResult = {
  exercise: Exercise;
  correct: boolean;
  helped: boolean;
  errors: DetectedError[];
  /** Set on the follow-up exercise after a correction ("Prova subito"). */
  drillFor?: string;
};

type Props = {
  exercise: Exercise;
  unit?: Unit;
  level?: string;
  interests?: string[];
  onAttempt: (r: AttemptResult) => void;
  onDone: () => void;
};

/**
 * One exercise, then (if wrong) the full correction: what you wrote, the right form, why,
 * and an immediate exercise on the same mistake.
 */
export function Practice({ exercise, unit, level = 'A1', interests = [], onAttempt, onDone }: Props) {
  const [phase, setPhase] = useState<'main' | 'drill'>('main');
  const [mainResult, setMainResult] = useState<{ result: CheckResult; answer: string } | null>(null);

  useEffect(() => {
    setPhase('main');
    setMainResult(null);
  }, [exercise]);

  const errorType = mainResult?.result.errors[0]?.type;
  const drill: Exercise | null = useMemo(() => {
    if (!mainResult || mainResult.result.correct) return null;
    if (errorType && errorType.drill !== exercise) return errorType.drill;
    // No specific error recognised: practise the same rule with a different sentence.
    return unit?.exercises.find((e) => e !== exercise && e.kind === 'type') ?? null;
  }, [mainResult, errorType, exercise, unit]);

  if (phase === 'drill' && drill) {
    return (
      <View style={{ gap: space.m }}>
        <Tag label="Prova subito sullo stesso errore" tone="violet" />
        <Single
          key="drill"
          exercise={drill}
          unit={unit}
          level={level}
          interests={interests}
          onChecked={(r, helped) => onAttempt({ exercise: drill, correct: r.correct, helped, errors: r.errors, drillFor: errorType?.id })}
          onContinue={onDone}
          allowCorrection={false}
        />
      </View>
    );
  }

  return (
    <Single
      key="main"
      exercise={exercise}
      unit={unit}
      level={level}
      interests={interests}
      onChecked={(r, helped, answer) => {
        setMainResult({ result: r, answer });
        onAttempt({ exercise, correct: r.correct, helped, errors: r.errors });
      }}
      onContinue={() => (drill ? setPhase('drill') : onDone())}
      continueLabel={drill ? 'Prova subito' : 'Avanti'}
      allowCorrection
    />
  );
}

function Single({
  exercise, unit, level, interests, onChecked, onContinue, continueLabel = 'Avanti', allowCorrection,
}: {
  exercise: Exercise;
  unit?: Unit;
  level: string;
  interests: string[];
  onChecked: (r: CheckResult, helped: boolean, answer: string) => void;
  onContinue: () => void;
  continueLabel?: string;
  allowCorrection: boolean;
}) {
  const c = useTheme();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [helped, setHelped] = useState(false);
  const [help, setHelp] = useState<{ title: string; text: string; exampleEn?: string; exampleIt?: string } | null>(null);
  const [helpLoading, setHelpLoading] = useState(false);

  const check = (given: string | number) => {
    const r = checkExercise(exercise, given);
    const shown = typeof given === 'number' && exercise.kind === 'choice' ? exercise.options[given] : String(given);
    setResult(r);
    setAnswer(shown);
    onChecked(r, helped, shown);
  };

  const retry = () => {
    setText('');
    setPicked(null);
    setOrder([]);
    setResult(null);
    setHelped(true);
  };

  const askHelp = async (mode: HelpMode, title: string) => {
    if (!unit) return;
    setHelped(true);
    setHelpLoading(true);
    setHelp({ title, text: '…' });
    const res = await explainAgain(unit, mode, level, interests);
    setHelp({ title, ...res });
    setHelpLoading(false);
  };

  const ready = exercise.kind === 'order' ? order.length === exercise.words.length : exercise.kind === 'choice' ? false : text.trim().length > 0;

  return (
    <View style={{ gap: space.m }}>
      <T v="eyebrow">{exercise.prompt}</T>
      {exercise.kind !== 'order' && 'sentence' in exercise && exercise.sentence ? (
        <Card>
          <Row>
            <T v="h2" style={{ flex: 1 }}>{exercise.sentence}</T>
            {/[a-z]/i.test(exercise.sentence) && exercise.kind === 'choice' ? <SpeakButton text={exercise.sentence.replace('___', '…')} /> : null}
          </Row>
        </Card>
      ) : null}

      {exercise.kind === 'choice' ? (
        <View style={{ gap: space.s }}>
          {exercise.options.map((o, i) => (
            <Option
              key={o}
              en={/[a-z]{2}/i.test(o) && !/[àèéìòù’]/.test(o)}
              label={o}
              selected={picked === i}
              state={result ? (i === exercise.answer ? 'right' : picked === i ? 'wrong' : undefined) : undefined}
              onPress={() => {
                if (result) return;
                setPicked(i);
                check(i);
              }}
            />
          ))}
        </View>
      ) : null}

      {exercise.kind === 'type' || exercise.kind === 'free' ? (
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!result}
          placeholder={exercise.placeholder ?? 'Scrivi qui…'}
          placeholderTextColor={c.muted}
          autoCapitalize="sentences"
          autoCorrect={false}
          multiline={exercise.kind === 'free'}
          onSubmitEditing={() => ready && !result && check(text)}
          style={{ fontFamily: fonts.bodyMedium, fontSize: 17, color: c.ink, backgroundColor: c.card, borderColor: result ? (result.correct ? c.mint : c.red) : c.line, borderWidth: 2, borderRadius: 16, padding: 14, minHeight: exercise.kind === 'free' ? 90 : undefined, textAlignVertical: 'top' }}
        />
      ) : null}

      {exercise.kind === 'order' ? (
        <View style={{ gap: space.m }}>
          <View style={{ minHeight: 56, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: result ? (result.correct ? c.mint : c.red) : c.line, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {order.map((i) => (
              <Chip key={`o${i}`} label={exercise.words[i]} onPress={() => !result && setOrder(order.filter((x) => x !== i))} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {exercise.words.map((w, i) => (order.includes(i) ? null : <Chip key={`w${i}`} label={w} onPress={() => !result && setOrder([...order, i])} />))}
          </View>
        </View>
      ) : null}

      {unit && !result ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <HelpChip label="Non ho capito" onPress={() => askHelp('simpler', 'Proviamo in un altro modo')} />
          <HelpChip label="Fammi un esempio" onPress={() => askHelp('example', 'Un esempio')} />
          <HelpChip label="Spiegamelo in italiano" onPress={() => askHelp('italian', 'In italiano')} />
          <HelpChip label="Fammi riprovare" onPress={retry} />
        </View>
      ) : null}

      {!result && exercise.kind !== 'choice' ? (
        <Button label="Controlla" disabled={!ready} onPress={() => check(exercise.kind === 'order' ? order.map((i) => exercise.words[i]).join(' ') : text)} />
      ) : null}

      {result ? (
        result.correct ? (
          <Card style={{ borderColor: c.mint, borderWidth: 2 }}>
            <T v="h3" color={c.mint}>{result.nearMiss ? 'Giusto, attenzione a un piccolo errore di battitura' : 'Esatto!'}</T>
            {result.nearMiss || exercise.kind === 'free' ? <T v="en">{result.expected}</T> : null}
            {exercise.kind === 'free' ? <T v="muted">Un modo possibile di dirlo. La tua frase va benissimo.</T> : null}
          </Card>
        ) : allowCorrection ? (
          <Correction answer={answer} result={result} unit={unit} exercise={exercise} />
        ) : (
          <Card style={{ borderColor: c.amber, borderWidth: 2 }}>
            <T v="h3">Quasi. La forma giusta:</T>
            <T v="en" color={c.mint}>{result.expected}</T>
            <T v="muted">Lo ripassiamo nei prossimi giorni.</T>
          </Card>
        )
      ) : null}

      {result ? <Button label={result.correct ? 'Avanti' : continueLabel} onPress={onContinue} kind={result.correct ? 'primary' : 'dark'} /> : null}

      <Modal transparent visible={!!help} animationType="slide" onRequestClose={() => setHelp(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(18,17,32,0.45)' }} onPress={() => setHelp(null)} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl, paddingBottom: 36, gap: space.m }}>
          <T v="h2">{help?.title}</T>
          <T>{helpLoading ? 'Il tutor sta preparando una spiegazione…' : help?.text}</T>
          {help?.exampleEn ? (
            <Card tone="violet">
              <Row>
                <T v="en" style={{ flex: 1 }}>{help.exampleEn}</T>
                <SpeakButton text={help.exampleEn} />
              </Row>
              {help.exampleIt ? <T v="muted">{help.exampleIt}</T> : null}
            </Card>
          ) : null}
          <Button label="Ho capito, riprovo" onPress={() => setHelp(null)} />
        </View>
      </Modal>
    </View>
  );
}

/** "Hai scritto / La forma corretta è / Perché?" */
function Correction({ answer, result, unit, exercise }: { answer: string; result: CheckResult; unit?: Unit; exercise?: Exercise }) {
  const c = useTheme();
  const err = result.errors[0];
  return (
    <Card style={{ borderColor: c.red, borderWidth: 2, gap: space.m }}>
      <Tag label={err?.type.severity === 'major' ? 'Errore importante' : 'Quasi!'} tone={err?.type.severity === 'major' ? 'red' : 'amber'} />
      <View>
        <T v="muted">Hai scritto</T>
        <T v="en" color={c.red} style={{ textDecorationLine: 'line-through' }}>{answer || '—'}</T>
      </View>
      <View>
        <T v="muted">La forma corretta è</T>
        <Row>
          <T v="en" color={c.mint} style={{ flex: 1 }}>{err?.fixed ?? result.expected}</T>
          <SpeakButton text={err?.fixed ?? result.expected} />
        </Row>
      </View>
      <View style={{ gap: 4 }}>
        <T v="h3">Perché?</T>
        <T>{err ? err.type.explain : (exercise && 'why' in exercise ? exercise.why : undefined) ?? unit?.explain ?? 'Confronta la tua risposta con quella corretta: lo ripassiamo presto.'}</T>
        {err ? err.type.examples.map((e) => <T key={e} v="en">{e}</T>) : null}
      </View>
    </Card>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderBottomWidth: 3, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
      <T v="en">{label}</T>
    </Pressable>
  );
}

function HelpChip({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} style={{ backgroundColor: c.violetSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }}>
      <T v="small" color={c.violet} style={{ fontFamily: fonts.bodyMedium }}>{label}</T>
    </Pressable>
  );
}

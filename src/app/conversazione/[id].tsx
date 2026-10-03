import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aiAvailable, converse, opening, suggestionsFor, type ChatTurn, type Correction } from '../../ai/tutor';
import { Button, Card, Hero, Row, Screen, SpeakButton, T, Tag, TopBar, speak } from '../../components/ui';
import { SCENARIO_BY_ID } from '../../content/scenarios';
import { WORDS } from '../../content/vocab';
import type { DetectedError } from '../../engine/checker';
import { addError, currentLevel, markCorrectUse, recordConversation, recordWordUse } from '../../engine/model';
import { learnerBrief, useLearner } from '../../engine/store';
import { fonts, radius, space, useTheme } from '../../theme/tokens';

const FREE_TALK_TURNS = 8;

type Said = { text: string; grade: 'ok' | 'minor' | 'major'; errors: DetectedError[] };

export default function Conversation() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scenario = id && id !== 'libera' ? SCENARIO_BY_ID[id] ?? null : null;
  const { learner, update } = useLearner();
  const level = currentLevel(learner);

  const [history, setHistory] = useState<ChatTurn[]>(() => [opening(scenario)]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(true);
  const [showIt, setShowIt] = useState<Record<number, boolean>>({});
  const [hint, setHint] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [said, setSaid] = useState<Said[]>([]);
  const [finished, setFinished] = useState<null | { seconds: number }>(null);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState(false);
  const started = useRef(Date.now());
  const scroll = useRef<ScrollView>(null);

  const lastTutor = [...history].reverse().find((t) => t.role === 'tutor');
  useEffect(() => {
    if (voice && lastTutor) speak(lastTutor.text, level === 'A0');
    // Speak each new tutor line once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);

  const suggestions = useMemo(() => suggestionsFor(scenario, history), [scenario, history]);
  const learnerTurns = history.filter((t) => t.role === 'learner').length;

  async function send(raw: string) {
    const msg = raw.trim();
    if (!msg || busy || finished) return;
    setText('');
    setHint(false);
    const next: ChatTurn[] = [...history, { role: 'learner', text: msg }];
    setHistory(next);
    setBusy(true);
    const r = await converse({ scenario, history: next, level, brief: learnerBrief(learner), learnerName: learner.profile?.name });
    setBusy(false);
    setSaid((s) => [...s, { text: msg, grade: r.local.grade, errors: r.local.errors }]);
    // Corrections are collected silently and shown only at the end, so the conversation is never interrupted.
    if (r.corrections.length) setCorrections((cs) => [...cs, ...r.corrections]);
    setHistory((h) => [...h, { role: 'tutor', text: r.reply, it: r.it }]);
    if (r.missionComplete || (!scenario && learnerTurns + 1 >= FREE_TALK_TURNS)) finish();
  }

  function finish() {
    const seconds = Math.round((Date.now() - started.current) / 1000);
    setFinished({ seconds });
  }

  // Persist once the report is shown.
  useEffect(() => {
    if (!finished) return;
    const ok = said.filter((s) => s.grade === 'ok');
    update((l) => {
      let next = l;
      for (const s of said) for (const e of s.errors) next = addError(next, e);
      for (const s of ok) {
        for (const w of WORDS) {
          const head = w.en.split(' / ')[0].toLowerCase();
          if (next.cards[`word:${w.id}`] && new RegExp(`\\b${head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s.text)) next = recordWordUse(next, w.id);
        }
      }
      // Rules the learner used correctly in free speech count toward fixing them.
      const problem = new Set(said.flatMap((s) => s.errors.map((e) => e.type.id)));
      for (const errId of Object.keys(next.errors)) if (!problem.has(errId) && ok.length >= 2) next = markCorrectUse(next, errId);
      const sample = said.map((s) => s.text).join(' · ').slice(0, 300);
      return recordConversation(next, { seconds: finished.seconds, ok: ok.length, total: said.length, sample: sample || undefined });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function listen() {
    const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
    const Rec = (w?.SpeechRecognition ?? w?.webkitSpeechRecognition) as (new () => SpeechRec) | undefined;
    if (Platform.OS !== 'web' || !Rec) {
      setMicNote(true);
      return;
    }
    const rec = new Rec();
    rec.lang = 'en-GB';
    rec.interimResults = false;
    rec.onresult = (e) => setText(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }
  if (finished) return <Report scenarioTitle={scenario?.title ?? 'Parla con me'} seconds={finished.seconds} said={said} corrections={corrections} again={() => router.replace({ pathname: '/conversazione/[id]', params: { id: id ?? 'libera' } })} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + space.m, paddingHorizontal: space.xl, gap: space.s }}>
        <TopBar title={scenario ? `${scenario.emoji} ${scenario.title}` : 'Parla con me'} />
        {scenario ? (
          <Card tone="violet" style={{ padding: space.m }}>
            <T v="small"><T v="small" style={{ fontFamily: fonts.bodyBold }}>Missione: </T>{scenario.mission}</T>
            <T v="muted">Il tutor fa il {scenario.role}. Le correzioni arrivano alla fine.</T>
          </Card>
        ) : (
          <T v="muted">Rispondi come vuoi, anche con frasi semplici. Le correzioni arrivano alla fine.</T>
        )}
      </View>

      <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: space.xl, gap: space.m }} keyboardShouldPersistTaps="handled">
        {history.map((t, i) =>
          t.role === 'tutor' ? (
            <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '85%', gap: 4 }}>
              <View style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 18, borderTopLeftRadius: 4, padding: space.m, gap: 6 }}>
                <T v="en">{t.text}</T>
                {showIt[i] && t.it ? <T v="muted">{t.it}</T> : null}
              </View>
              <Row style={{ gap: 8 }}>
                <SpeakButton text={t.text} slow />
                {t.it ? (
                  <Pressable accessibilityRole="button" onPress={() => setShowIt((s) => ({ ...s, [i]: !s[i] }))}>
                    <T v="small" color={c.violet}>{showIt[i] ? 'Nascondi traduzione' : 'Traduci'}</T>
                  </Pressable>
                ) : null}
              </Row>
            </View>
          ) : (
            <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.primary, borderRadius: 18, borderTopRightRadius: 4, padding: space.m }}>
              <T v="en" color={c.onPrimary}>{t.text}</T>
            </View>
          ),
        )}
        {busy ? <ActivityIndicator color={c.primary} style={{ alignSelf: 'flex-start' }} /> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.s, paddingBottom: Math.max(insets.bottom, space.l), gap: space.s, borderTopWidth: 1, borderTopColor: c.line }}>
        {hint && suggestions.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((s) => (
              <Pressable key={s} accessibilityRole="button" onPress={() => setText(s)} style={{ backgroundColor: c.violetSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12 }}>
                <T v="small" color={c.violet}>{s}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
        {micNote ? <T v="muted">Il riconoscimento vocale su telefono arriva nella prossima versione. Per ora scrivi la risposta (puoi usare il microfono della tastiera).</T> : null}
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          {suggestions.length ? <Chip label={hint ? 'Nascondi aiuti' : '💡 Cosa posso dire?'} onPress={() => setHint((h) => !h)} /> : null}
          <Chip label={voice ? '🔊 Voce attiva' : '🔇 Voce spenta'} onPress={() => setVoice((v) => !v)} />
          {learnerTurns > 0 ? <Chip label="Termina" onPress={finish} /> : null}
        </Row>
        <Row style={{ gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Parla" onPress={listen} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: listening ? c.red : c.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
            <T>🎙</T>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Scrivi in inglese…"
            placeholderTextColor={c.muted}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            autoCapitalize="sentences"
            style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, borderWidth: 2, borderColor: c.line, paddingHorizontal: 16, color: c.ink, fontFamily: fonts.body, fontSize: 16, backgroundColor: c.card }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Invia" disabled={!text.trim() || busy} onPress={() => send(text)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, opacity: !text.trim() || busy ? 0.4 : 1, alignItems: 'center', justifyContent: 'center' }}>
            <T color={c.onPrimary}>➤</T>
          </Pressable>
        </Row>
        {!aiAvailable && !scenario ? <T v="muted">Modalità offline: il tutor fa domande semplici a turno.</T> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
};

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.card, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 }}>
      <T v="small">{label}</T>
    </Pressable>
  );
}

function Report({ scenarioTitle, seconds, said, corrections, again }: { scenarioTitle: string; seconds: number; said: Said[]; corrections: Correction[]; again: () => void }) {
  const c = useTheme();
  const ok = said.filter((s) => s.grade === 'ok');
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const major = corrections.filter((x) => x.grade === 'major');
  const minor = corrections.filter((x) => x.grade === 'minor');

  return (
    <Screen footer={<><Button label="Rifai la conversazione" onPress={again} /><Button kind="ghost" label="Torna a Oggi" onPress={() => router.replace('/')} /></>}>
      <T v="eyebrow">{scenarioTitle}</T>
      <T v="h1">Com’è andata</T>
      <Hero>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T v="big" color={c.heroText}>{mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`}</T>
            <T v="small" color={c.heroText}>di conversazione in inglese</T>
          </View>
          <View>
            <T v="big" color={c.sun}>{ok.length}/{said.length}</T>
            <T v="small" color={c.heroText}>frasi senza errori</T>
          </View>
        </Row>
      </Hero>

      {major.length ? (
        <Card>
          <T v="h3">🔴 Errori importanti</T>
          <T v="muted">Cambiano il significato o suonano strani a un madrelingua.</T>
          {major.map((x, i) => <Fix key={`M${i}`} x={x} />)}
        </Card>
      ) : null}
      {minor.length ? (
        <Card>
          <T v="h3">🟡 Si può dire meglio</T>
          {minor.map((x, i) => <Fix key={`m${i}`} x={x} />)}
        </Card>
      ) : null}
      {ok.length ? (
        <Card>
          <T v="h3">🟢 Frasi riuscite bene</T>
          {ok.slice(0, 5).map((s, i) => <T key={i} v="en">“{s.text}”</T>)}
        </Card>
      ) : null}
      {!said.length ? <T v="muted">Non hai scritto nessuna frase. Riprova quando vuoi: anche due parole valgono.</T> : null}
      {corrections.length ? <Tag label="Questi errori sono ora in “I miei errori” e torneranno nel ripasso" tone="violet" /> : null}
    </Screen>
  );
}

function Fix({ x }: { x: Correction }) {
  const c = useTheme();
  return (
    <View style={{ gap: 2, paddingVertical: 6 }}>
      <T v="small" color={c.red}>✕ {x.said}</T>
      <T v="en" color={c.mint}>✓ {x.better}</T>
      <T v="muted">{x.why}</T>
    </View>
  );
}

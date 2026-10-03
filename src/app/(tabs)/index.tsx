import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Bar, Button, Card, CefrPath, Hero, Option, Row, Screen, T, TutorSays } from '../../components/ui';
import { LEVELS } from '../../content/types';
import { TIME_OPTIONS } from '../../engine/composer';
import { currentLevel, dueItems, levelProgress, realProgress, tutorMessage, weeklyGoalPct, wordsKnown } from '../../engine/model';
import { useLearner } from '../../engine/store';
import { space, useTheme } from '../../theme/tokens';

export default function Today() {
  const c = useTheme();
  const { learner } = useLearner();
  const [picking, setPicking] = useState(false);
  const level = currentLevel(learner);
  const goal = learner.profile?.goal ?? 'B2';
  const pct = levelProgress(learner, level);
  const due = dueItems(learner).length;
  const progress = realProgress(learner);
  const name = learner.profile?.name;

  const actions: { label: string; emoji: string; tone: 'soft' | 'violet'; go: () => void }[] = [
    { label: 'Continua la lezione', emoji: '📘', tone: 'soft', go: () => setPicking(true) },
    { label: 'Parla con AI', emoji: '💬', tone: 'violet', go: () => router.push('/parla') },
    { label: due ? `Ripassa · ${due}` : 'Ripassa', emoji: '🔁', tone: 'soft', go: () => router.push({ pathname: '/sessione', params: { mode: 'review' } }) },
    { label: 'Vocaboli', emoji: '🧠', tone: 'violet', go: () => router.push('/vocaboli') },
    { label: 'Verbi', emoji: '⚡', tone: 'soft', go: () => router.push('/verbi') },
    { label: 'I miei errori', emoji: '🎯', tone: 'violet', go: () => router.push('/errori') },
  ];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Hi{name ? ` ${name}` : ''}! Ready? 👋</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Il tuo tutor" onPress={() => router.push('/profilo')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.violet, alignItems: 'center', justifyContent: 'center' }}>
          <T color="#fff">{(name || 'Tu').charAt(0).toUpperCase()}</T>
        </Pressable>
      </Row>

      <TutorSays>{tutorMessage(learner)}</TutorSays>

      <Hero>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small" color={c.heroText}>Livello attuale <T v="h3" color={c.heroText}>{level}</T></T>
          <T v="small" color={c.heroText}>Obiettivo <T v="h3" color={c.sun}>{goal}</T></T>
        </Row>
        <CefrPath current={level} goal={goal} done={(l) => LEVELS.indexOf(l) < LEVELS.indexOf(level)} />
        <Bar pct={pct} color={c.sun} track="rgba(255,255,255,0.15)" />
        <T v="small" color={c.heroText} style={{ opacity: 0.75 }}>{level} padroneggiato al {pct}% · misurato su quello che sai usare</T>
        <View style={{ height: space.s }} />
        <Button label="Continua il tuo percorso" onPress={() => setPicking(true)} />
      </Hero>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat value={`🔥 ${learner.stats.streak}`} label={learner.stats.streak === 1 ? 'giorno di streak' : 'giorni di streak'} />
        <Stat value={`🧠 ${wordsKnown(learner)}`} label="parole che sai usare" />
        <Stat value={`💬 ${Math.round(learner.stats.talkSeconds / 60)}`} label="minuti di conversazione" />
        <Stat value={`🎯 ${weeklyGoalPct(learner)}%`} label="obiettivo settimanale" />
      </View>

      {progress ? (
        <Card tone="violet">
          <T>{progress}</T>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {actions.map((a) => (
          <Pressable key={a.label} accessibilityRole="button" onPress={a.go} style={({ pressed }) => ({ width: '31%', flexGrow: 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            <View style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: a.tone === 'soft' ? c.soft : c.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
                <T>{a.emoji}</T>
              </View>
              <T v="small" center>{a.label}</T>
            </View>
          </Pressable>
        ))}
      </View>
      <Button label="Fai un test" kind="ghost" onPress={() => router.push({ pathname: '/sessione', params: { mode: 'test' } })} />

      <Modal transparent visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(18,17,32,0.45)' }} onPress={() => setPicking(false)} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl, paddingBottom: 36, gap: space.s }}>
          <T v="h2">Quanto tempo hai oggi?</T>
          <T v="muted">Creo la lezione in base al tempo che hai.</T>
          {TIME_OPTIONS.map((o) => (
            <Option
              key={o.minutes}
              label={o.label}
              sub={o.detail}
              selected={o.minutes === (learner.profile?.minutesPerDay ?? 15)}
              onPress={() => {
                setPicking(false);
                router.push({ pathname: '/sessione', params: { minutes: String(o.minutes) } });
              }}
            />
          ))}
        </View>
      </Modal>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const c = useTheme();
  return (
    <View style={{ width: '47%', flexGrow: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
      <T v="h2">{value}</T>
      <T v="muted">{label}</T>
    </View>
  );
}

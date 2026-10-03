import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Row, Screen, T, Tag, TopBar } from '../components/ui';
import { UNIT_BY_ID } from '../content/units';
import { activeErrors, currentLevel, unitProgress, wordsKnown } from '../engine/model';
import { useLearner } from '../engine/store';
import { useTheme } from '../theme/tokens';

const STYLE_NAMES = { listen: 'ascoltando', read: 'leggendo', practice: 'facendo esercizi', speak: 'parlando' } as const;

export default function Profile() {
  const c = useTheme();
  const { learner, reset } = useLearner();
  const [confirm, setConfirm] = useState(false);
  const p = learner.profile;
  const errors = activeErrors(learner).filter((e) => e.rec.status !== 'acquired').slice(0, 5);
  const learning = Object.keys(learner.units).filter((id) => ['learning', 'consolidating'].includes(unitProgress(learner, id).status) && UNIT_BY_ID[id]);
  const lapsed = Object.keys(learner.units).filter((id) => learner.units[id].lapsed && UNIT_BY_ID[id]);

  const facts: [string, string][] = p
    ? [
        ['Ti chiami', p.name || 'non me l’hai detto'],
        ['Vuoi l’inglese per', p.reasons.join(', ') || 'uso generale'],
        ['Situazioni', p.situations.join(', ') || 'vita di tutti i giorni'],
        ['Ti mette in difficoltà', p.difficulties.join(', ') || 'niente in particolare'],
        ['Preferisci imparare', STYLE_NAMES[p.style]],
        ['Tempo al giorno', `${p.minutesPerDay} minuti`],
        ['Livello', `${currentLevel(learner)} → obiettivo ${p.goal}`],
      ]
    : [];

  return (
    <Screen>
      <TopBar title="Il tuo tutor" />
      <T v="h1">Cosa so di te</T>
      <T v="muted">Uso queste informazioni per scegliere esempi, ripassi e conversazioni. Restano sul tuo telefono.</T>

      <Card>
        {facts.map(([k, v]) => (
          <View key={k} style={{ paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <T v="muted">{k}</T>
            <T>{v}</T>
          </View>
        ))}
      </Card>

      <Card>
        <T v="h3">Cosa stai imparando</T>
        {learning.length ? learning.map((id) => <T key={id}>• {UNIT_BY_ID[id].title}</T>) : <T v="muted">Ancora niente in corso.</T>}
        {lapsed.length ? <T v="small" color={c.amber}>Da rinforzare: {lapsed.map((id) => UNIT_BY_ID[id].title).join(', ')}</T> : null}
        <T v="muted">{wordsKnown(learner)} parole che sai usare.</T>
      </Card>

      <Card>
        <T v="h3">Errori che tengo d’occhio</T>
        {errors.length ? errors.map((e) => <T key={e.id}>• {e.type.title}</T>) : <T v="muted">Nessuno per ora.</T>}
      </Card>

      {learner.milestones.length ? (
        <Card tone="violet">
          <T v="h3">Traguardi reali</T>
          {learner.milestones.map((m) => (
            <Row key={m.id} style={{ justifyContent: 'space-between' }}>
              <T v="small" style={{ flex: 1 }}>🏁 {m.title}</T>
              <T v="muted">{new Date(m.date).toLocaleDateString('it-IT')}</T>
            </Row>
          ))}
        </Card>
      ) : null}

      {learner.journal.length ? (
        <Card>
          <T v="h3">Il tuo inglese, giorno per giorno</T>
          <T v="muted">Frasi che hai scritto nelle conversazioni. Tra qualche settimana rileggile.</T>
          {learner.journal.slice(0, 5).map((j) => (
            <View key={j.date} style={{ gap: 2 }}>
              <Tag label={new Date(j.date).toLocaleDateString('it-IT')} tone="muted" />
              <T v="small">{j.text}</T>
            </View>
          ))}
        </Card>
      ) : null}

      {confirm ? (
        <Card style={{ borderColor: c.red }}>
          <T>Cancello tutti i progressi e ricominci dall’inizio. Non si può annullare.</T>
          <Button kind="dark" label="Sì, ricomincia da capo" onPress={async () => { await reset(); router.replace('/onboarding'); }} />
          <Button kind="ghost" label="Annulla" onPress={() => setConfirm(false)} />
        </Card>
      ) : (
        <Button kind="ghost" label="Ricomincia da capo" onPress={() => setConfirm(true)} />
      )}
    </Screen>
  );
}

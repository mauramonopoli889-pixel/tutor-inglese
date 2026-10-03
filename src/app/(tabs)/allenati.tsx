import { router } from 'expo-router';
import { View } from 'react-native';
import { statusLabel } from '../../components/labels';
import { Card, Row, Screen, T, Tag } from '../../components/ui';
import { UNITS } from '../../content/units';
import { activeErrors, dueItems, unitProgress, verbsKnown, wordsKnown } from '../../engine/model';
import { useLearner } from '../../engine/store';
import { useTheme } from '../../theme/tokens';

export default function Train() {
  const c = useTheme();
  const { learner } = useLearner();
  const due = dueItems(learner).length;
  const open = activeErrors(learner).filter((e) => e.rec.status !== 'acquired').length;

  const tiles = [
    { emoji: '🔁', title: 'Ripasso intelligente', sub: due ? `${due} cose da ripassare adesso` : 'Niente in scadenza: torna domani', go: () => router.push({ pathname: '/sessione', params: { mode: 'review' } }) },
    { emoji: '🧠', title: 'Vocaboli', sub: `${wordsKnown(learner)} parole che sai usare`, go: () => router.push('/vocaboli') },
    { emoji: '⚡', title: 'Verbi', sub: `${verbsKnown(learner)} verbi consolidati`, go: () => router.push('/verbi') },
    { emoji: '🎯', title: 'I miei errori', sub: open ? `${open} da sistemare` : 'Nessun errore aperto', go: () => router.push('/errori') },
    { emoji: '📝', title: 'Test', sub: 'Controlla cosa ricordi davvero', go: () => router.push({ pathname: '/sessione', params: { mode: 'test' } }) },
  ];

  return (
    <Screen>
      <T v="h1">Allenati</T>
      <View style={{ gap: 10 }}>
        {tiles.map((t) => (
          <Card key={t.title} onPress={t.go}>
            <Row>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
                <T v="h2">{t.emoji}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">{t.title}</T>
                <T v="muted">{t.sub}</T>
              </View>
              <T v="h3" color={c.muted}>›</T>
            </Row>
          </Card>
        ))}
      </View>

      <T v="h2">Grammatica spiegata semplice</T>
      <T v="muted">Puoi riaprire qualsiasi argomento: spiegazione, esempi ed esercizi.</T>
      {UNITS.map((u) => (
        <Card key={u.id} onPress={() => router.push({ pathname: '/sessione', params: { unit: u.id } })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T v="h3">{u.title}</T>
              <T v="muted">{u.level} · {statusLabel(unitProgress(learner, u.id).status)}</T>
            </View>
            <Tag label={u.level} tone="violet" />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

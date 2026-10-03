import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Hero, Row, Screen, T, Tag } from '../../components/ui';
import { aiAvailable } from '../../ai/tutor';
import { LEVELS } from '../../content/types';
import { SCENARIOS } from '../../content/scenarios';
import { currentLevel } from '../../engine/model';
import { useLearner } from '../../engine/store';
import { useTheme } from '../../theme/tokens';

export default function Talk() {
  const c = useTheme();
  const { learner } = useLearner();
  const level = currentLevel(learner);
  const minutes = Math.round(learner.stats.talkSeconds / 60);

  return (
    <Screen>
      <T v="h1">Parla</T>
      <T v="muted">Parli come in una conversazione vera. Il tutor non ti interrompe: le correzioni arrivano alla fine.</T>

      <Card onPress={() => router.push('/conversazione/libera')} style={{ backgroundColor: c.primary, borderWidth: 0 }}>
        <T v="eyebrow" color={c.onPrimary}>Parla con me</T>
        <T v="h2" color={c.onPrimary}>Una chiacchierata libera, al tuo livello</T>
        <T v="small" color={c.onPrimary}>Ti chiede della tua giornata, del lavoro, dei tuoi gusti. Sbagliare va bene.</T>
      </Card>

      <Hero>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T v="big" color={c.heroText}>{minutes}</T>
            <T v="small" color={c.heroText}>minuti di inglese parlato finora</T>
          </View>
          <View>
            <T v="big" color={c.sun}>{learner.stats.conversations}</T>
            <T v="small" color={c.heroText}>conversazioni</T>
          </View>
        </Row>
      </Hero>

      <T v="h2">Situazioni reali</T>
      {SCENARIOS.map((s) => {
        const above = LEVELS.indexOf(s.level) > LEVELS.indexOf(level);
        return (
          <Card key={s.id} onPress={() => router.push({ pathname: '/conversazione/[id]', params: { id: s.id } })}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <T v="h2">{s.emoji}</T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="h3">{s.title}</T>
                  <Tag label={s.level} tone={above ? 'amber' : 'violet'} />
                </Row>
                <T v="muted">{s.mission}</T>
              </View>
            </Row>
          </Card>
        );
      })}

      {!aiAvailable ? (
        <T v="muted">Modalità offline: il tutor segue un copione per ogni situazione. Collegando il server con Claude, le conversazioni diventano libere.</T>
      ) : null}
    </Screen>
  );
}

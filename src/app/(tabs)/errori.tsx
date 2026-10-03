import { router } from 'expo-router';
import { View } from 'react-native';
import { errorStatusLabel } from '../../components/labels';
import { Button, Card, Row, Screen, T, Tag, TutorSays } from '../../components/ui';
import { UNIT_BY_ID } from '../../content/units';
import { activeErrors, recentCount } from '../../engine/model';
import { useLearner } from '../../engine/store';
import { useTheme } from '../../theme/tokens';

const TONE = { todo: 'red', improving: 'amber', acquired: 'mint' } as const;

export default function Errors() {
  const c = useTheme();
  const { learner } = useLearner();
  const errors = activeErrors(learner);
  const open = errors.filter((e) => e.rec.status !== 'acquired');
  const fixed = errors.filter((e) => e.rec.status === 'acquired');

  return (
    <Screen>
      <T v="h1">I miei errori</T>
      {errors.length === 0 ? (
        <TutorSays>Qui raccolgo gli errori che fai davvero, nelle lezioni e nelle conversazioni. Per ognuno ti spiego il perché e lo ripassiamo finché diventa naturale.</TutorSays>
      ) : (
        <TutorSays>
          {open.length
            ? `Hai ${open.length} ${open.length === 1 ? 'errore' : 'errori'} su cui lavorare. Un errore diventa “acquisito” quando usi la forma giusta in 3 giorni diversi.`
            : 'Nessun errore aperto. Quelli che hai corretto restano qui sotto.'}
        </TutorSays>
      )}

      {open.map(({ id, rec, type }) => {
        const last = rec.events[0];
        const unit = UNIT_BY_ID[type.rule];
        const recent = recentCount(rec);
        return (
          <Card key={id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T v="h3">{type.title}</T>
                {unit ? <T v="muted">Regola: {unit.title}</T> : null}
              </View>
              <Tag label={errorStatusLabel(rec.status)} tone={TONE[rec.status]} />
            </Row>
            {last ? (
              <View style={{ gap: 2 }}>
                <T v="small" color={c.red}>✕ {last.said}</T>
                {last.fixed ? <T v="small" color={c.mint}>✓ {last.fixed}</T> : null}
              </View>
            ) : null}
            <T v="small">{type.explain}</T>
            {type.examples.slice(0, 2).map((ex) => (
              <T key={ex} v="en">{ex}</T>
            ))}
            <T v="muted">
              {recent > 1 ? `Ripetuto ${recent} volte nell’ultimo mese. ` : ''}
              {rec.status === 'improving' ? `Giusto in ${rec.correctDays.length} ${rec.correctDays.length === 1 ? 'giorno' : 'giorni'} su 3.` : ''}
            </T>
            <Button small kind="soft" label="Allenati su questo errore" onPress={() => router.push({ pathname: '/sessione', params: { error: id } })} />
          </Card>
        );
      })}

      {fixed.length ? (
        <View style={{ gap: 10 }}>
          <T v="h2">Errori che non fai più</T>
          {fixed.map(({ id, type }) => (
            <Card key={id} tone="soft">
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ flex: 1 }}>{type.title}</T>
                <Tag label="acquisito" tone="mint" />
              </Row>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Row, Screen, SpeakButton, T, Tag, TopBar } from '../../components/ui';
import { VERB_BY_ID } from '../../content/verbs';
import { startItem } from '../../engine/model';
import { useLearner } from '../../engine/store';
import { useTheme } from '../../theme/tokens';

export default function VerbScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = id ? VERB_BY_ID[id] : undefined;
  const { learner, update } = useLearner();
  if (!v) return <Screen><TopBar title="Verbo" /><T>Verbo non trovato.</T></Screen>;
  const key = `verb:${v.id}` as const;

  const forms: [string, string, string][] = [
    ['Base', v.base, 'I / you / we / they'],
    ['3ª persona', v.third, 'he / she / it'],
    ['Passato', v.past, 'ieri, la settimana scorsa'],
    ['Participio', v.participle, 'have ' + v.participle],
  ];

  return (
    <Screen footer={learner.cards[key] ? <Button kind="soft" label="È nel tuo ripasso ✓" disabled onPress={() => {}} /> : <Button label="Aggiungi al ripasso" onPress={() => update((l) => startItem(l, key))} />}>
      <TopBar title="Verbo" />
      <View style={{ gap: 6 }}>
        <Tag label={v.irregular ? 'irregolare' : 'regolare'} tone={v.irregular ? 'amber' : 'mint'} />
        <Row>
          <T v="display" style={{ flex: 1 }}>to {v.base}</T>
          <SpeakButton text={v.base} />
          <SpeakButton text={v.base} slow />
        </Row>
        <T v="h3">{v.it}</T>
        <T v="muted">{v.ipa}</T>
      </View>
      <Card>
        {forms.map(([label, form, note]) => (
          <Row key={label} style={{ paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <T v="muted" style={{ width: 96 }}>{label}</T>
            <View style={{ flex: 1 }}>
              <T v="en">{form}</T>
              <T v="muted">{note}</T>
            </View>
            <SpeakButton text={form} />
          </Row>
        ))}
      </Card>
      {v.irregular ? <Card tone="violet"><T v="small">Il passato di “{v.base}” non finisce in -ed: va imparato a memoria. Lo ripassiamo finché ti viene spontaneo.</T></Card> : null}
      {v.examples.map((ex) => (
        <Card key={ex.en}>
          <Row>
            <T v="en" style={{ flex: 1 }}>{ex.en}</T>
            <SpeakButton text={ex.en} />
          </Row>
          <T v="muted">{ex.it}</T>
        </Card>
      ))}
    </Screen>
  );
}

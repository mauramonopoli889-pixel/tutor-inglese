import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { itemState } from '../../components/itemStatus';
import { Button, Card, Row, Screen, SpeakButton, T, Tag, TopBar } from '../../components/ui';
import { TOPICS, WORD_BY_ID } from '../../content/vocab';
import { startItem } from '../../engine/model';
import { useLearner } from '../../engine/store';

export default function WordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = id ? WORD_BY_ID[id] : undefined;
  const { learner, update } = useLearner();
  if (!w) return <Screen><TopBar title="Parola" /><T>Parola non trovata.</T></Screen>;
  const key = `word:${w.id}` as const;
  const s = itemState(learner, key, learner.wordUses[w.id]);
  const head = w.en.split(' / ')[0];
  const topic = TOPICS.find((t) => t.id === w.topic);

  return (
    <Screen footer={learner.cards[key] ? <Button kind="soft" label="È nel tuo ripasso ✓" disabled onPress={() => {}} /> : <Button label="Aggiungi al ripasso" onPress={() => update((l) => startItem(l, key))} />}>
      <TopBar title={topic ? `${topic.emoji} ${topic.title}` : 'Parola'} />
      <View style={{ gap: 6 }}>
        <Tag label={s.label} tone={s.tone} />
        <T v="display">{w.en}</T>
        <T v="h3">{w.it}</T>
      </View>
      <Card>
        <T v="eyebrow">Pronuncia</T>
        <Row>
          <View style={{ flex: 1 }}>
            <T v="en">{w.ipa}</T>
            <T v="muted">Si legge circa: “{w.say}”</T>
          </View>
          <SpeakButton text={head} />
          <SpeakButton text={head} slow />
        </Row>
      </Card>
      <Card>
        <T v="eyebrow">Esempio</T>
        <Row>
          <T v="en" style={{ flex: 1 }}>{w.example.en}</T>
          <SpeakButton text={w.example.en} />
        </Row>
        <T v="muted">{w.example.it}</T>
      </Card>
      <Card tone="violet">
        <T v="eyebrow">Quando si usa</T>
        <T>{w.context}</T>
      </Card>
      {(learner.wordUses[w.id] ?? 0) > 0 ? <T v="muted">L’hai usata correttamente {learner.wordUses[w.id]} {learner.wordUses[w.id] === 1 ? 'volta' : 'volte'} in frasi tue.</T> : null}
    </Screen>
  );
}

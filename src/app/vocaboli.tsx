import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { itemState } from '../components/itemStatus';
import { Card, Row, Screen, SpeakButton, T, Tag, TopBar } from '../components/ui';
import { TOPICS, WORDS } from '../content/vocab';
import { wordsKnown } from '../engine/model';
import { useLearner } from '../engine/store';
import { radius, useTheme } from '../theme/tokens';

export default function Vocab() {
  const c = useTheme();
  const { learner } = useLearner();
  const [topic, setTopic] = useState(TOPICS[0].id);
  const words = WORDS.filter((w) => w.topic === topic);

  return (
    <Screen>
      <TopBar title="Vocaboli" />
      <T v="muted">{wordsKnown(learner)} parole che sai usare. Una parola conta solo quando la ricordi dopo giorni o la usi in una frase tua.</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TOPICS.map((t) => {
          const on = t.id === topic;
          return (
            <Pressable key={t.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setTopic(t.id)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? c.ink : c.card, borderWidth: 1, borderColor: on ? c.ink : c.line }}>
              <T v="small" color={on ? c.paper : c.ink}>{t.emoji} {t.title}</T>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ gap: 10 }}>
        {words.map((w) => {
          const s = itemState(learner, `word:${w.id}`, learner.wordUses[w.id]);
          return (
            <Card key={w.id} onPress={() => router.push({ pathname: '/parola/[id]', params: { id: w.id } })}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T v="en">{w.en}</T>
                  <T v="muted">{w.it} · {w.ipa}</T>
                </View>
                <Tag label={s.label} tone={s.tone} />
                <SpeakButton text={w.en.split(' / ')[0]} />
              </Row>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

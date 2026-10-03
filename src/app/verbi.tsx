import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { itemState } from '../components/itemStatus';
import { Card, Row, Screen, T, Tag, TopBar } from '../components/ui';
import { VERBS } from '../content/verbs';
import { verbsKnown } from '../engine/model';
import { useLearner } from '../engine/store';
import { radius, useTheme } from '../theme/tokens';

const FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'irregular', label: 'Irregolari' },
  { id: 'regular', label: 'Regolari' },
] as const;

export default function Verbs() {
  const c = useTheme();
  const { learner } = useLearner();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const list = VERBS.filter((v) => filter === 'all' || (filter === 'irregular') === v.irregular);

  return (
    <Screen>
      <TopBar title="Verbi" />
      <T v="muted">{verbsKnown(learner)} verbi consolidati. Per ogni verbo: significato, forme, pronuncia ed esempi.</T>
      <Row style={{ gap: 8 }}>
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <Pressable key={f.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFilter(f.id)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? c.ink : c.card, borderWidth: 1, borderColor: on ? c.ink : c.line }}>
              <T v="small" color={on ? c.paper : c.ink}>{f.label}</T>
            </Pressable>
          );
        })}
      </Row>
      <View style={{ gap: 10 }}>
        {list.map((v) => {
          const s = itemState(learner, `verb:${v.id}`);
          return (
            <Card key={v.id} onPress={() => router.push({ pathname: '/verbo/[id]', params: { id: v.id } })}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T v="en">{v.base} · {v.past} · {v.participle}</T>
                  <T v="muted">{v.it}{v.irregular ? ' · irregolare' : ''}</T>
                </View>
                <Tag label={s.label === 'nuova' ? 'nuovo' : s.label.replace('la ', 'lo ')} tone={s.tone} />
              </Row>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

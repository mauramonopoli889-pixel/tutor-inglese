import { router } from 'expo-router';
import { View } from 'react-native';
import { Bar, Card, CefrPath, Hero, Row, Screen, T, Tag } from '../../components/ui';
import { LEVELS } from '../../content/types';
import { SKILLS, currentLevel, levelProgress, skillPercent, unitProgress, unitScore, unitsAt, type Skill } from '../../engine/model';
import { useLearner } from '../../engine/store';
import { useTheme } from '../../theme/tokens';
import { statusLabel } from '../../components/labels';

const SKILL_NAMES: Record<Skill, string> = {
  grammar: 'Grammatica',
  vocabulary: 'Vocabolario',
  listening: 'Ascolto',
  speaking: 'Parlato',
  pronunciation: 'Pronuncia',
  writing: 'Scrittura',
};

const TONE = { new: 'muted', learning: 'amber', consolidating: 'violet', mastered: 'mint' } as const;

export default function Path() {
  const c = useTheme();
  const { learner } = useLearner();
  const level = currentLevel(learner);
  const goal = learner.profile?.goal ?? 'B2';

  return (
    <Screen>
      <T v="h1">Il tuo percorso</T>
      <Hero>
        <T v="small" color={c.heroText}>Da {learner.profile?.startLevel ?? 'A0'} a {goal}</T>
        <CefrPath current={level} goal={goal} done={(l) => LEVELS.indexOf(l) < LEVELS.indexOf(level)} />
        <T v="small" color={c.heroText} style={{ opacity: 0.75 }}>Un argomento conta come acquisito solo quando lo ricordi dopo giorni e lo usi da solo.</T>
      </Hero>

      <Card>
        <T v="h3">Le tue abilità a livello {level}</T>
        {SKILLS.map((s) => {
          const pct = skillPercent(learner, s);
          return (
            <View key={s} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small">{SKILL_NAMES[s]}</T>
                <T v="small" color={c.muted}>{pct}%</T>
              </Row>
              <Bar pct={pct} height={6} color={pct >= 70 ? c.mint : pct >= 35 ? c.amber : c.primary} />
            </View>
          );
        })}
      </Card>

      {LEVELS.map((lvl) => {
        const units = unitsAt(lvl);
        return (
          <View key={lvl} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h2">{lvl}</T>
              {units.length ? <T v="muted">{levelProgress(learner, lvl)}% padroneggiato</T> : <Tag label="in arrivo" tone="muted" />}
            </Row>
            {units.length ? null : <T v="muted">I contenuti di questo livello arrivano nella prossima versione.</T>}
            {units.map((u) => {
              const p = unitProgress(learner, u.id);
              return (
                <Card key={u.id} onPress={() => router.push({ pathname: '/sessione', params: { unit: u.id } })}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="h3">{u.title}</T>
                      <T v="muted">{u.can}</T>
                    </View>
                    <Tag label={p.lapsed && p.status !== 'mastered' ? 'da rinforzare' : statusLabel(p.status)} tone={p.lapsed && p.status !== 'mastered' ? 'red' : TONE[p.status]} />
                  </Row>
                  {p.status !== 'new' ? <Bar pct={unitScore(p)} height={6} color={p.status === 'mastered' ? c.mint : c.primary} /> : null}
                </Card>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

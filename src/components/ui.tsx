import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEVELS, type Level } from '../content/types';
import { fonts, radius, space, useTheme } from '../theme/tokens';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/** Reads English aloud; slower for beginners. */
export function speak(text: string, slow = false) {
  Speech.stop();
  Speech.speak(text, { language: 'en-GB', rate: slow ? 0.7 : 0.95 });
}

export function Screen({ children, scroll = true, padded = true, footer }: { children: ReactNode; scroll?: boolean; padded?: boolean; footer?: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const body = padded ? { paddingHorizontal: space.xl, paddingTop: space.l, paddingBottom: space.xxl, gap: space.l } : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[body, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, body]}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: space.xl, paddingTop: space.s, paddingBottom: Math.max(insets.bottom, space.l), gap: space.s }}>{footer}</View> : null}
    </View>
  );
}

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'muted' | 'eyebrow' | 'en' | 'big';

export function T({ v = 'body', children, style, color, center, onPress }: { v?: Variant; children: ReactNode; style?: StyleProp<TextStyle>; color?: string; center?: boolean; onPress?: () => void }) {
  const c = useTheme();
  const base: Record<Variant, TextStyle> = {
    display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
    h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
    h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
    h3: { fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 23 },
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
    small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
    muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.muted },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: c.muted },
    en: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25 },
    big: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  };
  return (
    <Text onPress={onPress} style={[{ color: c.ink }, base[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  );
}

export function Button({ label, onPress, kind = 'primary', disabled, small }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'dark' | 'soft'; disabled?: boolean; small?: boolean }) {
  const c = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const bg = { primary: c.primary, ghost: 'transparent', dark: c.ink, soft: c.violetSoft }[kind];
  const fg = { primary: c.onPrimary, ghost: c.ink, dark: c.paper, soft: c.violet }[kind];
  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.4 : 1 }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start()}
        onPress={() => {
          tap();
          onPress();
        }}
        style={{ backgroundColor: bg, borderRadius: radius.pill, paddingVertical: small ? 10 : 15, paddingHorizontal: 22, alignItems: 'center', borderWidth: kind === 'ghost' ? 2 : 0, borderColor: c.line }}
      >
        <Text style={{ color: fg, fontFamily: fonts.bodyBold, fontSize: small ? 14 : 16 }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function Card({ children, style, onPress, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'soft' | 'violet' }) {
  const c = useTheme();
  const bg = tone === 'soft' ? c.soft : tone === 'violet' ? c.violetSoft : c.card;
  const content = <View style={[{ backgroundColor: bg, borderRadius: radius.card, padding: space.l, borderWidth: tone ? 0 : 1, borderColor: c.line, gap: space.s }, style]}>{children}</View>;
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function Hero({ children, color }: { children: ReactNode; color?: string }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: color ?? c.hero, borderRadius: 24, padding: space.xl, overflow: 'hidden', gap: space.s }}>
      <View style={{ position: 'absolute', right: -50, bottom: -60, width: 150, height: 150, borderRadius: 75, backgroundColor: c.primary, opacity: 0.22 }} />
      <View style={{ position: 'absolute', right: 70, bottom: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: c.sun, opacity: 0.18 }} />
      {children}
    </View>
  );
}

export function Bar({ pct, color, track, height = 10 }: { pct: number; color?: string; track?: string; height?: number }) {
  const c = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(100, pct)), duration: 700, useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View style={{ height, backgroundColor: track ?? c.line, borderRadius: height, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color ?? c.primary, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function CefrPath({ current, goal, done }: { current: Level; goal: Level; done: (l: Level) => boolean }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {LEVELS.map((l) => {
        const isNow = l === current;
        const isDone = done(l) && !isNow;
        return (
          <View key={l} style={{ flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: 'center', backgroundColor: isNow ? c.primary : isDone ? c.mint : 'rgba(255,255,255,0.12)', borderWidth: l === goal ? 2 : 0, borderColor: c.sun, borderStyle: 'dashed' }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: isDone ? '#0d2e26' : '#FFF8F0' }}>{l}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function Tag({ label, tone }: { label: string; tone: 'red' | 'amber' | 'mint' | 'violet' | 'muted' }) {
  const c = useTheme();
  const color = { red: c.red, amber: c.amber, mint: c.mint, violet: c.violet, muted: c.muted }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color + '26' }}>
      <Text style={{ color, fontFamily: fonts.bodyBold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Option({ label, selected, onPress, sub, state, en }: { label: string; selected?: boolean; onPress: () => void; sub?: string; state?: 'right' | 'wrong'; en?: boolean }) {
  const c = useTheme();
  const border = state === 'right' ? c.mint : state === 'wrong' ? c.red : selected ? c.primary : c.line;
  const bg = state === 'right' ? c.mint + '22' : state === 'wrong' ? c.red + '18' : selected ? c.soft : c.card;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [styles.option, { borderColor: border, backgroundColor: bg, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={{ flex: 1 }}>
        <T v={en ? 'en' : 'body'}>{label}</T>
        {sub ? <T v="muted">{sub}</T> : null}
      </View>
      {selected || state ? <T color={state === 'wrong' ? c.red : state === 'right' ? c.mint : c.primary}>{state === 'wrong' ? '✕' : '✓'}</T> : null}
    </Pressable>
  );
}

export function TopBar({ progress, onBack, title }: { progress?: number; onBack?: () => void; title?: string }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Indietro" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={[styles.round, { backgroundColor: c.card, borderColor: c.line }]}>
        <T v="h3">←</T>
      </Pressable>
      {progress !== undefined ? (
        <View style={{ flex: 1 }}>
          <Bar pct={progress} height={8} />
        </View>
      ) : (
        <T v="h3" style={{ flex: 1 }}>{title ?? ''}</T>
      )}
    </View>
  );
}

export function SpeakButton({ text, slow }: { text: string; slow?: boolean }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ascolta: ${text}`} onPress={() => speak(text, slow)} style={[styles.round, { backgroundColor: c.violetSoft, borderColor: 'transparent' }]}>
      <Text style={{ color: c.violet, fontSize: 14 }}>▶</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.m }, style]}>{children}</View>;
}

export function TutorSays({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.violet, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: fonts.display }}>S</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 18, borderTopLeftRadius: 4, padding: space.m }}>
        {typeof children === 'string' ? <T>{children}</T> : children}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 2, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

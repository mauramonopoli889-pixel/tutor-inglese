import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Redirect, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LearnerProvider, useLearner } from '../engine/store';
import { useTheme } from '../theme/tokens';

function Gate() {
  const c = useTheme();
  const { ready, learner } = useLearner();
  const segments = useSegments();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  const inOnboarding = segments[0] === 'onboarding';
  if (!learner.profile && !inOnboarding) return <Redirect href="/onboarding" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper }, animation: 'slide_from_right' }} />;
}

export default function RootLayout() {
  const [loaded] = useFonts({ BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <LearnerProvider>
        <StatusBar style="auto" />
        <Gate />
      </LearnerProvider>
    </SafeAreaProvider>
  );
}

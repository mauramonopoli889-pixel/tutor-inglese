import { Tabs } from 'expo-router/js-tabs';
import { Text, View, type ColorValue } from 'react-native';
import { fonts, useTheme } from '../../theme/tokens';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const c = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.line, height: 64, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Oggi', tabBarIcon: ({ color }) => <Icon glyph="⌂" color={color} /> }} />
      <Tabs.Screen name="percorso" options={{ title: 'Percorso', tabBarIcon: ({ color }) => <Icon glyph="◎" color={color} /> }} />
      <Tabs.Screen
        name="parla"
        options={{
          title: 'Parla',
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: -22, shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }}>
              <Text style={{ fontSize: 22, color: '#fff' }}>🎙</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="allenati" options={{ title: 'Allenati', tabBarIcon: ({ color }) => <Icon glyph="⚡" color={color} /> }} />
      <Tabs.Screen name="errori" options={{ title: 'Errori', tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }} />
    </Tabs>
  );
}

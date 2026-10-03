import { useColorScheme } from 'react-native';

// Design system tokens (see the design doc, section "Design system").
const light = {
  ink: '#1B1A2E',
  paper: '#FFF8F0',
  card: '#FFFFFF',
  line: '#EADFD3',
  muted: '#6E6878',
  primary: '#FF5A3C',
  onPrimary: '#FFFFFF',
  sun: '#FFC83D',
  mint: '#2EC4A0',
  amber: '#F5A524',
  red: '#E5484D',
  violet: '#7B61FF',
  sky: '#3D8BFD',
  hero: '#1B1A2E',
  heroText: '#FFF8F0',
  soft: '#FFEDE6',
  violetSoft: '#EEEAFF',
};

const dark: typeof light = {
  ink: '#F4EEF8',
  paper: '#121120',
  card: '#1D1B2E',
  line: '#2E2B44',
  muted: '#A49FB5',
  primary: '#FF6B4F',
  onPrimary: '#FFFFFF',
  sun: '#F2C14E',
  mint: '#3CCFAB',
  amber: '#F2AE3D',
  red: '#F06368',
  violet: '#9483FF',
  sky: '#5B9DFF',
  hero: '#26233D',
  heroText: '#FFF8F0',
  soft: '#3A2420',
  violetSoft: '#272244',
};

export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28 };
export const radius = { card: 20, pill: 999, tile: 16 };

import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

type Props = { size?: number; onLight?: boolean };

// Wordmark: "כלב love" — Hebrew word (dark) on the right, lowercase rose
// "love" on the left, with a small paw badge. Matches the reference mockup.
export default function BrandLockup({ size = 36, onLight = true }: Props) {
  return (
    <View testID="brand-lockup" style={styles.row}>
      <View style={[styles.badge, { width: size * 0.86, height: size * 0.86, borderRadius: size }]}>
        <Text style={{ fontSize: size * 0.46 }}>🐾</Text>
      </View>
      <Text style={[styles.love, { fontSize: size }]}>love</Text>
      <Text style={[styles.kelev, { fontSize: size, color: onLight ? colors.brandDark : colors.white }]}>כלב</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  kelev: { fontFamily: font.display },
  love: { fontFamily: font.display, color: colors.rose },
  badge: {
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});

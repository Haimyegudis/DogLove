import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

type Props = { size?: number };

export default function BrandLockup({ size = 40 }: Props) {
  // Row reversed so the Hebrew word sits on the right, LOVE on the left,
  // with a heart nuzzled between them.
  return (
    <View testID="brand-lockup" style={styles.row}>
      <Text style={[styles.love, { fontSize: size }]}>LOVE</Text>
      <Text style={[styles.heart, { fontSize: size * 0.7 }]}>♥</Text>
      <Text style={[styles.kelev, { fontSize: size }]}>כלב</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  kelev: { fontFamily: font.black, color: colors.bark },
  love: { fontFamily: font.black, color: colors.coralDeep, letterSpacing: 1 },
  heart: { fontFamily: font.bold, color: colors.heart, marginTop: 4 },
});

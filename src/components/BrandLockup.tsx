import { View, Text, StyleSheet } from 'react-native';

export default function BrandLockup() {
  // Row reversed so the Hebrew word sits on the right, LOVE on the left.
  return (
    <View testID="brand-lockup" style={styles.row}>
      <Text style={styles.love}>LOVE</Text>
      <Text style={styles.kelev}>כלב</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  kelev: { fontSize: 32, fontWeight: '800' },
  love: { fontSize: 32, fontWeight: '800', letterSpacing: 1 },
});

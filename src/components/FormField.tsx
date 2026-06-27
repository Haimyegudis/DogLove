import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.caramel, textAlign: 'right' },
});

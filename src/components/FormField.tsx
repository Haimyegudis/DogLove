import { ReactNode, ReactElement, Children, cloneElement, isValidElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  // RN doesn't auto-associate a visible label with its input, so screen readers
  // would announce the field as unnamed. Give each element child an
  // accessibilityLabel derived from the visible label (unless it set its own).
  const labelled = Children.map(children, (child) =>
    isValidElement(child) && (child.props as { accessibilityLabel?: string }).accessibilityLabel == null
      ? cloneElement(child as ReactElement<{ accessibilityLabel?: string }>, { accessibilityLabel: label })
      : child,
  );
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {labelled}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.caramel, textAlign: 'right' },
});

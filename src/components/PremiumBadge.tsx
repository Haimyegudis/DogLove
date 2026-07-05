import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius } from '../theme';

interface PremiumBadgeProps {
  premium: boolean;
}

/** Renders a gold "⭐ Premium" pill when premium=true; renders nothing otherwise. */
export function PremiumBadge({ premium }: PremiumBadgeProps) {
  if (!premium) return null;
  return (
    <View style={styles.pill} accessibilityRole="text" accessibilityLabel="חשבון פרימיום">
      <Text style={styles.label} importantForAccessibility="no">⭐ Premium</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#F9C74F',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontFamily: font.bold,
    fontSize: 12,
    color: '#B7860B',
    writingDirection: 'rtl',
  },
});

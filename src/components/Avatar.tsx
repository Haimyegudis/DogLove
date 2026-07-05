import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function Avatar({ uri, fallback = '🐶', size = 96 }: { uri: string | null; fallback?: string; size?: number }) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.img, dim]} accessibilityRole="image" accessibilityLabel="תמונת כלב" />;
  return (
    <View style={[styles.fallback, dim]} accessibilityRole="image" accessibilityLabel="תמונת כלב">
      {/* Emoji is decorative — the View carries the accessible label. */}
      <Text style={{ fontSize: size * 0.4 }} importantForAccessibility="no" accessibilityElementsHidden>{fallback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { borderWidth: 3, borderColor: colors.white, backgroundColor: colors.coralSoft },
  fallback: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.coralSoft, borderWidth: 3, borderColor: colors.white,
  },
});

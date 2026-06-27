import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function Avatar({ uri, fallback = '🐶', size = 96 }: { uri: string | null; fallback?: string; size?: number }) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.img, dim]} />;
  return (
    <View style={[styles.fallback, dim]}>
      <Text style={{ fontSize: size * 0.4 }}>{fallback}</Text>
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

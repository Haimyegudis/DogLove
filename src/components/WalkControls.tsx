import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, font, radius as r, shadow } from '../theme';

const RADII = [
  { m: 1000, label: '1 ק"מ' },
  { m: 3000, label: '3 ק"מ' },
  { m: 5000, label: '5 ק"מ' },
];

type Props = {
  walking: boolean;
  radiusM: number;
  nearbyCount: number;
  onToggleWalk: () => void;
  onSelectRadius: (m: number) => void;
};

export default function WalkControls({ walking, radiusM, nearbyCount, onToggleWalk, onSelectRadius }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {walking && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🟢 בהליכה — המיקום שלך משותף</Text>
        </View>
      )}

      <View style={[styles.card, shadow.card]}>
        <View style={styles.row}>
          <Text style={styles.count}>{nearbyCount}</Text>
          <Text style={styles.countLabel}>כלבים פעילים בקרבתך 🐾</Text>
        </View>

        <View style={styles.chips}>
          {RADII.map((opt) => (
            <Pressable
              key={opt.m}
              onPress={() => onSelectRadius(opt.m)}
              style={[styles.chip, radiusM === opt.m && styles.chipOn]}
            >
              <Text style={[styles.chipText, radiusM === opt.m && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="toggle-walk"
          onPress={onToggleWalk}
          style={({ pressed }) => [styles.cta, walking ? styles.ctaEnd : styles.ctaStart, shadow.soft, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{walking ? 'סיום הליכה' : 'יוצאים לטיול! 🦮'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10 },
  banner: { alignSelf: 'center', backgroundColor: colors.white, borderRadius: r.pill, paddingVertical: 8, paddingHorizontal: 16, ...shadow.soft },
  bannerText: { fontFamily: font.bold, color: colors.bark, fontSize: 13 },
  card: { backgroundColor: colors.white, borderRadius: r.lg, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, justifyContent: 'center' },
  count: { fontFamily: font.black, fontSize: 26, color: colors.coralDeep },
  countLabel: { fontFamily: font.medium, fontSize: 14, color: colors.caramel },
  chips: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: r.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { borderRadius: r.pill, paddingVertical: 16, alignItems: 'center' },
  ctaStart: { backgroundColor: colors.coral },
  ctaEnd: { backgroundColor: colors.bark },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});

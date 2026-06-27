import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, font, radius as r, shadow } from '../theme';

type Props = {
  walking: boolean;
  radiusM: number;
  nearbyCount: number;
  onToggleWalk: () => void;
  onSelectRadius: (m: number) => void;
};

export default function WalkControls({ walking, radiusM, nearbyCount, onToggleWalk, onSelectRadius }: Props) {
  // Live label while dragging; the actual query only commits on release.
  const [display, setDisplay] = useState(radiusM);
  const km = (m: number) => (m / 1000).toFixed(1);

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
          <Text style={styles.countLabel}>כלבים פעילים ברדיוס 🐾</Text>
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.dist}>{km(display)} ק"מ</Text>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={10000}
            step={500}
            value={radiusM}
            minimumTrackTintColor={colors.coral}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.coralDeep}
            onValueChange={setDisplay}
            onSlidingComplete={onSelectRadius}
          />
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
  sliderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  dist: { fontFamily: font.bold, fontSize: 14, color: colors.coralDeep, width: 64, textAlign: 'center' },
  slider: { flex: 1, height: 36 },
  cta: { borderRadius: r.pill, paddingVertical: 16, alignItems: 'center' },
  ctaStart: { backgroundColor: colors.coral },
  ctaEnd: { backgroundColor: colors.bark },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});

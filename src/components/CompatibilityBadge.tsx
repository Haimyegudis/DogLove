import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { compatibility, type CompatibilityResult } from '../services/compatibility';
import { colors, font, radius, shadow } from '../theme';

type Props = {
  dogA: string;
  dogB: string;
};

function pillColors(score: number): { bg: string; text: string; border: string } {
  if (score >= 70) {
    return { bg: colors.greenSoft, text: colors.green, border: colors.green };
  }
  if (score >= 40) {
    return { bg: '#FFF8E1', text: '#B78800', border: '#E6B800' };
  }
  return { bg: colors.roseSoft, text: colors.coralDeep, border: colors.coral };
}

export default function CompatibilityBadge({ dogA, dogB }: Props) {
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await compatibility(dogA, dogB);

      if (cancelled) return;

      if (rpcError || !data) {
        setError(rpcError ?? 'שגיאה בטעינת ניקוד ההתאמה');
      } else {
        setResult(data);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [dogA, dogB]);

  if (loading) {
    return (
      <View style={styles.centerRow}>
        <ActivityIndicator size="small" color={colors.purple} />
        <Text style={styles.loadingText}>מחשב התאמה…</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={styles.centerRow}>
        <Text style={styles.errorText}>{error ?? 'שגיאה לא ידועה'}</Text>
      </View>
    );
  }

  const pill = pillColors(result.score);

  return (
    <View style={[styles.card, shadow.card]}>
      {/* Score pill */}
      <View style={[styles.pill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
        <Text style={[styles.pillText, { color: pill.text }]}>
          {'התאמה '}
          {result.score}
          {'%'}
        </Text>
      </View>

      {/* Reasons list */}
      {result.reasons.length > 0 && (
        <View style={styles.reasonsWrap}>
          {result.reasons.map((reason, idx) => (
            <View key={idx} style={styles.reasonRow}>
              <View style={[styles.dot, { backgroundColor: pill.text }]} />
              <Text style={[styles.reasonText, { color: colors.inkCool }]}>{reason}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.lineCool,
    alignItems: 'flex-end', // RTL: align content to the right
  },
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    alignSelf: 'flex-end',
  },
  pillText: {
    fontFamily: font.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  reasonsWrap: {
    gap: 4,
    alignSelf: 'stretch',
  },
  reasonRow: {
    flexDirection: 'row-reverse', // RTL: bullet on the right
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reasonText: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
  },
  centerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
    textAlign: 'right',
  },
  errorText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'right',
  },
});

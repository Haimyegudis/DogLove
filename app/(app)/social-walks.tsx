import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font, radius } from '../../src/theme';
import { listSocialWalks, joinWalk, leaveWalk } from '../../src/services/events';
import type { SocialWalk } from '../../src/types/event';

const pad = (n: number) => String(n).padStart(2, '0');
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type WalkCardProps = {
  walk: SocialWalk;
  userId: string;
  onReload: () => void;
};

function WalkCard({ walk, userId, onReload }: WalkCardProps) {
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    try {
      const { error } = walk.i_joined
        ? await leaveWalk(walk.id, userId)
        : await joinWalk(walk.id, userId);
      if (error) { Alert.alert('שגיאה', error); return; }
      onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{walk.title}</Text>
      {walk.location_name ? (
        <Text style={styles.cardLocation}>📍 {walk.location_name}</Text>
      ) : null}
      <Text style={styles.cardDate}>{fmtDate(walk.starts_at)}</Text>
      {walk.organizer_name ? (
        <Text style={styles.cardOrganizer}>מארגן: {walk.organizer_name}</Text>
      ) : null}
      <Text style={styles.cardAttendees}>👥 {walk.attendee_count} משתתפים</Text>
      <Pressable
        style={[styles.joinBtn, walk.i_joined && styles.leaveBtn, busy && styles.btnDisabled]}
        onPress={handleToggle}
        disabled={busy}
      >
        <Text style={[styles.joinBtnText, walk.i_joined && styles.leaveBtnText]}>
          {walk.i_joined ? 'בטל הצטרפות' : 'הצטרף'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function SocialWalks() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [walks, setWalks] = useState<SocialWalk[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await listSocialWalks();
      if (error) { Alert.alert('שגיאה', error); return; }
      setWalks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'טיולים קבוצתיים 👥' }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.rose} />
          <Text style={styles.loadingText}>טוען…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {walks.length === 0 ? (
            <Text style={styles.empty}>אין טיולים קבוצתיים מתוכננים. ארגן אחד!</Text>
          ) : (
            walks.map((walk) => (
              <WalkCard key={walk.id} walk={walk} userId={userId} onReload={load} />
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          style={styles.organizeBtn}
          onPress={() => router.push('/(app)/new-social-walk')}
        >
          <Text style={styles.organizeBtnText}>+ ארגן טיול קבוצתי</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontFamily: font.regular, color: colors.inkCoolSoft, fontSize: 15 },
  scroll: { padding: 16, gap: 12, paddingBottom: 100 },
  empty: {
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineCool,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.brandDark,
    textAlign: 'right',
  },
  cardLocation: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.inkCoolSoft,
    textAlign: 'right',
  },
  cardDate: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.purple,
    textAlign: 'right',
  },
  cardOrganizer: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCool,
    textAlign: 'right',
  },
  cardAttendees: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.rose,
    textAlign: 'right',
  },
  joinBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  leaveBtn: {
    backgroundColor: colors.roseSoft,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.white,
  },
  leaveBtnText: {
    color: colors.rose,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgApp,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lineCool,
  },
  organizeBtn: {
    backgroundColor: colors.purple,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  organizeBtnText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.white,
  },
});

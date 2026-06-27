import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Avatar from '../../../src/components/Avatar';
import { listConversations } from '../../../src/services/chat';
import type { ConversationRow } from '../../../src/types/chat';
import { colors, font, radius } from '../../../src/theme';

export default function Messages() {
  const router = useRouter();
  const [rows, setRows] = useState<ConversationRow[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listConversations().then(({ data }) => { if (active) setRows(data); });
    return () => { active = false; };
  }, []));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>הודעות 💬</Text>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>אין שיחות עדיין. אשר בקשת משחק כדי להתחיל לשוחח!</Text>
          ) : rows.map((c) => (
            <Pressable key={c.conversation_id} onPress={() => router.push(`/(app)/chat/${c.conversation_id}`)} style={styles.row}>
              <Avatar uri={c.other_photo} fallback="🧑" size={52} />
              <View style={styles.info}>
                <Text style={styles.name}>{c.other_name ?? 'בעל כלב'}</Text>
                <Text style={styles.preview} numberOfLines={1}>{c.last_body ?? 'התחילו לשוחח 🐾'}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center', marginTop: 12 },
  scroll: { padding: 16, gap: 10 },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 24 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  info: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  preview: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
});

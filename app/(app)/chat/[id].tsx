import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/state/AuthContext';
import { listMessages, sendMessage, subscribeMessages } from '../../../src/services/chat';
import type { Message } from '../../../src/types/chat';
import { colors, font, radius } from '../../../src/theme';

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const headerTitle = name ?? 'שיחה';

  useEffect(() => {
    listMessages(id).then(({ data }) => setMessages(data));
    const sub = subscribeMessages(id, (m) => setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    return () => { sub.unsubscribe(); };
  }, [id]);

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { error } = await sendMessage(id, userId, body);
    if (error) {
      setText(body);
      Alert.alert('שליחה נכשלה', error);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.bubbleText, mine && styles.mineText]}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="הודעה…"
              placeholderTextColor={colors.inkCoolSoft}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable testID="send-message" onPress={onSend} style={styles.send}>
              <Text style={styles.sendText}>שלח</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', height: 50, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineCool, paddingHorizontal: 12 },
  headerTitle: { flex: 1, fontFamily: font.bold, fontSize: 17, color: colors.brandDark, textAlign: 'center' },
  backButton: { padding: 8 },
  backText: { fontSize: 28, color: colors.brandDark, lineHeight: 32 },
  flex: { flex: 1 },
  list: { padding: 14, gap: 8 },
  bubbleWrap: { flexDirection: 'row' },
  mineWrap: { justifyContent: 'flex-start' },
  theirsWrap: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13 },
  mine: { backgroundColor: colors.rose },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool },
  bubbleText: { fontFamily: font.regular, fontSize: 15, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  mineText: { color: colors.white },
  composer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.lineCool, backgroundColor: colors.white },
  input: { flex: 1, maxHeight: 110, backgroundColor: colors.bgApp, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: font.regular, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  send: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 18 },
  sendText: { fontFamily: font.bold, color: colors.white, fontSize: 15 },
});

import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font } from '../../src/theme';
import { useI18n } from '../../src/i18n/LanguageContext';
import { listFeed, reactToPost, removeReaction } from '../../src/services/feed';
import { getCurrentCoords } from '../../src/services/location';
import type { FeedPost } from '../../src/types/feed';
import type { Coords } from '../../src/types/walk';

const EMOJIS = ['❤️', '🐾', '😍', '👏'];

type PostCardProps = {
  post: FeedPost;
  onToggle: (emoji: string) => void;
};

function PostCard({ post, onToggle }: PostCardProps) {
  const { t } = useI18n();
  function handleEmoji(emoji: string) {
    onToggle(emoji); // parent applies the change optimistically + persists
  }

  const ownerName = post.owner_name ?? t('feed.dogOwner');

  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar uri={post.owner_photo} size={36} fallback="🧑" />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{ownerName}</Text>
          {post.dog_name ? (
            <Text style={styles.dogName}>{t('feed.with')} {post.dog_name} 🐕</Text>
          ) : null}
        </View>
      </View>

      {/* Photo */}
      <Image
        source={{ uri: post.photo_url }}
        style={styles.photo}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        accessibilityLabel={post.caption || `${t('feed.photoOf')} ${ownerName}`}
      />

      {/* Caption */}
      {post.caption ? (
        <Text style={styles.caption}>{post.caption}</Text>
      ) : null}

      {post.distance_m != null ? (
        <Text style={styles.distance}>📍 {(post.distance_m / 1000).toFixed(1)} {t('feed.kmAway')}</Text>
      ) : null}

      {/* Reactions row */}
      <View style={styles.reactionsRow}>
        {EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => handleEmoji(emoji)}
            style={[
              styles.emojiBtn,
              post.my_reaction === emoji && styles.emojiBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${t('feed.react')} ${emoji}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
        <Text style={styles.reactionCount}>{post.reaction_count}</Text>
      </View>
    </View>
  );
}

export default function Feed() {
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'nearby'>('recent');
  const [coords, setCoords] = useState<Coords | null>(null);

  const load = useCallback(async (mode: 'recent' | 'nearby') => {
    setLoading(true);
    try {
      let c = coords;
      if (mode === 'nearby' && !c) {
        c = await getCurrentCoords();
        if (c) setCoords(c); // used only to sort the feed nearby; home area is opt-in
      }
      const { data, error } = await listFeed(50, mode === 'nearby' ? c : null);
      if (error) { Alert.alert(t('feed.error'), error); return; }
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useFocusEffect(
    useCallback(() => {
      load(sortBy);
    }, [load, sortBy]),
  );

  // Optimistic reaction toggle — update the single post locally and persist,
  // instead of reloading the entire feed (which flashed a spinner and lost scroll).
  const toggleReaction = useCallback(async (post: FeedPost, emoji: string) => {
    const wasActive = post.my_reaction === emoji;
    const delta = wasActive ? -1 : post.my_reaction ? 0 : 1;
    setPosts((prev) => prev.map((p) => p.post_id === post.post_id
      ? { ...p, my_reaction: wasActive ? null : emoji, reaction_count: p.reaction_count + delta }
      : p));
    const { error } = wasActive
      ? await removeReaction(post.post_id, userId)
      : await reactToPost(post.post_id, userId, emoji);
    if (error) {
      setPosts((prev) => prev.map((p) => (p.post_id === post.post_id ? post : p))); // revert
      Alert.alert(t('feed.error'), error);
    }
  }, [userId]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: t('feed.title'),
          headerRight: () => (
            <Pressable onPress={() => router.push('/(app)/new-post')} accessibilityRole="button" accessibilityLabel={t('feed.share')}>
              <Text style={styles.headerBtn}>{t('feed.share')}</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.sortRow}>
        <Pressable onPress={() => setSortBy('recent')} style={[styles.sortChip, sortBy === 'recent' && styles.sortChipOn]} accessibilityRole="button" accessibilityLabel={t('feed.sortRecent')}>
          <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextOn]}>{t('feed.sortRecent')}</Text>
        </Pressable>
        <Pressable onPress={() => setSortBy('nearby')} style={[styles.sortChip, sortBy === 'nearby' && styles.sortChipOn]} accessibilityRole="button" accessibilityLabel={t('feed.sortNearby')}>
          <Text style={[styles.sortText, sortBy === 'nearby' && styles.sortTextOn]}>{t('feed.sortNearby')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.rose} />
          <Text style={styles.loadingText}>{t('feed.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.post_id}
          renderItem={({ item }) => (
            <PostCard post={item} onToggle={(emoji) => toggleReaction(item, emoji)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={styles.empty}>
              {t('feed.empty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  sortRow: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  sortChip: { borderRadius: 999, borderWidth: 1.5, borderColor: colors.lineCool, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.white },
  sortChipOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  sortText: { fontFamily: font.medium, fontSize: 13, color: colors.inkCoolSoft },
  sortTextOn: { color: colors.white, fontFamily: font.bold },
  distance: { fontFamily: font.medium, fontSize: 12, color: colors.rose, textAlign: 'right', paddingHorizontal: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontFamily: font.regular, color: colors.inkCoolSoft, fontSize: 15 },
  list: { paddingVertical: 8 },
  empty: {
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  headerBtn: {
    color: colors.rose,
    fontFamily: font.bold,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineCool,
    marginHorizontal: 12,
    marginVertical: 8,
    overflow: 'hidden',
  },
  authorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  authorInfo: { flex: 1 },
  authorName: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.brandDark,
    textAlign: 'right',
  },
  dogName: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.rose,
    textAlign: 'right',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  caption: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.inkCool,
    textAlign: 'right',
    padding: 10,
  },
  reactionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  emojiBtn: {
    borderRadius: 8,
    padding: 4,
  },
  emojiBtnActive: {
    backgroundColor: colors.roseSoft,
  },
  emojiText: {
    fontSize: 22,
  },
  reactionCount: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
    marginRight: 'auto',
  },
});

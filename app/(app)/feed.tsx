import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font } from '../../src/theme';
import { listFeed, reactToPost, removeReaction, setHomeLocation } from '../../src/services/feed';
import { getCurrentCoords } from '../../src/services/location';
import type { FeedPost } from '../../src/types/feed';
import type { Coords } from '../../src/types/walk';

const EMOJIS = ['❤️', '🐾', '😍', '👏'];

type PostCardProps = {
  post: FeedPost;
  userId: string;
  onReact: () => void;
};

function PostCard({ post, userId, onReact }: PostCardProps) {
  async function handleEmoji(emoji: string) {
    if (post.my_reaction === emoji) {
      await removeReaction(post.post_id, userId);
    } else {
      await reactToPost(post.post_id, userId, emoji);
    }
    onReact();
  }

  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar uri={post.owner_photo} size={36} fallback="🧑" />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.owner_name ?? 'בעל כלב'}</Text>
          {post.dog_name ? (
            <Text style={styles.dogName}>עם {post.dog_name} 🐕</Text>
          ) : null}
        </View>
      </View>

      {/* Photo */}
      <Image
        source={{ uri: post.photo_url }}
        style={styles.photo}
        resizeMode="cover"
      />

      {/* Caption */}
      {post.caption ? (
        <Text style={styles.caption}>{post.caption}</Text>
      ) : null}

      {post.distance_m != null ? (
        <Text style={styles.distance}>📍 {(post.distance_m / 1000).toFixed(1)} ק"מ ממך</Text>
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
        if (c) { setCoords(c); setHomeLocation(c.lat, c.lng); } // stamp my home so others can find me too
      }
      const { data } = await listFeed(50, mode === 'nearby' ? c : null);
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

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'גלריית הכלבים 🐾',
          headerRight: () => (
            <Pressable onPress={() => router.push('/(app)/new-post')}>
              <Text style={styles.headerBtn}>+ שתף</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.sortRow}>
        <Pressable onPress={() => setSortBy('recent')} style={[styles.sortChip, sortBy === 'recent' && styles.sortChipOn]}>
          <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextOn]}>חדש</Text>
        </Pressable>
        <Pressable onPress={() => setSortBy('nearby')} style={[styles.sortChip, sortBy === 'nearby' && styles.sortChipOn]}>
          <Text style={[styles.sortText, sortBy === 'nearby' && styles.sortTextOn]}>קרוב אליי 📍</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.rose} />
          <Text style={styles.loadingText}>טוען…</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.post_id}
          renderItem={({ item }) => (
            <PostCard post={item} userId={userId} onReact={() => load(sortBy)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>
              עדיין אין תמונות. היה הראשון לשתף! 📸
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

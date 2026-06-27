import { Pressable, View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { colors, font, radius, shadow } from '../theme';

type Props = {
  photo: string | null;
  name: string;
  breed: string;
  subtitle?: string;
  onPress?: () => void;
  right?: string;
};

export default function DogCard({ photo, name, breed, subtitle, onPress, right }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, shadow.card, pressed && onPress && styles.pressed]}>
      <Avatar uri={photo} fallback="🐶" size={56} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.breed}>{breed}{subtitle ? ` · ${subtitle}` : ''}</Text>
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
  info: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.bark, textAlign: 'right' },
  breed: { fontFamily: font.regular, fontSize: 13, color: colors.caramel, textAlign: 'right' },
  right: { fontFamily: font.bold, fontSize: 13, color: colors.coralDeep },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.92 },
});

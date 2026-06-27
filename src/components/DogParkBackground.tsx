import { ReactNode } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// Scattered, low-opacity paw prints drifting across a warm sunset wash.
const PAWS = [
  { top: 0.10, left: 0.08, size: 26, rot: -18, op: 0.10 },
  { top: 0.16, left: 0.78, size: 38, rot: 22, op: 0.12 },
  { top: 0.30, left: 0.30, size: 20, rot: 8, op: 0.08 },
  { top: 0.44, left: 0.86, size: 24, rot: -28, op: 0.09 },
  { top: 0.60, left: 0.06, size: 32, rot: 14, op: 0.10 },
  { top: 0.74, left: 0.70, size: 22, rot: -10, op: 0.09 },
  { top: 0.86, left: 0.24, size: 30, rot: 26, op: 0.10 },
];

export default function DogParkBackground({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return (
    <LinearGradient
      colors={[colors.cream, colors.creamDeep, colors.peach]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    >
      {/* warm "sun" glow, top-left */}
      <View style={[styles.glow, { top: -height * 0.12, left: -width * 0.2 }]} />
      {PAWS.map((p, i) => (
        <Text
          key={i}
          style={[
            styles.paw,
            {
              top: height * p.top,
              left: width * p.left,
              fontSize: p.size,
              opacity: p.op,
              transform: [{ rotate: `${p.rot}deg` }],
            },
          ]}
        >
          🐾
        </Text>
      ))}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: '#FFE2B0',
    opacity: 0.55,
  },
  paw: { position: 'absolute', color: colors.caramel },
});

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow } from '../theme';

type ToastOptions = { title: string; body?: string; onPress?: () => void };

type ToastContextValue = { showToast: (opts: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const showToast = useCallback((opts: ToastOptions) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast(opts);
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(hide, 4000);
  }, [anim, hide]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
            },
          ]}
        >
          <Pressable
            onPress={() => { if (hideTimer.current) clearTimeout(hideTimer.current); hide(); toast.onPress?.(); }}
            style={[styles.card, shadow.card]}
          >
            <View style={styles.iconWrap}><Text style={styles.icon}>💬</Text></View>
            <View style={styles.textWrap}>
              <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
              {toast.body ? <Text style={styles.body} numberOfLines={1}>{toast.body}</Text> : null}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 50, left: 12, right: 12, zIndex: 1000 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  textWrap: { flex: 1 },
  title: { fontFamily: font.bold, fontSize: 14, color: colors.brandDark, textAlign: 'right' },
  body: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
});

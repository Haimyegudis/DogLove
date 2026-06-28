import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'doglove.onboarding.v1';

export interface OnboardingState {
  /** null while loading from storage; boolean once resolved */
  seen: boolean | null;
  markSeen: () => Promise<void>;
}

export function useOnboarding(): OnboardingState {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((val) => setSeen(val === 'true'))
      .catch(() => setSeen(false));
  }, []);

  const markSeen = useCallback(async () => {
    await AsyncStorage.setItem(KEY, 'true');
    setSeen(true);
  }, []);

  return { seen, markSeen };
}

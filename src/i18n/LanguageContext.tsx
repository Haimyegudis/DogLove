import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, strings } from './strings';

const STORAGE_KEY = 'doglove.lang';

type LanguageValue = {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => Promise<void>;
};

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'he' || stored === 'en') setLangState(stored);
    });
  }, []);

  function t(key: string): string {
    return (strings[lang]?.[key]) ?? strings.he[key] ?? key;
  }

  async function setLang(next: Lang): Promise<void> {
    setLangState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}

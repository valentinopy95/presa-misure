import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_MODE_KEY = '@measure_dark_mode';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  label: string;
  inputBg: string;
  inputBorder: string;
  divider: string;
  shadow: string;
}

const light: Theme = {
  dark: false,
  bg: '#EEF2F7',
  card: '#ffffff',
  cardBorder: 'transparent',
  textPrimary: '#1a2a3a',
  textSecondary: '#8a9ab0',
  label: '#888',
  inputBg: '#F0F4FF',
  inputBorder: '#1565C0',
  divider: '#e8edf0',
  shadow: '#1a3a5c',
};

const dark: Theme = {
  dark: true,
  bg: '#0d1526',
  card: '#16213a',
  cardBorder: 'rgba(255,255,255,0.07)',
  textPrimary: '#e4eeff',
  textSecondary: '#7a9ab8',
  label: '#5a7a9a',
  inputBg: '#0f1d35',
  inputBorder: '#2a6dd9',
  divider: 'rgba(255,255,255,0.07)',
  shadow: '#000',
};

interface Ctx {
  theme: Theme;
  toggleDark: () => void;
}

const ThemeContext = createContext<Ctx>({ theme: light, toggleDark: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY).then(v => {
      if (v === 'true') setIsDark(true);
    });
  }, []);

  const toggleDark = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(DARK_MODE_KEY, String(next));
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  return useContext(ThemeContext);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getThemeMode, setThemeMode as setActiveThemeMode, type ThemeMode } from './tokens';

const THEME_MODE_STORAGE_KEY = 'snapshelf.themeMode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY)
      .then((storedMode) => {
        if (!isMounted || (storedMode !== 'light' && storedMode !== 'dark')) {
          return;
        }

        setActiveThemeMode(storedMode);
        setModeState(storedMode);
      })
      .catch(() => {
        // Keep the in-memory default if preference storage is unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<ThemeModeContextValue>(() => {
    function setMode(nextMode: ThemeMode) {
      setActiveThemeMode(nextMode);
      setModeState(nextMode);
      AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode).catch(() => {
        // The selected mode still applies for the current session.
      });
    }

    return {
      mode,
      setMode,
      toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used inside ThemeProvider.');
  }

  return context;
}

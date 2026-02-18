import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkThemeOverrides, designTokens } from './design-tokens';
import { getTheme, setTheme as persistTheme } from '../utils/storage';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
    mode: ThemeMode;
    colorScheme: 'light' | 'dark';
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
    theme: typeof designTokens;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const buildTheme = (scheme: 'light' | 'dark') => {
    if (scheme === 'light') {
        return designTokens;
    }

    return {
        ...designTokens,
        colors: {
            ...designTokens.colors,
            surface: {
                ...designTokens.colors.surface,
                ...darkThemeOverrides.colors.surface,
            },
            text: {
                ...designTokens.colors.text,
                ...darkThemeOverrides.colors.text,
            },
        },
    };
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        const hydrate = async () => {
            const saved = await getTheme();
            if (saved === 'auto') {
                setModeState('system');
                return;
            }
            if (saved) {
                setModeState(saved);
            }
        };
        hydrate().catch(() => undefined);
    }, []);

    const colorScheme: 'light' | 'dark' = mode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : mode;

    const setMode = useCallback((nextMode: ThemeMode) => {
        setModeState(nextMode);
        persistTheme(nextMode === 'system' ? 'auto' : nextMode).catch(() => undefined);
    }, []);

    const toggleMode = useCallback(() => {
        setMode(colorScheme === 'light' ? 'dark' : 'light');
    }, [colorScheme, setMode]);

    const theme = useMemo(() => buildTheme(colorScheme), [colorScheme]);

    const value = useMemo(
        () => ({ mode, colorScheme, setMode, toggleMode, theme }),
        [mode, colorScheme, setMode, toggleMode, theme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used inside ThemeProvider');
    }

    return context;
}

export function useColors() {
    return useThemeContext().theme.colors;
}

export function useSpacing() {
    const spacingTokens = useThemeContext().theme.spacing;
    return useCallback(
        (multiplier: number) => {
            const base = spacingTokens.sm;
            return base * multiplier;
        },
        [spacingTokens.sm],
    );
}

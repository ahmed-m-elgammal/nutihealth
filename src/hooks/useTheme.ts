import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { getTheme, setTheme as saveTheme } from '../utils/storage';

type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Hook for managing app theme
 * @returns Theme utilities
 */
export function useTheme() {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
        return getTheme() || 'auto';
    });

    const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
        Appearance.getColorScheme()
    );

    // Listen to system theme changes
    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemColorScheme(colorScheme);
        });

        return () => subscription.remove();
    }, []);

    /**
     * Get the effective color scheme (resolves 'auto' to actual scheme)
     */
    const colorScheme: 'light' | 'dark' =
        themeMode === 'auto'
            ? (systemColorScheme === 'dark' ? 'dark' : 'light')
            : themeMode;

    /**
     * Set theme mode and persist to storage
     */
    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
        saveTheme(mode);
    };

    /**
     * Toggle between light and dark modes
     */
    const toggleTheme = () => {
        const newMode = colorScheme === 'light' ? 'dark' : 'light';
        setThemeMode(newMode);
    };

    /**
     * Check if current theme is dark
     */
    const isDark = colorScheme === 'dark';

    /**
     * Check if current theme is light
     */
    const isLight = colorScheme === 'light';

    /**
     * Check if using auto theme
     */
    const isAuto = themeMode === 'auto';

    return {
        themeMode,
        colorScheme,
        setThemeMode,
        toggleTheme,
        isDark,
        isLight,
        isAuto,
    };
}

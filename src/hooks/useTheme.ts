import { useThemeContext } from '../theme/ThemeProvider';

/**
 * Backward compatible theme hook using the new ThemeProvider context.
 */
export function useTheme() {
    const { mode, colorScheme, setMode, toggleMode } = useThemeContext();

    return {
        themeMode: mode,
        colorScheme,
        setThemeMode: setMode,
        toggleTheme: toggleMode,
        isDark: colorScheme === 'dark',
        isLight: colorScheme === 'light',
        isAuto: mode === 'system',
    };
}

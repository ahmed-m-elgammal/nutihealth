const colors = {
    primary: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
    },
    secondary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
    },
    accent: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
    },
    surface: {
        background: '#f9fafb',
        surface: '#ffffff',
        surfaceVariant: '#f3f4f6',
        outline: '#e5e7eb',
        outlineVariant: '#d1d5db',
    },
};

const spacing = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
};

const borderRadius = {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
};

const fontFamily = {
    display: ['Manrope-Bold'],
    heading: ['Manrope-SemiBold'],
    body: ['Inter-Regular'],
    caption: ['Inter-Medium'],
};

const fontSize = {
    display: '40px',
    h1: '28px',
    h2: '22px',
    h3: '18px',
    bodyLarge: '16px',
    body: '14px',
    label: '13px',
    caption: '12px',
};

module.exports = {
    colors,
    spacing,
    borderRadius,
    fontFamily,
    fontSize,
};

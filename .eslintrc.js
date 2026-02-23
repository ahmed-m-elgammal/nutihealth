module.exports = {
    root: true,
    extends: ['@react-native-community', 'plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-native'],
    rules: {
        'react-hooks/exhaustive-deps': 'warn',
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/no-shadow': ['warn'],
                'no-shadow': 'off',
                'no-undef': 'off',
                'no-console': ['warn', { allow: ['warn', 'error'] }],
                'react-native/no-inline-styles': 'warn',
                'react-native/no-color-literals': 'off',
                'react-native/no-raw-text': 'off',
            },
        },
        {
            files: ['**/__tests__/**/*.{js,ts,tsx}', 'jest.setup.js'],
            env: {
                jest: true,
            },
            rules: {
                'no-undef': 'off',
                '@typescript-eslint/no-shadow': 'off',
            },
        },
    ],
};

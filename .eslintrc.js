module.exports = {
    root: true,
    extends: ['@react-native-community', 'plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-native'],
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/no-shadow': ['error'],
                'no-shadow': 'off',
                'no-undef': 'off',
                'no-console': ['warn', { allow: ['warn', 'error'] }],
                'react-native/no-inline-styles': 'warn',
                'react-native/no-color-literals': 'off', // NativeWind uses classes but keeping this off for flexibility
                'react-native/no-raw-text': 'off', // Too strict for some cases
            },
        },
    ],
};

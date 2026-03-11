module.exports = function (api) {
    api.cache(true);
    const plugins = [
        [
            'module-resolver',
            {
                root: ['./src'],
                alias: {
                    '@store': './src/store',
                    '@components': './src/components',
                    '@services': './src/services',
                    '@utils': './src/utils',
                    '@hooks': './src/hooks',
                    '@database': './src/database',
                    '@constants': './src/constants',
                    '@types': './src/types',
                },
            },
        ],
    ];

    if (process.env.NODE_ENV === 'production') {
        plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
    }

    plugins.push('react-native-reanimated/plugin');

    return {
        presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
        plugins,
        overrides: [
            {
                test: (fileName) => typeof fileName === 'string' && !fileName.includes('node_modules'),
                plugins: [
                    ['@babel/plugin-proposal-decorators', { legacy: true }],
                    ['@babel/plugin-proposal-class-properties', { loose: true }],
                ],
            },
        ],
    };
};

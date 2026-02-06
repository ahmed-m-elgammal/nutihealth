module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
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
            'react-native-reanimated/plugin',
        ],
    };
};

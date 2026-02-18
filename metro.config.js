const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
        if (moduleName === 'lucide-react-native') {
            // Force CJS build to avoid package exports issues on web
            return {
                filePath: path.resolve(__dirname, 'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js'),
                type: 'sourceFile',
            };
        }

        if (moduleName === 'zustand') {
            return {
                filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
                type: 'sourceFile',
            };
        }

        if (moduleName === 'zustand/middleware') {
            return {
                filePath: path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
                type: 'sourceFile',
            };
        }

        if (moduleName === '@react-native-async-storage/async-storage') {
            // Ensure we use the web-compatible version
            return {
                filePath: path.resolve(__dirname, 'node_modules/@react-native-async-storage/async-storage/lib/commonjs/index.js'),
                type: 'sourceFile',
            };
        }
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });

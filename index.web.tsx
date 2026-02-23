import '@expo/metro-runtime'; // Necessary for Fast Refresh on Web
import React from 'react';
import { AppRegistry } from 'react-native';
import { ExpoRoot } from 'expo-router';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Polyfills
if (typeof window !== 'undefined') {
    // Ensure setImmediate exists (common issue in some libs)
    if (!window.setImmediate) {
        (window as any).setImmediate = (fn: any) => setTimeout(fn, 0);
    }
}

// Global Error Handlers for Web
import { initializeWebErrorHandlers } from './src/utils/error-handlers';
if (typeof window !== 'undefined') {
    initializeWebErrorHandlers();
}

// Must be exported or Fast Refresh won't update the context
export function App() {
    const ctx = require.context('./src/app');
    return <ExpoRoot context={ctx} />;
}

AppRegistry.registerComponent('main', () => App);

const rootTag = document.getElementById('root') ?? document.getElementById('main');
const CANVASKIT_CDN_BASE = 'https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/';

async function bootstrap() {
    if (typeof window !== 'undefined') {
        try {
            await LoadSkiaWeb({
                locateFile: (file) => `${CANVASKIT_CDN_BASE}${file}`,
            });
        } catch (error) {
            console.error('[Web Bootstrap] Failed to load CanvasKit', error);
        }
    }

    AppRegistry.runApplication('main', { rootTag });
}

bootstrap().catch((error) => {
    console.error('[Web Bootstrap] Unhandled bootstrap error', error);
});

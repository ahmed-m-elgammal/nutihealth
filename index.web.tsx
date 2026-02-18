import '@expo/metro-runtime'; // Necessary for Fast Refresh on Web
import { AppRegistry } from 'react-native';
import { ExpoRoot } from 'expo-router';

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
AppRegistry.runApplication('main', { rootTag });

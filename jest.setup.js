import 'react-native-gesture-handler/jestSetup';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => { };
    return Reanimated;
});

// Mock Reanimated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Expo Secure Store
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// Mock console to avoid noisy logs during tests
global.console = {
    ...console,
    // error: jest.fn(), // Uncomment if you want to silence errors too
    warn: jest.fn(),
};

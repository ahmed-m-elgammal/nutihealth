import '@testing-library/react-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock('@nozbe/watermelondb/DatabaseProvider', () => {
    return {
        __esModule: true,
        default: ({ children }) => children,
    };
});

jest.mock('react-native-mmkv', () => ({
    MMKV: jest.fn(() => ({
        getString: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        getAllKeys: jest.fn(() => []),
        clearAll: jest.fn(),
    })),
}));

global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
};

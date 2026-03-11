
import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Wire React Query's online manager to NetInfo so queries
// automatically pause when the device is offline and resume on reconnect.
onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
        setOnline(!!state.isConnected);
    });
});

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
        },
        mutations: {
            // Keep failed mutations in queue so they can be retried when back online
            retry: 1,
        },
    },
});

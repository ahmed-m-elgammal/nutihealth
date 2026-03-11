import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSync } from '../hooks/useSync';

type BannerConfig = {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ReactNode;
    message: string;
    showRetry?: boolean;
};

export default function SyncStatusIndicator() {
    const insets = useSafeAreaInsets();
    const { isOnline, isSyncEnabled, isSyncing, syncError, triggerSync } = useSync();

    if (!isSyncEnabled) {
        return null;
    }

    let banner: BannerConfig | null = null;

    if (!isOnline) {
        banner = {
            backgroundColor: '#f59e0b',
            borderColor: '#d97706',
            textColor: '#ffffff',
            icon: <CloudOff size={14} color="#ffffff" />,
            message: 'Offline mode: changes are saved locally and will sync later.',
        };
    } else if (isSyncing) {
        banner = {
            backgroundColor: '#0ea5e9',
            borderColor: '#0284c7',
            textColor: '#ffffff',
            icon: <ActivityIndicator size="small" color="#ffffff" />,
            message: 'Syncing changes...',
        };
    } else if (syncError) {
        banner = {
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            textColor: '#ffffff',
            icon: <AlertTriangle size={14} color="#ffffff" />,
            message: 'Sync failed. Tap retry.',
            showRetry: true,
        };
    }

    if (!banner) {
        return null;
    }

    return (
        <View
            style={{
                position: 'absolute',
                top: insets.top + 8,
                left: 12,
                right: 12,
                zIndex: 60,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: banner.borderColor,
                backgroundColor: banner.backgroundColor,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
            }}
            pointerEvents="box-none"
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {banner.icon}
                <Text style={{ color: banner.textColor, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>
                    {banner.message}
                </Text>
            </View>

            {banner.showRetry ? (
                <Pressable
                    onPress={() => {
                        triggerSync().catch(() => undefined);
                    }}
                    style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.45)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <RefreshCw size={12} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Retry</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

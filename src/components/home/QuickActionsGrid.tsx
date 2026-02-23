import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Plus, Scan, Search, Camera } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

type Action = {
    id: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    onPress: () => void;
};

type QuickActionsGridProps = {
    onLogMeal: () => void;
    onScanFood: () => void;
    onSearchFood: () => void;
    onDetectAi: () => void;
};

export default function QuickActionsGrid({ onLogMeal, onScanFood, onSearchFood, onDetectAi }: QuickActionsGridProps) {
    const actions: Action[] = [
        {
            id: 'log',
            label: 'Log Meal',
            subtitle: 'Quick entry',
            icon: <Plus size={18} color="#16a34a" />,
            onPress: onLogMeal,
        },
        {
            id: 'scan',
            label: 'Scan Food',
            subtitle: 'Barcode scan',
            icon: <Scan size={18} color="#2563eb" />,
            onPress: onScanFood,
        },
        {
            id: 'search',
            label: 'Search Food',
            subtitle: 'Open database',
            icon: <Search size={18} color="#f59e0b" />,
            onPress: onSearchFood,
        },
        {
            id: 'ai',
            label: 'AI Detect',
            subtitle: 'Photo detect',
            icon: <Camera size={18} color="#a855f7" />,
            onPress: onDetectAi,
        },
    ];

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {actions.map((action, index) => (
                <Animated.View
                    entering={FadeInDown.delay(index * 60).duration(300)}
                    key={action.id}
                    style={{ width: '48.5%' }}
                >
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            action.onPress();
                        }}
                        android_ripple={{ color: '#dcfce7' }}
                        style={{
                            borderRadius: 16,
                            backgroundColor: '#ffffff',
                            padding: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            overflow: 'hidden',
                        }}
                    >
                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                backgroundColor: '#f8fafc',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {action.icon}
                        </View>
                        <Text style={{ marginTop: 10, fontWeight: '700', color: '#111827' }}>{action.label}</Text>
                        <Text style={{ marginTop: 2, color: '#6b7280', fontSize: 12 }}>{action.subtitle}</Text>
                    </Pressable>
                </Animated.View>
            ))}
        </View>
    );
}

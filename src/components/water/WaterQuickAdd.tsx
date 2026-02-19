import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOutUp } from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

type WaterQuickAddProps = {
    amounts?: number[];
    onAdd: (amount: number) => void;
};

type Drop = {
    id: number;
    x: number;
    y: number;
};

export default function WaterQuickAdd({ amounts = [150, 250, 330, 500], onAdd }: WaterQuickAddProps) {
    const [drops, setDrops] = useState<Drop[]>([]);

    const spawnDrop = (x: number, y: number) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setDrops((prev) => [...prev, { id, x, y }]);
        setTimeout(() => {
            setDrops((prev) => prev.filter((d) => d.id !== id));
        }, 850);
    };

    return (
        <View>
            <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>Quick Add</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {amounts.map((amount) => (
                    <Pressable
                        key={amount}
                        onPress={(event) => {
                            triggerHaptic('light').catch(() => undefined);
                            onAdd(amount);
                            const { locationX, locationY } = event.nativeEvent;
                            spawnDrop(locationX + 20, locationY + 10);
                        }}
                        android_ripple={{ color: 'rgba(14,116,144,0.15)' }}
                        style={{
                            borderRadius: 12,
                            backgroundColor: '#ecfeff',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <Text style={{ color: '#0f766e', fontWeight: '700' }}>+{amount} ml</Text>
                    </Pressable>
                ))}
            </View>

            {drops.map((drop) => (
                <Animated.Text
                    key={drop.id}
                    entering={FadeOutUp.duration(800)}
                    style={{ position: 'absolute', left: drop.x, top: drop.y, fontSize: 18 }}
                >
                    💧
                </Animated.Text>
            ))}
        </View>
    );
}

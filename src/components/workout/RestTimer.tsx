import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import { triggerHaptic } from '../../utils/haptics';

type RestTimerProps = {
    seconds: number;
    onDone: () => void;
};

export default function RestTimer({ seconds, onDone }: RestTimerProps) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        setRemaining(seconds);
    }, [seconds]);

    useEffect(() => {
        if (remaining <= 0) {
            triggerHaptic('success').catch(() => undefined);
            onDone();
            return;
        }

        if (remaining % 10 === 0) {
            triggerHaptic('light').catch(() => undefined);
        }

        const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
        return () => clearTimeout(timer);
    }, [onDone, remaining]);

    const progress = useMemo(() => (seconds > 0 ? remaining / seconds : 0), [remaining, seconds]);
    const size = 104;

    return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <Canvas style={{ width: size, height: size }}>
                <Circle cx={52} cy={52} r={42} style="stroke" strokeWidth={8} color="#e2e8f0" />
                <Circle
                    cx={52}
                    cy={52}
                    r={42}
                    style="stroke"
                    strokeWidth={8}
                    color="#16a34a"
                    start={-Math.PI / 2}
                    end={-Math.PI / 2 + progress * Math.PI * 2}
                />
            </Canvas>
            <Text style={{ marginTop: -66, color: '#0f172a', fontWeight: '800', fontSize: 22 }}>{remaining}s</Text>
            <Text style={{ marginTop: 40, color: '#64748b' }}>Rest timer</Text>
        </View>
    );
}

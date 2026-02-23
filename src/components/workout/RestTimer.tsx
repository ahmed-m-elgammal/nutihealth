import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
    const stroke = 8;
    const radius = 42;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size} style={{ position: 'absolute' }}>
                    <Circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#16a34a"
                        strokeWidth={stroke}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={dashOffset}
                        transform={`rotate(-90 ${center} ${center})`}
                    />
                </Svg>
                <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 22 }}>{remaining}s</Text>
            </View>
            <Text style={{ marginTop: 8, color: '#64748b' }}>Rest timer</Text>
        </View>
    );
}

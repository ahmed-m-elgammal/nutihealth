import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { format } from 'date-fns';

type ProfileHeaderProps = {
    user: { name: string; email: string; avatar?: string; memberSince: Date };
    stats: { currentWeight: number; goalWeight: number; bmi: number; streak: number; bestStreak: number };
    onAvatarPress: () => void;
};

export default function ProfileHeader({ user, stats, onAvatarPress }: ProfileHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={['#15803d', '#22c55e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 16, paddingTop: Math.max(16, insets.top * 0.35) }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                    onPress={onAvatarPress}
                    android_ripple={{ color: 'rgba(255,255,255,0.22)' }}
                    style={{ borderRadius: 999, overflow: 'hidden' }}
                >
                    {user.avatar ? (
                        <Image
                            source={{ uri: user.avatar }}
                            style={{ width: 74, height: 74, borderRadius: 37 }}
                            contentFit="cover"
                        />
                    ) : (
                        <View
                            style={{
                                width: 74,
                                height: 74,
                                borderRadius: 37,
                                backgroundColor: 'rgba(255,255,255,0.25)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>
                                {user.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </Pressable>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 21, fontWeight: '800' }}>{user.name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.88)', marginTop: 2 }}>{user.email}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 12 }}>
                        Member since {format(user.memberSince, 'MMM yyyy')}
                    </Text>
                </View>
            </View>

            <View style={{ marginTop: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', padding: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{stats.currentWeight}kg</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11 }}>Current</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{stats.goalWeight}kg</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11 }}>Goal</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{stats.bmi.toFixed(1)}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11 }}>BMI</Text>
                    </View>
                </View>
            </View>

            <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>🔥 {stats.streak}-day streak</Text>
                <Text style={{ color: '#fff', fontWeight: '700' }}>🏆 Best: {stats.bestStreak} days</Text>
            </View>
        </LinearGradient>
    );
}

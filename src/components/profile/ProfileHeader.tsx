import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Camera, Flame, Trophy } from 'lucide-react-native';

type ProfileHeaderProps = {
    user: { name: string; email: string; avatar?: string; memberSince: Date };
    stats: { currentWeight: number; goalWeight: number; bmi: number; streak: number; bestStreak: number };
    onAvatarPress: () => void;
};

export default function ProfileHeader({ user, stats, onAvatarPress }: ProfileHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={{ backgroundColor: '#0f172a', paddingTop: Math.max(20, insets.top), paddingBottom: 20, paddingHorizontal: 20 }}>
            {/* Avatar + Info */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Pressable
                    onPress={onAvatarPress}
                    style={{ position: 'relative', marginBottom: 14 }}
                    android_ripple={{ color: 'rgba(16,183,72,0.2)', borderless: true, radius: 46 }}
                >
                    {user.avatar ? (
                        <Image
                            source={{ uri: user.avatar }}
                            style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#10b748' }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                        />
                    ) : (
                        <View
                            style={{
                                width: 88,
                                height: 88,
                                borderRadius: 44,
                                backgroundColor: '#1e293b',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 3,
                                borderColor: '#10b748',
                            }}
                        >
                            <Text style={{ color: '#10b748', fontSize: 32, fontWeight: '800' }}>
                                {user.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    {/* Edit badge */}
                    <View
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#10b748',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#0f172a',
                        }}
                    >
                        <Camera size={13} color="#fff" />
                    </View>
                </Pressable>

                <Text style={{ color: '#f8fafc', fontSize: 22, fontWeight: '800' }}>{user.name}</Text>
                <Text style={{ color: '#94a3b8', marginTop: 3, fontSize: 14 }}>{user.email}</Text>
                <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>
                    Member since {format(user.memberSince, 'MMM yyyy')}
                </Text>
            </View>

            {/* Stats Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <StatCard label="Weight" value={`${stats.currentWeight}kg`} />
                <StatCard label="Goal" value={`${stats.goalWeight}kg`} />
                <StatCard label="BMI" value={stats.bmi > 0 ? stats.bmi.toFixed(1) : '–'} />
            </View>

            {/* Streak Row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Flame size={18} color="#10b748" />
                    <View>
                        <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 16 }}>{stats.streak}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>Day Streak</Text>
                    </View>
                </View>
                <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Trophy size={18} color="#10b748" />
                    <View>
                        <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 16 }}>{stats.bestStreak}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>Best Streak</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 18 }}>{value}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{label}</Text>
        </View>
    );
}

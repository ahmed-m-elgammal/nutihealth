import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    User,
    Settings,
    Bell,
    Heart,
    Award,
    ChevronRight,
    LogOut,
    TrendingDown,
    Target,
    Flame
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const router = useRouter();
    const userName = 'Alex Johnson';
    const userEmail = 'alex@nutrihealth.com';
    const currentWeight = 75; // kg
    const goalWeight = 70; // kg
    const streak = 12; // days
    const caloriesBurned = 2450; // total this week

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="px-6 pt-4 pb-6">
                    <Text className="text-3xl font-bold text-neutral-900">Profile</Text>
                    <Text className="text-neutral-500 mt-1">Your health journey</Text>
                </View>

                {/* Profile Card */}
                <View className="mx-6 bg-white rounded-3xl p-6 mb-6 shadow-lg border border-neutral-100">
                    <View className="flex-row items-center mb-4">
                        <View className="w-20 h-20 bg-primary-600 rounded-full items-center justify-center mr-4">
                            <Text className="text-white font-bold text-3xl">{userName[0]}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-900 font-bold text-xl">{userName}</Text>
                            <Text className="text-neutral-500">{userEmail}</Text>
                        </View>
                        <TouchableOpacity className="bg-neutral-100 p-2 rounded-full">
                            <Settings size={20} color="#737373" />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Grid */}
                    <View className="flex-row gap-3 mt-4">
                        <View className="flex-1 bg-gradient-to-b from-primary-50 to-white rounded-2xl p-4 border border-primary-100">
                            <View className="w-10 h-10 bg-primary-600 rounded-full items-center justify-center mb-2">
                                <TrendingDown size={20} color="white" />
                            </View>
                            <Text className="text-primary-900 text-2xl font-bold">{currentWeight}kg</Text>
                            <Text className="text-primary-700 text-xs">Current Weight</Text>
                        </View>

                        <View className="flex-1 bg-gradient-to-b from-blue-50 to-white rounded-2xl p-4 border border-blue-100">
                            <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center mb-2">
                                <Target size={20} color="white" />
                            </View>
                            <Text className="text-blue-900 text-2xl font-bold">{goalWeight}kg</Text>
                            <Text className="text-blue-700 text-xs">Goal Weight</Text>
                        </View>
                    </View>

                    <View className="flex-row gap-3 mt-3">
                        <View className="flex-1 bg-gradient-to-b from-amber-50 to-white rounded-2xl p-4 border border-amber-100">
                            <View className="w-10 h-10 bg-amber-600 rounded-full items-center justify-center mb-2">
                                <Award size={20} color="white" />
                            </View>
                            <Text className="text-amber-900 text-2xl font-bold">{streak} days</Text>
                            <Text className="text-amber-700 text-xs">Current Streak</Text>
                        </View>

                        <View className="flex-1 bg-gradient-to-b from-orange-50 to-white rounded-2xl p-4 border border-orange-100">
                            <View className="w-10 h-10 bg-orange-600 rounded-full items-center justify-center mb-2">
                                <Flame size={20} color="white" />
                            </View>
                            <Text className="text-orange-900 text-2xl font-bold">{caloriesBurned}</Text>
                            <Text className="text-orange-700 text-xs">Calories This Week</Text>
                        </View>
                    </View>
                </View>

                {/* Settings Section */}
                <View className="mx-6 bg-white rounded-3xl p-4 mb-6 shadow-sm border border-neutral-100">
                    <Text className="text-neutral-900 font-bold text-lg mb-3 px-2">Settings</Text>

                    <TouchableOpacity
                        className="flex-row items-center py-4 px-2 border-b border-neutral-100 active:bg-neutral-50"
                    >
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                            <User size={20} color="#3b82f6" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-900 font-semibold">Account Details</Text>
                            <Text className="text-neutral-500 text-xs">Manage your personal information</Text>
                        </View>
                        <ChevronRight size={20} color="#a3a3a3" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center py-4 px-2 border-b border-neutral-100 active:bg-neutral-50"
                    >
                        <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
                            <Bell size={20} color="#f59e0b" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-900 font-semibold">Notifications</Text>
                            <Text className="text-neutral-500 text-xs">Customize your alerts</Text>
                        </View>
                        <ChevronRight size={20} color="#a3a3a3" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center py-4 px-2 active:bg-neutral-50"
                    >
                        <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
                            <Heart size={20} color="#059669" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-900 font-semibold">Health Goals</Text>
                            <Text className="text-neutral-500 text-xs">Update your fitness targets</Text>
                        </View>
                        <ChevronRight size={20} color="#a3a3a3" />
                    </TouchableOpacity>
                </View>

                {/* Achievements */}
                <View className="mx-6 bg-white rounded-3xl p-6 mb-6 shadow-sm border border-neutral-100">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-neutral-900 font-bold text-lg">Recent Achievements</Text>
                        <Award size={20} color="#f59e0b" />
                    </View>

                    <View className="bg-amber-50 rounded-2xl p-4 mb-3 border border-amber-100">
                        <View className="flex-row items-center">
                            <Text className="text-3xl mr-3">🏆</Text>
                            <View className="flex-1">
                                <Text className="text-amber-900 font-bold">7-Day Streak!</Text>
                                <Text className="text-amber-700 text-xs">Logged meals for a week straight</Text>
                            </View>
                        </View>
                    </View>

                    <View className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                        <View className="flex-row items-center">
                            <Text className="text-3xl mr-3">💪</Text>
                            <View className="flex-1">
                                <Text className="text-emerald-900 font-bold">Goal Achieved!</Text>
                                <Text className="text-emerald-700 text-xs">Hit your calorie goal 5 times</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Logout Button */}
                <View className="mx-6 mb-6">
                    <TouchableOpacity
                        className="flex-row items-center justify-center bg-red-50 border border-red-200 rounded-2xl p-4 active:bg-red-100"
                    >
                        <LogOut size={20} color="#dc2626" />
                        <Text className="text-red-600 font-bold text-base ml-2">Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

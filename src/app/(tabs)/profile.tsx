import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
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
    Flame,
    Salad,
} from 'lucide-react-native';

import { useUserStore } from '../../store/userStore';
import { useActiveDiet } from '../../query/queries/useDiets';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Heading, Subheading, Body, Caption } from '../../components/ui/Typography';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { exportBackupAndShare, restoreBackupFromFilePicker } from '../../services/export/dataExport';
import { clearScheduledReminders, scheduleAdaptiveReminders } from '../../services/notifications';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, loadUser } = useUserStore();
    const { data: activeUserDiet, isLoading: isLoadingDiet } = useActiveDiet(user?.id);
    const [isExportingBackup, setIsExportingBackup] = useState(false);
    const [isRestoringBackup, setIsRestoringBackup] = useState(false);
    const [isRefreshingReminders, setIsRefreshingReminders] = useState(false);
    const [isClearingReminders, setIsClearingReminders] = useState(false);

    // Derived from user data or defaults
    const userName = user?.name || 'Guest User';
    const userEmail = user?.email || 'Set up your profile';
    const currentWeight = user?.weight || 70;
    const goalWeight = user?.targetWeight || user?.weight || 65;
    const streak = user?.stats?.current_streak || 0;
    const caloriesBurned = 0; // Placeholder until we have workout data

    // Extract active diet info
    const activeDiet = activeUserDiet?.diet;
    const hasDiet = !!activeDiet;

    const handleLogout = async () => {
        // Implement logout logic if available in store, otherwise just navigate/alert
        // Assuming logout might be a function in useUserStore eventually
        // for now just router replacement or mock
        if (logout) {
            await logout();
        }
        router.replace('/onboarding/welcome');
    };

    const handleExportBackup = async () => {
        try {
            setIsExportingBackup(true);
            const result = await exportBackupAndShare();
            Alert.alert(
                'Backup Ready',
                `Backup file created: ${result.fileName}\nRecords exported: ${result.recordCount}`,
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not export backup.';
            Alert.alert('Backup Failed', message);
        } finally {
            setIsExportingBackup(false);
        }
    };

    const runBackupRestore = async () => {
        try {
            setIsRestoringBackup(true);
            const result = await restoreBackupFromFilePicker();

            if (!result) {
                return;
            }

            await loadUser();
            Alert.alert('Backup Restored', `Loaded ${result.recordCount} records from ${result.fileName}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not restore backup.';
            Alert.alert('Restore Failed', message);
        } finally {
            setIsRestoringBackup(false);
        }
    };

    const handleRestoreBackup = () => {
        Alert.alert('Restore Backup', 'This will replace current local data with the selected backup file. Continue?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Restore',
                style: 'destructive',
                onPress: () => {
                    runBackupRestore().catch(() => undefined);
                },
            },
        ]);
    };

    const handleRefreshReminders = async () => {
        try {
            setIsRefreshingReminders(true);
            await scheduleAdaptiveReminders(user?.id);
            Alert.alert('Reminders Updated', 'Meal, workout, hydration, and streak reminders are scheduled.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to schedule reminders.';
            Alert.alert('Reminder Error', message);
        } finally {
            setIsRefreshingReminders(false);
        }
    };

    const handleClearReminders = async () => {
        try {
            setIsClearingReminders(true);
            await clearScheduledReminders();
            Alert.alert('Reminders Cleared', 'All app-scheduled reminders have been cleared.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to clear reminders.';
            Alert.alert('Reminder Error', message);
        } finally {
            setIsClearingReminders(false);
        }
    };

    return (
        <ScreenErrorBoundary screenName="profile">
            <ScreenLayout className="bg-background" edges={['top']}>
                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Header */}
                    <View className="px-6 pb-6 pt-2">
                        <Heading className="text-3xl font-bold">Profile</Heading>
                        <Body className="mt-1 text-muted-foreground">Your health journey</Body>
                    </View>

                    {/* Profile Card */}
                    <Card className="mx-6 mb-6">
                        <CardContent className="flex-row items-center p-6">
                            <View className="mr-4 h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                                <Heading className="text-3xl font-bold text-primary">{userName.charAt(0)}</Heading>
                            </View>
                            <View className="flex-1">
                                <Heading className="text-lg">{userName}</Heading>
                                <Body className="text-muted-foreground">{userEmail}</Body>
                            </View>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <Settings size={22} className="text-muted-foreground" />
                            </Button>
                        </CardContent>

                        {/* Stats Grid - Inside Profile Card or separate? 
                        Design keeps them visually connected usually. 
                        Let's put them in separate Cards or a grid inside the main view.
                        Original had them inside the container but updated design uses separate cards usually.
                        Let's use a Grid of small Cards.
                    */}
                    </Card>

                    {/* Stats Grid */}
                    <View className="mx-6 mb-6">
                        <View className="flex-row gap-3">
                            <Card className="flex-1 border-primary/20 bg-primary/5">
                                <CardContent className="items-center p-4">
                                    <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-primary">
                                        <TrendingDown size={20} className="text-primary-foreground" />
                                    </View>
                                    <Heading className="text-2xl text-primary">{currentWeight}kg</Heading>
                                    <Caption className="text-center text-primary/80">Current Weight</Caption>
                                </CardContent>
                            </Card>

                            <Card className="flex-1 border-blue-500/20 bg-blue-500/5">
                                <CardContent className="items-center p-4">
                                    <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-blue-500">
                                        <Target size={20} className="text-white" />
                                    </View>
                                    <Heading className="text-2xl text-blue-600 dark:text-blue-400">
                                        {goalWeight}kg
                                    </Heading>
                                    <Caption className="text-center text-blue-600/80 dark:text-blue-400/80">
                                        Goal Weight
                                    </Caption>
                                </CardContent>
                            </Card>
                        </View>

                        <View className="mt-3 flex-row gap-3">
                            <Card className="flex-1 border-amber-500/20 bg-amber-500/5">
                                <CardContent className="items-center p-4">
                                    <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                                        <Award size={20} className="text-white" />
                                    </View>
                                    <Heading className="text-2xl text-amber-600 dark:text-amber-500">
                                        {streak} days
                                    </Heading>
                                    <Caption className="text-center text-amber-600/80 dark:text-amber-500/80">
                                        Current Streak
                                    </Caption>
                                </CardContent>
                            </Card>

                            <Card className="flex-1 border-orange-500/20 bg-orange-500/5">
                                <CardContent className="items-center p-4">
                                    <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                                        <Flame size={20} className="text-white" />
                                    </View>
                                    <Heading className="text-2xl text-orange-600 dark:text-orange-500">
                                        {caloriesBurned}
                                    </Heading>
                                    <Caption className="text-center text-orange-600/80 dark:text-orange-500/80">
                                        Calories
                                    </Caption>
                                </CardContent>
                            </Card>
                        </View>
                    </View>

                    {/* Active Diet Plan */}
                    {isLoadingDiet ? (
                        <Card className="mx-6 mb-6">
                            <CardContent className="items-center p-6">
                                <ActivityIndicator color="#10b981" />
                                <Caption className="mt-2">Loading diet plan...</Caption>
                            </CardContent>
                        </Card>
                    ) : hasDiet ? (
                        <Card className="mx-6 mb-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                            <CardHeader className="flex-row items-center justify-between pb-3">
                                <View className="flex-row items-center">
                                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                                        <Salad size={20} color="white" />
                                    </View>
                                    <View>
                                        <Subheading className="text-emerald-700 dark:text-emerald-400">
                                            Active Diet Plan
                                        </Subheading>
                                        <Caption className="text-emerald-600/80">
                                            Your current nutrition program
                                        </Caption>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => router.push('/(tabs)/plans')}>
                                    <ChevronRight size={20} className="text-emerald-600" />
                                </TouchableOpacity>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <View className="mb-3 rounded-2xl bg-white p-4 dark:bg-neutral-800">
                                    <Heading className="mb-1 text-xl">{activeDiet.name}</Heading>
                                    <Body className="mb-3 text-muted-foreground">{activeDiet.description}</Body>

                                    {/* Macro Targets */}
                                    <View className="flex-row justify-between">
                                        <View className="flex-1 items-center">
                                            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                                                <Heading className="text-xl text-orange-600">
                                                    {activeDiet.calorieTarget}
                                                </Heading>
                                            </View>
                                            <Caption className="text-orange-600">Calories</Caption>
                                        </View>
                                        <View className="flex-1 items-center">
                                            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                                <Heading className="text-xl text-blue-600">
                                                    {activeDiet.proteinTarget}g
                                                </Heading>
                                            </View>
                                            <Caption className="text-blue-600">Protein</Caption>
                                        </View>
                                        <View className="flex-1 items-center">
                                            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                                <Heading className="text-xl text-amber-600">
                                                    {activeDiet.carbsTarget}g
                                                </Heading>
                                            </View>
                                            <Caption className="text-amber-600">Carbs</Caption>
                                        </View>
                                        <View className="flex-1 items-center">
                                            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                                                <Heading className="text-xl text-purple-600">
                                                    {activeDiet.fatsTarget}g
                                                </Heading>
                                            </View>
                                            <Caption className="text-purple-600">Fats</Caption>
                                        </View>
                                    </View>
                                </View>

                                {/* Restrictions */}
                                {activeDiet.restrictions && activeDiet.restrictions.length > 0 && (
                                    <View className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                        <Caption className="mb-2 font-semibold text-emerald-700 dark:text-emerald-400">
                                            Dietary Guidelines:
                                        </Caption>
                                        <View className="flex-row flex-wrap gap-2">
                                            {activeDiet.restrictions.map((restriction: string, index: number) => (
                                                <View
                                                    key={index}
                                                    className="rounded-full bg-emerald-100 px-3 py-1 dark:bg-emerald-800/50"
                                                >
                                                    <Caption className="text-emerald-700 dark:text-emerald-300">
                                                        {restriction}
                                                    </Caption>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="mx-6 mb-6 border-2 border-dashed">
                            <CardContent className="items-center p-6">
                                <Salad size={48} className="mb-3 text-neutral-300" />
                                <Subheading className="mb-2">No Active Diet Plan</Subheading>
                                <Caption className="mb-4 text-center">
                                    Choose a diet plan to optimize your nutrition
                                </Caption>
                                <Button onPress={() => router.push('/(tabs)/plans')}>
                                    <Body className="font-bold text-primary-foreground">Browse Diet Plans</Body>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="mx-6 mb-6">
                        <CardHeader>
                            <Subheading>Backup & Restore</Subheading>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Body className="mb-4 text-muted-foreground">
                                Save your profile and logs to a backup file, then restore anytime after reinstalling.
                            </Body>
                            <Button
                                className="mb-3 w-full flex-row"
                                onPress={handleExportBackup}
                                loading={isExportingBackup}
                                disabled={isRestoringBackup}
                            >
                                Export Backup
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full flex-row"
                                onPress={handleRestoreBackup}
                                loading={isRestoringBackup}
                                disabled={isExportingBackup}
                            >
                                Restore Backup
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="mx-6 mb-6">
                        <CardHeader>
                            <Subheading>Smart Reminders</Subheading>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Body className="mb-4 text-muted-foreground">
                                Configure hydration, meal, workout, and streak reminder schedules.
                            </Body>
                            <Button
                                className="mb-3 w-full flex-row"
                                onPress={handleRefreshReminders}
                                loading={isRefreshingReminders}
                                disabled={isClearingReminders}
                            >
                                Refresh Reminders
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full flex-row"
                                onPress={handleClearReminders}
                                loading={isClearingReminders}
                                disabled={isRefreshingReminders}
                            >
                                Clear Reminders
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Settings Section */}
                    <Card className="mx-6 mb-6">
                        <CardHeader>
                            <Subheading>Settings</Subheading>
                        </CardHeader>
                        <View>
                            <TouchableOpacity className="flex-row items-center border-b border-border p-4 active:bg-muted/50">
                                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                                    <User size={20} className="text-blue-500" />
                                </View>
                                <View className="flex-1">
                                    <Body className="font-semibold">Account Details</Body>
                                    <Caption>Manage your personal information</Caption>
                                </View>
                                <ChevronRight size={20} className="text-muted-foreground" />
                            </TouchableOpacity>

                            <TouchableOpacity className="flex-row items-center border-b border-border p-4 active:bg-muted/50">
                                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                                    <Bell size={20} className="text-amber-500" />
                                </View>
                                <View className="flex-1">
                                    <Body className="font-semibold">Notifications</Body>
                                    <Caption>Customize your alerts</Caption>
                                </View>
                                <ChevronRight size={20} className="text-muted-foreground" />
                            </TouchableOpacity>

                            <TouchableOpacity className="flex-row items-center p-4 active:bg-muted/50">
                                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                                    <Heart size={20} className="text-emerald-500" />
                                </View>
                                <View className="flex-1">
                                    <Body className="font-semibold">Health Goals</Body>
                                    <Caption>Update your fitness targets</Caption>
                                </View>
                                <ChevronRight size={20} className="text-muted-foreground" />
                            </TouchableOpacity>
                        </View>
                    </Card>

                    {/* Achievements */}
                    <Card className="mx-6 mb-6">
                        <CardHeader className="flex-row items-center justify-between">
                            <Subheading>Recent Achievements</Subheading>
                            <Award size={20} className="text-amber-500" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <View className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                                <View className="flex-row items-center">
                                    <Heading className="mr-3 text-3xl">🏆</Heading>
                                    <View className="flex-1">
                                        <Body className="font-bold text-amber-700 dark:text-amber-500">
                                            7-Day Streak!
                                        </Body>
                                        <Caption className="text-amber-600/80 dark:text-amber-500/80">
                                            Logged meals for a week straight
                                        </Caption>
                                    </View>
                                </View>
                            </View>

                            <View className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                <View className="flex-row items-center">
                                    <Heading className="mr-3 text-3xl">💪</Heading>
                                    <View className="flex-1">
                                        <Body className="font-bold text-emerald-700 dark:text-emerald-500">
                                            Goal Achieved!
                                        </Body>
                                        <Caption className="text-emerald-600/80 dark:text-emerald-500/80">
                                            Hit your calorie goal 5 times
                                        </Caption>
                                    </View>
                                </View>
                            </View>
                        </CardContent>
                    </Card>

                    {/* Logout Button */}
                    <View className="mx-6 mb-6">
                        <Button variant="destructive" size="lg" className="w-full flex-row" onPress={handleLogout}>
                            <LogOut size={20} className="mr-2 text-destructive-foreground" />
                            <Body className="font-bold text-destructive-foreground">Log Out</Body>
                        </Button>
                    </View>
                </ScrollView>
            </ScreenLayout>
        </ScreenErrorBoundary>
    );
}

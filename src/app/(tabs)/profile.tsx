import React, { useMemo } from 'react';
import { Alert, View } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Download, Globe, LogOut, Moon, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import ProfileHeader from '../../components/profile/ProfileHeader';
import SettingsList from '../../components/profile/SettingsList';
import { useUserStore } from '../../store/userStore';
import { exportBackupAndShare, restoreBackupFromFilePicker } from '../../services/export/dataExport';
import { clearScheduledReminders, scheduleAdaptiveReminders } from '../../services/notifications';
import { useTheme } from '../../hooks/useTheme';
import { ProfileSkeleton } from '../../components/skeletons/ScreenSkeletons';
import { EmptyPlateIllustration } from '../../components/illustrations/EmptyStateIllustrations';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, updateUser } = useUserStore();
    const { isDark, setThemeMode } = useTheme();

    const profileUser = {
        name: user?.name || 'Guest User',
        email: user?.email || 'Set up your profile',
        avatar: undefined,
        memberSince: user?.createdAt ? new Date(user.createdAt) : new Date(),
    };

    const bmi = user?.height ? user.weight / Math.pow(user.height / 100, 2) : 0;

    const stats = {
        currentWeight: user?.weight || 70,
        goalWeight: user?.targetWeight || user?.weight || 65,
        bmi: Number.isFinite(bmi) ? bmi : 0,
        streak: user?.stats?.current_streak || 0,
        bestStreak: Math.max(user?.stats?.current_streak || 0, 30),
    };

    const sections = useMemo(
        () => [
            {
                title: 'Account',
                items: [
                    {
                        type: 'navigation' as const,
                        key: 'edit-profile',
                        icon: <UserIcon size={17} color="#334155" />,
                        label: 'Edit Profile',
                        subtitle: 'Name, email, body metrics and goals',
                        onPress: () => router.push('/profile/edit'),
                    },
                    {
                        type: 'navigation' as const,
                        key: 'privacy',
                        icon: <ShieldCheck size={17} color="#334155" />,
                        label: 'Privacy & Security',
                        subtitle: 'Control account and data preferences',
                        onPress: () => Alert.alert('Coming soon', 'Privacy settings are being prepared.'),
                    },
                ],
            },
            {
                title: 'Preferences',
                items: [
                    {
                        type: 'toggle' as const,
                        key: 'theme-dark',
                        icon: <Moon size={17} color="#334155" />,
                        label: 'Dark Mode',
                        value: isDark,
                        onToggle: (enabled: boolean) => setThemeMode(enabled ? 'dark' : 'light'),
                    },
                    {
                        type: 'toggle' as const,
                        key: 'notifications',
                        icon: <Bell size={17} color="#334155" />,
                        label: 'Smart Reminders',
                        value: Boolean(user?.preferences?.notifications_enabled),
                        onToggle: (enabled: boolean) => {
                            updateUser({
                                preferences: {
                                    ...(user?.preferences || {
                                        allergies: [],
                                        dietary_restrictions: [],
                                        theme: 'auto',
                                        notifications_enabled: true,
                                        language: 'en',
                                    }),
                                    notifications_enabled: enabled,
                                },
                            }).catch(() => undefined);

                            if (enabled) {
                                scheduleAdaptiveReminders(user?.id).catch(() => undefined);
                            } else {
                                clearScheduledReminders().catch(() => undefined);
                            }
                        },
                    },
                    {
                        type: 'badge' as const,
                        key: 'language',
                        icon: <Globe size={17} color="#334155" />,
                        label: 'Language',
                        badge: (user?.preferences?.language || 'en').toUpperCase(),
                        onPress: () => Alert.alert('Language', 'Language picker will be added next.'),
                    },
                ],
            },
            {
                title: 'Data & Session',
                items: [
                    {
                        type: 'navigation' as const,
                        key: 'backup',
                        icon: <Download size={17} color="#334155" />,
                        label: 'Export Backup',
                        subtitle: 'Save all records to a file',
                        onPress: () => {
                            exportBackupAndShare().catch(() => undefined);
                        },
                    },
                    {
                        type: 'navigation' as const,
                        key: 'restore',
                        icon: <Download size={17} color="#334155" />,
                        label: 'Restore Backup',
                        subtitle: 'Load a backup from storage',
                        onPress: () => {
                            restoreBackupFromFilePicker().catch(() => undefined);
                        },
                    },
                    {
                        type: 'navigation' as const,
                        key: 'logout',
                        icon: <LogOut size={17} color="#dc2626" />,
                        label: 'Log Out',
                        subtitle: 'Sign out from this device',
                        onPress: () => {
                            Alert.alert('Log out', 'Are you sure?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Log Out',
                                    style: 'destructive',
                                    onPress: () => {
                                        logout?.().catch(() => undefined);
                                        router.replace('/onboarding/welcome');
                                    },
                                },
                            ]);
                        },
                    },
                ],
            },
        ],
        [isDark, logout, router, setThemeMode, updateUser, user?.id, user?.preferences],
    );

    return (
        <ScreenErrorBoundary screenName="profile">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <ProfileHeader
                            user={profileUser}
                            stats={stats}
                            onAvatarPress={() => Alert.alert('Avatar', 'Photo picker coming soon.')}
                        />
                    }
                    headerHeight={290}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {!user ? (
                        <>
                            <ProfileSkeleton />
                            <EmptyState
                                illustration={<EmptyPlateIllustration />}
                                title="Profile not set up"
                                message="Complete onboarding to unlock personalized settings and recommendations."
                                actionLabel="Start Onboarding"
                                onAction={() => router.replace('/onboarding/welcome')}
                            />
                        </>
                    ) : (
                        <View style={{ marginTop: 8 }}>
                            <SettingsList sections={sections} />
                        </View>
                    )}
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}

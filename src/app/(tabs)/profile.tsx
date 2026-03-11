import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Download, Globe, LogOut, Moon, Trash2, User as UserIcon } from 'lucide-react-native';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import ProfileHeader from '../../components/profile/ProfileHeader';
import SettingsList from '../../components/profile/SettingsList';
import { useUserStore } from '../../store/userStore';
import { useUIStore } from '../../store/uiStore';
import { exportBackupAndShare, restoreBackupFromFilePicker } from '../../services/export/dataExport';
import { clearScheduledReminders, scheduleAdaptiveReminders } from '../../services/notifications';
import { useTheme } from '../../hooks/useTheme';
import { ProfileSkeleton } from '../../components/skeletons/ScreenSkeletons';
import { EmptyPlateIllustration } from '../../components/illustrations/EmptyStateIllustrations';
import i18n, { changeAppLanguage, type SupportedLanguage } from '../../i18n';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const ICON_COLOR = '#94a3b8';
const ICON_ERROR = '#ef4444';

const LANGUAGES: SupportedLanguage[] = ['en', 'ar', 'es'];

const normalizeLanguage = (value?: string): SupportedLanguage => {
    const normalized = (value || '').toLowerCase().split('-')[0];
    if (normalized === 'ar' || normalized === 'es') {
        return normalized;
    }
    return 'en';
};

const confirmWithAlert = (title: string, message: string, confirmText: string): Promise<boolean> =>
    new Promise((resolve) => {
        let settled = false;
        const settle = (value: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            resolve(value);
        };

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => settle(false) },
                { text: confirmText, style: 'destructive', onPress: () => settle(true) },
            ],
            {
                cancelable: true,
                onDismiss: () => settle(false),
            },
        );
    });

export default function ProfileScreen() {
    const { section } = useLocalSearchParams<{ section?: string }>();
    const router = useRouter();
    const { user } = useCurrentUser();
    const { logout, updateUser, deleteAccount } = useUserStore();
    const { isDark, setThemeMode } = useTheme();
    const showToast = useUIStore((state) => state.showToast);
    const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isExportingBackup, setIsExportingBackup] = useState(false);
    const [isRestoringBackup, setIsRestoringBackup] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const notificationsRef = useRef<View>(null);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (section !== 'notifications') {
            return;
        }

        const timer = setTimeout(() => {
            const scrollTarget = (scrollRef.current as any)?.getScrollableNode?.() ?? (scrollRef.current as any);
            if (!scrollTarget || !notificationsRef.current) {
                return;
            }

            notificationsRef.current.measureLayout(
                scrollTarget,
                (_x, y) => {
                    (scrollRef.current as any)?.scrollTo?.({ y, animated: true });
                },
                () => undefined,
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [section]);

    const profileUser = useMemo(
        () => ({
            name: user?.name || 'Guest User',
            email: user?.email || 'Set up your profile',
            avatar: undefined,
            memberSince: user?.createdAt ? new Date(user.createdAt) : new Date(),
        }),
        [user?.createdAt, user?.email, user?.name],
    );

    const bmi = useMemo(
        () => (user?.height ? user.weight / Math.pow(user.height / 100, 2) : 0),
        [user?.height, user?.weight],
    );

    const stats = useMemo(
        () => ({
            currentWeight: user?.weight || 70,
            goalWeight: user?.targetWeight || user?.weight || 65,
            bmi: Number.isFinite(bmi) ? bmi : 0,
            streak: user?.stats?.current_streak || 0,
            bestStreak: user?.stats?.current_streak || 0,
        }),
        [bmi, user?.stats?.current_streak, user?.targetWeight, user?.weight],
    );

    const mergedPreferences = useMemo(
        () => ({
            allergies: [],
            dietary_restrictions: [],
            theme: 'auto' as const,
            notifications_enabled: true,
            language: 'en',
            ...(user?.preferences || {}),
        }),
        [user?.preferences],
    );

    const currentLanguage = useMemo(
        () => normalizeLanguage(mergedPreferences.language || i18n.language),
        [mergedPreferences.language],
    );

    const updatePreferences = useCallback(
        async (updates: Partial<typeof mergedPreferences>) => {
            await updateUser({
                preferences: {
                    ...mergedPreferences,
                    ...updates,
                },
            });
        },
        [mergedPreferences, updateUser],
    );

    const requestConfirmation = useCallback(async (title: string, message: string, confirmText: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
                return false;
            }
            return window.confirm(`${title}\n\n${message}`);
        }

        return confirmWithAlert(title, message, confirmText);
    }, []);

    const handleDeleteAccount = useCallback(async () => {
        if (isDeletingAccount) {
            return;
        }

        const confirmed = await requestConfirmation(
            'Delete account permanently?',
            'This will permanently delete your account and all synced data. This cannot be undone.',
            'Delete My Account',
        );
        if (!confirmed) {
            return;
        }

        setIsDeletingAccount(true);
        try {
            await deleteAccount();
            showToast('success', 'Your account was permanently deleted.');
            router.replace('/onboarding/welcome');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete account.';
            showToast('error', message);
        } finally {
            setIsDeletingAccount(false);
        }
    }, [deleteAccount, isDeletingAccount, requestConfirmation, router, showToast]);

    const handleNotificationToggle = useCallback(
        async (enabled: boolean) => {
            try {
                await updatePreferences({ notifications_enabled: enabled });
                if (enabled) {
                    await scheduleAdaptiveReminders(user?.id);
                } else {
                    await clearScheduledReminders();
                }
                showToast('success', enabled ? 'Smart reminders enabled.' : 'Smart reminders disabled.');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update reminders.';
                showToast('error', message);
            }
        },
        [showToast, updatePreferences, user?.id],
    );

    const handleLanguageChange = useCallback(
        async (language: SupportedLanguage) => {
            if (isSwitchingLanguage) {
                return;
            }

            setIsSwitchingLanguage(true);
            try {
                await updatePreferences({ language });
                const { directionChanged, reloadTriggered } = await changeAppLanguage(language);
                const message =
                    language === 'ar'
                        ? 'تم تغيير اللغة إلى العربية'
                        : language === 'es'
                          ? 'Idioma cambiado a español'
                          : 'Language changed to English';
                showToast('success', message);

                if (directionChanged && !reloadTriggered) {
                    showToast('info', 'Please restart the app to apply RTL layout changes.');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to change language.';
                showToast('error', message);
            } finally {
                setIsSwitchingLanguage(false);
            }
        },
        [isSwitchingLanguage, showToast, updatePreferences],
    );

    const openLanguagePicker = useCallback(() => {
        const buttons = [
            { text: 'English', onPress: () => handleLanguageChange('en').catch(() => undefined) },
            { text: 'العربية', onPress: () => handleLanguageChange('ar').catch(() => undefined) },
            { text: 'Español', onPress: () => handleLanguageChange('es').catch(() => undefined) },
        ];

        // Android supports only up to 3 Alert buttons.
        if (Platform.OS === 'android') {
            Alert.alert('Select language', 'Choose app language', buttons);
            return;
        }

        Alert.alert('Select language', 'Choose app language', [...buttons, { text: 'Cancel', style: 'cancel' }]);
    }, [handleLanguageChange]);

    const cycleLanguage = useCallback(() => {
        const currentIndex = LANGUAGES.indexOf(currentLanguage);
        const nextLanguage = LANGUAGES[(currentIndex + 1) % LANGUAGES.length];
        handleLanguageChange(nextLanguage).catch(() => undefined);
    }, [currentLanguage, handleLanguageChange]);

    const handleLanguagePress = useCallback(() => {
        if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[Profile] Language pressed');
        }

        if (Platform.OS === 'android' || Platform.OS === 'web') {
            cycleLanguage();
            return;
        }

        openLanguagePicker();
    }, [cycleLanguage, openLanguagePicker]);

    const handleExportBackup = useCallback(async () => {
        if (isExportingBackup) {
            return;
        }

        setIsExportingBackup(true);
        try {
            const result = await exportBackupAndShare();
            showToast('success', `Backup ready: ${result.recordCount} records exported.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export backup.';
            showToast('error', message);
        } finally {
            setIsExportingBackup(false);
        }
    }, [isExportingBackup, showToast]);

    const handleRestoreBackup = useCallback(async () => {
        if (isRestoringBackup) {
            return;
        }

        setIsRestoringBackup(true);
        try {
            const restored = await restoreBackupFromFilePicker();
            if (restored) {
                showToast('success', `Backup restored: ${restored.recordCount} records imported.`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to restore backup.';
            showToast('error', message);
        } finally {
            setIsRestoringBackup(false);
        }
    }, [isRestoringBackup, showToast]);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) {
            return;
        }

        const confirmed = await requestConfirmation('Log out', 'Are you sure?', 'Log Out');
        if (!confirmed) {
            return;
        }

        setIsLoggingOut(true);
        try {
            await logout();
            showToast('success', 'Logged out successfully.');
            router.replace('/onboarding/welcome');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to log out.';
            showToast('error', message);
        } finally {
            setIsLoggingOut(false);
        }
    }, [isLoggingOut, logout, requestConfirmation, router, showToast]);

    const sections = useMemo(
        () => [
            {
                title: 'Account',
                items: [
                    {
                        type: 'navigation' as const,
                        key: 'edit-profile',
                        icon: <UserIcon size={17} color={ICON_COLOR} />,
                        label: 'Edit Profile',
                        subtitle: 'Name, email, body metrics and goals',
                        onPress: () => {
                            if (__DEV__) {
                                // eslint-disable-next-line no-console
                                console.log('[Profile] Edit Profile pressed');
                            }
                            router.push('/profile/edit');
                        },
                    },
                ],
            },
            {
                title: 'Preferences',
                sectionKey: 'preferences',
                sectionRef: notificationsRef,
                items: [
                    {
                        type: 'toggle' as const,
                        key: 'theme-dark',
                        icon: <Moon size={17} color={ICON_COLOR} />,
                        label: 'Dark Mode',
                        value: isDark,
                        onToggle: (enabled: boolean) => setThemeMode(enabled ? 'dark' : 'light'),
                    },
                    {
                        type: 'toggle' as const,
                        key: 'notifications',
                        icon: <Bell size={17} color={ICON_COLOR} />,
                        label: 'Smart Reminders',
                        value: Boolean(mergedPreferences.notifications_enabled),
                        onToggle: (enabled: boolean) => {
                            handleNotificationToggle(enabled).catch(() => undefined);
                        },
                    },
                    {
                        type: 'badge' as const,
                        key: 'language',
                        icon: <Globe size={17} color={ICON_COLOR} />,
                        label: 'Language',
                        subtitle: isSwitchingLanguage
                            ? 'Switching language...'
                            : Platform.OS === 'android' || Platform.OS === 'web'
                              ? 'Tap to cycle languages'
                              : 'Tap to choose language',
                        badge: currentLanguage.toUpperCase(),
                        onPress: handleLanguagePress,
                    },
                ],
            },
            {
                title: 'Data & Session',
                items: [
                    {
                        type: 'navigation' as const,
                        key: 'backup',
                        icon: <Download size={17} color={ICON_COLOR} />,
                        label: 'Export Backup',
                        subtitle: isExportingBackup ? 'Preparing backup...' : 'Save all records to a file',
                        onPress: () => {
                            if (__DEV__) {
                                // eslint-disable-next-line no-console
                                console.log('[Profile] Export Backup pressed');
                            }
                            handleExportBackup().catch(() => undefined);
                        },
                    },
                    {
                        type: 'navigation' as const,
                        key: 'restore',
                        icon: <Download size={17} color={ICON_COLOR} />,
                        label: 'Import Backup',
                        subtitle: isRestoringBackup ? 'Importing backup...' : 'Load a backup from storage',
                        onPress: () => {
                            if (__DEV__) {
                                // eslint-disable-next-line no-console
                                console.log('[Profile] Import Backup pressed');
                            }
                            handleRestoreBackup().catch(() => undefined);
                        },
                    },
                    {
                        type: 'navigation' as const,
                        key: 'logout',
                        icon: <LogOut size={17} color={ICON_ERROR} />,
                        label: 'Log Out',
                        subtitle: isLoggingOut ? 'Signing out...' : 'Sign out from this device',
                        onPress: () => {
                            if (__DEV__) {
                                // eslint-disable-next-line no-console
                                console.log('[Profile] Log Out pressed');
                            }
                            handleLogout().catch(() => undefined);
                        },
                    },
                    {
                        type: 'navigation' as const,
                        key: 'delete-account',
                        icon: <Trash2 size={17} color={ICON_ERROR} />,
                        label: 'Delete My Account',
                        subtitle: isDeletingAccount
                            ? 'Deleting account data...'
                            : 'Permanently delete account and all data',
                        onPress: () => {
                            if (__DEV__) {
                                // eslint-disable-next-line no-console
                                console.log('[Profile] Delete My Account pressed');
                            }
                            handleDeleteAccount().catch(() => undefined);
                        },
                    },
                ],
            },
        ],
        [
            handleDeleteAccount,
            isDark,
            isDeletingAccount,
            isExportingBackup,
            isLoggingOut,
            isRestoringBackup,
            isSwitchingLanguage,
            handleExportBackup,
            handleLogout,
            router,
            setThemeMode,
            handleRestoreBackup,
            handleNotificationToggle,
            mergedPreferences.notifications_enabled,
            currentLanguage,
            handleLanguagePress,
        ],
    );

    return (
        <ScreenErrorBoundary screenName="profile">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top']}>
                <CollapsibleHeaderScrollView
                    scrollRef={scrollRef}
                    header={
                        <ProfileHeader
                            user={profileUser}
                            stats={stats}
                            onAvatarPress={() => router.push('/profile/edit')}
                        />
                    }
                    headerHeight={310}
                    contentContainerStyle={{ paddingHorizontal: 16, backgroundColor: '#0f172a' }}
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
                        <View style={{ marginTop: 8, paddingBottom: 32 }}>
                            <SettingsList sections={sections} />
                        </View>
                    )}
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}

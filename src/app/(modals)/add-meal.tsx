import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Search, Scan, Camera, FileText, Link2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Heading, Body } from '../../components/ui/Typography';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { needsBodyMetrics, buildCompleteProfileRoute } from '../../utils/profileCompletion';

export default function AddMealModal() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const { t } = useTranslation();

    const menuItems = [
        {
            title: t('addMeal.options.template.title'),
            description: t('addMeal.options.template.subtitle'),
            icon: FileText,
            route: '/(modals)/load-template',
            color: "text-amber-500", // We can keep some specific branding colors or map to semantic
            bgColor: "bg-amber-50",
            borderColor: "border-amber-200"
        },
        {
            title: t('addMeal.options.search.title'),
            description: t('addMeal.options.search.subtitle'),
            icon: Search,
            route: '/(modals)/food-search',
            color: "text-primary",
            bgColor: "bg-background",
            borderColor: "border-border"
        },
        {
            title: t('addMeal.options.barcode.title'),
            description: t('addMeal.options.barcode.subtitle'),
            icon: Scan,
            route: '/(modals)/barcode-scanner',
            color: "text-primary",
            bgColor: "bg-background",
            borderColor: "border-border"
        },
        {
            title: t('addMeal.options.ai.title'),
            description: t('addMeal.options.ai.subtitle'),
            icon: Camera,
            route: '/(modals)/ai-food-detect',
            color: "text-primary",
            bgColor: "bg-background",
            borderColor: "border-border"
        },
        {
            title: t('addMeal.options.recipeImport.title'),
            description: t('addMeal.options.recipeImport.subtitle'),
            icon: Link2,
            route: '/(modals)/recipe-import',
            color: "text-primary",
            bgColor: "bg-background",
            borderColor: "border-border"
        }
    ];

    const handleMenuPress = (route: string) => {
        if (needsBodyMetrics(user)) {
            Alert.alert(
                'Complete profile first',
                'Add your height and weight once to personalize your first logged meals.',
                [
                    { text: 'Not now', style: 'cancel' },
                    {
                        text: 'Add now',
                        onPress: () => router.push(buildCompleteProfileRoute(route) as any),
                    },
                ]
            );
            return;
        }

        router.push(route as any);
    };

    return (
        <ScreenLayout className="bg-background">
            <View className="flex-row justify-between items-center mb-6">
                <Heading>{t('addMeal.title')}</Heading>
                <Button variant="ghost" size="sm" onPress={() => router.back()}>
                    <X size={24} className="text-foreground" />
                </Button>
            </View>

            <Body className="text-muted-foreground mb-8">
                {t('addMeal.subtitle')}
            </Body>

            <View className="space-y-4">
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleMenuPress(item.route)}
                        activeOpacity={0.7}
                    >
                        <Card className="flex-row items-center p-4">
                            <View className={`p-3 rounded-full mr-4 bg-muted`}>
                                <item.icon size={24} className="text-foreground" />
                            </View>
                            <View className="flex-1">
                                <CardTitle className="text-lg">{item.title}</CardTitle>
                                <CardDescription>{item.description}</CardDescription>
                            </View>
                        </Card>
                    </TouchableOpacity>
                ))}
            </View>
        </ScreenLayout>
    );
}

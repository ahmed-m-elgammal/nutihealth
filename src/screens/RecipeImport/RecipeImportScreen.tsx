import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/ui/Skeleton';
import URLInputModal from '../../components/RecipeImport/URLInputModal';
import {
    importRecipeFromUrl,
    mapImportErrorToMessageKey,
    RecipeImportError,
} from '../../services/recipeImportService';

/**
 * Screen step 1/2: URL entry + parsing loader.
 */
export default function RecipeImportScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    const [url, setUrl] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<RecipeImportError | null>(null);

    const errorMessage = useMemo(() => {
        if (!error) {
            return null;
        }

        return t(mapImportErrorToMessageKey(error.code));
    }, [error, t]);

    const handleImport = async () => {
        setError(null);
        setIsModalVisible(false);
        setIsLoading(true);

        try {
            const recipe = await importRecipeFromUrl(url);
            router.replace({
                pathname: '/(modals)/recipe-preview',
                params: { url: recipe.sourceUrl },
            });
        } catch (caughtError) {
            const recipeError =
                caughtError instanceof RecipeImportError
                    ? caughtError
                    : new RecipeImportError('UNKNOWN', 'Recipe import failed');

            setError(recipeError);
            setIsModalVisible(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            <View className="px-5 py-4 border-b border-neutral-200 bg-white flex-row items-center">
                <Pressable
                    onPress={() => router.back()}
                    className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#404040" />
                </Pressable>
                <Text className="text-xl font-bold text-neutral-900">{t('recipeImport.screenTitle')}</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 px-5 py-6">
                    <Text className="text-base text-neutral-600 mb-4">
                        {t('recipeImport.loading.subtitle')}
                    </Text>
                    <Skeleton className="h-52 w-full rounded-3xl mb-4" />
                    <Skeleton className="h-8 w-2/3 rounded-xl mb-2" />
                    <Skeleton className="h-4 w-full rounded-xl mb-2" />
                    <Skeleton className="h-4 w-4/5 rounded-xl mb-4" />
                    <Skeleton className="h-24 w-full rounded-2xl mb-3" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                </View>
            ) : (
                <View className="flex-1 px-5 py-6">
                    <View className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                        <Text className="text-3xl mb-2">🔗</Text>
                        <Text className="text-xl font-bold text-neutral-900 mb-2">
                            {t('recipeImport.intro.title')}
                        </Text>
                        <Text className="text-neutral-600 leading-6">
                            {t('recipeImport.intro.description')}
                        </Text>

                        <View className="mt-5">
                            {[1, 2, 3].map((step) => (
                                <View key={step} className="flex-row items-start mb-3">
                                    <View className="w-7 h-7 rounded-full bg-primary-100 items-center justify-center mr-3 mt-0.5">
                                        <Text className="text-primary-700 text-xs font-bold">{step}</Text>
                                    </View>
                                    <Text className="flex-1 text-neutral-700 leading-5">
                                        {t(`recipeImport.intro.steps.${step}`)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {!!errorMessage && (
                            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-4">
                                <Text className="text-red-700 mb-2">{errorMessage}</Text>
                                <Pressable
                                    onPress={handleImport}
                                    className="bg-red-100 rounded-xl px-3 py-2 self-start"
                                >
                                    <Text className="text-red-800 font-semibold">
                                        {t('recipeImport.actions.retry')}
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    <Pressable
                        className="mt-4 bg-primary-500 rounded-2xl py-4 items-center"
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Text className="text-white font-bold text-base">
                            {t('recipeImport.actions.enterUrl')}
                        </Text>
                    </Pressable>
                </View>
            )}

            <URLInputModal
                visible={isModalVisible}
                value={url}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onChangeValue={setUrl}
                onSubmit={handleImport}
                onRetry={handleImport}
                onClose={() => {
                    if (!isLoading) {
                        if (!url.trim()) {
                            router.back();
                            return;
                        }
                        setIsModalVisible(false);
                    }
                }}
            />
        </SafeAreaView>
    );
}
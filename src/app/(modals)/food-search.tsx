import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Plus, Clock, Database, Globe } from 'lucide-react-native';
import { searchFoods, SearchResult, SearchResults } from '../../services/api/foodSearch';
import { useUIStore } from '../../store/uiStore';

export default function FoodSearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ recent: [], database: [], external: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    const showToast = useUIStore((state) => state.showToast);

    useEffect(() => {
        // Load recent foods on mount
        loadInitialResults();
    }, []);

    useEffect(() => {
        // Debounced search
        if (query.trim().length === 0) {
            loadInitialResults();
            return;
        }

        const timer = setTimeout(() => {
            performSearch(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const loadInitialResults = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const searchResults = await searchFoods('', 10);
            setResults(searchResults);
        } catch (error) {
            setError(t('foodSearch.errors.load'));
            showToast('error', t('foodSearch.errors.load'));
        } finally {
            setIsLoading(false);
        }
    };

    const performSearch = async (searchQuery: string) => {
        setIsSearching(true);
        setError(null);
        try {
            const searchResults = await searchFoods(searchQuery);
            setResults(searchResults);
        } catch (error) {
            setError(t('foodSearch.errors.search'));
            showToast('error', t('foodSearch.errors.search'));
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectFood = (food: SearchResult) => {
        router.push({
            pathname: '/(modals)/food-details',
            params: { food: JSON.stringify(food) },
        });
    };

    // Prepare sections for SectionList
    const sections = [
        ...(results.recent.length > 0
            ? [
                  {
                      title: t('foodSearch.sections.recent'),
                      icon: Clock,
                      color: '#10b981',
                      data: results.recent,
                  },
              ]
            : []),
        ...(results.database.length > 0
            ? [
                  {
                      title: t('foodSearch.sections.database'),
                      icon: Database,
                      color: '#3b82f6',
                      data: results.database,
                  },
              ]
            : []),
        ...(results.external.length > 0
            ? [
                  {
                      title: t('foodSearch.sections.external'),
                      icon: Globe,
                      color: '#f59e0b',
                      data: results.external,
                  },
              ]
            : []),
    ];

    const renderFoodItem = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            className="flex-row items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 active:bg-neutral-50"
            onPress={() => handleSelectFood(item)}
        >
            <View className="mr-3 flex-1">
                <View className="mb-1 flex-row items-center gap-2">
                    <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.source === 'recent' && (
                        <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                            <Text className="text-xs font-medium text-emerald-700">
                                {t('foodSearch.sections.recent')}
                            </Text>
                        </View>
                    )}
                </View>
                {item.brand && (
                    <Text className="mb-1 text-sm text-neutral-500" numberOfLines={1}>
                        {item.brand}
                    </Text>
                )}
                <View className="flex-row gap-3">
                    <Text className="text-sm font-medium text-neutral-600">{Math.round(item.calories)} cal</Text>
                    <Text className="text-sm text-blue-600">P: {Math.round(item.protein)}g</Text>
                    <Text className="text-sm text-orange-600">C: {Math.round(item.carbs)}g</Text>
                    <Text className="text-sm text-purple-600">F: {Math.round(item.fats)}g</Text>
                </View>
            </View>
            <View className="rounded-full bg-emerald-100 p-2">
                <Plus size={18} color="#059669" />
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: any) => {
        const Icon = section.icon;
        return (
            <View className="flex-row items-center gap-2 bg-neutral-100 px-4 py-2">
                <Icon size={16} color={section.color} />
                <Text className="text-sm font-bold uppercase tracking-wide text-neutral-700">{section.title}</Text>
                <View className="rounded-full bg-neutral-200 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-neutral-600">{section.data.length}</Text>
                </View>
            </View>
        );
    };

    const renderEmptyComponent = () => (
        <View className="items-center justify-center bg-white p-8">
            <Search size={48} color="#d1d5db" />
            <Text className="mt-4 text-center text-base text-neutral-400">
                {query ? t('foodSearch.empty.notFound') : t('foodSearch.empty.startTyping')}
            </Text>
            {query.length > 0 && query.length < 3 && (
                <Text className="mt-2 text-center text-sm text-neutral-400">{t('foodSearch.empty.minChars')}</Text>
            )}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="border-b border-neutral-200 bg-white p-4 shadow-sm">
                <View className="mb-3 flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-neutral-100 p-2">
                        <ArrowLeft size={20} color="#525252" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-neutral-900">{t('foodSearch.title')}</Text>
                </View>

                {/* Search Input */}
                <View className="flex-row items-center rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3">
                    <Search size={20} color="#737373" />
                    <TextInput
                        placeholder={t('foodSearch.placeholder')}
                        placeholderTextColor="#a3a3a3"
                        className="ml-3 flex-1 text-base text-neutral-900"
                        autoFocus
                        value={query}
                        onChangeText={setQuery}
                    />
                    {isSearching && <ActivityIndicator size="small" color="#059669" />}
                </View>
            </View>

            {/* Results */}
            {error && (
                <View className="mx-4 mb-1 mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-sm text-red-700">{error}</Text>
                    <TouchableOpacity
                        onPress={() => (query.trim().length ? performSearch(query) : loadInitialResults())}
                        className="mt-2 self-start rounded-lg bg-red-100 px-3 py-1"
                    >
                        <Text className="text-xs font-semibold text-red-800">{t('foodSearch.retry')}</Text>
                    </TouchableOpacity>
                </View>
            )}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#059669" size="large" />
                    <Text className="mt-4 text-neutral-500">{t('foodSearch.loading')}</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => `${item.source}-${item.id}-${index}`}
                    renderItem={renderFoodItem}
                    renderSectionHeader={renderSectionHeader}
                    ListEmptyComponent={renderEmptyComponent}
                    contentContainerStyle={{ flexGrow: 1 }}
                    stickySectionHeadersEnabled={true}
                />
            )}
        </SafeAreaView>
    );
}

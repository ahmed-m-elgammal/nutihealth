import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Plus, Clock, Database, Globe } from 'lucide-react-native';
import { searchFoods, SearchResult, SearchResults } from '../../services/api/foodSearch';

export default function FoodSearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ recent: [], database: [], external: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

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
        try {
            const searchResults = await searchFoods('', 10);
            setResults(searchResults);
        } catch (error) {
            console.error('Failed to load recent foods:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const performSearch = async (searchQuery: string) => {
        setIsSearching(true);
        try {
            const searchResults = await searchFoods(searchQuery);
            setResults(searchResults);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectFood = (food: SearchResult) => {
        router.push({
            pathname: '/(modals)/food-details',
            params: { food: JSON.stringify(food) }
        });
    };

    // Prepare sections for SectionList
    const sections = [
        ...(results.recent.length > 0 ? [{
            title: 'Recent Foods',
            icon: Clock,
            color: '#10b981',
            data: results.recent
        }] : []),
        ...(results.database.length > 0 ? [{
            title: 'Your Custom Foods',
            icon: Database,
            color: '#3b82f6',
            data: results.database
        }] : []),
        ...(results.external.length > 0 ? [{
            title: 'OpenFoodFacts Database',
            icon: Globe,
            color: '#f59e0b',
            data: results.external
        }] : [])
    ];

    const renderFoodItem = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            className="bg-white px-4 py-3 border-b border-neutral-100 flex-row justify-between items-center active:bg-neutral-50"
            onPress={() => handleSelectFood(item)}
        >
            <View className="flex-1 mr-3">
                <View className="flex-row items-center gap-2 mb-1">
                    <Text className="font-semibold text-base text-neutral-900" numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.source === 'recent' && (
                        <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Text className="text-emerald-700 text-xs font-medium">Recent</Text>
                        </View>
                    )}
                </View>
                {item.brand && (
                    <Text className="text-neutral-500 text-sm mb-1" numberOfLines={1}>
                        {item.brand}
                    </Text>
                )}
                <View className="flex-row gap-3">
                    <Text className="text-neutral-600 text-sm font-medium">
                        {Math.round(item.calories)} cal
                    </Text>
                    <Text className="text-blue-600 text-sm">
                        P: {Math.round(item.protein)}g
                    </Text>
                    <Text className="text-orange-600 text-sm">
                        C: {Math.round(item.carbs)}g
                    </Text>
                    <Text className="text-purple-600 text-sm">
                        F: {Math.round(item.fats)}g
                    </Text>
                </View>
            </View>
            <View className="bg-emerald-100 p-2 rounded-full">
                <Plus size={18} color="#059669" />
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: any) => {
        const Icon = section.icon;
        return (
            <View className="bg-neutral-100 px-4 py-2 flex-row items-center gap-2">
                <Icon size={16} color={section.color} />
                <Text className="font-bold text-neutral-700 text-sm uppercase tracking-wide">
                    {section.title}
                </Text>
                <View className="bg-neutral-200 px-2 py-0.5 rounded-full">
                    <Text className="text-neutral-600 text-xs font-semibold">
                        {section.data.length}
                    </Text>
                </View>
            </View>
        );
    };

    const renderEmptyComponent = () => (
        <View className="p-8 items-center justify-center bg-white">
            <Search size={48} color="#d1d5db" />
            <Text className="text-neutral-400 text-center mt-4 text-base">
                {query
                    ? "No foods found. Try a different search term."
                    : "Start typing to search for foods."}
            </Text>
            {query.length > 0 && query.length < 3 && (
                <Text className="text-neutral-400 text-center mt-2 text-sm">
                    Type at least 3 characters for best results
                </Text>
            )}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="bg-white p-4 border-b border-neutral-200 shadow-sm">
                <View className="flex-row items-center gap-3 mb-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-neutral-100 p-2 rounded-full"
                    >
                        <ArrowLeft size={20} color="#525252" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-neutral-900">Search Foods</Text>
                </View>

                {/* Search Input */}
                <View className="bg-neutral-100 rounded-2xl flex-row items-center px-4 py-3 border border-neutral-200">
                    <Search size={20} color="#737373" />
                    <TextInput
                        placeholder="Search by name, brand, or barcode..."
                        placeholderTextColor="#a3a3a3"
                        className="flex-1 ml-3 text-base text-neutral-900"
                        autoFocus
                        value={query}
                        onChangeText={setQuery}
                    />
                    {isSearching && (
                        <ActivityIndicator size="small" color="#059669" />
                    )}
                </View>
            </View>

            {/* Results */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#059669" size="large" />
                    <Text className="text-neutral-500 mt-4">Loading recent foods...</Text>
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

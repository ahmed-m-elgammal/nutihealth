import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Search } from 'lucide-react-native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import CustomFood from '../../database/models/CustomFood';
import Recipe from '../../database/models/Recipe';
import { useDebounce } from '../../hooks/useDebounce';
import { searchFoods, SearchResult, SearchResults } from '../../services/api/foodSearch';
import { useAddMealDraftStore } from '../../store/addMealDraftStore';
import { useUIStore } from '../../store/uiStore';
import { useUserStore } from '../../store/userStore';
import EmptyState from '../common/EmptyState';
import { NoResultsIllustration } from '../illustrations/EmptyStateIllustrations';
import { FoodSearchSkeleton } from '../skeletons/ScreenSkeletons';
import ServingSizePicker from './ServingSizePicker';
import { stitchModalColors, stitchModalSharedStyles } from './modalTheme';

type StitchFoodSearchModalProps = {
    onClose: () => void;
};

type SearchRow = { id: string; kind: 'header'; title: string } | { id: string; kind: 'item'; item: SearchResult };
type TabKey = 'database' | 'myFoods' | 'recipes';

const HeaderRow = memo(({ title }: { title: string }) => <Text style={styles.sectionHeader}>{title}</Text>);

const FoodRow = memo(({ item, onPress }: { item: SearchResult; onPress: (food: SearchResult) => void }) => (
    <Pressable
        onPress={() => onPress(item)}
        android_ripple={{ color: 'rgba(16,183,127,0.2)' }}
        style={styles.foodRowCard}
    >
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodBrand}>{item.brand || 'Unknown brand'}</Text>
        <Text style={styles.foodCalories}>{Math.round(item.calories)} kcal / 100g</Text>
    </Pressable>
));

const customFoodToResult = (cf: CustomFood): SearchResult => ({
    id: cf.id,
    name: cf.name,
    brand: cf.brand,
    barcode: cf.barcode,
    calories: cf.calories,
    protein: cf.protein,
    carbs: cf.carbs,
    fats: cf.fats,
    fiber: cf.fiber,
    sugar: cf.sugar,
    servingSize: cf.servingSize,
    servingUnit: cf.servingUnit,
    source: 'database',
});

const recipeToResult = (r: Recipe): SearchResult => ({
    id: r.id,
    name: r.name,
    brand: 'My Recipe',
    calories: r.caloriesPerServing,
    protein: r.proteinPerServing,
    carbs: r.carbsPerServing,
    fats: r.fatsPerServing,
    servingSize: 1,
    servingUnit: 'serving',
    source: 'database',
});

function StitchFoodSearchModal({ onClose }: StitchFoodSearchModalProps) {
    const showToast = useUIStore((state) => state.showToast);
    const addFoodToDraft = useAddMealDraftStore((state) => state.addFood);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ recent: [], database: [], external: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('database');
    const debouncedQuery = useDebounce(query, 300);
    const requestIdRef = useRef(0);
    const userId = useUserStore((state) => state.user?.id);
    const [myFoods, setMyFoods] = useState<CustomFood[]>([]);
    const [myFoodsLoading, setMyFoodsLoading] = useState(false);
    const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
    const [recipesLoading, setRecipesLoading] = useState(false);

    useEffect(() => {
        const activeRequestId = ++requestIdRef.current;

        const runSearch = async () => {
            setIsSearching(true);
            try {
                const response = await searchFoods(debouncedQuery);
                if (activeRequestId === requestIdRef.current) {
                    setResults(response);
                }
            } finally {
                if (activeRequestId === requestIdRef.current) {
                    setIsSearching(false);
                }
            }
        };

        runSearch().catch(() => {
            if (activeRequestId === requestIdRef.current) {
                setIsSearching(false);
            }
        });
    }, [debouncedQuery]);

    useEffect(() => {
        if (activeTab !== 'myFoods' || !userId) return;

        setMyFoodsLoading(true);
        const q = database
            .get<CustomFood>('custom_foods')
            .query(
                Q.where('user_id', userId),
                Q.where('name', Q.like(`%${debouncedQuery.toLowerCase()}%`)),
                Q.sortBy('use_count', Q.desc),
                Q.take(60),
            );
        const sub = q.observe().subscribe((resultItems) => {
            setMyFoods(resultItems);
            setMyFoodsLoading(false);
        });

        return () => sub.unsubscribe();
    }, [activeTab, userId, debouncedQuery]);

    useEffect(() => {
        if (activeTab !== 'recipes' || !userId) return;

        setRecipesLoading(true);
        const q = database
            .get<Recipe>('recipes')
            .query(
                Q.where('user_id', userId),
                Q.where('name', Q.like(`%${debouncedQuery.toLowerCase()}%`)),
                Q.sortBy('created_at', Q.desc),
                Q.take(60),
            );
        const sub = q.observe().subscribe((resultItems) => {
            setMyRecipes(resultItems);
            setRecipesLoading(false);
        });

        return () => sub.unsubscribe();
    }, [activeTab, userId, debouncedQuery]);

    const rows = useMemo<SearchRow[]>(() => {
        const sections = [
            { title: 'Recent', data: results.recent },
            { title: 'Favourites', data: results.database.slice(0, 5) },
            { title: 'Search Results', data: results.external.concat(results.database.slice(5)) },
        ].filter((section) => section.data.length > 0);

        return sections.flatMap((section) => [
            { id: `header-${section.title}`, kind: 'header', title: section.title } as const,
            ...section.data.map((item) => ({ id: item.id, kind: 'item', item }) as const),
        ]);
    }, [results]);

    const onFoodPress = useCallback((food: SearchResult) => setSelectedFood(food), []);
    const keyExtractor = useCallback((item: SearchRow) => item.id, []);
    const getItemType = useCallback((item: SearchRow) => item.kind, []);

    const renderItem = useCallback(
        ({ item }: { item: SearchRow }) => {
            if (item.kind === 'header') return <HeaderRow title={item.title} />;
            return <FoodRow item={item.item} onPress={onFoodPress} />;
        },
        [onFoodPress],
    );

    const renderTab = (tab: TabKey, label: string) => {
        const active = activeTab === tab;
        return (
            <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                android_ripple={{ color: 'rgba(16,183,127,0.2)' }}
            >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[stitchModalSharedStyles.headerRow, styles.topBar]}>
                <Pressable onPress={onClose} style={stitchModalSharedStyles.closeButton}>
                    <ArrowLeft size={18} color={stitchModalColors.textMain} />
                </Pressable>
                <Text style={styles.title}>Search Food</Text>
                <View style={styles.topSpacer} />
            </View>

            <View style={styles.searchBar}>
                <Search size={16} color={stitchModalColors.textSecondary} />
                <TextInput
                    placeholder="Search food"
                    placeholderTextColor={stitchModalColors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.tabBar}>
                {renderTab('database', 'Database')}
                {renderTab('myFoods', 'My Foods')}
                {renderTab('recipes', 'Recipes')}
            </View>

            {activeTab === 'database' && (
                <>
                    {isSearching ? <FoodSearchSkeleton /> : null}
                    {!isSearching && rows.length === 0 && query.trim().length > 0 ? (
                        <EmptyState
                            illustration={<NoResultsIllustration />}
                            title="No results found"
                            message="Try a different keyword or check your spelling."
                        />
                    ) : null}
                    {!isSearching ? (
                        <FlashList
                            data={rows}
                            keyExtractor={keyExtractor}
                            getItemType={getItemType}
                            renderItem={renderItem}
                            style={styles.resultsList}
                        />
                    ) : null}
                </>
            )}

            {activeTab === 'myFoods' && (
                <>
                    {myFoodsLoading ? <FoodSearchSkeleton /> : null}
                    {!myFoodsLoading && myFoods.length === 0 ? (
                        <EmptyState
                            illustration={<NoResultsIllustration />}
                            title="No custom foods yet"
                            message="Foods you add manually will appear here."
                        />
                    ) : null}
                    {!myFoodsLoading && myFoods.length > 0 ? (
                        <FlashList
                            data={myFoods.map(customFoodToResult)}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => <FoodRow item={item} onPress={onFoodPress} />}
                            style={styles.resultsList}
                        />
                    ) : null}
                </>
            )}

            {activeTab === 'recipes' && (
                <>
                    {recipesLoading ? <FoodSearchSkeleton /> : null}
                    {!recipesLoading && myRecipes.length === 0 ? (
                        <EmptyState
                            illustration={<NoResultsIllustration />}
                            title="No recipes yet"
                            message="Recipes you save from Smart Cooker will appear here."
                        />
                    ) : null}
                    {!recipesLoading && myRecipes.length > 0 ? (
                        <FlashList
                            data={myRecipes.map(recipeToResult)}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => <FoodRow item={item} onPress={onFoodPress} />}
                            style={styles.resultsList}
                        />
                    ) : null}
                </>
            )}

            <ServingSizePicker
                visible={Boolean(selectedFood)}
                foodName={selectedFood?.name || ''}
                caloriesPerServing={Math.max(1, Math.round(selectedFood?.calories || 0))}
                onClose={() => setSelectedFood(null)}
                onAdd={(payload) => {
                    if (!selectedFood) return;
                    addFoodToDraft(selectedFood, { quantity: payload.quantity, unit: payload.unit });
                    showToast('success', `${selectedFood.name} added`);
                    setSelectedFood(null);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: stitchModalColors.bgDark,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    topBar: {
        marginBottom: 12,
    },
    topSpacer: {
        width: 38,
        height: 38,
    },
    title: {
        color: stitchModalColors.textMain,
        fontWeight: '800',
        fontSize: 18,
    },
    searchBar: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
        backgroundColor: stitchModalColors.cardDark,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        color: stitchModalColors.textMain,
        paddingVertical: 11,
    },
    tabBar: {
        marginTop: 10,
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
        backgroundColor: stitchModalColors.cardDark,
        padding: 4,
        gap: 6,
    },
    tabButton: {
        flex: 1,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
    },
    tabButtonActive: {
        backgroundColor: stitchModalColors.primary,
    },
    tabText: {
        color: stitchModalColors.textSecondary,
        fontWeight: '600',
        fontSize: 12,
    },
    tabTextActive: {
        color: stitchModalColors.textMain,
        fontWeight: '700',
    },
    resultsList: {
        marginTop: 10,
    },
    sectionHeader: {
        marginTop: 14,
        marginBottom: 6,
        color: stitchModalColors.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontSize: 11,
    },
    foodRowCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: stitchModalColors.border,
        backgroundColor: stitchModalColors.cardDark,
        padding: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    foodName: {
        fontWeight: '700',
        color: stitchModalColors.textMain,
    },
    foodBrand: {
        color: stitchModalColors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    foodCalories: {
        color: stitchModalColors.primary,
        fontSize: 12,
        marginTop: 6,
        fontWeight: '700',
    },
});

export default memo(StitchFoodSearchModal);

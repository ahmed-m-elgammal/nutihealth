import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search } from 'lucide-react-native';
import { searchFoods, SearchResult, SearchResults } from '../../services/api/foodSearch';
import ServingSizePicker from './ServingSizePicker';
import EmptyState from '../common/EmptyState';
import { FoodSearchSkeleton } from '../skeletons/ScreenSkeletons';
import { NoResultsIllustration } from '../illustrations/EmptyStateIllustrations';

type FoodSearchModalProps = {
    onClose: () => void;
};

type SearchRow = { id: string; kind: 'header'; title: string } | { id: string; kind: 'item'; item: SearchResult };

const HeaderRow = memo(({ title }: { title: string }) => (
    <Text style={{ marginTop: 14, marginBottom: 6, color: '#475569', fontWeight: '700' }}>{title}</Text>
));

const FoodRow = memo(({ item, onPress }: { item: SearchResult; onPress: (food: SearchResult) => void }) => (
    <Pressable
        onPress={() => onPress(item)}
        android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
        style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 12,
            marginBottom: 8,
            overflow: 'hidden',
        }}
    >
        <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.name}</Text>
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.brand || 'Unknown brand'}</Text>
        <Text style={{ color: '#334155', fontSize: 12, marginTop: 6 }}>{Math.round(item.calories)} kcal / 100g</Text>
    </Pressable>
));

function FoodSearchModal({ onClose }: FoodSearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ recent: [], database: [], external: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null);

    useEffect(() => {
        const timer = setTimeout(async () => {
            setIsSearching(true);
            const r = await searchFoods(query);
            setResults(r);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const rows = useMemo<SearchRow[]>(() => {
        const sections = [
            { title: 'Recent', data: results.recent },
            { title: 'Favourites', data: results.database.slice(0, 5) },
            { title: 'Search Results', data: results.external.concat(results.database.slice(5)) },
        ].filter((s) => s.data.length > 0);

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

    return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Search size={16} color="#64748b" />
                    <TextInput
                        placeholder="Search food"
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        style={{ flex: 1, paddingVertical: 10 }}
                    />
                </View>
                <Pressable onPress={onClose} style={{ paddingHorizontal: 8, paddingVertical: 10 }}>
                    <Text style={{ fontWeight: '700', color: '#334155' }}>Close</Text>
                </Pressable>
            </View>

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
                    estimatedItemSize={74}
                    keyExtractor={keyExtractor}
                    getItemType={getItemType}
                    renderItem={renderItem}
                    style={{ marginTop: 10 }}
                />
            ) : null}

            <ServingSizePicker
                visible={Boolean(selectedFood)}
                foodName={selectedFood?.name || ''}
                caloriesPerServing={Math.max(1, Math.round(selectedFood?.calories || 0))}
                onClose={() => setSelectedFood(null)}
                onAdd={() => setSelectedFood(null)}
            />
        </View>
    );
}

export default memo(FoodSearchModal);

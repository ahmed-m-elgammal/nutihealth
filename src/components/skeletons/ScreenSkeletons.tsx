import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';

export function HomeSkeleton() {
    return (
        <View className="px-4 pt-3">
            <Skeleton height={200} className="mb-4" />
            <View className="mb-4 flex-row flex-wrap justify-between gap-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} width="48%" height={74} />
                ))}
            </View>
            {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} className="mb-3">
                    <Skeleton width={130} height={18} className="mb-2" />
                    <Skeleton height={64} className="mb-2" />
                    <Skeleton height={64} />
                </View>
            ))}
        </View>
    );
}

export function MealsSkeleton() {
    return (
        <View className="px-4 pt-4">
            <View className="mb-3 flex-row justify-between">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} width={38} height={56} borderRadius={18} />
                ))}
            </View>
            <Skeleton height={64} className="mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} className="mb-4">
                    <Skeleton width={160} height={22} className="mb-2" />
                    {Array.from({ length: 4 }).map((__, j) => (
                        <Skeleton key={j} height={64} className="mb-2" />
                    ))}
                </View>
            ))}
        </View>
    );
}

export function ProgressSkeleton() {
    return (
        <View className="px-4 pt-4">
            <Skeleton height={40} className="mb-4" />
            <Skeleton height={200} className="mb-4" />
            <View className="mb-4 flex-row justify-between">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} width="31%" height={100} />
                ))}
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} width="48%" height={74} />
                ))}
            </View>
        </View>
    );
}

export function WorkoutSkeleton() {
    return (
        <View className="px-4 pt-4">
            <Skeleton height={76} className="mb-4" />
            <Skeleton height={170} className="mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={72} className="mb-3" />
            ))}
        </View>
    );
}

export function ProfileSkeleton() {
    return (
        <View className="px-4 pt-8">
            <View className="items-center">
                <Skeleton width={90} height={90} borderRadius={45} className="mb-4" />
                <Skeleton width={180} height={20} className="mb-2" />
                <Skeleton width={140} height={14} className="mb-5" />
            </View>
            <View className="mb-4 flex-row justify-between">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} width="31%" height={74} />
                ))}
            </View>
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={58} className="mb-2" />
            ))}
        </View>
    );
}

export function FoodSearchSkeleton() {
    return (
        <View className="px-4 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} className="mb-3 flex-row items-center">
                    <Skeleton width={44} height={44} borderRadius={22} className="mr-3" />
                    <View className="flex-1">
                        <Skeleton width="70%" height={14} className="mb-2" />
                        <Skeleton width="45%" height={12} />
                    </View>
                    <Skeleton width={56} height={24} borderRadius={12} />
                </View>
            ))}
        </View>
    );
}

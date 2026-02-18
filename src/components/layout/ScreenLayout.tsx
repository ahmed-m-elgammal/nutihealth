import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../utils/cn';

export interface ScreenLayoutProps extends ViewProps {
    children: React.ReactNode;
    /** Skip default horizontal padding */
    noPadding?: boolean;
    /** Custom safe area edges */
    edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
    className?: string;
}

/**
 * ScreenLayout wrapper component to reduce repetitive padding and SafeAreaView logic.
 * Provides consistent screen background and spacing.
 * 
 * @example
 * <ScreenLayout>
 *   <Heading>Welcome</Heading>
 *   <Body>Your content here</Body>
 * </ScreenLayout>
 * 
 * @example
 * <ScreenLayout noPadding edges={['top']}>
 *   <CustomHeader />
 * </ScreenLayout>
 */
export function ScreenLayout({
    children,
    noPadding = false,
    edges = ['top'],
    className,
    ...props
}: ScreenLayoutProps) {
    return (
        <SafeAreaView
            className={cn('flex-1 bg-background', className)}
            edges={edges}
            {...props}
        >
            <View className={cn('flex-1', !noPadding && 'px-4')}>
                {children}
            </View>
        </SafeAreaView>
    );
}

export default ScreenLayout;

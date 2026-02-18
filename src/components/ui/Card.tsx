import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '../../utils/cn';

/**
 * Base Card component for grouping related content.
 * Uses semantic color tokens for background and borders.
 */
export interface CardProps extends ViewProps {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <View
            className={cn(
                'rounded-lg border border-border bg-card p-6',
                'w-full md:max-w-3xl md:mx-auto',
                className
            )}
            {...props}
        >
            {children}
        </View>
    );
}

/**
 * Card header section for titles and descriptions.
 */
export interface CardHeaderProps extends ViewProps {
    children: React.ReactNode;
    className?: string;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
    return (
        <View className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props}>
            {children}
        </View>
    );
}

/**
 * Card title component.
 */
export interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <Text className={cn('text-lg font-semibold leading-none tracking-tight text-card-foreground', className)}>
            {children}
        </Text>
    );
}

/**
 * Card description component for muted text.
 */
export interface CardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <Text className={cn('text-sm text-muted-foreground', className)}>
            {children}
        </Text>
    );
}

/**
 * Card content section for main body.
 */
export interface CardContentProps extends ViewProps {
    children: React.ReactNode;
    className?: string;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
    return (
        <View className={cn('py-4', className)} {...props}>
            {children}
        </View>
    );
}

/**
 * Card footer section for actions.
 */
export interface CardFooterProps extends ViewProps {
    children: React.ReactNode;
    className?: string;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
    return (
        <View className={cn('flex flex-row items-center pt-4', className)} {...props}>
            {children}
        </View>
    );
}

// Export default Card component
export default Card;

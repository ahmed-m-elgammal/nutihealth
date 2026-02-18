import React from 'react';
import { Text, TextProps } from 'react-native';
import { cn } from '../../utils/cn';

/**
 * Large display heading component.
 * Uses display font family with bold weight.
 */
export interface HeadingProps extends TextProps {
    children: React.ReactNode;
    className?: string;
}

export function Heading({ children, className, ...props }: HeadingProps) {
    return (
        <Text
            className={cn('text-2xl font-display font-bold text-foreground', className)}
            {...props}
        >
            {children}
        </Text>
    );
}

/**
 * Section subheading component.
 * Uses heading font family with semibold weight.
 */
export interface SubheadingProps extends TextProps {
    children: React.ReactNode;
    className?: string;
}

export function Subheading({ children, className, ...props }: SubheadingProps) {
    return (
        <Text
            className={cn('text-lg font-heading font-semibold text-foreground', className)}
            {...props}
        >
            {children}
        </Text>
    );
}

/**
 * Body text component.
 * Uses body font family with regular weight.
 */
export interface BodyProps extends TextProps {
    children: React.ReactNode;
    className?: string;
}

export function Body({ children, className, ...props }: BodyProps) {
    return (
        <Text
            className={cn('text-base font-body text-foreground', className)}
            {...props}
        >
            {children}
        </Text>
    );
}

/**
 * Small caption text component.
 * Uses muted foreground color for secondary text.
 */
export interface CaptionProps extends TextProps {
    children: React.ReactNode;
    className?: string;
}

export function Caption({ children, className, ...props }: CaptionProps) {
    return (
        <Text
            className={cn('text-sm font-caption text-muted-foreground', className)}
            {...props}
        >
            {children}
        </Text>
    );
}

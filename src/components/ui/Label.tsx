import React from 'react';
import { Text, TextProps } from 'react-native';
import { cn } from '../../utils/cn';

/**
 * Label component for form fields.
 * Provides consistent styling and accessibility for input labels.
 */
export interface LabelProps extends TextProps {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
}

export function Label({ children, className, ...props }: LabelProps) {
    return (
        <Text
            className={cn(
                'text-sm font-medium leading-none text-foreground mb-2',
                className
            )}
            {...props}
        >
            {children}
        </Text>
    );
}

export default Label;

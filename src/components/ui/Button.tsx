import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Button variant definitions using CVA.
 * Provides type-safe variants with automatic class merging.
 */
const buttonVariants = cva(
    // Base classes applied to all variants
    'rounded-lg items-center justify-center flex-row',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                destructive: 'bg-destructive',
                outline: 'border-2 border-input bg-transparent',
                secondary: 'bg-secondary',
                ghost: 'bg-transparent',
                link: 'bg-transparent',
            },
            size: {
                default: 'h-11 px-4 py-3',
                sm: 'h-9 px-3 py-2',
                lg: 'h-12 px-8 py-4',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

const buttonTextVariants = cva(
    'font-semibold text-center',
    {
        variants: {
            variant: {
                default: 'text-primary-foreground',
                destructive: 'text-destructive-foreground',
                outline: 'text-foreground',
                secondary: 'text-secondary-foreground',
                ghost: 'text-foreground',
                link: 'text-primary underline',
            },
            size: {
                default: 'text-base',
                sm: 'text-sm',
                lg: 'text-lg',
                icon: 'text-base',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends Omit<TouchableOpacityProps, 'style'>,
    VariantProps<typeof buttonVariants> {
    children: React.ReactNode;
    loading?: boolean;
    className?: string;
}

/**
 * Button component with semantic variants and consistent styling.
 * Uses CVA for type-safe variant composition.
 * 
 * @example
 * <Button variant="default" size="lg" onPress={handleSubmit}>
 *   Submit
 * </Button>
 * 
 * @example
 * <Button variant="outline" loading={isLoading}>
 *   Loading...
 * </Button>
 */
export function Button({
    children,
    variant,
    size,
    disabled = false,
    loading = false,
    className,
    accessibilityLabel,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    // Default accessibility label to children if it's a string
    const label = accessibilityLabel || (typeof children === 'string' ? children : 'Button');

    // Determine spinner color based on variant
    const getSpinnerColor = () => {
        if (variant === 'outline' || variant === 'ghost' || variant === 'link') {
            return 'hsl(var(--primary))';
        }
        return 'hsl(var(--primary-foreground))';
    };

    return (
        <TouchableOpacity
            disabled={isDisabled}
            className={cn(buttonVariants({ variant, size }), className)}
            style={{ opacity: isDisabled ? 0.5 : 1 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getSpinnerColor()} size="small" />
            ) : (
                <Text className={cn(buttonTextVariants({ variant, size }))}>
                    {children}
                </Text>
            )}
        </TouchableOpacity>
    );
}

export default Button;

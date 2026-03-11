import React from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { cn } from '../../utils/cn';

type CheckboxProps = {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    className?: string;
    accessibilityLabel?: string;
};

export function Checkbox({ value, onValueChange, disabled = false, className, accessibilityLabel }: CheckboxProps) {
    return (
        <Pressable
            onPress={() => {
                if (!disabled) onValueChange(!value);
            }}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ checked: value, disabled }}
            className={cn(
                'h-5 w-5 items-center justify-center rounded border',
                value ? 'border-primary bg-primary' : 'border-border bg-card',
                disabled ? 'opacity-50' : '',
                className,
            )}
        >
            <View pointerEvents="none">{value ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}</View>
        </Pressable>
    );
}

export default Checkbox;

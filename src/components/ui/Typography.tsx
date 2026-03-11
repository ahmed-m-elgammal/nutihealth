import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { cn } from '../../utils/cn';
import { designTokens } from '../../theme/design-tokens';

type TypographyProps = TextProps & {
    children: React.ReactNode;
    color?: string;
    align?: TextStyle['textAlign'];
    className?: string;
};

function createTextStyle(size: keyof typeof designTokens.typography.size) {
    return {
        fontSize: designTokens.typography.size[size],
        lineHeight: designTokens.typography.lineHeight[size],
    };
}

function createTextComponent(style: TextStyle, defaultClassName: string, defaultFontFamily: string) {
    return function TypographyComponent({
        children,
        color,
        align,
        className,
        allowFontScaling = true,
        style: styleOverride,
        ...props
    }: TypographyProps) {
        return (
            <Text
                allowFontScaling={allowFontScaling}
                className={cn(defaultClassName, className)}
                style={[
                    style,
                    {
                        color,
                        textAlign: align,
                        fontFamily: defaultFontFamily,
                    },
                    styleOverride,
                ]}
                {...props}
            >
                {children}
            </Text>
        );
    };
}

export const H1 = createTextComponent(
    { ...createTextStyle('h1'), fontWeight: '700' },
    'text-foreground',
    designTokens.typography.fontFamily.display,
);
export const H3 = createTextComponent(
    { ...createTextStyle('h3'), fontWeight: '600' },
    'text-foreground',
    designTokens.typography.fontFamily.heading,
);
export const Body = createTextComponent(
    { ...createTextStyle('body') },
    'text-foreground',
    designTokens.typography.fontFamily.body,
);
// Backward compatible aliases
export const Heading = H1;
export const Subheading = H3;

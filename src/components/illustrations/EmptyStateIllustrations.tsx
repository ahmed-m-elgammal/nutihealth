import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

type IllustrationProps = { size?: number };

function Frame({ size = 120, children }: React.PropsWithChildren<IllustrationProps>) {
    return (
        <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
            {children}
        </Svg>
    );
}

export const EmptyPlateIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Ellipse cx="60" cy="90" rx="34" ry="8" fill="#DBEAFE" />
        <Circle cx="60" cy="64" r="28" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="3" />
        <Circle cx="60" cy="64" r="14" fill="#F8FAFC" />
        <Path d="M45 34C45 30 48 28 50 24" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
        <Path d="M60 30C60 25 63 23 65 19" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
        <Path d="M75 34C75 30 78 27 80 23" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
    </Frame>
);

export const EmptyCalendarIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Rect x="20" y="24" width="80" height="72" rx="12" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
        <Rect x="20" y="24" width="80" height="20" rx="12" fill="#F59E0B" />
        <Circle cx="46" cy="67" r="4" fill="#92400E" />
        <Circle cx="74" cy="67" r="4" fill="#92400E" />
        <Path d="M47 82C53 87 67 87 73 82" stroke="#B91C1C" strokeWidth="3" strokeLinecap="round" />
    </Frame>
);

export const HammockIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Line x1="20" y1="26" x2="20" y2="96" stroke="#64748B" strokeWidth="4" />
        <Line x1="100" y1="26" x2="100" y2="96" stroke="#64748B" strokeWidth="4" />
        <Path d="M20 38C42 52 78 52 100 38" stroke="#94A3B8" strokeWidth="3" />
        <Path d="M30 52C45 70 75 70 90 52" fill="#A7F3D0" stroke="#10B981" strokeWidth="3" />
        <Circle cx="58" cy="52" r="6" fill="#FDE68A" />
    </Frame>
);

export const SeedlingChartIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Path d="M20 90H100" stroke="#CBD5E1" strokeWidth="3" />
        <Path d="M28 90V50" stroke="#CBD5E1" strokeWidth="3" />
        <Path
            d="M38 82L52 66L66 70L84 46"
            stroke="#60A5FA"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Rect x="52" y="82" width="16" height="8" rx="2" fill="#92400E" />
        <Path d="M60 82V66" stroke="#16A34A" strokeWidth="3" />
        <Path d="M60 70C52 70 50 62 55 58C60 61 62 66 60 70Z" fill="#4ADE80" />
        <Path d="M60 74C68 74 70 66 65 62C60 65 58 70 60 74Z" fill="#22C55E" />
    </Frame>
);

export const NoPlanIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Path d="M32 32L88 88" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
        <Path d="M88 32L32 88" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
        <Path d="M36 74C36 56 48 46 60 46C72 46 84 56 84 74" stroke="#94A3B8" strokeWidth="3" />
        <Rect x="28" y="74" width="20" height="8" rx="3" fill="#94A3B8" />
        <Rect x="72" y="74" width="20" height="8" rx="3" fill="#94A3B8" />
    </Frame>
);

export const EmptyGlassIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Path d="M38 28H82L76 92H44L38 28Z" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="3" />
        <Path d="M46 78H74" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 4" />
        <Circle cx="60" cy="42" r="3" fill="#BAE6FD" />
    </Frame>
);

export const NoResultsIllustration = ({ size }: IllustrationProps) => (
    <Frame size={size}>
        <Circle cx="52" cy="52" r="24" stroke="#64748B" strokeWidth="6" />
        <Line x1="70" y1="70" x2="94" y2="94" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />
        <Path d="M52 42V58" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
        <Circle cx="52" cy="66" r="2" fill="#0F172A" />
    </Frame>
);

export const illustrations = {
    home: EmptyPlateIllustration,
    meals: EmptyCalendarIllustration,
    workouts: HammockIllustration,
    progress: SeedlingChartIllustration,
    plans: NoPlanIllustration,
    water: EmptyGlassIllustration,
    search: NoResultsIllustration,
};

export default illustrations;

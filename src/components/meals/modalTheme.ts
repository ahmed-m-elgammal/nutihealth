import { StyleSheet } from 'react-native';

export const stitchModalColors = {
    primary: '#10b77f',
    bgDark: '#10221c',
    cardDark: '#1e293b',
    textMain: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    panelDark: '#0f172a',
} as const;

export const stitchModalSharedStyles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16,183,127,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(16,183,127,0.34)',
    },
    actionButton: {
        borderRadius: 14,
        backgroundColor: stitchModalColors.primary,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: stitchModalColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.34,
        shadowRadius: 14,
        elevation: 10,
    },
    actionButtonText: {
        color: stitchModalColors.textMain,
        fontWeight: '800',
    },
});

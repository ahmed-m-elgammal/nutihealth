import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ActivePlanHero from '../ActivePlanHero';
import type { ActivePlanSummary } from '../../../hooks/usePlansScreenData';

type Props = {
    activePlan: ActivePlanSummary | null;
    onEdit: () => void;
    onDeactivate: () => Promise<void>;
};

export default function PrescribedPlanSection({ activePlan, onEdit, onDeactivate }: Props) {
    const router = useRouter();

    return (
        <ActivePlanHero
            plan={activePlan}
            onEdit={onEdit}
            onDeactivate={() => {
                if (!activePlan) return;
                const planKind = activePlan.source === 'weekly' ? 'weekly plan' : 'template';
                Alert.alert('Deactivate plan', `Do you want to deactivate this ${planKind}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Deactivate',
                        style: 'destructive',
                        onPress: () => {
                            onDeactivate().catch(() => undefined);
                        },
                    },
                ]);
            }}
            onCreatePlan={() => router.push('/(modals)/create-weekly-plan')}
            onManagePlans={() => router.push('/(modals)/weekly-plans')}
        />
    );
}

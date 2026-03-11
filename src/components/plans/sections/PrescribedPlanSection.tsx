import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import ActivePlanHero from '../ActivePlanHero';
import ConfirmationSheet from '../../common/ConfirmationSheet';
import type { ActivePlanSummary } from '../../../hooks/usePlansScreenData';

type Props = {
    activePlan: ActivePlanSummary | null;
    onEdit: () => void;
    onDeactivate: () => Promise<void>;
};

export default function PrescribedPlanSection({ activePlan, onEdit, onDeactivate }: Props) {
    const router = useRouter();
    const { t } = useTranslation();
    const [showDeactivateSheet, setShowDeactivateSheet] = useState(false);

    const planKind = useMemo(
        () => (activePlan?.source === 'weekly' ? t('plans.labels.weeklyPlan') : t('plans.labels.template')),
        [activePlan?.source, t],
    );

    return (
        <>
            <ActivePlanHero
                plan={activePlan}
                onEdit={onEdit}
                onDeactivate={() => {
                    if (!activePlan) return;
                    setShowDeactivateSheet(true);
                }}
                onCreatePlan={() => router.push('/(modals)/create-weekly-plan')}
                onManagePlans={() => router.push('/(modals)/weekly-plans')}
            />

            <ConfirmationSheet
                visible={showDeactivateSheet}
                title={t('plans.confirmation.deactivateTitle')}
                message={t('plans.confirmation.deactivateMessage', { planKind })}
                confirmLabel={t('plans.confirmation.deactivateConfirm')}
                cancelLabel={t('plans.actions.cancel')}
                onCancel={() => setShowDeactivateSheet(false)}
                onConfirm={() => {
                    setShowDeactivateSheet(false);
                    onDeactivate().catch(() => undefined);
                }}
                destructive
            />
        </>
    );
}

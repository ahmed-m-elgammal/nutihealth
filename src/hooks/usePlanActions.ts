import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { deactivateActiveDiet } from '../services/api/plans';
import { deactivatePlan } from '../services/api/weeklyGoals';
import { useUIStore } from '../store/uiStore';
import type { ActivePlanSummary } from './usePlansScreenData';

interface UsePlanActionsOptions {
    userId?: string;
    activePlan: ActivePlanSummary | null;
    activeWeeklyGoalPlanId?: string;
    activateDiet: (userId: string, dietId: string) => Promise<unknown>;
    refetchActiveDiet: () => Promise<unknown>;
    refetchActiveWeeklyGoalPlan: () => Promise<unknown>;
}

export function usePlanActions({
    userId,
    activePlan,
    activeWeeklyGoalPlanId,
    activateDiet,
    refetchActiveDiet,
    refetchActiveWeeklyGoalPlan,
}: UsePlanActionsOptions) {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const posthog = usePostHog();

    const openPrefilledWeeklyPlan = ({
        name,
        calories,
        protein,
        carbs,
        fats,
    }: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    }) => {
        router.push({
            pathname: '/(modals)/create-weekly-plan',
            params: {
                prefillName: name,
                prefillCalories: String(calories),
                prefillProtein: String(protein),
                prefillCarbs: String(carbs),
                prefillFats: String(fats),
            },
        } as never);
    };

    const activateTemplate = async (templateId: string, templateName: string) => {
        if (!userId) return;

        try {
            if (activeWeeklyGoalPlanId) {
                await deactivatePlan(activeWeeklyGoalPlanId);
                await refetchActiveWeeklyGoalPlan();
            }

            await activateDiet(userId, templateId);
            await refetchActiveDiet();
            posthog.capture('diet_plan_activated', { plan_name: templateName, plan_id: templateId });
            showToast('success', `${templateName} activated`);
        } catch {
            showToast('error', 'Failed to activate template');
        }
    };

    const deactivateCurrentPlan = async () => {
        if (!activePlan || !userId) return;

        try {
            if (activePlan.source === 'weekly') {
                await deactivatePlan(activePlan.id);
                await refetchActiveWeeklyGoalPlan();
                showToast('info', 'Weekly plan deactivated');
                return;
            }

            await deactivateActiveDiet(userId);
            await refetchActiveDiet();
            posthog.capture('diet_plan_deactivated', { plan_kind: 'template' });
            showToast('info', 'Template deactivated');
        } catch {
            showToast('error', 'Failed to deactivate plan');
        }
    };

    const handleEditActivePlan = () => {
        if (!activePlan) {
            router.push('/(modals)/create-weekly-plan');
            return;
        }

        if (activePlan.source === 'weekly') {
            router.push({ pathname: '/(modals)/create-weekly-plan', params: { planId: activePlan.id } } as never);
            return;
        }

        openPrefilledWeeklyPlan({
            name: activePlan.name,
            calories: activePlan.dailyCalories,
            protein: activePlan.macros.protein,
            carbs: activePlan.macros.carbs,
            fats: activePlan.macros.fats,
        });
    };

    return {
        openPrefilledWeeklyPlan,
        activateTemplate,
        deactivateCurrentPlan,
        handleEditActivePlan,
    };
}

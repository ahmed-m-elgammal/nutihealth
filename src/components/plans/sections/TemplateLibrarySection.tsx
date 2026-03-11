import React from 'react';
import { Alert } from 'react-native';
import TemplateLibrary from '../TemplateLibrary';
import type { PlanTemplateCard } from '../../../hooks/usePlansScreenData';

type Props = {
    templateCards: PlanTemplateCard[];
    onActivateTemplate: (templateId: string, templateName: string) => Promise<void>;
    onCustomizeTemplate: (template: PlanTemplateCard) => void;
};

export default function TemplateLibrarySection({ templateCards, onActivateTemplate, onCustomizeTemplate }: Props) {
    return (
        <TemplateLibrary
            templates={templateCards}
            onTemplatePress={(template) => {
                const scoreLabel = typeof template.score === 'number' ? `\n${template.score}% fit` : '';
                const insightLabel = template.insight ? `\n${template.insight}` : '';
                Alert.alert(template.name, `${template.type} • ${template.calories}${scoreLabel}${insightLabel}`, [
                    {
                        text: 'Activate',
                        onPress: () => {
                            onActivateTemplate(template.id, template.name).catch(() => undefined);
                        },
                    },
                    {
                        text: 'Customize',
                        onPress: () => onCustomizeTemplate(template),
                    },
                    { text: 'Close', style: 'cancel' },
                ]);
            }}
            onTemplateLongPress={(template) => {
                onActivateTemplate(template.id, template.name).catch(() => undefined);
            }}
        />
    );
}

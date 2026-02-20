import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import { getLanguage, setLanguage } from '../utils/storage';

export type SupportedLanguage = 'en' | 'ar' | 'es';

const loadedLanguages = new Set<SupportedLanguage>(['en']);

const localeLoaders: Record<Exclude<SupportedLanguage, 'en'>, () => Promise<{ default: Record<string, unknown> }>> = {
    ar: () => import('./locales/ar.json'),
    es: () => import('./locales/es.json'),
};

const isSupportedLanguage = (value?: string): value is SupportedLanguage =>
    value === 'en' || value === 'ar' || value === 'es';

const ensureLocaleLoaded = async (language: SupportedLanguage) => {
    if (loadedLanguages.has(language)) {
        return;
    }

    const loader = localeLoaders[language as Exclude<SupportedLanguage, 'en'>];
    if (!loader) {
        return;
    }

    const module = await loader();
    i18n.addResourceBundle(language, 'translation', module.default, true, true);
    loadedLanguages.add(language);
};

if (!i18n.isInitialized) {
    i18n.use(initReactI18next)
        .init({
            resources: {
                en: { translation: en },
            },
            lng: 'en',
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
            returnNull: false,
            compatibilityJSON: 'v4',
        })
        .catch(() => undefined);
}

export async function initializeI18n() {
    const preferredLanguage = await getLanguage();
    const language: SupportedLanguage = isSupportedLanguage(preferredLanguage) ? preferredLanguage : 'en';

    await ensureLocaleLoaded(language);

    if (i18n.language !== language) {
        await i18n.changeLanguage(language);
    }
}

export async function changeAppLanguage(language: SupportedLanguage) {
    await ensureLocaleLoaded(language);
    await i18n.changeLanguage(language);
    await setLanguage(language);
}

export default i18n;

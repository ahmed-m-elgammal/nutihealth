import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import es from './locales/es.json';

const resources = {
    en: { translation: en },
    ar: { translation: ar },
    es: { translation: es },
};

if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        returnNull: false,
        compatibilityJSON: 'v4',
    });
}

export default i18n;
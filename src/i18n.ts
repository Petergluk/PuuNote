import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "Your Documents": "Your Documents",
      "New Document": "New Document",
      "Delete file": "Delete file",
      "Toggle Theme": "Toggle Theme",
      "Toggle Expand": "Toggle Expand",
      "Open Timeline View": "Open Timeline View",
      Search: "Search or type a command...",
      "No results": "No fragments found",
    },
  },
  ru: {
    translation: {
      "Your Documents": "Ваши документы",
      "New Document": "Создать документ",
      "Delete file": "Удалить файл",
      "Toggle Theme": "Переключить тему",
      "Toggle Expand": "Развернуть / Свернуть",
      "Open Timeline View": "Открыть Timeline",
      Search: "Поиск или команда...",
      "No results": "Ничего не найдено",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;

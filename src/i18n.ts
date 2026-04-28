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
      "Search": "Search or type a command...",
      "No results": "No fragments found",
      "Col Width": "Col Width",
      "Shortcuts": "Shortcuts",
      "Reset to Tutorial": "Reset to Tutorial",
      "Restore Tutorial Confirm": "Restore this document to the original Tutorial? Current content will be lost.",
      "Tutorial Exists Title": "Tutorial already exists",
      "Tutorial Exists Msg": "The document \"PuuNote: Complete Guide\" is already in your file list. What would you like to do?",
      "Open old tutorial": "Open old tutorial",
      "Create new tutorial": "Create new (copy)",
      "Reset tutorial": "Reset and overwrite",
      "Reset Tutorial Confirm": "Are you sure? The current content of the old tutorial will be deleted and overwritten.",
      "Cancel": "Cancel",
      "Empty node": "Empty node...",
      "Close Focus Mode": "Close Focus Mode (Esc)",
      "Undo": "Undo (Ctrl+Z)",
      "Redo": "Redo (Ctrl+Shift+Z)",
      "Export": "Export",
      "Import": "Import",
      "Are you sure you want to delete this document?": "Are you sure you want to delete this document?",
      "Confirm": "Confirm",
      "Please confirm": "Please confirm",
      "Decrease width": "Decrease width",
      "Increase width": "Increase width",
      "Keyboard Shortcuts": "Keyboard Shortcuts",
      "Split Node (Enter)": "Split Node (Enter)",
      "Move focus": "Move focus",
      "Clear focus": "Clear focus",
      "Edit selected": "Edit selected",
      "Save changes": "Save changes",
      "Undo shortcut": "Undo",
      "Redo shortcut": "Redo",
      "Add Sibling": "Add Sibling",
      "Add Child": "Add Child",
      "Command Palette": "Command Palette",
      "Copied": "Copied!",
      "Copy all": "Copy All",
      "Document is empty": "Document is empty...",
      "File is too large": "File is too large (max 5MB).",
      "Import invalid": "Imported file is invalid or corrupted.",
      "Import confirm": "Import will create a new document. Proceed?",
      "Add Fragment": "+ Add Fragment",
      "Loading timeline": "Loading timeline..."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // force English
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Language = "en" | "ar";

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    "login.title": "Alpha Cyber",
    "login.subtitle": "Precision Intelligence Instrument",
    "login.accessCode": "Access Code",
    "login.submit": "Authenticate",
    "login.invalid": "Invalid access code",
    "nav.dashboard": "Dashboard",
    "nav.search": "New Search",
    "nav.history": "History",
    "nav.admin": "Admin",
    "nav.settings": "Settings",
    "nav.logout": "Terminate Session",
    "dashboard.stats.searches": "Total Searches",
    "dashboard.stats.sessions": "Active Sessions",
    "dashboard.stats.activity": "System Activity",
    "search.target": "Target (Username, Email, Phone, Name)",
    "search.start": "Initiate Search",
    "search.tools": "Analysis Tools",
    "search.progress": "Search Progress",
    "admin.codes": "Access Codes",
    "admin.logs": "Audit Logs",
    "admin.system": "System Status",
  },
  ar: {
    "login.title": "ألفا سايبر",
    "login.subtitle": "أداة استخبارات دقيقة",
    "login.accessCode": "رمز الوصول",
    "login.submit": "مصادقة",
    "login.invalid": "رمز وصول غير صالح",
    "nav.dashboard": "لوحة القيادة",
    "nav.search": "بحث جديد",
    "nav.history": "السجل",
    "nav.admin": "المسؤول",
    "nav.settings": "الإعدادات",
    "nav.logout": "إنهاء الجلسة",
    "dashboard.stats.searches": "إجمالي عمليات البحث",
    "dashboard.stats.sessions": "الجلسات النشطة",
    "dashboard.stats.activity": "نشاط النظام",
    "search.target": "الهدف (اسم المستخدم، البريد، الهاتف، الاسم)",
    "search.start": "بدء البحث",
    "search.tools": "أدوات التحليل",
    "search.progress": "تقدم البحث",
    "admin.codes": "رموز الوصول",
    "admin.logs": "سجلات التدقيق",
    "admin.system": "حالة النظام",
  },
} as const;

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (lang: Language) => {
        set({ language: lang });
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      },
      t: (key: string) => {
        const lang = get().language;
        // @ts-ignore
        return translations[lang]?.[key] || key;
      },
    }),
    {
      name: "alpha-cyber-lang",
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
        }
      },
    }
  )
);

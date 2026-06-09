import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Globe, Shield, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-foreground uppercase tracking-widest mb-2">
          {t("nav.settings")}
        </h1>
        <div className="h-1 w-20 bg-primary mb-4" />
        <p className="text-muted-foreground font-mono">Preferences and session diagnostics.</p>
      </header>

      <div className="grid gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest text-primary">
                <Globe className="w-5 h-5" /> Localization
              </CardTitle>
              <CardDescription className="font-mono text-xs">Interface language and regional settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <button
                  onClick={() => setLanguage("en")}
                  className={`flex-1 p-4 border font-mono uppercase tracking-widest transition-colors ${
                    language === "en"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`flex-1 p-4 border font-mono uppercase tracking-widest transition-colors ${
                    language === "ar"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  العربية
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest text-secondary">
                <Terminal className="w-5 h-5" /> Interface
              </CardTitle>
              <CardDescription className="font-mono text-xs">Display and terminal preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-primary/20 bg-primary/5 flex justify-between items-center">
                <div>
                  <h3 className="font-mono font-bold text-foreground">Theme Mode</h3>
                  <p className="font-mono text-xs text-muted-foreground">Dark mode is locked for optimal visibility.</p>
                </div>
                <div className="px-3 py-1 bg-background border border-border font-mono text-xs text-primary uppercase">
                  Dark (Enforced)
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest text-muted-foreground">
                <Shield className="w-5 h-5" /> Session Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border bg-background">
                    <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Session ID</div>
                    <div className="font-mono text-sm break-all">{user?.sessionId}</div>
                  </div>
                  <div className="p-4 border border-border bg-background">
                    <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Clearance Level</div>
                    <div className={`font-mono text-sm uppercase font-bold ${user?.role === 'admin' ? 'text-destructive' : 'text-primary'}`}>
                      {user?.role}
                    </div>
                  </div>
                  <div className="p-4 border border-border bg-background">
                    <div className="text-xs font-mono uppercase text-muted-foreground mb-1">IP Address</div>
                    <div className="font-mono text-sm">{user?.ip || "Unknown"}</div>
                  </div>
                  <div className="p-4 border border-border bg-background">
                    <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Connected Since</div>
                    <div className="font-mono text-sm">
                      {user?.createdAt ? format(new Date(user.createdAt), "yyyy-MM-dd HH:mm:ss") : "Unknown"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

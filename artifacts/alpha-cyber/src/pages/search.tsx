import { useState } from "react";
import { useLocation } from "wouter";
import { useStartSearch, SearchInputTargetType } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Search as SearchIcon, Shield, Server, TerminalSquare, AlertCircle } from "lucide-react";

const TOOLS = [
  "Maigret", "Social Analyzer", "Blackbird", "Holehe", "SpiderFoot", 
  "Sherlock", "Telespotter", "Phoneinfoga", "DIGI-NETRA", "Enhanced Mobile Tracker", 
  "Phunter", "DetectDee", "Tele-Trace", "TeleOSINT", "Spyder", 
  "Telemetrio", "Telepathy", "Telegram Group Scraper", "Telegram Profile Scraper"
];

export default function Search() {
  const { t } = useI18n();
  const [_, setLocation] = useLocation();
  const [target, setTarget] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>(TOOLS);

  const startSearch = useStartSearch({
    mutation: {
      onSuccess: (data) => {
        toast.success("Search job initialized");
        setLocation(`/search/${data.searchId}`);
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to start search");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) {
      toast.error("Target is required");
      return;
    }
    if (selectedTools.length === 0) {
      toast.error("Select at least one tool");
      return;
    }

    startSearch.mutate({
      data: {
        target: target.trim(),
        targetType: "auto" as SearchInputTargetType,
        tools: selectedTools
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-foreground uppercase tracking-widest mb-2">
          {t("nav.search")}
        </h1>
        <div className="h-1 w-20 bg-primary mb-4" />
        <p className="text-muted-foreground font-mono">Initialize a new intelligence gathering operation.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest text-primary">
                <TerminalSquare className="w-5 h-5" /> Operation Target
              </CardTitle>
              <CardDescription className="font-mono text-xs">Enter a username, email address, phone number, or full name.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Target identifier..."
                  className="w-full bg-background border border-border p-4 pl-10 font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-lg"
                  autoComplete="off"
                  spellCheck="false"
                  disabled={startSearch.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest">
                  <Server className="w-5 h-5" /> Analytical Engines
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-1">Select the tools to deploy for this operation.</CardDescription>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTools(TOOLS)}
                  className="text-xs font-mono uppercase text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedTools([])}
                  className="text-xs font-mono uppercase text-muted-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOOLS.map((tool) => (
                  <label key={tool} className="flex items-center space-x-3 p-3 border border-border bg-background/50 hover:bg-muted/30 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTools([...selectedTools, tool]);
                        } else {
                          setSelectedTools(selectedTools.filter((t) => t !== tool));
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-primary border-border bg-background rounded-none focus:ring-primary focus:ring-offset-background"
                      disabled={startSearch.isPending}
                    />
                    <span className="font-mono text-sm tracking-wide group-hover:text-primary transition-colors">{tool}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-end">
          <button
            type="submit"
            disabled={startSearch.isPending}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 font-mono font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {startSearch.isPending ? (
              <span className="animate-pulse">Initializing...</span>
            ) : (
              <>
                <Shield className="w-5 h-5" /> {t("search.start")}
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

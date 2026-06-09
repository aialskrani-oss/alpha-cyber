import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import {
  Terminal,
  Search,
  History,
  Settings,
  ShieldAlert,
  Activity,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

export function MobileNav() {
  const { data: user } = useGetMe();
  const [location, setLocation] = useLocation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        toast.success("Session terminated");
        setLocation("/login");
        setMenuOpen(false);
      },
    },
  });

  const navItems = [
    { href: "/dashboard", icon: Activity, label: t("nav.dashboard") },
    { href: "/search", icon: Search, label: t("nav.search") },
    { href: "/history", icon: History, label: t("nav.history") },
    ...(user?.role === "admin"
      ? [{ href: "/admin", icon: ShieldAlert, label: t("nav.admin") }]
      : []),
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  const bottomItems = navItems.slice(0, 4);

  return (
    <>
      {/* Top bar for mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-b border-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 text-primary font-mono font-bold tracking-widest">
          <Terminal className="w-5 h-5" />
          <span className="text-sm">ALPHA_CYBER</span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Full-screen drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col bg-background/98 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 h-14 border-b border-border">
            <div className="flex items-center gap-2 text-primary font-mono font-bold tracking-widest">
              <Terminal className="w-5 h-5" />
              <span className="text-sm">ALPHA_CYBER</span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 text-sm font-mono tracking-wider transition-colors cursor-pointer border",
                    location === item.href || location.startsWith(item.href + "/")
                      ? "bg-primary/10 text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="p-6 border-t border-border space-y-4">
            <div className="px-4 py-3 bg-muted/50 border border-border text-xs font-mono text-muted-foreground flex flex-col gap-1">
              <span className="uppercase text-primary/50 tracking-widest">Operator ID</span>
              <span className="truncate">{user?.sessionId?.substring(0, 16)}...</span>
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-mono tracking-wider text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      )}

      {/* Bottom tab bar for quick nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border flex items-center justify-around h-16 px-2">
        {bottomItems.map((item) => {
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 transition-colors cursor-pointer min-w-[56px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-mono uppercase tracking-wider">{item.label.split(" ")[0]}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

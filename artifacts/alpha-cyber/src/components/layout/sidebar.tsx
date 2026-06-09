import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { 
  Terminal, 
  Search, 
  History, 
  Settings, 
  ShieldAlert, 
  LogOut,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Sidebar() {
  const { data: user } = useGetMe();
  const [location, setLocation] = useLocation();
  const { t } = useI18n();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        toast.success("Session terminated");
        setLocation("/login");
      }
    }
  });

  const navItems = [
    { href: "/dashboard", icon: Activity, label: t("nav.dashboard") },
    { href: "/search", icon: Search, label: t("nav.search") },
    { href: "/history", icon: History, label: t("nav.history") },
    ...(user?.role === "admin" ? [{ href: "/admin", icon: ShieldAlert, label: t("nav.admin") }] : []),
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <aside className="w-full md:w-64 border-r border-border bg-card hidden md:flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 text-primary font-mono font-bold text-xl tracking-widest">
          <Terminal className="w-6 h-6" />
          <span>ALPHA_CYBER</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-mono tracking-wider transition-colors cursor-pointer border",
              location === item.href || location.startsWith(item.href + "/") 
                ? "bg-primary/10 text-primary border-primary" 
                : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-4 px-4 py-3 bg-muted/50 border border-border text-xs font-mono text-muted-foreground flex flex-col gap-1">
          <span className="uppercase text-primary/50 tracking-widest">Operator ID</span>
          <span className="truncate">{user?.sessionId?.substring(0, 12)}...</span>
        </div>
        
        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-mono tracking-wider text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}

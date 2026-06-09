import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useGetMe } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Search from "@/pages/search";
import SearchDetailsPage from "@/pages/search-details";
import History from "@/pages/history";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

const queryClient = new QueryClient();

function AuthGuard({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { data, error, isLoading } = useGetMe();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (error) {
      setLocation("/login");
    } else if (data && requireAdmin && data.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [error, data, requireAdmin, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="font-mono text-primary animate-pulse tracking-widest text-sm uppercase">Authenticating...</div>
      </div>
    );
  }

  if (!data) return null;
  if (requireAdmin && data.role !== "admin") return null;

  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col md:flex-row relative">
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-5">
        <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>
      </div>
      {/* Desktop sidebar */}
      <Sidebar />
      {/* Mobile top bar + bottom nav + drawer */}
      <MobileNav />
      {/* Page content — add top/bottom padding for mobile fixed bars */}
      <main className="flex-1 p-4 pt-16 pb-20 md:pt-6 md:pb-6 md:p-10 overflow-y-auto z-10 relative">
        {children}
      </main>
    </div>
  );
}

function RootRedirect() {
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={RootRedirect} />

      <Route path="/dashboard">
        {() => <AuthGuard><MainLayout><Dashboard /></MainLayout></AuthGuard>}
      </Route>

      <Route path="/search">
        {() => <AuthGuard><MainLayout><Search /></MainLayout></AuthGuard>}
      </Route>

      <Route path="/search/:searchId">
        {() => <AuthGuard><MainLayout><SearchDetailsPage /></MainLayout></AuthGuard>}
      </Route>

      <Route path="/history">
        {() => <AuthGuard><MainLayout><History /></MainLayout></AuthGuard>}
      </Route>

      <Route path="/admin">
        {() => <AuthGuard requireAdmin><MainLayout><Admin /></MainLayout></AuthGuard>}
      </Route>

      <Route path="/settings">
        {() => <AuthGuard><MainLayout><Settings /></MainLayout></AuthGuard>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

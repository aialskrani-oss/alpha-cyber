import { useState } from "react";
import {
  useGetAuditLogs, getGetAuditLogsQueryKey,
  useGetAdminStats, getGetAdminStatsQueryKey,
  useListAccessCodes, getListAccessCodesQueryKey,
  useListActiveSessions, getListActiveSessionsQueryKey,
  useCreateAccessCode,
  useDeleteAccessCode,
  useTerminateSession,
  useUpdateSiteStatus,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Users, Key, Activity, AlertTriangle, ShieldCheck, Trash2,
  Plus, RefreshCw, Monitor, FileText, Clock, Eye, EyeOff,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type CodeRole = "admin" | "user";

export default function Admin() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "codes" | "sessions" | "logs">("overview");

  // Create-code form state
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newRole, setNewRole] = useState<CodeRole>("user");
  const [newMaxUses, setNewMaxUses] = useState<string>("");
  const [showCodeForm, setShowCodeForm] = useState(false);

  const { data: stats, refetch: refetchStats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: codes, refetch: refetchCodes } = useListAccessCodes({ query: { queryKey: getListAccessCodesQueryKey() } });
  const { data: sessions, refetch: refetchSessions } = useListActiveSessions({ query: { queryKey: getListActiveSessionsQueryKey() } });
  const { data: logsData, refetch: refetchLogs } = useGetAuditLogs(
    { page: 1, limit: 200 },
    { query: { queryKey: getGetAuditLogsQueryKey({ page: 1, limit: 200 }) } }
  );

  const createCode = useCreateAccessCode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccessCodesQueryKey() });
        toast.success("Access code created successfully");
        setNewCode("");
        setNewLabel("");
        setNewRole("user");
        setNewMaxUses("");
        setShowCodeForm(false);
      },
      onError: () => toast.error("Failed to create access code"),
    },
  });

  const deleteCode = useDeleteAccessCode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccessCodesQueryKey() });
        toast.success("Access code revoked");
      },
      onError: () => toast.error("Failed to revoke code"),
    },
  });

  const terminateSession = useTerminateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActiveSessionsQueryKey() });
        toast.success("Session terminated");
      },
      onError: () => toast.error("Failed to terminate session"),
    },
  });

  const toggleSite = useUpdateSiteStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast.success("Site status updated");
      },
    },
  });

  const handleGenerateCode = () => {
    const auto = "ALPHA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCode(auto);
  };

  const handleCreateCode = () => {
    if (!newCode.trim()) { toast.error("Access code is required"); return; }
    createCode.mutate({
      data: {
        code: newCode.trim().toUpperCase(),
        label: newLabel.trim() || "Manual",
        role: newRole,
        maxUses: newMaxUses ? parseInt(newMaxUses) : undefined,
      },
    });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "codes", label: "Access Codes", icon: Key },
    { id: "sessions", label: "Sessions", icon: Monitor },
    { id: "logs", label: "Audit Logs", icon: FileText },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-0">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-mono font-bold text-destructive uppercase tracking-widest mb-2 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 md:w-8 md:h-8" /> {t("nav.admin")}
        </h1>
        <div className="h-1 w-20 bg-destructive mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Full system administration and access control.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: "Active Codes", value: stats?.activeCodes ?? 0, icon: Key, color: "text-primary" },
                { label: "Active Sessions", value: stats?.activeSessions ?? 0, icon: Users, color: "text-secondary" },
                { label: "Total Searches", value: stats?.totalSearches ?? 0, icon: Activity, color: "text-primary" },
                { label: "System", value: stats?.siteEnabled ? "ONLINE" : "OFFLINE", icon: Monitor, color: stats?.siteEnabled ? "text-primary" : "text-destructive" },
              ].map((s) => (
                <Card key={s.label} className="border-border bg-card/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                    <CardTitle className="text-[10px] font-mono uppercase text-muted-foreground leading-tight">{s.label}</CardTitle>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className={`text-xl md:text-2xl font-mono font-bold ${s.color}`}>{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Master Controls */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono uppercase text-destructive text-base md:text-lg">
                  <AlertTriangle className="w-5 h-5" /> Master Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-destructive/20 p-4 bg-background/50">
                  <div>
                    <h3 className="font-mono font-bold text-foreground text-sm">Global System Lock</h3>
                    <p className="font-mono text-xs text-muted-foreground mt-1">Suspend all non-admin access to the platform.</p>
                  </div>
                  <button
                    onClick={() => toggleSite.mutate({ data: { enabled: !stats?.siteEnabled } })}
                    disabled={toggleSite.isPending}
                    className={`px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                      stats?.siteEnabled
                        ? "bg-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                        : "bg-primary/20 text-primary hover:bg-primary hover:text-black"
                    }`}
                  >
                    {stats?.siteEnabled ? "Engage Lockout" : "Restore Access"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── ACCESS CODES ── */}
        {activeTab === "codes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                {codes?.length ?? 0} codes registered
              </h2>
              <div className="flex gap-2">
                <button onClick={() => refetchCodes()} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCodeForm(!showCodeForm)}
                  className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Code
                </button>
              </div>
            </div>

            {/* Create Code Form */}
            {showCodeForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border border-primary/30 bg-primary/5 p-4 space-y-4"
              >
                <h3 className="font-mono text-sm uppercase tracking-widest text-primary">Create Access Code</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Access Code *</label>
                    <div className="flex gap-2">
                      <input
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        placeholder="ALPHA-XXXX-XXXX"
                        className="flex-1 bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleGenerateCode}
                        className="px-3 py-2 bg-muted border border-border text-muted-foreground hover:text-primary font-mono text-xs transition-colors"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Label</label>
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. VIP Client"
                      className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as CodeRole)}
                      className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Max Uses (blank = unlimited)</label>
                    <input
                      type="number"
                      min="1"
                      value={newMaxUses}
                      onChange={(e) => setNewMaxUses(e.target.value)}
                      placeholder="Unlimited"
                      className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCodeForm(false)}
                    className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCode}
                    disabled={createCode.isPending}
                    className="px-4 py-2 font-mono text-xs uppercase tracking-widest bg-primary text-black hover:bg-primary/80 transition-colors disabled:opacity-50"
                  >
                    {createCode.isPending ? "Creating..." : "Create Code"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Codes Table */}
            <div className="border border-border bg-card/50 overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="text-[10px] uppercase bg-muted/50 text-muted-foreground font-mono">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Usage</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border">
                  {codes?.map((code) => (
                    <tr key={code.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-bold text-primary text-xs tracking-widest">{code.code}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{code.label || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                          code.role === "admin"
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : "bg-secondary/20 text-secondary border border-secondary/30"
                        }`}>
                          {code.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={code.maxUses && code.usedCount >= code.maxUses ? "text-destructive" : "text-foreground"}>
                          {code.usedCount}
                        </span>
                        <span className="text-muted-foreground"> / {code.maxUses ?? "∞"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(code.createdAt), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Revoke code "${code.code}"?`)) {
                              deleteCode.mutate({ id: code.id });
                            }
                          }}
                          disabled={deleteCode.isPending}
                          className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                          title="Revoke code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!codes || codes.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground font-mono text-xs">
                        No access codes registered
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── SESSIONS ── */}
        {activeTab === "sessions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                {sessions?.length ?? 0} active sessions
              </h2>
              <button onClick={() => refetchSessions()} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-border bg-card/50 overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="text-[10px] uppercase bg-muted/50 text-muted-foreground font-mono">
                  <tr>
                    <th className="px-4 py-3">Session ID</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Code Used</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border">
                  {sessions?.map((session) => (
                    <tr key={session.sessionId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-primary font-bold">
                        {session.sessionId.substring(0, 16)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                          session.role === "admin"
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : "bg-secondary/20 text-secondary border border-secondary/30"
                        }`}>
                          {session.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {session.accessCodeLabel ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(session.createdAt), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(session.lastSeenAt), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Terminate this session?")) {
                              terminateSession.mutate({ sessionId: session.sessionId });
                            }
                          }}
                          disabled={terminateSession.isPending}
                          className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors flex items-center gap-1 ml-auto text-xs font-mono uppercase"
                          title="Terminate session"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Kill
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!sessions || sessions.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground font-mono text-xs">
                        No active sessions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── AUDIT LOGS ── */}
        {activeTab === "logs" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                {logsData?.logs?.length ?? 0} log entries
              </h2>
              <button onClick={() => refetchLogs()} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-border bg-card/50 overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="text-[10px] uppercase bg-muted/50 text-muted-foreground font-mono">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border">
                  {logsData?.logs?.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.createdAt), "MM-dd HH:mm:ss")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          log.action.includes("login") || log.action.includes("auth")
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : log.action.includes("delete") || log.action.includes("revoke") || log.action.includes("terminate")
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.sessionId ? `${log.sessionId.substring(0, 10)}...` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))}
                  {(!logsData?.logs || logsData.logs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground font-mono text-xs">
                        No audit logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

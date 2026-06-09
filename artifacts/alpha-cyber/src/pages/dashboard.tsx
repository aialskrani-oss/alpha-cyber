import { useGetSearchStats, getGetSearchStatsQueryKey } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Target, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

export default function Dashboard() {
  const { t } = useI18n();
  const { data: stats, isLoading } = useGetSearchStats({
    query: { queryKey: getGetSearchStatsQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="font-mono text-primary animate-pulse">Initializing telemetry...</div>
      </div>
    );
  }

  const defaultStats = stats || {
    recentActivity: [],
    byTargetType: [],
    byStatus: [],
    topTools: []
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-foreground uppercase tracking-widest mb-2">
          {t("nav.dashboard")}
        </h1>
        <div className="h-1 w-20 bg-primary mb-4" />
        <p className="text-muted-foreground font-mono">System telemetry and active operations overview.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Active Scans", value: defaultStats.byStatus.find(s => s.label === "running")?.count || 0, icon: Activity, color: "text-primary" },
          { title: "Total Targets", value: defaultStats.byTargetType.reduce((acc, curr) => acc + curr.count, 0), icon: Target, color: "text-secondary" },
          { title: "Success Rate", value: "94.2%", icon: Zap, color: "text-primary" },
          { title: "System Status", value: "SECURE", icon: Shield, color: "text-secondary" }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest">Operation Volume (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {defaultStats.recentActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={defaultStats.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm">No recent activity data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest">Target Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {defaultStats.byTargetType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defaultStats.byTargetType} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm">No target data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

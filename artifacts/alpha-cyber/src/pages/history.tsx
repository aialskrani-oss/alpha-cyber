import { useState } from "react";
import { useListSearches, getListSearchesQueryKey, useDeleteSearch } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Search as SearchIcon, Filter, Trash2, ArrowRight, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function History() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useListSearches({ page, limit: 10 }, { 
    query: { queryKey: getListSearchesQueryKey({ page, limit: 10 }) } 
  });

  const deleteSearch = useDeleteSearch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSearchesQueryKey() });
        toast.success("Search record expunged from database");
      }
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
      case "running": return <Loader2 className="w-4 h-4 text-secondary animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredSearches = data?.searches?.filter(search => {
    const matchesSearch = search.target.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          search.searchId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || search.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-foreground uppercase tracking-widest mb-2">
          {t("nav.history")}
        </h1>
        <div className="h-1 w-20 bg-primary mb-4" />
        <p className="text-muted-foreground font-mono">Past operation logs and archived intelligence.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search targets or operation IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card/50 border border-border p-2 pl-9 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card/50 border border-border p-2 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="all">ALL STATUSES</option>
            <option value="completed">COMPLETED</option>
            <option value="running">RUNNING</option>
            <option value="failed">FAILED</option>
            <option value="queued">QUEUED</option>
          </select>
        </div>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground font-mono">
              <tr>
                <th className="px-6 py-4">Operation ID</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Found</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-primary animate-pulse">
                    Accessing archives...
                  </td>
                </tr>
              ) : filteredSearches.length > 0 ? (
                filteredSearches.map((search, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={search.searchId} 
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4 text-xs text-muted-foreground">{search.searchId.substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-bold text-foreground">{search.target}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs border border-primary/30 text-primary bg-primary/5 uppercase">
                        {search.targetType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs uppercase">
                        {getStatusIcon(search.status)}
                        <span className={
                          search.status === "completed" ? "text-primary" : 
                          search.status === "failed" ? "text-destructive" : 
                          "text-secondary"
                        }>{search.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${search.totalFound > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {search.totalFound}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {format(new Date(search.createdAt), "yyyy-MM-dd HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/search/${search.searchId}`} className="inline-flex items-center justify-center p-2 text-primary hover:bg-primary/10 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteSearch.mutate({ searchId: search.searchId })}
                        className="inline-flex items-center justify-center p-2 text-destructive hover:bg-destructive/10 transition-colors"
                        disabled={deleteSearch.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No intelligence records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {data && data.total > 10 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
            <span className="font-mono text-xs text-muted-foreground">
              Showing {filteredSearches.length} of {data.total} records
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 font-mono text-xs border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors"
              >
                PREV
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= data.total}
                className="px-3 py-1 font-mono text-xs border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors"
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useGetSearch, getGetSearchQueryKey, useExportSearch, SearchDetails } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Terminal, Download, Activity, CheckCircle2, XCircle, Clock, Search as SearchIcon, FileText, FileSpreadsheet, FileJson, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function SearchDetailsPage() {
  const params = useParams();
  const searchId = params.searchId as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [liveData, setLiveData] = useState<{ [tool: string]: { status: string, progress: number, found: number } }>({});

  const { data: search, isLoading } = useGetSearch(searchId, {
    query: {
      queryKey: getGetSearchQueryKey(searchId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return (status === 'running' || status === 'queued') ? 3000 : false;
      }
    }
  });

  const exportSearch = useExportSearch({
    mutation: {
      onSuccess: (data) => {
        toast.success(`Exported ${data.format.toUpperCase()} successfully`);
        // In a real app, this would trigger a download
      },
      onError: () => toast.error("Export failed")
    }
  });

  useEffect(() => {
    if (!searchId || search?.status === "completed" || search?.status === "failed") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/search/${searchId}`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tool) {
            setLiveData(prev => ({
              ...prev,
              [data.tool]: {
                status: data.status,
                progress: data.progress,
                found: data.found
              }
            }));
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WS Error", e);
      };
    } catch (e) {
      console.error("Failed to connect to WS", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [searchId, search?.status]);

  const handleExport = (format: "pdf" | "csv" | "json") => {
    exportSearch.mutate({ searchId, data: { format } });
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-8 h-8 text-primary animate-pulse" />
        <div className="font-mono text-primary animate-pulse uppercase tracking-widest text-sm">
          Accessing operation data...
        </div>
      </div>
    );
  }

  if (!search) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <div className="font-mono text-destructive uppercase tracking-widest text-sm">
          Operation record not found.
        </div>
      </div>
    );
  }

  // Merge live data into search data for display
  const displayTools = search.tools.map(toolName => {
    const staticResult = search.toolResults.find(r => r.tool === toolName);
    const liveResult = liveData[toolName];
    
    return {
      name: toolName,
      status: liveResult?.status || staticResult?.status || "pending",
      progress: liveResult?.progress || (staticResult?.status === "completed" ? 100 : 0),
      found: liveResult?.found || staticResult?.results?.length || 0,
      results: staticResult?.results || []
    };
  });

  const totalFoundLive = displayTools.reduce((acc, curr) => acc + curr.found, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground uppercase tracking-widest mb-2 flex items-center gap-3">
            <Terminal className="w-8 h-8 text-primary" /> 
            Operation: {search.target}
          </h1>
          <div className="h-1 w-20 bg-primary mb-4" />
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="text-muted-foreground">ID: <span className="text-foreground">{search.searchId}</span></span>
            <span className="text-muted-foreground px-2">|</span>
            <span className="px-2 py-1 border border-primary/30 text-primary bg-primary/5 uppercase">{search.targetType}</span>
            <span className="text-muted-foreground px-2">|</span>
            <span className={`flex items-center gap-1 uppercase ${
              search.status === "completed" ? "text-primary" : 
              search.status === "failed" ? "text-destructive" : 
              "text-secondary animate-pulse"
            }`}>
              {search.status === "running" && <Activity className="w-3 h-3" />}
              {search.status}
            </span>
            <span className="text-muted-foreground px-2">|</span>
            <span className="text-muted-foreground">{format(new Date(search.createdAt), "yyyy-MM-dd HH:mm:ss")}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => handleExport("pdf")} className="p-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Export PDF">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => handleExport("csv")} className="p-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Export CSV">
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button onClick={() => handleExport("json")} className="p-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Export JSON">
            <FileJson className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono uppercase text-muted-foreground tracking-widest">
                Total Intelligence Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-mono font-bold text-primary">
                {search.status === "completed" ? search.totalFound : totalFoundLive}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono uppercase text-muted-foreground tracking-widest">
                Engines deployed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayTools.map((tool) => (
                <div key={tool.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="truncate pr-2" title={tool.name}>{tool.name}</span>
                    <span className={tool.found > 0 ? "text-primary font-bold" : "text-muted-foreground"}>
                      {tool.found > 0 ? `${tool.found} hits` : tool.status}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-muted overflow-hidden">
                    <motion.div 
                      className={`h-full ${
                        tool.status === "failed" ? "bg-destructive" : 
                        tool.status === "completed" ? "bg-primary" : "bg-secondary"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${tool.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="border-border bg-card/50 backdrop-blur min-h-[500px] flex flex-col">
            <div className="border-b border-border flex overflow-x-auto">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-3 font-mono text-sm tracking-widest uppercase border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === "overview" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                All Intelligence
              </button>
              {displayTools.filter(t => t.found > 0).map(tool => (
                <button
                  key={tool.name}
                  onClick={() => setActiveTab(tool.name)}
                  className={`px-6 py-3 font-mono text-sm tracking-widest uppercase border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeTab === tool.name ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tool.name} <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px]">{tool.found}</span>
                </button>
              ))}
            </div>
            
            <CardContent className="p-0 flex-1 overflow-auto bg-background/30">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/30 text-muted-foreground font-mono sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-3">Platform/Engine</th>
                    <th className="px-6 py-3">Identifier</th>
                    <th className="px-6 py-3">Name/Bio</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border/50">
                  {search.toolResults
                    .filter(tr => activeTab === "overview" || tr.tool === activeTab)
                    .flatMap(tr => tr.results.map(r => ({ ...r, engine: tr.tool })))
                    .map((result, i) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.05, 0.5) }}
                        key={`${result.engine}-${i}`} 
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 border-l-2 border-l-transparent hover:border-l-primary">
                          <div className="font-bold text-foreground">{result.platform || "Unknown"}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{result.engine}</div>
                        </td>
                        <td className="px-6 py-4 text-primary">
                          {result.username || result.email || result.phone || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold">{result.displayName || "-"}</div>
                          {result.bio && <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs" title={result.bio}>{result.bio}</div>}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {result.location || "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {result.url ? (
                            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary hover:underline text-xs uppercase tracking-wider">
                              Open Link
                            </a>
                          ) : "-"}
                        </td>
                      </motion.tr>
                    ))}
                  {search.toolResults.filter(tr => activeTab === "overview" || tr.tool === activeTab).flatMap(tr => tr.results).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          {search.status === "running" ? (
                            <>
                              <Activity className="w-8 h-8 mb-4 animate-pulse text-secondary" />
                              <span className="font-mono uppercase tracking-widest text-sm">Awaiting intelligence...</span>
                            </>
                          ) : (
                            <>
                              <SearchIcon className="w-8 h-8 mb-4 opacity-50" />
                              <span className="font-mono uppercase tracking-widest text-sm">No positive hits recorded in this view.</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

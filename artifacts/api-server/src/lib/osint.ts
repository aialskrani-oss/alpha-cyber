import { db, searchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export const ALL_TOOLS = [
  "Maigret",
  "Social Analyzer",
  "Blackbird",
  "Holehe",
  "SpiderFoot",
  "Sherlock",
  "Telespotter",
  "Phoneinfoga",
  "DIGI-NETRA",
  "Enhanced Mobile Tracker",
  "Phunter",
  "DetectDee",
  "Tele-Trace",
  "TeleOSINT",
  "Spyder",
  "Telemetrio",
  "Telepathy",
  "Telegram Group Scraper",
  "Telegram Profile Scraper",
];

export const TOOLS_BY_TYPE: Record<string, string[]> = {
  username: ["Maigret", "Blackbird", "Sherlock", "Social Analyzer", "DetectDee", "SpiderFoot"],
  email: ["Holehe", "SpiderFoot", "Social Analyzer", "Maigret"],
  phone: ["Phoneinfoga", "Enhanced Mobile Tracker", "Phunter"],
  name: ["Social Analyzer", "SpiderFoot", "Maigret"],
  auto: ALL_TOOLS,
};

// Simulated OSINT search runner (real implementations would shell out to Python tools)
export async function runOsintSearch(
  searchId: string,
  target: string,
  targetType: string,
  tools: string[],
  onProgress: (toolName: string, status: string, found: number) => void
): Promise<void> {
  const toolResults: any[] = tools.map((t) => ({
    tool: t,
    status: "pending",
    results: [],
    duration: null,
    errorMessage: null,
  }));

  await db.update(searchesTable)
    .set({ status: "running", toolResults })
    .where(eq(searchesTable.searchId, searchId));

  let totalFound = 0;

  await Promise.all(
    tools.map(async (tool, idx) => {
      try {
        onProgress(tool, "running", 0);
        toolResults[idx].status = "running";

        // Simulated delay and results
        const delay = 1000 + Math.random() * 4000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const mockResults = generateMockResults(tool, target, targetType);
        const found = mockResults.length;
        totalFound += found;

        toolResults[idx] = {
          tool,
          status: "completed",
          results: mockResults,
          duration: Math.round(delay),
          errorMessage: null,
        };

        onProgress(tool, "completed", found);

        await db.update(searchesTable)
          .set({ toolResults: [...toolResults], totalFound })
          .where(eq(searchesTable.searchId, searchId));
      } catch (err) {
        logger.error({ err, tool }, "Tool error");
        toolResults[idx] = {
          tool,
          status: "failed",
          results: [],
          duration: null,
          errorMessage: String(err),
        };
        onProgress(tool, "failed", 0);
      }
    })
  );

  await db.update(searchesTable)
    .set({
      status: "completed",
      toolResults,
      totalFound,
      completedAt: new Date(),
    })
    .where(eq(searchesTable.searchId, searchId));
}

function generateMockResults(tool: string, target: string, targetType: string): any[] {
  const platforms = [
    "Twitter/X", "Instagram", "GitHub", "LinkedIn", "Reddit",
    "Facebook", "TikTok", "YouTube", "Telegram", "Discord",
    "Pinterest", "Snapchat", "Tumblr", "Medium", "Quora",
  ];

  const shouldFind = Math.random() > 0.3;
  if (!shouldFind) return [];

  const count = Math.floor(Math.random() * 5) + 1;
  return platforms.slice(0, count).map((platform) => ({
    platform,
    url: `https://${platform.toLowerCase().replace("/", "").replace(" ", "")}.com/${target}`,
    username: target,
    displayName: target,
    bio: `Profile found on ${platform}`,
    location: ["United States", "United Kingdom", "Germany", "France", null][Math.floor(Math.random() * 5)],
    email: targetType === "email" ? target : null,
    phone: targetType === "phone" ? target : null,
    profilePicture: null,
    found: true,
    metadata: JSON.stringify({ source: tool, confidence: "high" }),
  }));
}

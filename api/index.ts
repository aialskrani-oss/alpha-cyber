import app from "../artifacts/api-server/src/app";

// Export Express app as a Vercel serverless function.
// Express is a valid Node.js http.RequestListener, Vercel accepts it directly.
// WebSocket (/api/ws/*) is not available on Vercel — the frontend falls back to polling.
export default app;

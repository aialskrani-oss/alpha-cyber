// Vercel serverless handler — imports the pre-compiled Express app bundle.
// The app is compiled by esbuild (artifacts/api-server/build.mjs → dist/app.mjs)
// as part of the Vercel buildCommand, so no TypeScript re-compilation is needed here.
//
// WebSocket (/api/ws/*) is not available in serverless mode;
// the frontend automatically falls back to polling (refetchInterval).
export { default } from "../artifacts/api-server/dist/app.mjs";

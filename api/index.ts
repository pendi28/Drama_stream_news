// @ts-nocheck
// Vercel serverless function — proxies all /api/* traffic through the
// pre-built Express app from the api-server artifact.
import app from "../artifacts/api-server/dist/serverless.mjs";

export default app;

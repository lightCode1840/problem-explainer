// Single source of truth for API base URL.
// In dev, Vite proxies /api → localhost:3001 (see vite.config.ts).
// In production, the Express server serves both the API and the SPA from the same origin.
// Always use relative URLs like `/api/parse`, never hardcode `localhost:3001`.

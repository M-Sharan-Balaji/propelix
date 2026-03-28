# Tinyfish HDB Seller Intelligence

An MVP full-stack hackathon product for a Singapore HDB seller intelligence platform. The app is built as a Next.js dashboard with:

- valuation, liquidity, proceeds, and trend intelligence
- TinyFish-powered live web scraping orchestration
- a live embedded browser preview driven by TinyFish `STREAMING_URL`
- TinyFish runs history surfaced inside the product

## Stack

- Next.js App Router
- TypeScript
- Server-side report generation
- PostGIS-ready SQL schema for future production data pipelines

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Add environment variables:

```bash
TINYFISH_API_KEY=your_tinyfish_api_key
AGENTQL_API_KEY=your_agentql_api_key
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## API

- `GET /api/report`
- `POST /api/tinyfish/stream`
- `GET /api/tinyfish/runs`

Returns the computed seller intelligence report backing the dashboard.

## TinyFish integration

- TinyFish live SSE automations are proxied through the backend so your API key stays server-side.
- The dashboard includes presets for PropertyGuru, 99.co, and Data.gov.sg-oriented runs.
- When TinyFish emits a `STREAMING_URL`, the app embeds it in an iframe so you can watch the agent work live.
- Workspace MCP config also includes the TinyFish MCP endpoint at `https://agent.tinyfish.ai/mcp`.

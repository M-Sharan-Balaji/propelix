export type TinyFishBrowserProfile = "lite" | "stealth";

export interface TinyFishRunRequest {
  url: string;
  goal: string;
  browser_profile?: TinyFishBrowserProfile;
  proxy_config?: {
    enabled: boolean;
    country_code?: string;
  };
  api_integration?: string;
}

export interface TinyFishEvent {
  type: string;
  runId?: string;
  run_id?: string;
  status?: string;
  purpose?: string;
  message?: string;
  streamingUrl?: string;
  streaming_url?: string;
  result?: unknown;
  resultJson?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

export interface TinyFishRunSummary {
  run_id: string;
  status: string;
  goal: string;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  result?: unknown;
  error?: unknown;
}

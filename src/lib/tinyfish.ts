import { TinyFishRunRequest } from "@/src/types/tinyfish";

export const TINYFISH_BASE_URL = "https://agent.tinyfish.ai";
export const TINYFISH_SSE_ENDPOINT = `${TINYFISH_BASE_URL}/v1/automation/run-sse`;
export const TINYFISH_RUNS_ENDPOINT = `${TINYFISH_BASE_URL}/v1/runs`;

export function getTinyFishApiKey() {
  return process.env.TINYFISH_API_KEY;
}

export function assertTinyFishApiKey() {
  const apiKey = getTinyFishApiKey();

  if (!apiKey) {
    throw new Error("TINYFISH_API_KEY is not configured.");
  }

  return apiKey;
}

export function buildTinyFishHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey
  };
}

export function buildTinyFishPayload(request: TinyFishRunRequest) {
  return {
    ...request,
    api_integration: request.api_integration ?? "tinyfish-hackathon-demo",
    proxy_config: request.proxy_config ?? { enabled: false }
  };
}

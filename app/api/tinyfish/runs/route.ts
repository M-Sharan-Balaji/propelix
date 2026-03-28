import { NextRequest } from "next/server";
import {
  assertTinyFishApiKey,
  buildTinyFishHeaders,
  TINYFISH_RUNS_ENDPOINT
} from "@/src/lib/tinyfish";

export async function GET(request: NextRequest) {
  try {
    const apiKey = assertTinyFishApiKey();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "10";
    const status = searchParams.get("status");
    const upstreamUrl = new URL(TINYFISH_RUNS_ENDPOINT);

    upstreamUrl.searchParams.set("limit", limit);

    if (status) {
      upstreamUrl.searchParams.set("status", status);
    }

    const upstream = await fetch(upstreamUrl, {
      headers: buildTinyFishHeaders(apiKey),
      cache: "no-store"
    });

    const data = await upstream.json();

    return Response.json(data, {
      status: upstream.status
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unexpected TinyFish error."
      },
      { status: 500 }
    );
  }
}

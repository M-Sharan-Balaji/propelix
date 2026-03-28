import { NextRequest } from "next/server";
import {
  assertTinyFishApiKey,
  buildTinyFishHeaders,
  buildTinyFishPayload,
  TINYFISH_SSE_ENDPOINT
} from "@/src/lib/tinyfish";
import { TinyFishRunRequest } from "@/src/types/tinyfish";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TinyFishRunRequest;
    const apiKey = assertTinyFishApiKey();

    const upstream = await fetch(TINYFISH_SSE_ENDPOINT, {
      method: "POST",
      headers: buildTinyFishHeaders(apiKey),
      body: JSON.stringify(buildTinyFishPayload(payload))
    });

    if (!upstream.ok || !upstream.body) {
      const message = await upstream.text();

      return Response.json(
        {
          error: message || "TinyFish stream failed."
        },
        { status: upstream.status || 500 }
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
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

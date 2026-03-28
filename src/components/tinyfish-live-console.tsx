"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TinyFishEvent, TinyFishRunSummary } from "@/src/types/tinyfish";

type StreamStatus = "idle" | "connecting" | "running" | "completed" | "failed";

interface ParsedSseEvent {
  event: string;
  data: string;
}

const presets = [
  {
    label: "PropertyGuru competitors",
    url: "https://www.propertyguru.com.sg/property-for-sale",
    goal:
      "Search for Bukit Batok 4-room HDB resale listings, extract the first 10 relevant listings with address, asking price, floor area, floor level, agent name, and any seller motivation signals."
  },
  {
    label: "99.co competitors",
    url: "https://www.99.co/singapore/sale",
    goal:
      "Find active 4-room HDB resale listings in Bukit Batok and extract listing title, price, floor area, estimated days on market clues, and listing URL."
  },
  {
    label: "Data.gov resale context",
    url: "https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view",
    goal:
      "Navigate to the HDB resale prices dataset and identify the latest available dataset coverage, update cadence, and access method for transaction records."
  }
];

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as TinyFishEvent;
  } catch {
    return { message: value, type: "MESSAGE" } satisfies TinyFishEvent;
  }
}

function parseSseChunk(buffer: string) {
  const segments = buffer.split("\n\n");
  const remainder = segments.pop() ?? "";
  const events = segments
    .map((segment) => {
      const lines = segment.split("\n");
      let event = "message";
      const dataLines: string[] = [];

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      return {
        event,
        data: dataLines.join("\n")
      } satisfies ParsedSseEvent;
    })
    .filter((entry) => entry.data.length > 0);

  return { events, remainder };
}

function eventLabel(event: TinyFishEvent) {
  return (
    String(event.type ?? event.status ?? event.purpose ?? "EVENT")
      .replaceAll("_", " ")
      .toUpperCase()
  );
}

export function TinyFishLiveConsole() {
  const [url, setUrl] = useState(presets[0].url);
  const [goal, setGoal] = useState(presets[0].goal);
  const [browserProfile, setBrowserProfile] = useState<"lite" | "stealth">("lite");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [events, setEvents] = useState<TinyFishEvent[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<TinyFishRunSummary[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const latestEvent = events[events.length - 1];

  const prettyResult = useMemo(() => {
    if (!result) {
      return null;
    }

    return JSON.stringify(result, null, 2);
  }, [result]);

  async function loadRecentRuns() {
    try {
      const response = await fetch("/api/tinyfish/runs?limit=6", {
        cache: "no-store"
      });

      const payload = await response.json();

      if (response.ok && Array.isArray(payload.data)) {
        setRecentRuns(payload.data as TinyFishRunSummary[]);
      }
    } catch {
      // Keep the interface usable even if the runs endpoint is unavailable.
    }
  }

  useEffect(() => {
    void loadRecentRuns();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function applyPreset(index: number) {
    setUrl(presets[index].url);
    setGoal(presets[index].goal);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setStreamStatus("connecting");
    setEvents([]);
    setResult(null);
    setError(null);
    setStreamingUrl(null);
    setRunId(null);

    try {
      const response = await fetch("/api/tinyfish/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          goal,
          browser_profile: browserProfile,
          proxy_config: {
            enabled: false
          }
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "TinyFish run failed to start.");
      }

      setStreamStatus("running");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.remainder;

        for (const sseEvent of parsed.events) {
          const parsedEvent = tryParseJson(sseEvent.data);
          const normalizedType = sseEvent.event === "message" ? parsedEvent.type : sseEvent.event;
          const normalizedEvent = {
            ...parsedEvent,
            type: String(normalizedType ?? parsedEvent.type ?? "MESSAGE")
          } satisfies TinyFishEvent;

          if (normalizedEvent.runId || normalizedEvent.run_id) {
            setRunId(String(normalizedEvent.runId ?? normalizedEvent.run_id));
          }

          if (normalizedEvent.streamingUrl || normalizedEvent.streaming_url) {
            setStreamingUrl(String(normalizedEvent.streamingUrl ?? normalizedEvent.streaming_url));
          }

          if (normalizedEvent.result || normalizedEvent.resultJson) {
            setResult(normalizedEvent.result ?? normalizedEvent.resultJson);
          }

          if (normalizedEvent.error) {
            setError(
              typeof normalizedEvent.error === "string"
                ? normalizedEvent.error
                : JSON.stringify(normalizedEvent.error, null, 2)
            );
            setStreamStatus("failed");
          }

          if (String(normalizedEvent.status).toUpperCase() === "COMPLETED") {
            setStreamStatus("completed");
          }

          setEvents((current) => [...current, normalizedEvent]);
        }
      }

      await loadRecentRuns();

      setStreamStatus((current) => (current === "failed" ? current : "completed"));
    } catch (submissionError) {
      if ((submissionError as Error).name === "AbortError") {
        return;
      }

      setError(submissionError instanceof Error ? submissionError.message : "Unexpected TinyFish error.");
      setStreamStatus("failed");
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setStreamStatus("idle");
  }

  return (
    <section className="tinyfish-shell">
      <div className="tinyfish-shell__header">
        <div>
          <span className="eyebrow">TinyFish Control Center</span>
          <h3>Live scraping orchestration</h3>
          <p className="tinyfish-shell__lede">
            Launch a real TinyFish run, watch progress events as they stream, and embed the
            live browser session via the `STREAMING_URL` emitted by TinyFish.
          </p>
        </div>
        <div className={`tinyfish-state tinyfish-state--${streamStatus}`}>{streamStatus}</div>
      </div>

      <div className="tinyfish-grid">
        <form className="tinyfish-form" onSubmit={handleSubmit}>
          <label>
            Presets
            <div className="preset-row">
              {presets.map((preset, index) => (
                <button
                  className="preset-pill"
                  key={preset.label}
                  onClick={() => applyPreset(index)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </label>

          <label>
            Target URL
            <input
              onChange={(inputEvent) => setUrl(inputEvent.target.value)}
              placeholder="https://www.propertyguru.com.sg/property-for-sale"
              value={url}
            />
          </label>

          <label>
            Goal
            <textarea
              onChange={(inputEvent) => setGoal(inputEvent.target.value)}
              rows={6}
              value={goal}
            />
          </label>

          <label>
            Browser profile
            <select
              onChange={(inputEvent) => setBrowserProfile(inputEvent.target.value as "lite" | "stealth")}
              value={browserProfile}
            >
              <option value="lite">lite</option>
              <option value="stealth">stealth</option>
            </select>
          </label>

          <div className="tinyfish-actions">
            <button className="tinyfish-button tinyfish-button--primary" type="submit">
              Start TinyFish run
            </button>
            <button className="tinyfish-button tinyfish-button--secondary" onClick={handleStop} type="button">
              Stop stream
            </button>
          </div>

          <div className="tinyfish-meta">
            <div>
              <span>Run ID</span>
              <strong>{runId ?? "Waiting for TinyFish..."}</strong>
            </div>
            <div>
              <span>Latest event</span>
              <strong>{latestEvent ? eventLabel(latestEvent) : "No events yet"}</strong>
            </div>
          </div>

          {error ? <p className="tinyfish-error">{error}</p> : null}
        </form>

        <div className="tinyfish-preview">
          <div className="tinyfish-preview__header">
            <strong>Live browser preview</strong>
            <span>{streamingUrl ? "Embedded from TinyFish STREAMING_URL" : "Waiting for stream"}</span>
          </div>
          {streamingUrl ? (
            <iframe
              allow="clipboard-write"
              className="tinyfish-iframe"
              src={streamingUrl}
              title="TinyFish live browser preview"
            />
          ) : (
            <div className="tinyfish-preview__placeholder">
              Start a run to see the TinyFish browser session here.
            </div>
          )}
        </div>
      </div>

      <div className="tinyfish-grid tinyfish-grid--lower">
        <div className="tinyfish-log">
          <div className="tinyfish-preview__header">
            <strong>Event stream</strong>
            <span>{events.length} events</span>
          </div>
          <div className="tinyfish-log__items">
            {events.length === 0 ? (
              <div className="tinyfish-log__empty">No TinyFish events yet.</div>
            ) : (
              events.map((entry, index) => (
                <article className="tinyfish-log__item" key={`${entry.type}-${index}`}>
                  <div className="tinyfish-log__item-top">
                    <strong>{eventLabel(entry)}</strong>
                    <span>{entry.message ?? entry.status ?? "progress update"}</span>
                  </div>
                  <pre>{JSON.stringify(entry, null, 2)}</pre>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="tinyfish-side-stack">
          <div className="tinyfish-runs">
            <div className="tinyfish-preview__header">
              <strong>Recent TinyFish runs</strong>
              <span>Fetched from TinyFish Runs API</span>
            </div>
            <div className="tinyfish-runs__list">
              {recentRuns.length === 0 ? (
                <div className="tinyfish-log__empty">No recent runs available.</div>
              ) : (
                recentRuns.map((run) => (
                  <div className="tinyfish-runs__item" key={run.run_id}>
                    <div>
                      <strong>{run.status}</strong>
                      <span>{run.goal}</span>
                    </div>
                    <code>{run.run_id}</code>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="tinyfish-result">
            <div className="tinyfish-preview__header">
              <strong>Latest structured result</strong>
              <span>Returned by TinyFish</span>
            </div>
            <pre>{prettyResult ?? "No structured extraction result yet."}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

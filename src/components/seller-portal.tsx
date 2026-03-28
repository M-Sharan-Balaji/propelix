"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { activeListings, targetProperty } from "@/src/data/mock";
import { buildSellerReportForProperty } from "@/src/lib/report";
import { formatCurrency, formatPercent } from "@/src/lib/utils";
import { TinyFishEvent } from "@/src/types/tinyfish";
import { TargetProperty } from "@/src/types/domain";

type StepState = "details" | "scraping" | "analysis" | "confirm" | "posting" | "complete";

interface PropertyFormState {
  address: string;
  town: string;
  block: string;
  flatType: TargetProperty["flatType"];
  floorAreaSqm: number;
  storeyRange: string;
  remainingLeaseYears: number;
  sellerAskingPrice: number;
  outstandingLoan: number;
  cpfRefund: number;
}

const initialForm: PropertyFormState = {
  address: targetProperty.address,
  town: targetProperty.town,
  block: targetProperty.block,
  flatType: targetProperty.flatType,
  floorAreaSqm: targetProperty.floorAreaSqm,
  storeyRange: targetProperty.storeyRange,
  remainingLeaseYears: targetProperty.remainingLeaseYears,
  sellerAskingPrice: targetProperty.sellerAskingPrice,
  outstandingLoan: targetProperty.outstandingLoan,
  cpfRefund: targetProperty.cpfRefund
};

const demo99CoLogin = {
  mobileNumber: "80330402",
  password: "tinyfishisthebest"
};

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as TinyFishEvent;
  } catch {
    return { type: "MESSAGE", message: value } satisfies TinyFishEvent;
  }
}

function calculateStoreyMidpoint(storeyRange: string) {
  const numbers = storeyRange.match(/\d+/g)?.map(Number) ?? [];

  if (numbers.length >= 2) {
    return Math.round((numbers[0] + numbers[1]) / 2);
  }

  if (numbers.length === 1) {
    return numbers[0];
  }

  return targetProperty.storeyMidpoint;
}

function parseSse(buffer: string) {
  const chunks = buffer.split("\n\n");
  const remainder = chunks.pop() ?? "";
  const events = chunks
    .map((chunk) => {
      const lines = chunk.split("\n");
      let eventName = "message";
      const data: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          data.push(line.slice(5).trim());
        }
      }

      return {
        eventName,
        data: data.join("\n")
      };
    })
    .filter((event) => event.data.length > 0);

  return { events, remainder };
}

function toProperty(form: PropertyFormState): TargetProperty {
  return {
    ...targetProperty,
    address: form.address,
    town: form.town.toUpperCase(),
    block: form.block,
    flatType: form.flatType,
    floorAreaSqm: Number(form.floorAreaSqm),
    storeyRange: form.storeyRange,
    storeyMidpoint: calculateStoreyMidpoint(form.storeyRange),
    remainingLeaseYears: Number(form.remainingLeaseYears),
    sellerAskingPrice: Number(form.sellerAskingPrice),
    outstandingLoan: Number(form.outstandingLoan),
    cpfRefund: Number(form.cpfRefund)
  };
}

export function SellerPortal() {
  const [form, setForm] = useState<PropertyFormState>(initialForm);
  const [step, setStep] = useState<StepState>("details");
  const [events, setEvents] = useState<TinyFishEvent[]>([]);
  const [scrapeStreamingUrl, setScrapeStreamingUrl] = useState<string | null>(null);
  const [postingStreamingUrl, setPostingStreamingUrl] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [postingError, setPostingError] = useState<string | null>(null);
  const [postingResult, setPostingResult] = useState<unknown>(null);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const property = useMemo(() => toProperty(form), [form]);
  const report = useMemo(() => buildSellerReportForProperty(property), [property]);
  const photoPreviewUrls = useMemo(
    () => photos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [photos]
  );
  const currentStepIndex = {
    details: 0,
    scraping: 1,
    analysis: 2,
    confirm: 3,
    posting: 4,
    complete: 4
  }[step];
  const competitorSummary = useMemo(
    () =>
      activeListings
        .slice(0, 3)
        .map((listing) => `${listing.block}: ${formatCurrency(listing.askingPrice)}`)
        .join(" | "),
    []
  );

  const uploadedPhotoSummary = useMemo(
    () => (photos.length > 0 ? photos.map((file) => file.name).join(", ") : "No photos uploaded yet"),
    [photos]
  );

  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, [photoPreviewUrls]);

  async function runTinyFish(goal: string, mode: "scrape" | "post") {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsBusy(true);

    if (mode === "scrape") {
      setEvents([]);
      setScrapeError(null);
      setScrapeStreamingUrl(null);
    } else {
      setPostingError(null);
      setPostingStreamingUrl(null);
      setPostingResult(null);
    }

    try {
      const response = await fetch("/api/tinyfish/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: "https://www.99.co/singapore/sale",
          goal,
          browser_profile: "stealth",
          proxy_config: {
            enabled: false
          }
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "TinyFish request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer);
        buffer = parsed.remainder;

        for (const item of parsed.events) {
          const event = {
            ...tryParseJson(item.data),
            type: item.eventName
          } satisfies TinyFishEvent;

          setEvents((current) => (mode === "scrape" ? [...current, event] : current));

          const maybeStreamingUrl = String(event.streamingUrl ?? event.streaming_url ?? "");
          if (maybeStreamingUrl) {
            if (mode === "scrape") {
              setScrapeStreamingUrl(maybeStreamingUrl);
            } else {
              setPostingStreamingUrl(maybeStreamingUrl);
            }
          }

          if (event.result || event.resultJson) {
            if (mode === "post") {
              setPostingResult(event.result ?? event.resultJson);
            }
          }

          if (event.error) {
            const message =
              typeof event.error === "string" ? event.error : JSON.stringify(event.error, null, 2);
            if (mode === "scrape") {
              setScrapeError(message);
            } else {
              setPostingError(message);
            }
          }
        }
      }

      setStep(mode === "scrape" ? "analysis" : "complete");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        const message = error instanceof Error ? error.message : "TinyFish request failed.";
        if (mode === "scrape") {
          setScrapeError(message);
        } else {
          setPostingError(message);
        }
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("scraping");

    const goal = `You are helping a Singapore HDB seller. Search 99.co for comparable ${
      property.flatType
    } HDB resale listings around ${property.block} ${property.town}. Extract active competing listings, asking prices, floor area, storey clues, agent information, and any seller urgency signals. Focus on properties most comparable to ${property.address} with floor area near ${
      property.floorAreaSqm
    } sqm. Return concise structured findings for pricing analysis.`;

    await runTinyFish(goal, "scrape");
  }

  async function handleCreatePostings() {
    setStep("posting");

    const goal = `You are posting a Singapore HDB resale property on 99.co for the owner. Use the following property details:
Address: ${property.address}
Town: ${property.town}
Block: ${property.block}
Flat type: ${property.flatType}
Floor area: ${property.floorAreaSqm} sqm
Storey range: ${property.storeyRange}
Suggested listing price: ${confirmedPrice}
99.co login mobile number: ${demo99CoLogin.mobileNumber}
99.co login password: ${demo99CoLogin.password}
Uploaded seller photo files: ${uploadedPhotoSummary}

Navigate to 99.co, log in using the provided mobile number and password, and then prepare or create the property posting with this information. Populate title, pricing, property details, and seller-facing description based on the supplied details. If image upload is requested, use the available uploaded photo set if accessible in the environment; otherwise continue the listing flow as far as possible and clearly report that photo attachment still needs to be completed manually from the seller portal. If login or submission barriers appear, proceed as far as possible and report exactly what was completed.`;

    await runTinyFish(goal, "post");
  }

  return (
    <main className="portal-shell">
      <section className="portal-hero">
        <span className="portal-kicker">Tinyfish HDB Seller Portal</span>
        <h1>Enter your flat details once. We scrape, price, and list for you.</h1>
        <p>
          The flow is simple: give property details, let TinyFish gather comparable listings,
          review the quantitative recommendation, confirm the asking price, and let the agent
          create the 99.co posting for you.
        </p>
      </section>

      <section className="step-strip">
        {[
          "1. Property details",
          "2. TinyFish scrapes market",
          "3. Quant analysis",
          "4. Seller confirms price",
          "5. TinyFish posts on 99.co"
        ].map((label, index) => (
          <div className={`step-pill ${index <= currentStepIndex ? "step-pill--active" : ""}`} key={label}>
            {label}
          </div>
        ))}
      </section>

      <section className="portal-card">
        <div className="portal-grid">
          <form className="details-form" onSubmit={handleAnalyze}>
            <div className="section-heading">
              <span>Step 1</span>
              <h2>Property details</h2>
            </div>

            <label>
              Property address
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
            <div className="details-form__row">
              <label>
                Town
                <input value={form.town} onChange={(event) => setForm({ ...form, town: event.target.value })} />
              </label>
              <label>
                Block
                <input value={form.block} onChange={(event) => setForm({ ...form, block: event.target.value })} />
              </label>
            </div>
            <div className="details-form__row">
              <label>
                Flat type
                <select
                  value={form.flatType}
                  onChange={(event) =>
                    setForm({ ...form, flatType: event.target.value as PropertyFormState["flatType"] })
                  }
                >
                  <option value="3 ROOM">3 ROOM</option>
                  <option value="4 ROOM">4 ROOM</option>
                  <option value="5 ROOM">5 ROOM</option>
                  <option value="EXECUTIVE">EXECUTIVE</option>
                </select>
              </label>
              <label>
                Floor area (sqm)
                <input
                  type="number"
                  value={form.floorAreaSqm}
                  onChange={(event) => setForm({ ...form, floorAreaSqm: Number(event.target.value) })}
                />
              </label>
            </div>
            <div className="details-form__row">
              <label>
                Storey range
                <input
                  value={form.storeyRange}
                  onChange={(event) => setForm({ ...form, storeyRange: event.target.value })}
                />
              </label>
              <label>
                Calculated midpoint
                <input disabled value={calculateStoreyMidpoint(form.storeyRange)} />
              </label>
            </div>
            <div className="details-form__row">
              <label>
                Remaining lease years
                <input
                  type="number"
                  value={form.remainingLeaseYears}
                  onChange={(event) =>
                    setForm({ ...form, remainingLeaseYears: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Your target ask
                <input
                  type="number"
                  value={form.sellerAskingPrice}
                  onChange={(event) =>
                    setForm({ ...form, sellerAskingPrice: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <div className="details-form__row">
              <label>
                Outstanding loan
                <input
                  type="number"
                  value={form.outstandingLoan}
                  onChange={(event) => setForm({ ...form, outstandingLoan: Number(event.target.value) })}
                />
              </label>
              <label>
                CPF refund
                <input
                  type="number"
                  value={form.cpfRefund}
                  onChange={(event) => setForm({ ...form, cpfRefund: Number(event.target.value) })}
                />
              </label>
            </div>
            <label>
              Listing photos
              <input
                accept="image/*"
                multiple
                type="file"
                onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
              />
            </label>
            {photos.length > 0 ? (
              <div className="photo-grid">
                {photoPreviewUrls.map((photo) => (
                  <figure className="photo-card" key={photo.name}>
                    <Image alt={photo.name} height={120} src={photo.url} unoptimized width={180} />
                    <figcaption>{photo.name}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            <button className="primary-button" disabled={isBusy} type="submit">
              Start market analysis
            </button>
          </form>

          <div className="flow-panel">
            <div className="section-heading">
              <span>Current flow</span>
              <h2>{step === "details" ? "Waiting for property details" : step}</h2>
            </div>

            <div className="flow-summary">
              <div>
                <span>Comparable pricing found</span>
                <strong>{competitorSummary}</strong>
              </div>
              <div>
                <span>Recommended ask</span>
                <strong>{formatCurrency(report.fairValue.recommendedAskHigh)}</strong>
              </div>
              <div>
                <span>Expected time to close</span>
                <strong>{report.liquidity.expectedDaysToClose} days</strong>
              </div>
              <div>
                <span>Uploaded photos</span>
                <strong>{photos.length}</strong>
              </div>
            </div>

            {step === "scraping" || scrapeStreamingUrl || events.length > 0 ? (
              <div className="live-box">
                <div className="live-box__header">
                  <strong>Step 2: TinyFish live scrape</strong>
                  <span>{events.length} live events</span>
                </div>
                {scrapeStreamingUrl ? (
                  <iframe className="live-frame" src={scrapeStreamingUrl} title="TinyFish scraping live view" />
                ) : (
                  <div className="live-placeholder">Waiting for TinyFish live browser stream...</div>
                )}
                <div className="event-list">
                  {events.slice(-5).map((event, index) => (
                    <div className="event-item" key={`${event.type}-${index}`}>
                      <strong>{String(event.type ?? "event")}</strong>
                      <span>{String(event.message ?? event.status ?? "progress")}</span>
                    </div>
                  ))}
                </div>
                {scrapeError ? <p className="error-text">{scrapeError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {step === "analysis" || step === "confirm" || step === "posting" || step === "complete" ? (
        <section className="portal-card">
          <div className="section-heading">
            <span>Step 3</span>
            <h2>Quantitative analysis and seller recommendation</h2>
          </div>
          <div className="analysis-grid">
            <div className="analysis-card">
              <span>Fair value</span>
              <strong>{formatCurrency(report.fairValue.fairValue)}</strong>
              <p>
                Based on comparable listings, spatial quality, lease profile, and current market
                pressure.
              </p>
            </div>
            <div className="analysis-card">
              <span>Suggested ask range</span>
              <strong>
                {formatCurrency(report.fairValue.recommendedAskLow)} to{" "}
                {formatCurrency(report.fairValue.recommendedAskHigh)}
              </strong>
              <p>Positioned to maximize proceeds without pushing liquidity risk too far.</p>
            </div>
            <div className="analysis-card">
              <span>Liquidity outlook</span>
              <strong>
                {formatPercent(report.liquidity.saleProbability30d)} within 30 days
              </strong>
              <p>{report.liquidity.expectedDaysToClose} expected days to close.</p>
            </div>
            <div className="analysis-card">
              <span>Expected net proceeds</span>
              <strong>{formatCurrency(report.proceeds.p50)}</strong>
              <p>
                Downside {formatCurrency(report.proceeds.p10)} · upside{" "}
                {formatCurrency(report.proceeds.p90)}.
              </p>
            </div>
          </div>

          <div className="confirm-box">
            <div>
              <span>Step 4</span>
              <h3>Confirm the price you want the agent to post</h3>
            </div>
            <div className="confirm-box__actions">
              <button
                className={`choice-button ${confirmedPrice === report.fairValue.recommendedAskLow ? "choice-button--active" : ""}`}
                onClick={() => {
                  setConfirmedPrice(report.fairValue.recommendedAskLow);
                  setStep("confirm");
                }}
                type="button"
              >
                Conservative: {formatCurrency(report.fairValue.recommendedAskLow)}
              </button>
              <button
                className={`choice-button ${confirmedPrice === report.fairValue.recommendedAskHigh ? "choice-button--active" : ""}`}
                onClick={() => {
                  setConfirmedPrice(report.fairValue.recommendedAskHigh);
                  setStep("confirm");
                }}
                type="button"
              >
                Max yield: {formatCurrency(report.fairValue.recommendedAskHigh)}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {confirmedPrice ? (
        <section className="portal-card">
          <div className="section-heading">
            <span>Step 5</span>
            <h2>Post to 99.co through TinyFish</h2>
          </div>
          <div className="posting-box">
            <div>
              <p>
                Confirmed listing price: <strong>{formatCurrency(confirmedPrice)}</strong>
              </p>
              <p>
                The agent will use your approved price and property details to populate listing
                fields on 99.co so you do not have to do it manually.
              </p>
              <p>
                Uploaded photos in this portal: <strong>{photos.length}</strong>
              </p>
            </div>
            <button className="primary-button" disabled={isBusy} onClick={handleCreatePostings} type="button">
              Create 99.co posting with TinyFish
            </button>
          </div>

          {step === "posting" || step === "complete" ? (
            <div className="live-box">
              <div className="live-box__header">
                <strong>TinyFish live posting session</strong>
                <span>{step === "complete" ? "Completed" : "Running"}</span>
              </div>
              {postingStreamingUrl ? (
                <iframe className="live-frame" src={postingStreamingUrl} title="TinyFish posting live view" />
              ) : (
                <div className="live-placeholder">Waiting for TinyFish posting stream...</div>
              )}
              {postingResult ? <pre className="result-box">{JSON.stringify(postingResult, null, 2)}</pre> : null}
              {postingError ? <p className="error-text">{postingError}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

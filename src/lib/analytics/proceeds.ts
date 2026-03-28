import { FairValueResult, ProceedsResult, TargetProperty } from "@/src/types/domain";

function createSeededRandom(seed: number) {
  let state = seed % 2147483647;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function simulateNetProceeds(
  property: TargetProperty,
  fairValue: FairValueResult
): ProceedsResult {
  const random = createSeededRandom(42);
  const outcomes: number[] = [];
  const negotiatedPrices: number[] = [];
  const discountSamples: number[] = [];

  for (let iteration = 0; iteration < 3000; iteration += 1) {
    const spreadNoise = (random() - 0.5) * 0.04;
    const marketDrift = (random() - 0.5) * 12000;
    const negotiationDiscountPct =
      0.008 +
      Math.max(0, (property.sellerAskingPrice - fairValue.fairValue) / fairValue.fairValue) * 0.45 +
      spreadNoise;
    const transactedPrice = property.sellerAskingPrice * (1 - negotiationDiscountPct) + marketDrift;
    const netProceeds = transactedPrice - property.outstandingLoan - property.cpfRefund;

    outcomes.push(netProceeds);
    negotiatedPrices.push(transactedPrice);
    discountSamples.push(negotiationDiscountPct);
  }

  outcomes.sort((left, right) => left - right);
  negotiatedPrices.sort((left, right) => left - right);

  const quantile = (values: number[], percentile: number) =>
    values[Math.floor((values.length - 1) * percentile)];

  return {
    p10: Math.round(quantile(outcomes, 0.1)),
    p50: Math.round(quantile(outcomes, 0.5)),
    p90: Math.round(quantile(outcomes, 0.9)),
    medianNegotiatedPrice: Math.round(quantile(negotiatedPrices, 0.5)),
    averageDiscountToAskPct:
      discountSamples.reduce((sum, sample) => sum + sample, 0) / discountSamples.length
  };
}

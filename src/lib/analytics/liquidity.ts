import {
  ActiveListing,
  FairValueResult,
  LiquidityResult,
  TargetProperty
} from "@/src/types/domain";
import { average, clamp } from "@/src/lib/utils";

export function estimateLiquidity(
  property: TargetProperty,
  fairValue: FairValueResult,
  competitors: ActiveListing[]
): LiquidityResult {
  const avgCompetitorDom = average(competitors.map((listing) => listing.daysOnMarket));
  const avgRelistCount = average(competitors.map((listing) => listing.relistCount));
  const competitorPriceMean = average(competitors.map((listing) => listing.askingPrice));
  const pricingSpread = (property.sellerAskingPrice - fairValue.fairValue) / fairValue.fairValue;
  const competitorPremium = (property.sellerAskingPrice - competitorPriceMean) / competitorPriceMean;
  const competitionIndex = clamp(
    competitors.length * 14 + avgCompetitorDom * 0.45 + avgRelistCount * 10,
    0,
    100
  );
  const expectedDaysToClose = Math.round(
    24 + avgCompetitorDom * 0.42 + pricingSpread * 160 + Math.max(0, competitorPremium) * 55
  );
  const saleProbability30d = clamp(0.82 - pricingSpread * 2.2 - competitionIndex / 180, 0.12, 0.92);
  const saleProbability60d = clamp(saleProbability30d + 0.23, 0.22, 0.97);
  const saleProbability90d = clamp(saleProbability60d + 0.16, 0.35, 0.99);

  return {
    expectedDaysToClose,
    saleProbability30d,
    saleProbability60d,
    saleProbability90d,
    liquidityRisk:
      expectedDaysToClose <= 35 ? "Low" : expectedDaysToClose <= 60 ? "Moderate" : "High",
    competitionIndex: Math.round(competitionIndex)
  };
}

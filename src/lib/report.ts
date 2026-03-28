import {
  activeListings,
  estateSignals,
  estateTrendHistory,
  recentTransactions,
  targetProperty
} from "@/src/data/mock";
import { buildDistanceProfile } from "@/src/lib/analytics/distances";
import { estimateFairValue } from "@/src/lib/analytics/valuation";
import { estimateLiquidity } from "@/src/lib/analytics/liquidity";
import { simulateNetProceeds } from "@/src/lib/analytics/proceeds";
import { forecastEstateTrend } from "@/src/lib/analytics/trend";
import { SellerReport, TargetProperty } from "@/src/types/domain";

export function buildSellerReportForProperty(property: TargetProperty): SellerReport {
  const distances = buildDistanceProfile(property);
  const fairValue = estimateFairValue(property, recentTransactions, distances, estateSignals);
  const liquidity = estimateLiquidity(property, fairValue, activeListings);
  const proceeds = simulateNetProceeds(property, fairValue);
  const trend = forecastEstateTrend(estateTrendHistory);

  return {
    property,
    distances,
    fairValue,
    liquidity,
    proceeds,
    trend,
    activeCompetitors: activeListings,
    recentTransactions,
    signals: estateSignals
  };
}

export function buildSellerReport(): SellerReport {
  return buildSellerReportForProperty(targetProperty);
}

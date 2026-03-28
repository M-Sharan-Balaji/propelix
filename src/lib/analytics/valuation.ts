import {
  DistanceProfile,
  EstateSignal,
  FairValueResult,
  HistoricalTransaction,
  TargetProperty
} from "@/src/types/domain";
import { average } from "@/src/lib/utils";

export function estimateFairValue(
  property: TargetProperty,
  transactions: HistoricalTransaction[],
  distances: DistanceProfile,
  signals: EstateSignal[]
): FairValueResult {
  const comparablePsf = transactions.map(
    (transaction) => transaction.resalePrice / (transaction.floorAreaSqm * 10.7639)
  );
  const avgPsf = average(comparablePsf);
  const baselineFromTransactions = avgPsf * property.floorAreaSqm * 10.7639;
  const adjustedForLease = baselineFromTransactions * (property.remainingLeaseYears >= 70 ? 1.01 : 0.985);
  const adjustedForStorey = adjustedForLease * (1 + (property.storeyMidpoint - 8) * 0.0035);
  const spatialPremium =
    1 +
    Math.max(0, 0.018 - distances.mrtKm * 0.01) +
    Math.max(0, 0.01 - distances.hawkerKm * 0.003) +
    Math.max(0, 0.008 - distances.primarySchoolKm * 0.002);
  const adjustedForSpatialQuality = adjustedForStorey * spatialPremium;
  const signalAdjustment = 1 + signals.reduce((sum, signal) => sum + signal.impactScore, 0) * 0.015;
  const adjustedForSignals = adjustedForSpatialQuality * signalAdjustment;
  const fairValue = Math.round(adjustedForSignals / 1000) * 1000;

  return {
    fairValue,
    recommendedAskLow: Math.round(fairValue * 1.005 / 1000) * 1000,
    recommendedAskHigh: Math.round(fairValue * 1.03 / 1000) * 1000,
    confidence: 0.82,
    breakdown: {
      baselineFromTransactions: Math.round(baselineFromTransactions),
      adjustedForLease: Math.round(adjustedForLease),
      adjustedForStorey: Math.round(adjustedForStorey),
      adjustedForSpatialQuality: Math.round(adjustedForSpatialQuality),
      adjustedForSignals: Math.round(adjustedForSignals)
    }
  };
}

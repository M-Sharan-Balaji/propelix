import { EstateTrendResult, TrendPoint } from "@/src/types/domain";
import { average } from "@/src/lib/utils";

export function forecastEstateTrend(history: TrendPoint[]): EstateTrendResult {
  const latest = history[history.length - 1];
  const deltas = history.slice(1).map((point, index) => point.psf - history[index].psf);
  const avgDelta = average(deltas);
  const projectedPsf3M = Math.round(latest.psf + avgDelta * 3);

  return {
    currentPsf: latest.psf,
    projectedPsf3M,
    direction: projectedPsf3M > latest.psf + 2 ? "Up" : projectedPsf3M < latest.psf - 2 ? "Down" : "Flat",
    momentumScore: Math.round((avgDelta / latest.psf) * 1000 * 100) / 100,
    history
  };
}

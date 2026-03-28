export type FlatType = "3 ROOM" | "4 ROOM" | "5 ROOM" | "EXECUTIVE";

export interface TargetProperty {
  id: string;
  address: string;
  town: string;
  block: string;
  flatType: FlatType;
  floorAreaSqm: number;
  storeyRange: string;
  storeyMidpoint: number;
  remainingLeaseYears: number;
  leaseCommenceYear: number;
  latitude: number;
  longitude: number;
  outstandingLoan: number;
  cpfRefund: number;
  sellerAskingPrice: number;
}

export interface HistoricalTransaction {
  id: string;
  month: string;
  town: string;
  block: string;
  flatType: FlatType;
  storeyRange: string;
  floorAreaSqm: number;
  remainingLeaseYears: number;
  resalePrice: number;
  latitude: number;
  longitude: number;
}

export interface ActiveListing {
  id: string;
  portal: "PropertyGuru" | "99.co";
  address: string;
  block: string;
  askingPrice: number;
  originalAskingPrice: number;
  floorAreaSqm: number;
  partialUnit: string;
  storeyMidpoint: number;
  daysOnMarket: number;
  relistCount: number;
  ceaAgentId: string;
  imageHash: string;
  latitude: number;
  longitude: number;
  tags: string[];
}

export interface EstateSignal {
  id: string;
  category: "policy" | "infrastructure" | "supply" | "sentiment";
  title: string;
  impactScore: number;
  summary: string;
  effectiveDate: string;
}

export interface DistanceProfile {
  mrtKm: number;
  hawkerKm: number;
  primarySchoolKm: number;
}

export interface FairValueBreakdown {
  baselineFromTransactions: number;
  adjustedForLease: number;
  adjustedForStorey: number;
  adjustedForSpatialQuality: number;
  adjustedForSignals: number;
}

export interface FairValueResult {
  fairValue: number;
  recommendedAskLow: number;
  recommendedAskHigh: number;
  confidence: number;
  breakdown: FairValueBreakdown;
}

export interface LiquidityResult {
  expectedDaysToClose: number;
  saleProbability30d: number;
  saleProbability60d: number;
  saleProbability90d: number;
  liquidityRisk: "Low" | "Moderate" | "High";
  competitionIndex: number;
}

export interface ProceedsResult {
  p10: number;
  p50: number;
  p90: number;
  medianNegotiatedPrice: number;
  averageDiscountToAskPct: number;
}

export interface TrendPoint {
  month: string;
  psf: number;
  volume: number;
}

export interface EstateTrendResult {
  currentPsf: number;
  projectedPsf3M: number;
  direction: "Up" | "Flat" | "Down";
  momentumScore: number;
  history: TrendPoint[];
}

export interface SellerReport {
  property: TargetProperty;
  distances: DistanceProfile;
  fairValue: FairValueResult;
  liquidity: LiquidityResult;
  proceeds: ProceedsResult;
  trend: EstateTrendResult;
  activeCompetitors: ActiveListing[];
  recentTransactions: HistoricalTransaction[];
  signals: EstateSignal[];
}

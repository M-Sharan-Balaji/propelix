import {
  ActiveListing,
  EstateSignal,
  HistoricalTransaction,
  TargetProperty,
  TrendPoint
} from "@/src/types/domain";

export const targetProperty: TargetProperty = {
  id: "hdb-bt-batok-001",
  address: "Blk 289C Bukit Batok Street 25",
  town: "BUKIT BATOK",
  block: "289C",
  flatType: "4 ROOM",
  floorAreaSqm: 93,
  storeyRange: "10 TO 12",
  storeyMidpoint: 11,
  remainingLeaseYears: 71,
  leaseCommenceYear: 1997,
  latitude: 1.3489,
  longitude: 103.7564,
  outstandingLoan: 188000,
  cpfRefund: 142000,
  sellerAskingPrice: 698000
};

export const recentTransactions: HistoricalTransaction[] = [
  { id: "txn-1", month: "2025-11", town: "BUKIT BATOK", block: "289A", flatType: "4 ROOM", storeyRange: "10 TO 12", floorAreaSqm: 92, remainingLeaseYears: 71, resalePrice: 688000, latitude: 1.3491, longitude: 103.7568 },
  { id: "txn-2", month: "2025-12", town: "BUKIT BATOK", block: "289B", flatType: "4 ROOM", storeyRange: "07 TO 09", floorAreaSqm: 93, remainingLeaseYears: 70, resalePrice: 676000, latitude: 1.3482, longitude: 103.7559 },
  { id: "txn-3", month: "2026-01", town: "BUKIT BATOK", block: "290A", flatType: "4 ROOM", storeyRange: "13 TO 15", floorAreaSqm: 95, remainingLeaseYears: 71, resalePrice: 701000, latitude: 1.3498, longitude: 103.7576 },
  { id: "txn-4", month: "2026-01", town: "BUKIT BATOK", block: "288D", flatType: "4 ROOM", storeyRange: "10 TO 12", floorAreaSqm: 90, remainingLeaseYears: 70, resalePrice: 669000, latitude: 1.3479, longitude: 103.7557 },
  { id: "txn-5", month: "2026-02", town: "BUKIT BATOK", block: "289D", flatType: "4 ROOM", storeyRange: "10 TO 12", floorAreaSqm: 93, remainingLeaseYears: 71, resalePrice: 694000, latitude: 1.3486, longitude: 103.7562 },
  { id: "txn-6", month: "2026-03", town: "BUKIT BATOK", block: "291B", flatType: "4 ROOM", storeyRange: "07 TO 09", floorAreaSqm: 94, remainingLeaseYears: 71, resalePrice: 685000, latitude: 1.3503, longitude: 103.7579 }
];

export const activeListings: ActiveListing[] = [
  { id: "lst-1", portal: "PropertyGuru", address: "Blk 289B Bukit Batok Street 25", block: "289B", askingPrice: 699000, originalAskingPrice: 718000, floorAreaSqm: 93, partialUnit: "11-XX", storeyMidpoint: 11, daysOnMarket: 41, relistCount: 1, ceaAgentId: "R012345A", imageHash: "a1b2", latitude: 1.3484, longitude: 103.7561, tags: ["corner_unit", "pure_selling"] },
  { id: "lst-2", portal: "99.co", address: "Blk 290A Bukit Batok Street 25", block: "290A", askingPrice: 715000, originalAskingPrice: 728000, floorAreaSqm: 95, partialUnit: "14-XX", storeyMidpoint: 14, daysOnMarket: 63, relistCount: 2, ceaAgentId: "R076543B", imageHash: "c3d4", latitude: 1.3498, longitude: 103.7576, tags: ["tastefully_renovated"] },
  { id: "lst-3", portal: "PropertyGuru", address: "Blk 288D Bukit Batok Street 25", block: "288D", askingPrice: 682000, originalAskingPrice: 688000, floorAreaSqm: 90, partialUnit: "08-XX", storeyMidpoint: 8, daysOnMarket: 18, relistCount: 0, ceaAgentId: "R023456C", imageHash: "e5f6", latitude: 1.3479, longitude: 103.7557, tags: ["requires_extension"] },
  { id: "lst-4", portal: "99.co", address: "Blk 289A Bukit Batok Street 25", block: "289A", askingPrice: 705000, originalAskingPrice: 725000, floorAreaSqm: 92, partialUnit: "10-XX", storeyMidpoint: 10, daysOnMarket: 52, relistCount: 1, ceaAgentId: "R012345A", imageHash: "g7h8", latitude: 1.3491, longitude: 103.7568, tags: ["pure_selling", "main_door_north"] }
];

export const estateSignals: EstateSignal[] = [
  { id: "sig-1", category: "infrastructure", title: "Upcoming transport access improvements near Bukit Batok precinct", impactScore: 0.68, summary: "Improved commuter convenience supports buyer demand and pricing resilience.", effectiveDate: "2026-02-10" },
  { id: "sig-2", category: "supply", title: "Moderate BTO pipeline nearby may soften upside", impactScore: -0.34, summary: "Future supply provides alternatives for price-sensitive buyers.", effectiveDate: "2026-01-28" },
  { id: "sig-3", category: "sentiment", title: "Buyer chatter remains constructive for mature-west estates", impactScore: 0.24, summary: "Forum and listing-description sentiment indicates resilient interest.", effectiveDate: "2026-03-01" }
];

export const estateTrendHistory: TrendPoint[] = [
  { month: "2025-09", psf: 673, volume: 41 },
  { month: "2025-10", psf: 678, volume: 44 },
  { month: "2025-11", psf: 681, volume: 39 },
  { month: "2025-12", psf: 686, volume: 46 },
  { month: "2026-01", psf: 689, volume: 43 },
  { month: "2026-02", psf: 693, volume: 47 },
  { month: "2026-03", psf: 697, volume: 45 }
];

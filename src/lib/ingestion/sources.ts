export interface DataSourceStatus {
  name: string;
  cadence: string;
  status: "Ready" | "Planned";
  notes: string;
}

export const dataSources: DataSourceStatus[] = [
  {
    name: "Data.gov.sg resale transactions",
    cadence: "Daily sync",
    status: "Ready",
    notes: "Canonical transaction history normalized into comparable HDB records."
  },
  {
    name: "PropertyGuru listings",
    cadence: "4-hour crawl",
    status: "Planned",
    notes: "Active competition, price-drop history, and agent metadata."
  },
  {
    name: "99.co listings",
    cadence: "4-hour crawl",
    status: "Planned",
    notes: "Listing overlap, relist detection, and price freshness."
  },
  {
    name: "Policy and infrastructure signals",
    cadence: "Event-driven parse",
    status: "Planned",
    notes: "Government and media announcements summarized into structured effects."
  }
];

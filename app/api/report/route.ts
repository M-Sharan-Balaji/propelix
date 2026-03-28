import { buildSellerReport } from "@/src/lib/report";

export async function GET() {
  return Response.json(buildSellerReport());
}

import { DistanceProfile, TargetProperty } from "@/src/types/domain";

export function buildDistanceProfile(property: TargetProperty): DistanceProfile {
  return {
    mrtKm: Number((0.62 + (property.storeyMidpoint > 10 ? -0.03 : 0)).toFixed(2)),
    hawkerKm: 0.48,
    primarySchoolKm: 0.74
  };
}

import {
  formatHospitalData,
  getHospitalsNearby,
  getPincodeCoordinates,
} from "@/lib/openstreetmap";
import type { HospitalResult } from "@/lib/openstreetmap";
import type { RiskLevel } from "@/services/aiHealthAssistant/types";
import { createSafeLogger } from "@/services/observability/safeLogger";

const logger = createSafeLogger("hospitalRecommendation");

export async function recommendHospitalsForRisk(
  riskLevel: RiskLevel,
  pincode?: string,
  limit = 3
): Promise<HospitalResult[]> {
  if (!pincode || (riskLevel !== "moderate" && riskLevel !== "high" && riskLevel !== "emergency")) {
    return [];
  }

  try {
    const coordinates = await getPincodeCoordinates(pincode);
    const hospitals = await getHospitalsNearby(coordinates);

    const recommendations = hospitals
      .map((hospital) =>
        formatHospitalData(hospital, coordinates.lat, coordinates.lon)
      )
      .sort((left, right) => left.distance - right.distance)
      .slice(0, limit);

    logger.info("hospitals_recommended", {
      riskLevel,
      recommendationCount: recommendations.length,
    });

    return recommendations;
  } catch (error) {
    logger.warn("hospital_recommendation_failed", {
      riskLevel,
      hasPincode: Boolean(pincode),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return [];
  }
}

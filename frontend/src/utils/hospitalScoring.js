// hospitalScoring.js
import { getTimeBasedWeights } from "./hospitalWeights";

// Calculate distance between two points (Haversine formula)
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Score a single hospital using hospital.stats.inflowActive as incoming count
export function scoreHospital(hospital, driverLat, driverLng, serviceNeeded) {
  const weights = getTimeBasedWeights(serviceNeeded);
  
  const profile = hospital.profile || {};
  const capacity = hospital.capacity || {};
  const stats = hospital.stats || {};
  const resources = hospital.resources || {};
  const location = hospital.location || {};
  const incomingCount = stats.inflowActive || 0;

  // 1. SERVICE MATCH (must-have)
  let serviceScore = 0;
  let hasRequiredService = false;

  if (serviceNeeded === "Emergency" && resources?.emergencyAvailable) {
    serviceScore = weights.serviceScore;
    hasRequiredService = true;
  } else if (serviceNeeded === "ICU" && (capacity?.icuTotal > 0)) {
    serviceScore = weights.serviceScore;
    hasRequiredService = true;
  } else if ((serviceNeeded === "Advanced" || serviceNeeded === "Basic") && (capacity?.bedsTotal > 0)) {
    serviceScore = weights.serviceScore;
    hasRequiredService = true;
  }

  if (!hasRequiredService) {
    return {
      id: hospital.id,
      name: profile.name || "Unknown Hospital",
      totalScore: -1000,
      excluded: true,
      reason: `No ${serviceNeeded} service available`,
    };
  }

  // 2. DISTANCE SCORE (closer is better)
  let distanceScore = 0;
  let distance = null;
  if (location?.lat != null && location?.lng != null) {
    distance = haversineKm(driverLat, driverLng, location.lat, location.lng);
    distanceScore = Math.max(0, 100 - distance * 5);
  }

  // 3. INFLOW SCORE (based on inflowActive stat)
  const inflowScore = Math.max(0, 100 - incomingCount * 10);

  // 4. BED AVAILABILITY SCORE
  const bedsAvail = Math.max((capacity?.bedsTotal || 0) - (stats?.bedsOccupied || 0), 0);
  const icuAvail = Math.max((capacity?.icuTotal || 0) - (stats?.icuOccupied || 0), 0);
  
  let bedScore = 0;
  if (serviceNeeded === "ICU" && capacity?.icuTotal > 0) {
    bedScore = (icuAvail / capacity.icuTotal) * 100;
  } else if (capacity?.bedsTotal > 0) {
    bedScore = (bedsAvail / capacity.bedsTotal) * 100;
  }

  // Weighted total score
  const totalScore =
    serviceScore * 0.4 +
    distanceScore * weights.distanceWeight * 0.3 +
    inflowScore * weights.inflowWeight * 0.3 +
    bedScore * weights.bedWeight * 0.3;

  return {
    id: hospital.id,
    name: profile.name || "Unknown Hospital",
    address: location?.address || "Address not set",
    distance: distance ? distance.toFixed(2) : "N/A",
    beds: `${bedsAvail}/${capacity?.bedsTotal || 0}`,
    icuBeds: `${icuAvail}/${capacity?.icuTotal || 0}`,
    incomingAmbulances: incomingCount,
    emergencyAvailable: resources?.emergencyAvailable ? "Yes" : "No",
    totalScore: parseFloat(totalScore.toFixed(2)),
    breakdown: {
      serviceScore: parseFloat(serviceScore.toFixed(1)),
      distanceScore: parseFloat(distanceScore.toFixed(1)),
      inflowScore: parseFloat(inflowScore.toFixed(1)),
      bedScore: parseFloat(bedScore.toFixed(1)),
    },
  };
}

// Main export that returns top recommendations using hospitals with stats included
export function getTopRecommendations(hospitals, driverLat, driverLng, serviceNeeded) {
  const scored = Object.entries(hospitals)
    .map(([id, hospital]) =>
      scoreHospital(hospital, driverLat, driverLng, serviceNeeded)
    )
    .filter((h) => h.totalScore > -1000)
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    recommended: scored[0] || null,
    alternates: scored.slice(1, 3),
    allScored: scored,
  };
}

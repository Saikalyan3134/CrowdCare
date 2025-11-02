// Service type weights (how important each factor is)
export const serviceWeights = {
  Basic: {
    serviceScore: 100,
    distanceWeight: 0.3,
    inflowWeight: 0.2,
    bedWeight: 0.5,
  },
  Advanced: {
    serviceScore: 100,
    distanceWeight: 0.4,
    inflowWeight: 0.3,
    bedWeight: 0.3,
  },
  ICU: {
    serviceScore: 100,
    distanceWeight: 0.2,
    inflowWeight: 0.4,
    bedWeight: 0.4,
  },
  Emergency: {
    serviceScore: 100,
    distanceWeight: 0.1,
    inflowWeight: 0.3,
    bedWeight: 0.6,
  },
};

// Adjust weights based on time of day (peak hours)
export const getTimeBasedWeights = (serviceType) => {
  const now = new Date();
  const hour = now.getHours();
  
  // Peak hours: 8-10am, 5-7pm
  const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
  
  let weights = { ...serviceWeights[serviceType] };
  
  if (isPeakHour) {
    // During peak, prioritize closer hospitals with less inflow
    weights.distanceWeight *= 1.2;
    weights.inflowWeight *= 1.3;
    weights.bedWeight *= 0.8;
  }
  
  return weights;
};

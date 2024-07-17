enum LatencyOptimizationLevel {
  highQuality = 0, // No optimization - high quality
  optimized = 1, // A bit of optimization - cracks can happen
  bestPerformance = 2, // Low latency, cracks in poor networks
  ultraFast = 3, // Ultra low latency
}

export default LatencyOptimizationLevel;

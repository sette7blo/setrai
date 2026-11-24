// No AI feature exists yet, so "ai" stays false whatever AI_ENABLED says.
// Once one does, report config.ai.enabled here.
const AI_FEATURE_AVAILABLE = false

export function getCapabilities(config) {
  return {
    ai: AI_FEATURE_AVAILABLE && config.ai.enabled
  }
}

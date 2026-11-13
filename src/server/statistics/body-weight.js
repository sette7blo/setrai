export function getChronologicalBodyWeight(bodyService) {
  return bodyService
    .listBodyWeight()
    .map((entry) => ({
      date: entry.date,
      weightKg: entry.weightKg
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Latest minus first entry, matching "Total change" on the Body tab. Rounded
// to grams so float noise from unit conversion does not leak into the API.
export function getBodyWeightChange(history) {
  if (!history.length) return null
  const change = history[history.length - 1].weightKg - history[0].weightKg
  return Math.round(change * 1000) / 1000
}

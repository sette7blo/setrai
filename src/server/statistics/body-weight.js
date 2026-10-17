export function getChronologicalBodyWeight(bodyService) {
  return bodyService
    .listBodyWeight()
    .map((entry) => ({
      date: entry.date,
      weightKg: entry.weightKg
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

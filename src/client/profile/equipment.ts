export const EQUIPMENT_OPTIONS = [
  'bodyweight',
  'dumbbells',
  'barbell',
  'bench',
  'cable-machine',
  'machine',
  'pull-up-bar',
  'kettlebell'
]

export function equipmentLabel(value: string): string {
  const known: Record<string, string> = {
    bodyweight: 'Bodyweight',
    dumbbells: 'Dumbbells',
    barbell: 'Barbell',
    bench: 'Bench',
    'cable-machine': 'Cable Machine',
    machine: 'Machine',
    'pull-up-bar': 'Pull-up Bar',
    kettlebell: 'Kettlebell'
  }
  return known[value] ?? value.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

export function goalLabel(value: string): string {
  const known: Record<string, string> = {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    'general-fitness': 'General Fitness',
    endurance: 'Endurance'
  }
  return known[value] ?? (value ? equipmentLabel(value) : 'Not set')
}

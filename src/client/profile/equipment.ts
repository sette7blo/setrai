import trainingGoals from '../../shared/training-goals.json' with { type: 'json' }

export interface TrainingGoal {
  value: string
  label: string
  description: string
  sets: number
  reps: string
  restSec: number
}

export const TRAINING_GOALS = trainingGoals.goals as TrainingGoal[]

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
  return TRAINING_GOALS.find(goal => goal.value === value)?.label ?? (value ? equipmentLabel(value) : 'Not set')
}

export function effectiveTrainingGoal(value: string): TrainingGoal {
  return TRAINING_GOALS.find(goal => goal.value === value)
    ?? TRAINING_GOALS.find(goal => goal.value === 'general-fitness')!
}

export function goalPrescription(goal: TrainingGoal): string {
  return `${goal.sets} sets · ${goal.reps} reps · ${goal.restSec} sec rest`
}

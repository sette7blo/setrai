export interface TrainingFrequency { totalSessions: number, thisWeek: number }
export interface WeeklyVolumePoint { weekStart: string, volume: number }
export interface ExerciseVolume { exerciseSlug: string, exerciseName: string, volume: number }
export interface MuscleVolume { muscle: string, volume: number }
export interface PersonalRecord {
  exerciseSlug: string
  exerciseName: string
  maxWeight: number
  estimated1RM: number
  recordWeight?: number
  recordReps?: number
  achievedAt?: string
  previousEstimated1RM?: number | null
  improvement?: number | null
}
export interface TrainingStreak {
  currentStreakDays?: number
  longestStreakDays?: number
  currentStreakWeeks: number
  longestStreakWeeks?: number
}
export interface BodyWeightPoint { date: string, weightKg: number }

export interface StatisticsApiPayload {
  timeZone?: string
  trainingFrequency?: Partial<TrainingFrequency>
  totalVolume?: number
  weeklyVolume?: WeeklyVolumePoint[]
  volumeByExercise?: ExerciseVolume[]
  volumeByMuscle?: MuscleVolume[]
  personalRecords?: PersonalRecord[]
  trainingStreak?: Partial<TrainingStreak>
  bodyWeight?: BodyWeightPoint[]
  bodyWeightChangeKg?: number | null
}

export interface StatisticsOverview {
  timeZone?: string
  trainingFrequency: TrainingFrequency
  totalVolume: number
  weeklyVolume: WeeklyVolumePoint[]
  volumeByExercise: ExerciseVolume[]
  volumeByMuscle: MuscleVolume[]
  personalRecords: PersonalRecord[]
  trainingStreak: TrainingStreak
  bodyWeight: BodyWeightPoint[]
  bodyWeightChangeKg: number | null
}

export interface ExerciseProgressSet { setNumber: number, reps: number, weight: number | null, durationSec: number | null }
export interface ExerciseProgressSession {
  sessionId: number
  finishedAt: string
  sets: ExerciseProgressSet[]
  topSet: ExerciseProgressSet
  bestEstimated1RM: number | null
  volume: number
}
export interface ExerciseBest { value: number, date: string, weight?: number | null, reps?: number }
export interface ExerciseProgress {
  exercise: { id: number, slug: string, name: string }
  sessions: ExerciseProgressSession[]
  best: { heaviestWeight: ExerciseBest | null, estimated1RM: ExerciseBest | null, mostReps: ExerciseBest | null, longestDurationSec: ExerciseBest | null }
}

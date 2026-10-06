export interface TrainingFrequency { totalSessions: number, thisWeek: number }
export interface WeeklyVolumePoint { weekStart: string, volume: number }
export interface ExerciseVolume { exerciseSlug: string, exerciseName: string, volume: number }
export interface MuscleVolume { muscle: string, volume: number }
export interface PersonalRecord { exerciseSlug: string, exerciseName: string, maxWeight: number, estimated1RM: number }
export interface TrainingStreak { currentStreakWeeks: number, longestStreakWeeks?: number }
export interface BodyWeightPoint { date: string, weightKg: number }

export interface StatisticsApiPayload {
  trainingFrequency?: Partial<TrainingFrequency>
  totalVolume?: number
  weeklyVolume?: WeeklyVolumePoint[]
  volumeByExercise?: ExerciseVolume[]
  volumeByMuscle?: MuscleVolume[]
  personalRecords?: PersonalRecord[]
  trainingStreak?: Partial<TrainingStreak>
  bodyWeight?: BodyWeightPoint[]
}

export interface StatisticsOverview {
  trainingFrequency: TrainingFrequency
  totalVolume: number
  weeklyVolume: WeeklyVolumePoint[]
  volumeByExercise: ExerciseVolume[]
  volumeByMuscle: MuscleVolume[]
  personalRecords: PersonalRecord[]
  trainingStreak: TrainingStreak
  bodyWeight: BodyWeightPoint[]
}

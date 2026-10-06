import { startQuickWorkout } from './api.js'
import type { QuickWorkout } from './types.js'

export async function startAndNavigate(workout: QuickWorkout): Promise<void> {
  const { session } = await startQuickWorkout(workout)
  window.location.href = `/sessions/${session.id}`
}

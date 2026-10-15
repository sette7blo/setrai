import { updateExercise, uploadExerciseImage } from './api.js'
import type { Exercise } from './types.js'

interface ImageUploadDependencies {
  upload?: (file: File) => Promise<string>
  update?: (id: number, payload: { imageUrl: string }) => Promise<Exercise>
}

export const MAX_EXERCISE_IMAGE_BYTES = 10 * 1024 * 1024

export interface AppliedExerciseImage {
  imageUrl: string
  persisted: boolean
}

export async function applyExerciseImage(
  file: File,
  exerciseId: number | null,
  dependencies: ImageUploadDependencies = {}
): Promise<AppliedExerciseImage> {
  if (file.size > MAX_EXERCISE_IMAGE_BYTES) {
    throw new Error('Image must be 10 MB or smaller')
  }
  const upload = dependencies.upload ?? uploadExerciseImage
  const update = dependencies.update ?? updateExercise
  const imageUrl = await upload(file)

  if (exerciseId == null) return { imageUrl, persisted: false }

  const exercise = await update(exerciseId, { imageUrl })
  return {
    imageUrl: exercise.imageUrl || imageUrl,
    persisted: true
  }
}

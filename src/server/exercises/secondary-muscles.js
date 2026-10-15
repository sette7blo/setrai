import corrections from '../../shared/exercise-secondary-muscles.json' with { type: 'json' }

export function catalogSecondaryMuscles(slug, primary, muscles) {
  const secondary = [...new Set(
    muscles.filter(muscle => muscle && muscle !== primary)
  )]

  if (secondary.length > 0) return secondary
  return corrections[slug] ?? []
}

export const exerciseSecondaryMuscleCorrections = corrections

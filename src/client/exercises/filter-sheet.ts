import { createFilterChips, createFilterSheet, type FilterGroup } from '../shared/filter-sheet.js'
import { filterExercises, uniqueDifficulties, uniqueEquipment, uniqueMuscles } from './filters.js'
import { displayName } from './format.js'
import type { Exercise, ExerciseFilters } from './types.js'

type Facet = 'muscle' | 'equipment' | 'difficulty'
function groups(exercises: Exercise[], filters: ExerciseFilters): FilterGroup[] {
  return ([['muscle', 'Muscle', uniqueMuscles(exercises)], ['equipment', 'Equipment', uniqueEquipment(exercises)],
    ['difficulty', 'Difficulty', uniqueDifficulties(exercises)]] as [Facet, string, string[]][])
    .map(([key, label, values]) => ({ key, label, value: filters[key], options: values.map(value => ({ value, label: displayName(value) })) }))
}

export function exerciseFilterSheet(exercises: Exercise[], getFilters: () => ExerciseFilters, commit: (filters: ExerciseFilters) => void, onClose: () => void): HTMLDialogElement {
  return createFilterSheet({
    title: 'Filter exercises', resultLabel: 'exercises', groups: groups(exercises, getFilters()),
    count: () => filterExercises(exercises, getFilters()).length,
    onChange: (key, value) => commit({ ...getFilters(), [key]: value }),
    onReset: () => commit({ ...getFilters(), muscle: '', equipment: '', difficulty: '' }),
    onClose
  })
}

export function exerciseFilterChips(exercises: Exercise[], filters: ExerciseFilters, commit: (filters: ExerciseFilters) => void): HTMLElement {
  return createFilterChips(groups(exercises, filters), key => commit({ ...filters, [key]: '' }),
    () => commit({ ...filters, muscle: '', equipment: '', difficulty: '' }))
}

import { Check } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { muscleMapMarkupForMuscles } from './muscle-map.js'
import {
  canonicalSelection,
  EXERCISE_EQUIPMENT,
  normalizeEquipment,
  normalizePrimaryMuscle,
  normalizeSecondaryMuscle,
  PRIMARY_MUSCLES,
  SECONDARY_MUSCLES,
  type TaxonomyOption
} from './taxonomy.js'

export function taxonomySelect(
  options: TaxonomyOption[],
  current: string,
  placeholder = 'Choose one'
): HTMLSelectElement {
  const select = document.createElement('select')
  const empty = document.createElement('option')
  empty.value = ''
  empty.textContent = placeholder
  empty.disabled = true
  select.append(empty)

  const normalizedCurrent = current.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  for (const item of options) {
    const option = document.createElement('option')
    option.value = item.value
    option.textContent = item.label
    option.selected = item.value === normalizedCurrent
    select.append(option)
  }
  if (!options.some(option => option.value === normalizedCurrent)) {
    if (normalizedCurrent) {
      const legacy = document.createElement('option')
      legacy.value = ''
      legacy.textContent = `Current: ${current} — choose a supported value`
      legacy.selected = true
      select.append(legacy)
    } else {
      empty.selected = true
    }
  }
  return select
}

interface ChipGroup {
  element: HTMLElement
  values: () => string[]
  setDisabled: (value: string, disabled: boolean) => void
}

function chipGroup(
  label: string,
  hint: string,
  options: TaxonomyOption[],
  initial: string[],
  normalize: (value: string) => string,
  onChange?: () => void
): ChipGroup {
  const section = document.createElement('fieldset')
  section.className = 'exercise-editor__choice-field'
  const legend = document.createElement('legend')
  legend.textContent = label
  const note = document.createElement('small')
  note.textContent = hint
  const chips = document.createElement('div')
  chips.className = 'exercise-editor__chips'
  const selected = new Set(canonicalSelection(initial, options, normalize))
  const inputs = new Map<string, HTMLInputElement>()

  for (const option of options) {
    const chip = document.createElement('label')
    chip.className = 'exercise-editor__chip'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = option.value
    input.checked = selected.has(option.value)
    const mark = document.createElement('span')
    mark.className = 'exercise-editor__chip-mark'
    mark.append(iconElement(Check))
    const text = document.createElement('span')
    text.textContent = option.label
    input.addEventListener('change', () => onChange?.())
    chip.append(input, mark, text)
    chips.append(chip)
    inputs.set(option.value, input)
  }
  section.append(legend, note, chips)
  return {
    element: section,
    values: () => [...inputs.values()].filter(input => input.checked && !input.disabled).map(input => input.value),
    setDisabled: (value, disabled) => {
      const input = inputs.get(value)
      if (!input) return
      input.disabled = disabled
      if (disabled) input.checked = false
    }
  }
}

export interface MuscleEditorControl {
  element: HTMLElement
  primary: HTMLSelectElement
  secondaryValues: () => string[]
}

export function muscleEditorControl(initialPrimary: string, initialSecondary: string[]): MuscleEditorControl {
  const section = document.createElement('section')
  section.className = 'exercise-editor__muscle-layout'
  const controls = document.createElement('div')
  controls.className = 'exercise-editor__muscle-controls'

  const primaryField = document.createElement('label')
  primaryField.className = 'exercise-editor__field'
  const primaryLabel = document.createElement('span')
  primaryLabel.textContent = 'Primary muscle'
  const primary = taxonomySelect(PRIMARY_MUSCLES, normalizePrimaryMuscle(initialPrimary), 'Select primary muscle')
  primary.required = true
  const primaryHint = document.createElement('small')
  primaryHint.textContent = 'Required. This recovery group drives readiness and Quick Workout matching.'
  primaryField.append(primaryLabel, primary, primaryHint)

  const preview = document.createElement('figure')
  preview.className = 'exercise-editor__muscle-preview muscle-map'
  const caption = document.createElement('figcaption')
  caption.textContent = 'Muscle preview'
  const graphic = document.createElement('div')
  const legend = document.createElement('p')
  legend.className = 'muscle-map__legend'
  legend.innerHTML = '<span class="muscle-map__key-primary">● Primary</span> <span class="muscle-map__key-secondary">● Secondary</span> · Front / Back'

  let secondary!: ChipGroup
  const render = (): void => {
    const primaryValue = primary.value
    for (const option of SECONDARY_MUSCLES) {
      secondary?.setDisabled(option.value, Boolean(primaryValue) && option.value === primaryValue)
    }
    const values = secondary?.values() ?? []
    graphic.innerHTML = muscleMapMarkupForMuscles(primaryValue ? [primaryValue] : [], values)
    const svg = graphic.querySelector('svg')
    if (svg) {
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', `Muscle preview. Primary: ${primaryValue || 'none'}. Secondary: ${values.join(', ') || 'none'}.`)
    }
  }

  secondary = chipGroup(
    'Secondary muscles',
    'Optional detailed targets. The primary group cannot also be secondary.',
    SECONDARY_MUSCLES,
    initialSecondary,
    normalizeSecondaryMuscle,
    render
  )
  primary.addEventListener('change', render)
  controls.append(primaryField, secondary.element)
  preview.append(caption, graphic, legend)
  section.append(controls, preview)
  render()
  return { element: section, primary, secondaryValues: secondary.values }
}

export function equipmentEditorControl(initial: string[]): { element: HTMLElement, values: () => string[] } {
  const group = chipGroup(
    'Equipment',
    'Choose all equipment required so library and Quick Workout filters stay accurate.',
    EXERCISE_EQUIPMENT,
    initial,
    normalizeEquipment
  )
  return { element: group.element, values: group.values }
}

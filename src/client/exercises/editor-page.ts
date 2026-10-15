import { ChevronLeft, ImagePlus, Save, Trash2 } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { readableApiError } from '../shared/api/errors.js'
import { pageHeading } from '../shared/page-chrome.js'
import { pageError, pageLoading } from '../shared/page-states.js'
import {
  createExercise,
  deleteExercise,
  getExercise,
  updateExercise,
  uploadExerciseImage
} from './api.js'
import { createExerciseImage } from './image.js'
import { equipmentEditorControl, muscleEditorControl, taxonomySelect } from './editor-taxonomy.js'
import { EXERCISE_CATEGORIES, EXERCISE_DIFFICULTIES } from './taxonomy.js'
import type { Exercise, ExerciseWrite } from './types.js'

function field(label: string, control: HTMLElement, hint = ''): HTMLElement {
  const wrap = document.createElement('label')
  wrap.className = 'exercise-editor__field'
  const title = document.createElement('span')
  title.textContent = label
  wrap.append(title, control)
  if (hint) {
    const note = document.createElement('small')
    note.textContent = hint
    wrap.append(note)
  }
  return wrap
}

function textInput(value: string, opts: { type?: string, placeholder?: string, required?: boolean, min?: string, max?: string } = {}): HTMLInputElement {
  const input = document.createElement('input')
  input.type = opts.type || 'text'
  input.value = value
  if (opts.placeholder) input.placeholder = opts.placeholder
  if (opts.required) input.required = true
  if (opts.min) input.min = opts.min
  if (opts.max) input.max = opts.max
  return input
}

function textArea(value: string, rows = 3): HTMLTextAreaElement {
  const area = document.createElement('textarea')
  area.rows = rows
  area.value = value
  return area
}

function csvValue(values: string[]): string {
  return values.join(', ')
}

function parseCsv(value: string): string[] {
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

function linesValue(values: string[]): string {
  return values.join('\n')
}

function parseLines(value: string): string[] {
  return value.split('\n').map(part => part.trim()).filter(Boolean)
}

function emptyExercise(): Exercise {
  return {
    id: 0,
    slug: '',
    name: '',
    description: '',
    category: 'strength',
    muscleGroup: '',
    muscles: [],
    equipment: [],
    difficulty: 'intermediate',
    tags: [],
    instructions: [],
    imageUrl: '',
    favourite: false,
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRest: 90
  }
}

export function createExerciseEditorForm(
  initial: Exercise,
  mode: 'create' | 'edit',
  onSaved: (exercise: Exercise) => void
): HTMLElement {
  const form = document.createElement('form')
  form.className = 'exercise-editor'
  form.noValidate = true

  const status = document.createElement('p')
  status.className = 'exercise-editor__status'
  status.setAttribute('role', 'status')

  const name = textInput(initial.name, { required: true, placeholder: 'Bench Press' })
  const description = textArea(initial.description, 3)
  const category = taxonomySelect(EXERCISE_CATEGORIES, initial.category || 'strength', 'Select category')
  category.required = true
  const muscles = muscleEditorControl(initial.muscleGroup, initial.muscles)
  const equipment = equipmentEditorControl(initial.equipment)
  const difficulty = taxonomySelect(EXERCISE_DIFFICULTIES, initial.difficulty || 'intermediate', 'Select difficulty')
  difficulty.required = true
  const tags = textInput(csvValue(initial.tags), { placeholder: 'compound, push' })
  const instructions = textArea(linesValue(initial.instructions), 6)
  const defaultSets = textInput(String(initial.defaultSets), { type: 'number', min: '1', max: '50' })
  const defaultReps = textInput(initial.defaultReps, { placeholder: '8-12' })
  const defaultRest = textInput(String(initial.defaultRest), { type: 'number', min: '0', max: '600' })

  let imageUrl = initial.imageUrl
  const preview = document.createElement('div')
  preview.className = 'exercise-editor__preview'
  const renderPreview = (): void => {
    preview.replaceChildren(createExerciseImage(imageUrl, `${name.value || 'Exercise'} image`, 'exercise-editor__image'))
  }
  renderPreview()

  const file = document.createElement('input')
  file.type = 'file'
  file.accept = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'
  file.setAttribute('aria-label', 'Upload exercise image')
  file.addEventListener('change', () => {
    status.textContent = ''
    const chosen = file.files?.[0]
    if (!chosen) return
    status.textContent = 'Uploading image…'
    void uploadExerciseImage(chosen)
      .then((url) => {
        imageUrl = url
        renderPreview()
        status.textContent = 'Image uploaded.'
      })
      .catch((error) => {
        status.textContent = readableApiError(error)
      })
      .finally(() => {
        file.value = ''
      })
  })

  const imageHint = document.createElement('div')
  imageHint.className = 'exercise-editor__image-actions'
  const uploadLabel = document.createElement('label')
  uploadLabel.className = 'button button--secondary exercise-editor__upload'
  uploadLabel.append(iconElement(ImagePlus), document.createTextNode('Upload image'), file)
  const clear = document.createElement('button')
  clear.type = 'button'
  clear.className = 'button button--secondary'
  clear.textContent = 'Remove image'
  clear.addEventListener('click', () => {
    imageUrl = ''
    renderPreview()
    status.textContent = 'Image cleared.'
  })
  imageHint.append(uploadLabel, clear)

  const actions = document.createElement('div')
  actions.className = 'exercise-editor__actions'
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary'
  save.append(iconElement(Save), document.createTextNode(mode === 'create' ? 'Create exercise' : 'Save changes'))
  const cancel = document.createElement('a')
  cancel.className = 'button button--secondary'
  cancel.href = mode === 'edit' && initial.id ? `/exercises/${initial.id}` : '/exercises'
  cancel.textContent = 'Cancel'
  actions.append(save, cancel)

  if (mode === 'edit' && initial.id) {
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'button button--danger'
    remove.append(iconElement(Trash2), document.createTextNode('Delete'))
    remove.addEventListener('click', () => {
      if (!window.confirm(`Delete “${initial.name}”? This cannot be undone.`)) return
      remove.disabled = true
      status.textContent = 'Deleting…'
      void deleteExercise(initial.id)
        .then(() => {
          window.history.pushState({}, '', '/exercises')
          window.dispatchEvent(new PopStateEvent('popstate'))
        })
        .catch((error) => {
          remove.disabled = false
          status.textContent = readableApiError(error)
        })
    })
    actions.append(remove)
  }

  form.append(
    field('Name', name),
    field('Description', description),
    field('Category', category, 'Controlled so categories remain consistent across the library.'),
    muscles.element,
    equipment.element,
    field('Difficulty', difficulty),
    field('Tags', tags, 'Comma-separated'),
    field('Instructions', instructions, 'One step per line'),
    field('Default sets', defaultSets),
    field('Default reps', defaultReps),
    field('Default rest (sec)', defaultRest),
    field('Image', preview),
    imageHint,
    status,
    actions
  )

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    status.textContent = ''
    const payload: ExerciseWrite = {
      name: name.value.trim(),
      description: description.value.trim(),
      category: category.value,
      muscleGroup: muscles.primary.value,
      muscles: muscles.secondaryValues(),
      equipment: equipment.values(),
      difficulty: difficulty.value,
      tags: parseCsv(tags.value),
      instructions: parseLines(instructions.value),
      imageUrl,
      defaultSets: Number(defaultSets.value || 3),
      defaultReps: defaultReps.value.trim() || '8-12',
      defaultRest: Number(defaultRest.value || 90)
    }
    if (!payload.name) {
      status.textContent = 'Name is required.'
      name.focus()
      return
    }
    if (!payload.category || !payload.muscleGroup || !payload.difficulty) {
      status.textContent = 'Choose a category, primary muscle, and difficulty.'
      return
    }
    save.disabled = true
    status.textContent = mode === 'create' ? 'Creating…' : 'Saving…'
    const request = mode === 'create'
      ? createExercise(payload)
      : updateExercise(initial.id, payload)
    void request
      .then((exercise) => onSaved(exercise))
      .catch((error) => {
        status.textContent = readableApiError(error)
        save.disabled = false
      })
  })

  return form
}

export async function renderExerciseEditor(root: HTMLElement, id: number | null): Promise<void> {
  const mode = id == null ? 'create' : 'edit'
  root.replaceChildren(pageLoading({
    className: 'exercise-editor-page',
    label: mode === 'create' ? 'Loading editor' : 'Loading exercise'
  }))

  try {
    const exercise = id == null ? emptyExercise() : await getExercise(id)
    const page = document.createElement('div')
    page.className = 'exercise-editor-page'
    const heading = pageHeading({
      title: mode === 'create' ? 'New exercise' : 'Edit exercise',
      className: 'exercise-heading'
    })
    const back = document.createElement('a')
    back.className = 'detail-back'
    back.href = id == null ? '/exercises' : `/exercises/${id}`
    back.append(iconElement(ChevronLeft), document.createTextNode(id == null ? 'Exercises' : 'Back to exercise'))
    page.append(
      back,
      heading,
      createExerciseEditorForm(exercise, mode, (saved) => {
        window.history.pushState({}, '', `/exercises/${saved.id}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
    )
    root.replaceChildren(page)
  } catch (error) {
    root.replaceChildren(pageError({
      eyebrow: 'Exercise',
      title: mode === 'create' ? 'Unable to open editor' : 'Unable to load exercise',
      message: readableApiError(error),
      action: { label: 'Back to Exercises', href: '/exercises', primary: false }
    }))
  }
}

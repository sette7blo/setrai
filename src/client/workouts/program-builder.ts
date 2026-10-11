import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { readableApiError } from '../shared/api/errors.js'
import { displayName } from '../exercises/format.js'
import type { Exercise } from '../exercises/types.js'
import { saveProgram } from './api.js'
import { buildProgramInput, builderEntries, builderEntry } from './builder-plan.js'
import type { BuilderEntry } from './builder-plan.js'
import { PROGRAM_GOALS } from './program-taxonomy.js'
import type { Program } from './types.js'

export function openProgramBuilder(library: Exercise[], program: Program | undefined, onSaved: (saved: Program) => Promise<void>): void {
  const opener = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'program-builder'
  dialog.setAttribute('aria-label', program ? 'Edit program' : 'New program')
  const form = document.createElement('form')
  const heading = document.createElement('div')
  heading.className = 'program-dialog-heading'
  const title = document.createElement('h2')
  title.textContent = program ? 'Edit program' : 'New program'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'program-toolbar-action'
  close.setAttribute('aria-label', 'Close program builder')
  close.append(iconElement(X))
  close.addEventListener('click', () => dialog.close())
  heading.append(title, close)
  form.append(heading)
  const field = (label: string, value: string, multiline = false): HTMLInputElement | HTMLTextAreaElement => {
    const wrapper = document.createElement('label')
    wrapper.textContent = label
    const input = document.createElement(multiline ? 'textarea' : 'input')
    input.value = value
    input.maxLength = multiline ? 10000 : 300
    wrapper.append(input)
    form.append(wrapper)
    return input
  }
  const name = field('Program name', program?.name ?? '')
  name.required = true
  const description = field('Description', program?.description ?? '', true)
  const selectField = (label: string, options: string[], value: string): HTMLSelectElement => {
    const wrapper = document.createElement('label')
    wrapper.textContent = label
    const select = document.createElement('select')
    for (const option of options) select.add(new Option(option ? displayName(option) : 'Not specified', option))
    select.value = value
    wrapper.append(select)
    form.append(wrapper)
    return select
  }
  const level = selectField('Level', ['', 'beginner', 'intermediate', 'advanced'], program?.difficulty.toLowerCase() ?? '')
  const rows: BuilderEntry[] = program ? builderEntries(program) : []
  const timed = rows.some(row => row.section > 0)
  const mode = selectField('Format', ['normal', 'emom', 'mixed'], timed ? rows.some(row => row.section === 0) ? 'mixed' : 'emom' : 'normal')
  const goals = document.createElement('fieldset')
  const legend = document.createElement('legend')
  legend.textContent = 'Goals'
  goals.className = 'builder-goals'
  goals.append(legend)
  for (const goal of PROGRAM_GOALS) {
    const label = document.createElement('label')
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = goal
    input.checked = program?.tags.includes(goal) ?? false
    label.append(input, document.createTextNode(displayName(goal)))
    goals.append(label)
  }
  form.append(goals)
  const extraTags = field('Tags (comma separated)', (program?.tags.filter(tag => !PROGRAM_GOALS.includes(tag)) ?? []).join(', '))
  const rowHost = document.createElement('div')
  rowHost.className = 'builder-exercises'
  form.append(rowHost)
  const renderRows = (): void => {
    rowHost.replaceChildren()
    rows.forEach((row, index) => {
      const section = document.createElement('section')
      section.className = 'builder-exercise'
      const top = document.createElement('div')
      top.className = 'builder-exercise-heading'
      const title = document.createElement('strong')
      title.textContent = `${index + 1}. ${row.exerciseName}`
      top.append(title)
      const rowAction = (label: string, glyph: typeof ArrowUp, action: () => void, disabled = false): void => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'program-toolbar-action'
        button.setAttribute('aria-label', `${label} ${row.exerciseName}`)
        button.disabled = disabled
        button.append(iconElement(glyph))
        button.addEventListener('click', () => { action(); renderRows() })
        top.append(button)
      }
      rowAction('Move up', ArrowUp, () => { [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]] }, index === 0)
      rowAction('Move down', ArrowDown, () => { [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]] }, index === rows.length - 1)
      rowAction('Remove', Trash2, () => { rows.splice(index, 1) })
      const grid = document.createElement('div')
      grid.className = 'builder-prescription'
      const entryField = (label: string, key: 'sets' | 'reps' | 'restSec' | 'weight' | 'notes' | 'section' | 'interval' | 'workSec' | 'superset', numeric = false): void => {
        const wrapper = document.createElement('label')
        wrapper.textContent = label
        const input = document.createElement('input')
        input.setAttribute('aria-label', `${label} for ${row.exerciseName}`)
        input.type = numeric ? 'number' : 'text'
        if (numeric) { input.min = key === 'sets' ? '1' : '0'; input.step = key === 'weight' ? 'any' : '1' }
        input.value = row[key] === null ? '' : String(row[key])
        input.addEventListener('input', () => {
          if (key === 'reps' || key === 'notes' || key === 'superset') row[key] = input.value
          else if (key === 'weight') row.weight = input.value === '' ? null : Number(input.value)
          else row[key] = Number(input.value)
        })
        if (key === 'section') input.addEventListener('change', renderRows)
        wrapper.append(input)
        grid.append(wrapper)
      }
      entryField(row.section ? 'Rounds' : 'Sets', 'sets', true)
      entryField('Reps', 'reps')
      entryField(row.section ? 'Interval (s)' : 'Rest (s)', 'restSec', true)
      entryField('Weight (kg)', 'weight', true)
      if (mode.value !== 'normal') {
        entryField('EMOM section (0 = strength)', 'section', true)
        entryField('Interval group (0 = separate)', 'interval', true)
        entryField('Work (s, 0 = reps)', 'workSec', true)
      }
      if (!row.section) entryField('Superset group (optional)', 'superset')
      entryField('Exercise notes', 'notes')
      section.append(top, grid)
      rowHost.append(section)
    })
  }
  mode.addEventListener('change', () => {
    rows.forEach(row => { row.section = mode.value === 'emom' ? 1 : 0; row.interval = 0; row.workSec = 0; if (row.section) row.restSec = 60 })
    renderRows()
  })
  renderRows()
  const picker = document.createElement('section')
  picker.className = 'builder-picker'
  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = 'Find an exercise...'
  search.setAttribute('aria-label', 'Find an exercise')
  const select = document.createElement('select')
  select.setAttribute('aria-label', 'Exercise to add')
  const updateOptions = (): void => {
    select.replaceChildren()
    for (const exercise of library.filter(item => item.name.toLowerCase().includes(search.value.toLowerCase()))) select.add(new Option(`${exercise.name}${exercise.favourite ? ' ★' : ''}`, String(exercise.id)))
  }
  search.addEventListener('input', updateOptions)
  updateOptions()
  const add = document.createElement('button')
  add.type = 'button'
  add.className = 'button button--secondary'
  add.append(iconElement(Plus), document.createTextNode('Add exercise'))
  add.addEventListener('click', () => {
    const exercise = library.find(item => item.id === Number(select.value))
    if (!exercise) return
    const row = builderEntry(exercise, rows.length)
    if (mode.value === 'emom') { row.section = 1; row.restSec = 60 }
    rows.push(row)
    renderRows()
  })
  picker.append(search, select, add)
  form.append(picker)
  const error = document.createElement('p')
  error.className = 'workout-action-error'
  error.setAttribute('role', 'alert')
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary'
  save.textContent = 'Save program'
  form.append(error, save)
  form.addEventListener('submit', event => {
    event.preventDefault()
    save.disabled = true
    error.textContent = ''
    void Promise.resolve().then(async () => {
      const tags = [...Array.from(goals.querySelectorAll<HTMLInputElement>('input:checked'), input => input.value), ...extraTags.value.split(',').map(tag => tag.trim()).filter(Boolean)]
      const input = buildProgramInput(name.value, description.value, level.value, tags, rows)
      const saved = await saveProgram(input, program?.id)
      await onSaved(saved)
      dialog.close()
    }).catch(reason => { error.textContent = readableApiError(reason) }).finally(() => { save.disabled = false })
  })
  dialog.append(form)
  dialog.addEventListener('close', () => { dialog.remove(); opener?.focus() })
  document.body.append(dialog)
  dialog.showModal()
}

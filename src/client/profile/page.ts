import { Activity, ChevronDown, DatabaseBackup, Download, Dumbbell, Settings, Upload } from 'lucide'

import { iconElement } from '../app/navigation.js'
import { pageHeading, pageSummary } from '../shared/page-chrome.js'
import { bindPageRetry, pageError, pageLoading } from '../shared/page-states.js'
import { readableApiError } from '../shared/api/errors.js'
import { getProfile, updateProfile } from './api.js'
import { DATABASE_BACKUP_URL, restoreDatabase } from './backup-api.js'
import { effectiveTrainingGoal, EQUIPMENT_OPTIONS, equipmentLabel, goalLabel, goalPrescription, TRAINING_GOALS } from './equipment.js'
import type { Profile } from './types.js'

interface ProfileState {
  profile: Profile
  message: string
  backupBusy: boolean
}

function loadingView(): HTMLElement {
  return pageLoading({ className: 'profile-page profile-page--loading', label: 'Loading settings' })
}

function errorView(message: string): HTMLElement {
  return pageError({ eyebrow: 'Settings', title: 'Settings unavailable', message, className: 'profile-empty' })
}

function category(icon: Parameters<typeof iconElement>[0], title: string, summary: string, status = '', open = false): HTMLDetailsElement {
  const details = document.createElement('details')
  details.className = 'settings-category profile-settings-category'
  if (open) details.open = true
  const head = document.createElement('summary')
  const iconWrap = document.createElement('span')
  iconWrap.className = 'settings-category-icon'
  iconWrap.append(iconElement(icon))
  const copy = document.createElement('span')
  copy.className = 'settings-category-copy'
  const strong = document.createElement('strong')
  strong.textContent = title
  const small = document.createElement('small')
  small.textContent = summary
  copy.append(strong, small)
  const pill = document.createElement('span')
  pill.className = 'status-pill profile-settings-status'
  pill.textContent = status
  const chevron = document.createElement('span')
  chevron.className = 'settings-category-chevron'
  chevron.append(iconElement(ChevronDown))
  head.append(iconWrap, copy, pill, chevron)
  const body = document.createElement('div')
  body.className = 'settings-category-body'
  details.append(head, body)
  return details
}

function categoryBody(details: HTMLDetailsElement): HTMLElement {
  return details.querySelector('.settings-category-body') as HTMLElement
}

function subsection(label: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'settings-subsection'
  const title = document.createElement('span')
  title.className = 'settings-subsection-label'
  title.textContent = label
  wrap.append(title)
  return wrap
}

function row(title: string, help: string, control: HTMLElement): HTMLElement {
  const item = document.createElement('div')
  item.className = 'settings-row'
  const copy = document.createElement('span')
  copy.className = 'settings-row-copy'
  const strong = document.createElement('strong')
  strong.textContent = title
  const small = document.createElement('small')
  small.textContent = help
  copy.append(strong, small)
  const slot = document.createElement('span')
  slot.className = 'settings-row-control'
  slot.append(control)
  item.append(copy, slot)
  return item
}

function trainingGoalPicker(selectedValue: string): HTMLElement {
  const selected = effectiveTrainingGoal(selectedValue)
  const section = document.createElement('section')
  section.className = 'training-goal-guide'
  section.setAttribute('role', 'radiogroup')
  section.setAttribute('aria-label', 'Training goal')

  const heading = document.createElement('div')
  heading.className = 'training-goal-guide__heading'
  const title = document.createElement('strong')
  title.textContent = 'Training goal'
  const help = document.createElement('small')
  help.textContent = 'Select a goal directly. Quick Workout uses its starting prescription, which you can still edit.'
  heading.append(title, help)

  const list = document.createElement('div')
  list.className = 'training-goal-guide__list'
  for (const option of TRAINING_GOALS) {
    const item = document.createElement('label')
    item.className = 'training-goal-option'
    item.dataset.goal = option.value
    const choice = document.createElement('input')
    choice.type = 'radio'
    choice.name = 'trainingGoal'
    choice.value = option.value
    choice.checked = option.value === selected.value

    const top = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = option.label
    const badge = document.createElement('span')
    badge.textContent = 'Selected'
    top.append(name, badge)
    const description = document.createElement('p')
    description.textContent = option.description
    const prescription = document.createElement('small')
    prescription.textContent = goalPrescription(option)
    item.append(choice, top, description, prescription)
    list.append(item)
  }

  section.append(heading, list)
  return section
}

function trainingSection(state: ProfileState, rerender: () => void): HTMLDetailsElement {
  const details = category(Activity, 'Training', `${goalLabel(state.profile.trainingGoal)} · ${state.profile.weightUnit.toUpperCase()}`, state.profile.weightUnit.toUpperCase())
  const body = categoryBody(details)
  const form = document.createElement('form')
  form.className = 'profile-settings-form'
  form.append(subsection('Preferences'))
  form.append(trainingGoalPicker(state.profile.trainingGoal))
  const unit = document.createElement('select')
  unit.name = 'weightUnit'
  unit.setAttribute('aria-label', 'Weight unit')
  unit.append(new Option('Kilograms', 'kg'), new Option('Pounds', 'lb'))
  unit.value = state.profile.weightUnit
  form.append(row('Display unit', 'Used for workouts, history, home, and body weight.', unit))
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary settings-row-button'
  save.textContent = 'Save'
  form.append(row('Apply changes', 'Persist training preferences.', save))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    void updateProfile({ trainingGoal: String(data.get('trainingGoal')), weightUnit: unit.value as 'kg' | 'lb' }).then((profile) => {
      state.profile = profile
      state.message = 'Training settings saved.'
      rerender()
    })
  })
  body.append(form)
  return details
}

function equipmentSection(state: ProfileState, rerender: () => void): HTMLDetailsElement {
  const count = state.profile.equipment.length
  const details = category(Dumbbell, 'Equipment', count === 0 ? 'No restrictions; all equipment allowed.' : `${count} selected`, count ? `${count}` : 'ALL')
  const body = categoryBody(details)
  body.append(subsection('Available equipment'))
  const help = document.createElement('p')
  help.className = 'section-help'
  help.textContent = 'Select the equipment you want Setrai to prefer. Leave empty for unrestricted workouts.'
  const grid = document.createElement('div')
  grid.className = 'equipment-grid'
  const selected = new Set(state.profile.equipment)
  for (const option of EQUIPMENT_OPTIONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = selected.has(option) ? 'equipment-chip equipment-chip--active' : 'equipment-chip'
    button.setAttribute('aria-pressed', String(selected.has(option)))
    button.textContent = equipmentLabel(option)
    button.addEventListener('click', () => {
      selected.has(option) ? selected.delete(option) : selected.add(option)
      void updateProfile({ equipment: [...selected] }).then((profile) => {
        state.profile = profile
        state.message = 'Equipment saved.'
        rerender()
      })
    })
    grid.append(button)
  }
  body.append(help, grid)
  return details
}

function backupSection(state: ProfileState, rerender: () => void): HTMLDetailsElement {
  const details = category(DatabaseBackup, 'Backup', 'Export or restore your Setrai database.', state.backupBusy ? 'WORKING' : 'READY')
  const body = categoryBody(details)
  body.append(subsection('Database'))
  const notice = document.createElement('p')
  notice.className = 'section-help settings-backup-notice'
  notice.textContent = 'The database contains your preferences, body weight, exercises, workouts, and training history. Treat the downloaded file as private.'

  const download = document.createElement('a')
  download.className = 'button button--secondary settings-row-button'
  download.href = DATABASE_BACKUP_URL
  download.download = ''
  download.append(iconElement(Download), document.createTextNode('Export database'))

  const upload = document.createElement('button')
  upload.type = 'button'
  upload.className = 'button button--secondary settings-row-button'
  upload.disabled = state.backupBusy
  upload.append(iconElement(Upload), document.createTextNode(state.backupBusy ? 'Restoring…' : 'Import database'))

  const picker = document.createElement('input')
  picker.className = 'settings-backup-input'
  picker.type = 'file'
  picker.accept = '.db,.sqlite,.sqlite3,application/vnd.sqlite3,application/x-sqlite3,application/octet-stream'
  picker.setAttribute('aria-label', 'Select Setrai database backup')
  upload.addEventListener('click', () => picker.click())
  picker.addEventListener('change', () => {
    const file = picker.files?.[0]
    if (!file) return
    const confirmed = window.confirm(`Restore ${file.name}? This replaces the current Setrai database. A safety backup will be created first.`)
    if (!confirmed) {
      picker.value = ''
      return
    }
    state.backupBusy = true
    state.message = 'Restoring database…'
    rerender()
    void restoreDatabase(file).then(async result => {
      state.profile = await getProfile()
      state.message = `Database restored. Safety backup: ${result.safetyBackup}`
    }).catch(error => {
      state.message = readableApiError(error)
    }).finally(() => {
      state.backupBusy = false
      rerender()
    })
  })

  body.append(
    notice,
    row('Export database', 'Download a consistent SQLite snapshot.', download),
    row('Import database', 'Replace current data from a Setrai .db backup.', upload),
    picker
  )
  if (state.message) {
    const status = document.createElement('p')
    status.className = 'settings-backup-status'
    status.setAttribute('role', 'status')
    status.textContent = state.message
    body.append(status)
  }
  const media = document.createElement('p')
  media.className = 'settings-backup-footnote'
  media.textContent = 'Uploaded exercise image files are stored separately under data/media and are not embedded in the database file.'
  body.append(media)
  return details
}

function renderLoaded(root: HTMLElement, state: ProfileState): void {
  const page = document.createElement('div')
  page.className = 'profile-page profile-settings-page'
  const heading = pageHeading({ title: 'Settings', className: 'profile-settings-hero page-heading' })
  const summary = pageSummary({
    icon: Settings,
    title: 'Preferences',
    description: 'Training preferences and equipment.',
    className: 'page-summary',
  })
  const list = document.createElement('section')
  list.className = 'profile-settings-list'
  const rerender = () => renderLoaded(root, state)
  list.append(trainingSection(state, rerender), equipmentSection(state, rerender), backupSection(state, rerender))
  page.append(heading, summary, list)
  root.replaceChildren(page)
}

export async function renderProfilePage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const profile = await getProfile()
    renderLoaded(root, { profile, message: '', backupBusy: false })
  } catch (error) {
    const view = errorView(readableApiError(error))
    bindPageRetry(view, () => { void renderProfilePage(root) })
    root.replaceChildren(view)
  }
}

import { Activity, ChevronDown, Dumbbell, Settings, UserRound } from 'lucide'

import { iconElement } from '../app/navigation.js'
import { pageHeading, pageSummary } from '../shared/page-chrome.js'
import { bindPageRetry, pageError, pageLoading } from '../shared/page-states.js'
import { readableApiError } from '../shared/api/errors.js'
import { getProfile, updateProfile } from './api.js'
import { EQUIPMENT_OPTIONS, equipmentLabel, goalLabel } from './equipment.js'
import type { Profile } from './types.js'

interface ProfileState {
  profile: Profile
  message: string
  nostrIdentityEnabled: boolean
}

function loadingView(): HTMLElement {
  return pageLoading({ className: 'profile-page profile-page--loading', label: 'Loading settings' })
}

function errorView(message: string): HTMLElement {
  return pageError({ eyebrow: 'Settings', title: 'Settings unavailable', message, className: 'profile-empty' })
}

function avatar(profile: Profile): HTMLElement {
  const frame = document.createElement('div')
  frame.className = 'profile-avatar'
  if (!profile.avatarUrl) {
    frame.textContent = profile.displayName.slice(0, 1).toUpperCase() || 'S'
    return frame
  }
  const image = document.createElement('img')
  image.src = profile.avatarUrl
  image.alt = profile.displayName ? `${profile.displayName} avatar` : 'Profile avatar'
  image.addEventListener('error', () => { frame.textContent = profile.displayName.slice(0, 1).toUpperCase() || 'S' })
  frame.append(image)
  return frame
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

function showToast(container: HTMLElement, message: string) {
  const toast = document.createElement("div")
  toast.className = "settings-toast"
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => {
    toast.style.transition = "opacity 0.2s ease"
    toast.style.opacity = "0"
    setTimeout(() => toast.remove(), 200)
  }, 2200)
}

function input(name: string, value: string, label: string, type = 'text'): HTMLInputElement {
  const field = document.createElement('input')
  field.name = name
  field.value = value
  field.type = type
  field.setAttribute('aria-label', label)
  return field
}

function profileSection(state: ProfileState, rerender: () => void): HTMLDetailsElement {
  const details = category(UserRound, 'Profile', state.profile.displayName || 'Set display name and avatar', state.profile.displayName || 'LOCAL')
  const body = categoryBody(details)
  const form = document.createElement('form')
  form.className = 'profile-settings-form'
  const identity = document.createElement('div')
  identity.className = 'profile-identity-row'
  const copy = document.createElement('div')
  copy.className = 'profile-identity-copy'
  copy.append(Object.assign(document.createElement('strong'), { textContent: state.profile.displayName }), Object.assign(document.createElement('small'), { textContent: state.profile.avatarUrl ? 'Avatar configured' : 'No avatar URL set' }))
  if (state.profile.avatarUrl) identity.append(avatar(state.profile))
  if (state.profile.displayName) identity.append(copy)
  if (identity.childElementCount) form.append(identity)
  form.append(subsection('Identity'))
  form.append(row('Display name', 'Shown in the app header and profile surfaces.', input('displayName', state.profile.displayName, 'Display name')))
  form.append(row('Avatar URL', 'Optional image URL for the profile chip.', input('avatarUrl', state.profile.avatarUrl, 'Avatar URL', 'url')))
  const save = document.createElement('button')
  save.className = 'button button--primary settings-row-button'
  save.type = 'submit'
  save.textContent = 'Save'
  form.append(row('Apply changes', 'Update profile identity on this device.', save))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    save.disabled = true
    const data = new FormData(form)
    void updateProfile({ displayName: String(data.get('displayName') ?? ''), avatarUrl: String(data.get('avatarUrl') ?? '') }).then((profile) => {
      state.profile = profile
      state.message = 'Profile saved.'
      rerender()
    }).catch(() => { save.disabled = false })
  })
  body.append(form)
  return details
}

function trainingSection(state: ProfileState, rerender: () => void): HTMLDetailsElement {
  const details = category(Activity, 'Training', `${goalLabel(state.profile.trainingGoal)} · ${state.profile.weightUnit.toUpperCase()}`, state.profile.weightUnit.toUpperCase())
  const body = categoryBody(details)
  const form = document.createElement('form')
  form.className = 'profile-settings-form'
  form.append(subsection('Preferences'))
  const goal = document.createElement('select')
  goal.name = 'trainingGoal'
  goal.setAttribute('aria-label', 'Training goal')
  for (const value of ['', 'strength', 'hypertrophy', 'general-fitness', 'endurance']) goal.append(new Option(goalLabel(value), value))
  goal.value = state.profile.trainingGoal
  const unit = document.createElement('select')
  unit.name = 'weightUnit'
  unit.setAttribute('aria-label', 'Weight unit')
  unit.append(new Option('Kilograms', 'kg'), new Option('Pounds', 'lb'))
  unit.value = state.profile.weightUnit
  form.append(row('Training goal', 'Tunes labels and defaults toward your main goal.', goal))
  form.append(row('Display unit', 'Used for workouts, history, home, and body weight.', unit))
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary settings-row-button'
  save.textContent = 'Save'
  form.append(row('Apply changes', 'Persist training preferences.', save))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    void updateProfile({ trainingGoal: goal.value, weightUnit: unit.value as 'kg' | 'lb' }).then((profile) => {
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

function renderLoaded(root: HTMLElement, state: ProfileState): void {
  const page = document.createElement('div')
  page.className = 'profile-page profile-settings-page'
  const heading = pageHeading({ title: 'Settings', className: 'profile-settings-hero page-heading' })
  const summary = pageSummary({
    icon: Settings,
    title: 'Preferences',
    description: state.nostrIdentityEnabled ? 'Identity, training preferences, and equipment.' : 'Training preferences and equipment.',
    className: 'page-summary',
  })
  const list = document.createElement('section')
  list.className = 'profile-settings-list'
  if (state.nostrIdentityEnabled) list.append(profileSection(state, () => renderLoaded(root, state)))
  list.append(trainingSection(state, () => renderLoaded(root, state)), equipmentSection(state, () => renderLoaded(root, state)))
  page.append(heading, summary, list)
  root.replaceChildren(page)
}

export async function renderProfilePage(root: HTMLElement, nostrIdentityEnabled = false): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const profile = await getProfile()
    renderLoaded(root, { profile, message: '', nostrIdentityEnabled })
  } catch (error) {
    const view = errorView(readableApiError(error))
    bindPageRetry(view, () => { void renderProfilePage(root, nostrIdentityEnabled) })
    root.replaceChildren(view)
  }
}

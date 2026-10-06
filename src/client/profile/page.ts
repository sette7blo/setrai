import { readableApiError } from '../shared/api/errors.js'
import { todayDate, formatDate } from '../shared/formatting/date-format.js'
import { getProfile, updateProfile } from './api.js'
import { EQUIPMENT_OPTIONS, equipmentLabel, goalLabel } from './equipment.js'
import type { Profile } from './types.js'
import { displayWeightFromKg, inputWeightToKg, formatWeightFromKg } from './weight-units.js'
import { deleteBodyWeight, listBodyWeight, saveBodyWeight } from './body-weight/api.js'
import { newestFirst, latestEntryText } from './body-weight/format.js'
import type { BodyWeightEntry } from './body-weight/types.js'

interface ProfileState {
  profile: Profile
  weights: BodyWeightEntry[]
  message: string
}

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'profile-page profile-page--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'profile-empty'
  section.innerHTML = `<p class="eyebrow">Profile</p><h1>Profile unavailable</h1><p>${message}</p><button class="button button--primary" data-retry>Try again</button>`
  return section
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

function profileSection(state: ProfileState, rerender: () => void): HTMLElement {
  const form = document.createElement('form')
  form.className = 'profile-panel'
  form.innerHTML = `
    <h2>Profile</h2>
    <label><span>Display name</span><input name="displayName" value="${state.profile.displayName}"></label>
    <label><span>Avatar URL</span><input name="avatarUrl" value="${state.profile.avatarUrl}"></label>
  `
  form.prepend(avatar(state.profile))
  const save = document.createElement('button')
  save.className = 'button button--primary'
  save.type = 'submit'
  save.textContent = 'Save profile'
  form.append(save)
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
  return form
}

function trainingSection(state: ProfileState, rerender: () => void): HTMLElement {
  const form = document.createElement('form')
  form.className = 'profile-panel'
  form.innerHTML = '<h2>Training</h2>'
  const goal = document.createElement('select')
  goal.name = 'trainingGoal'
  goal.setAttribute('aria-label', 'Training goal')
  for (const value of ['', 'strength', 'hypertrophy', 'general-fitness', 'endurance']) {
    goal.append(new Option(goalLabel(value), value))
  }
  goal.value = state.profile.trainingGoal
  const unit = document.createElement('select')
  unit.name = 'weightUnit'
  unit.setAttribute('aria-label', 'Weight unit')
  unit.append(new Option('Kilograms', 'kg'), new Option('Pounds', 'lb'))
  unit.value = state.profile.weightUnit
  const goalLabelElement = document.createElement('label')
  goalLabelElement.innerHTML = '<span>Training goal</span>'
  goalLabelElement.append(goal)
  const unitLabelElement = document.createElement('label')
  unitLabelElement.innerHTML = '<span>Display unit</span>'
  unitLabelElement.append(unit)
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary'
  save.textContent = 'Save training settings'
  form.append(goalLabelElement, unitLabelElement, save)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    void updateProfile({ trainingGoal: goal.value, weightUnit: unit.value as 'kg' | 'lb' }).then((profile) => {
      state.profile = profile
      state.message = 'Training settings saved.'
      rerender()
    })
  })
  return form
}

function equipmentSection(state: ProfileState, rerender: () => void): HTMLElement {
  const section = document.createElement('section')
  section.className = 'profile-panel'
  section.innerHTML = '<h2>Equipment</h2><p>No equipment selected means unrestricted equipment preferences.</p>'
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
  section.append(grid)
  return section
}

function bodyWeightSection(state: ProfileState, rerender: () => void): HTMLElement {
  const section = document.createElement('section')
  section.className = 'profile-panel body-weight-panel'
  const latest = newestFirst(state.weights)[0] ?? null
  section.innerHTML = `<h2>Body Weight</h2><p>${latestEntryText(latest, state.profile.weightUnit)}</p>`
  const form = document.createElement('form')
  form.className = 'body-weight-form'
  form.innerHTML = `
    <label><span>Date</span><input name="date" type="date" value="${todayDate()}" required></label>
    <label><span>Weight (${state.profile.weightUnit})</span><input name="weight" type="number" min="1" step="0.1" inputmode="decimal" value="${latest ? displayWeightFromKg(latest.weightKg, state.profile.weightUnit) : ''}" required></label>
    <label><span>Notes</span><input name="notes" placeholder="Optional"></label>
  `
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary'
  save.textContent = 'Add / Update weight'
  form.append(save)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    void saveBodyWeight({
      date: String(data.get('date')),
      weightKg: inputWeightToKg(Number(data.get('weight')), state.profile.weightUnit),
      notes: String(data.get('notes') ?? '')
    }).then(async () => {
      state.weights = await listBodyWeight()
      state.message = 'Body weight saved.'
      rerender()
    })
  })
  const history = document.createElement('div')
  history.className = 'body-weight-history'
  for (const entry of newestFirst(state.weights).slice(0, 8)) {
    const row = document.createElement('article')
    row.innerHTML = `<div><strong>${formatWeightFromKg(entry.weightKg, state.profile.weightUnit)}</strong><span>${formatDate(entry.date)}${entry.notes ? ` · ${entry.notes}` : ''}</span></div>`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.textContent = 'Delete'
    remove.addEventListener('click', () => {
      if (window.confirm(`Delete body-weight entry for ${entry.date}?`)) {
        void deleteBodyWeight(entry.id).then(async () => {
          state.weights = await listBodyWeight()
          state.message = 'Body weight deleted.'
          rerender()
        })
      }
    })
    row.append(remove)
    history.append(row)
  }
  section.append(form, history)
  return section
}

function renderLoaded(root: HTMLElement, state: ProfileState): void {
  const page = document.createElement('div')
  page.className = 'profile-page'
  const hero = document.createElement('section')
  hero.className = 'profile-hero'
  hero.innerHTML = `<p class="eyebrow">Profile</p><h1>Training preferences</h1><p class="hero-summary">Manage local training settings without exposing deployment configuration.</p>${state.message ? `<strong>${state.message}</strong>` : ''}`
  page.append(hero)
  page.append(profileSection(state, () => renderLoaded(root, state)))
  page.append(trainingSection(state, () => renderLoaded(root, state)))
  page.append(equipmentSection(state, () => renderLoaded(root, state)))
  page.append(bodyWeightSection(state, () => renderLoaded(root, state)))
  root.replaceChildren(page)
}

export async function renderProfilePage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const [profile, weights] = await Promise.all([getProfile(), listBodyWeight()])
    renderLoaded(root, { profile, weights, message: '' })
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderProfilePage(root) })
    root.replaceChildren(view)
  }
}

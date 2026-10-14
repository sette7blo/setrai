import { ClipboardList, Compass, Dumbbell, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayName } from '../exercises/format.js'
import { PROGRAM_GOALS, PROGRAM_FOCUS, PROGRAM_FORMATS, emptyProgramFilters } from './program-taxonomy.js'
import type { ProgramFilters } from './program-taxonomy.js'
import type { Program } from './types.js'
import { createFilterChips, createFilterSheet, type FilterGroup } from '../shared/filter-sheet.js'

export function workoutHeading(active: 'library' | 'discover' | 'history' | 'recovery', _enabled: boolean): HTMLElement {
  const header = document.createElement('header')
  header.className = 'workout-heading'
  header.innerHTML = `<h1>Workouts</h1><nav class="workout-tabs" aria-label="Workout sections">
    <a class="workout-tab${active === 'library' || active === 'discover' ? ' workout-tab--active' : ''}" href="/workouts"${active === 'library' || active === 'discover' ? ' aria-current="page"' : ''}>Library</a>
    <a class="workout-tab${active === 'history' ? ' workout-tab--active' : ''}" href="/workouts/history"${active === 'history' ? ' aria-current="page"' : ''}>History</a>
    <a class="workout-tab${active === 'recovery' ? ' workout-tab--active' : ''}" href="/workouts/recovery"${active === 'recovery' ? ' aria-current="page"' : ''}>Recovery</a>
  </nav>`
  return header
}

export function programHero(programs: Program[], discover: boolean, status = ''): HTMLElement {
  const hero = document.createElement('section')
  hero.className = 'program-browse-hero'
  const icon = document.createElement('span')
  icon.className = 'program-browse-icon'
  icon.append(iconElement(discover ? Compass : ClipboardList))
  const copy = document.createElement('div')
  const title = document.createElement('h2')
  title.textContent = discover ? 'Creator programs' : 'Program library'
  const description = document.createElement('p')
  description.textContent = discover ? 'Import a program into your Library to edit and run it.' : 'Your own programs: run them, edit them, make them yours.'
  const metrics = document.createElement('div')
  metrics.className = 'program-browse-metrics'
  if (discover) metrics.textContent = status
  else {
    const counts = [[ClipboardList, programs.length, 'programs'], [Dumbbell, new Set(programs.flatMap(program => program.exercises.map(entry => entry.exerciseSlug))).size, 'exercises']] as const
    for (const [glyph, value, label] of counts) {
      const metric = document.createElement('span')
      metric.append(iconElement(glyph), document.createTextNode(`${value} ${value === 1 ? label.slice(0, -1) : label}`))
      metrics.append(metric)
    }
  }
  copy.append(title, description, metrics)
  hero.append(icon, copy)
  return hero
}

export function programToolbar(discover: boolean, filters: ProgramFilters, onSearch: () => void, onFilters: (opener: HTMLButtonElement) => void, onAction: () => void, onRefresh?: () => void): HTMLElement {
  const toolbar = document.createElement('div')
  toolbar.className = 'program-toolbar'
  const label = document.createElement('label')
  label.className = 'program-search'
  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = discover ? 'Search relay programs...' : 'Search programs...'
  search.setAttribute('aria-label', search.placeholder)
  search.value = filters.search
  search.addEventListener('input', () => { filters.search = search.value; onSearch() })
  label.append(iconElement(Search), search)
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'program-toolbar-action'
  toggle.setAttribute('aria-label', 'Filter programs')
  toggle.setAttribute('aria-haspopup', 'dialog')
  toggle.append(iconElement(SlidersHorizontal))
  toggle.addEventListener('click', () => onFilters(toggle))
  const action = document.createElement('button')
  action.type = 'button'
  action.className = `program-toolbar-action${discover ? '' : ' accent program-toolbar-action--create'}`
  action.setAttribute('aria-label', discover ? 'Refresh relay programs' : 'Create new program')
  action.append(iconElement(discover ? RefreshCw : Plus))
  action.addEventListener('click', onAction)
  toolbar.append(label, toggle, action)
  if (onRefresh) {
    toolbar.classList.add('program-toolbar--catalog')
    const refresh = document.createElement('button')
    refresh.type = 'button'; refresh.className = 'program-toolbar-action'
    refresh.setAttribute('aria-label', 'Refresh web workouts')
    refresh.append(iconElement(RefreshCw))
    refresh.addEventListener('click', onRefresh)
    toolbar.insertBefore(refresh, action)
  }
  return toolbar
}

type ProgramFacet = keyof Omit<ProgramFilters, 'search'>
function programFilterGroups(filters: ProgramFilters, equipment: string[], hasOwned: boolean): FilterGroup[] {
  const facets: [ProgramFacet, string, string[]][] = [
    ['goal', 'Goal', PROGRAM_GOALS], ['focus', 'Focus', PROGRAM_FOCUS], ['format', 'Format', PROGRAM_FORMATS],
    ['level', 'Level', ['beginner', 'intermediate', 'advanced']],
    ['equipment', 'Equipment', [...(hasOwned ? ['my-equipment'] : []), ...equipment]]
  ]
  return facets.map(([key, label, values]) => ({ key, label, value: filters[key],
    options: [...new Set(values)].map(value => ({ value, label: value === 'my-equipment' ? 'My equipment' : displayName(value) })) }))
}

export function programFilterSheet(filters: ProgramFilters, equipment: string[], hasOwned: boolean, onChange: () => number, opener: HTMLButtonElement): HTMLDialogElement {
  return createFilterSheet({
    title: 'Filter programs', resultLabel: 'programs', groups: programFilterGroups(filters, equipment, hasOwned),
    count: onChange,
    onChange: (key, value) => { filters[key as ProgramFacet] = value },
    onReset: () => { Object.assign(filters, { ...emptyProgramFilters(), search: filters.search }) },
    onClose: () => opener.focus()
  })
}

export function programFilterChips(filters: ProgramFilters, onChange: () => void): HTMLElement {
  return createFilterChips(programFilterGroups(filters, [], true), key => { filters[key as ProgramFacet] = ''; onChange() },
    () => { Object.assign(filters, { ...emptyProgramFilters(), search: filters.search }); onChange() })
}

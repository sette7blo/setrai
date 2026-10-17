import { ClipboardList, Dumbbell, Plus, Search, SlidersHorizontal } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayName } from '../exercises/format.js'
import { PROGRAM_GOALS, PROGRAM_FOCUS, PROGRAM_FORMATS, emptyProgramFilters } from './program-taxonomy.js'
import type { ProgramFilters } from './program-taxonomy.js'
import type { Program } from './types.js'
import { createFilterChips, createFilterSheet, type FilterGroup } from '../shared/filter-sheet.js'
import { pageHeading, pageSummary } from '../shared/page-chrome.js'

export function workoutHeading(active: 'library' | 'history' | 'recovery'): HTMLElement {
  return pageHeading({
    title: 'Workouts',
    className: 'workout-heading',
    tabsLabel: 'Workout sections',
    tabs: [
      { id: 'library', label: 'Library', href: '/workouts', active: active === 'library' },
      { id: 'history', label: 'History', href: '/workouts/history', active: active === 'history' },
      { id: 'recovery', label: 'Recovery', href: '/workouts/recovery', active: active === 'recovery' },
    ],
  })
}

export function programHero(programs: Program[]): HTMLElement {
  const exerciseCount = new Set(programs.flatMap(program => program.exercises.map(entry => entry.exerciseSlug))).size
  return pageSummary({
    icon: ClipboardList,
    title: 'Program library',
    description: 'Your own programs: run them, edit them, make them yours.',
    className: 'program-browse-hero',
    metrics: [
      { icon: ClipboardList, text: `${programs.length} ${programs.length === 1 ? 'program' : 'programs'}` },
      { icon: Dumbbell, text: `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}` },
    ],
  })
}

export function programToolbar(filters: ProgramFilters, onSearch: () => void, onFilters: (opener: HTMLButtonElement) => void, onAction: () => void): HTMLElement {
  const toolbar = document.createElement('div')
  toolbar.className = 'page-toolbar program-toolbar'
  const label = document.createElement('label')
  label.className = 'page-toolbar-search program-search'
  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = 'Search programs...'
  search.setAttribute('aria-label', search.placeholder)
  search.value = filters.search
  search.addEventListener('input', () => { filters.search = search.value; onSearch() })
  label.append(iconElement(Search), search)
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'page-toolbar-action program-toolbar-action'
  toggle.setAttribute('aria-label', 'Filter programs')
  toggle.setAttribute('aria-haspopup', 'dialog')
  toggle.append(iconElement(SlidersHorizontal))
  toggle.addEventListener('click', () => onFilters(toggle))
  const action = document.createElement('button')
  action.type = 'button'
  action.className = 'page-toolbar-action program-toolbar-action accent program-toolbar-action--create page-toolbar-action--primary'
  action.setAttribute('aria-label', 'Create new program')
  action.append(iconElement(Plus))
  action.addEventListener('click', onAction)
  toolbar.append(label, toggle, action)
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

import { Dumbbell, Plus, Search, SlidersHorizontal, Star, Target } from 'lucide'
import { selectionToggle, selectionToolbar } from './selection.js'
import { readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { libraryHeading } from '../app/section-navigation.js'
import { pageSummary } from '../shared/page-chrome.js'
import { bindPageRetry, pageEmpty, pageError } from '../shared/page-states.js'
import { exerciseFilterChips, exerciseFilterSheet } from './filter-sheet.js'
import { createExerciseCard } from './card.js'
import { pluralizeExercise } from './format.js'
import { activeFilterCount, filterExercises, filtersFromUrl, filtersToUrl, uniqueMuscles } from './filters.js'
import { deleteExercise, listExercises, setExerciseFavourite } from './api.js'
import type { Exercise, ExerciseFilters } from './types.js'

interface PageState {
  exercises: Exercise[]
  filters: ExerciseFilters
  selecting: boolean
  selectedIds: Set<number>
  busy: boolean
  error: string
}

function updateUrl(filters: ExerciseFilters): void {
  const params = filtersToUrl(filters)
  const nextUrl = params.toString() ? `/library/exercises?${params}` : '/library/exercises'
  if (nextUrl !== `${window.location.pathname}${window.location.search}`) window.history.replaceState({}, '', nextUrl)
}

function loadingView(): HTMLElement {
  const wrapper = document.createElement('section')
  wrapper.className = 'exercise-page'
  wrapper.setAttribute('aria-busy', 'true')
  wrapper.innerHTML = `
    <div class="exercise-heading exercise-heading--skeleton"><div></div><div></div><div></div></div>
    <div class="exercise-grid">${Array.from({ length: 6 }).map(() => `
      <div class="exercise-card exercise-card--loading"><div class="exercise-image-frame"></div><div class="exercise-card__body"><span></span><small></small></div></div>
    `).join('')}</div>
  `
  return wrapper
}

function errorView(message: string): HTMLElement {
  return pageError({ eyebrow: 'Library', title: 'Exercises unavailable', message, className: 'exercise-page exercise-empty' })
}

function header(state: PageState): HTMLElement {
  const favoriteCount = state.exercises.filter(exercise => exercise.favourite).length
  const muscleCount = uniqueMuscles(state.exercises).length
  const section = libraryHeading('exercises')
  section.classList.add('exercise-heading')
  section.append(pageSummary({
    icon: Dumbbell,
    title: 'Exercises',
    href: '#exercise-results',
    ariaLabel: 'Jump to exercise results',
    className: 'library-summary-card',
    trailing: true,
    metrics: [
      { icon: Dumbbell, text: pluralizeExercise(state.exercises.length) },
      { icon: Star, text: `${favoriteCount} fav`, tone: 'gold' },
      { icon: Target, text: `${muscleCount} muscles`, tone: 'green' }
    ]
  }))
  return section
}

function controls(state: PageState, onFilter: (filters: ExerciseFilters) => void, onToggle: (opener: HTMLButtonElement) => void, onSelectMode: () => void): HTMLElement {
  const wrap = document.createElement('section')
  wrap.className = 'page-toolbar exercise-controls'
  const searchLabel = document.createElement('label')
  searchLabel.className = 'page-toolbar-search exercise-search'
  searchLabel.append(iconElement(Search))
  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = 'Search...'
  search.value = state.filters.search
  search.setAttribute('aria-label', 'Search exercises')
  search.addEventListener('input', () => onFilter({ ...state.filters, search: search.value }))
  searchLabel.append(search)
  const favourites = document.createElement('button')
  favourites.type = 'button'
  favourites.className = state.filters.favouritesOnly
    ? 'page-toolbar-action filter-icon filter-icon--active page-toolbar-action--active'
    : 'page-toolbar-action filter-icon'
  favourites.setAttribute('aria-label', 'Show favorites')
  favourites.setAttribute('aria-pressed', String(state.filters.favouritesOnly))
  favourites.append(iconElement(Star))
  favourites.addEventListener('click', () => onFilter({ ...state.filters, favouritesOnly: !state.filters.favouritesOnly }))
  const filterToggle = document.createElement('button')
  filterToggle.type = 'button'
  filterToggle.className = activeFilterCount(state.filters) > 0
    ? 'page-toolbar-action filter-icon filter-icon--active page-toolbar-action--active'
    : 'page-toolbar-action filter-icon'
  filterToggle.setAttribute('aria-label', 'Filters')
  filterToggle.setAttribute('aria-haspopup', 'dialog')
  filterToggle.addEventListener('click', () => onToggle(filterToggle))
  filterToggle.append(iconElement(SlidersHorizontal))
  const selection = selectionToggle(state.selecting, state.busy, onSelectMode)
  const create = document.createElement('a')
  create.className = 'page-toolbar-action filter-icon page-toolbar-action--primary exercise-toolbar-create'
  create.href = '/exercises/new'
  create.setAttribute('aria-label', 'Create new exercise')
  create.title = 'Create new exercise'
  create.append(iconElement(Plus))
  wrap.append(searchLabel, favourites, filterToggle, selection, create)
  return wrap
}

function resultsView(state: PageState, onFavourite: (exercise: Exercise) => void, onReset: () => void, onSelect: (exercise: Exercise) => void, onSelectAll: () => void, onDelete: () => void, onCancelSelect: () => void): HTMLElement {
  const filtered = filterExercises(state.exercises, state.filters)
  const wrapper = document.createElement('section')
  wrapper.className = 'exercise-results'
  wrapper.id = 'exercise-results'
  const count = document.createElement('p')
  count.className = 'exercise-count'
  count.textContent = pluralizeExercise(filtered.length)
  count.setAttribute('role', 'status')
  wrapper.append(count)
  if (state.error) {
    const error = document.createElement('p')
    error.className = 'exercise-action-error'
    error.textContent = state.error
    wrapper.append(error)
  }
  if (state.selecting) wrapper.append(selectionToolbar(state, filtered, onSelectAll, onDelete, onCancelSelect))
  if (!filtered.length) {
    const empty = pageEmpty({ title: 'No exercises match these filters.', description: 'Clear search and filters to browse all exercises.', compact: true, className: 'exercise-empty' })
    const reset = document.createElement('button')
    reset.type = 'button'
    reset.className = 'button button--secondary'
    reset.textContent = 'Reset filters'
    reset.addEventListener('click', onReset)
    empty.append(reset)
    wrapper.append(empty)
    return wrapper
  }
  const grid = document.createElement('div')
  grid.className = 'exercise-grid'
  for (const exercise of filtered) {
    grid.append(createExerciseCard(exercise, onFavourite, {
      busy: state.busy,
      selectable: state.selecting,
      selected: state.selectedIds.has(exercise.id),
      onSelect
    }))
  }
  wrapper.append(grid)
  return wrapper
}

function renderLoaded(root: HTMLElement, state: PageState): void {
  const resetFilters = { search: '', favouritesOnly: false, muscle: '', equipment: '', difficulty: '' }
  function commit(nextFilters: ExerciseFilters): void {
    state.filters = nextFilters
    updateUrl(state.filters)
    const active = document.activeElement as HTMLInputElement | HTMLSelectElement | null
    const label = active?.getAttribute('aria-label')
    const cursor = active instanceof HTMLInputElement ? active.selectionStart : null
    renderLoaded(root, state)
    if (label) {
      const replacement = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[aria-label]')).find(element => element.getAttribute('aria-label') === label)
      replacement?.focus()
      if (replacement instanceof HTMLInputElement && cursor !== null) replacement.setSelectionRange(cursor, cursor)
    }
  }
  async function toggleFavourite(exercise: Exercise): Promise<void> {
    const updated = await setExerciseFavourite(exercise.id, !exercise.favourite)
    state.exercises = state.exercises.map(item => item.id === updated.id ? updated : item)
    renderLoaded(root, state)
  }
  function toggleSelect(exercise: Exercise): void {
    if (state.busy) return
    state.error = ''
    if (state.selectedIds.has(exercise.id)) state.selectedIds.delete(exercise.id)
    else state.selectedIds.add(exercise.id)
    renderLoaded(root, state)
  }
  const visible = filterExercises(state.exercises, state.filters)
  function toggleSelectAllVisible(): void {
    const allVisible = visible.length > 0 && visible.every(exercise => state.selectedIds.has(exercise.id))
    for (const exercise of visible) allVisible ? state.selectedIds.delete(exercise.id) : state.selectedIds.add(exercise.id)
    renderLoaded(root, state)
  }
  async function deleteSelected(): Promise<void> {
    const ids = [...state.selectedIds]
    if (!ids.length || state.busy) return
    if (!window.confirm(`Delete ${ids.length} selected exercise${ids.length === 1 ? '' : 's'}? Programs and workout history keep their snapshots.`)) return
    state.busy = true
    state.error = ''
    renderLoaded(root, state)
    try {
      await Promise.all(ids.map(id => deleteExercise(id)))
      state.exercises = state.exercises.filter(exercise => !state.selectedIds.has(exercise.id))
      state.selectedIds.clear()
      state.selecting = false
    } catch (error) {
      state.error = readableApiError(error)
    } finally {
      state.busy = false
      renderLoaded(root, state)
    }
  }
  const page = document.createElement('div')
  page.className = 'exercise-page'
  page.append(
    header(state),
    controls(state, commit, () => {
      const dialog = exerciseFilterSheet(state.exercises, () => state.filters, commit, () => root.querySelector<HTMLButtonElement>('[aria-label="Filters"]')?.focus())
      document.body.append(dialog)
      dialog.showModal()
    }, () => {
      state.selecting = !state.selecting
      if (!state.selecting) state.selectedIds.clear()
      state.error = ''
      renderLoaded(root, state)
    }),
    exerciseFilterChips(state.exercises, state.filters, commit),
    resultsView(state, exercise => { void toggleFavourite(exercise).catch(() => renderLoaded(root, state)) },
      () => commit(resetFilters), toggleSelect, toggleSelectAllVisible, () => { void deleteSelected() },
      () => { state.selecting = false; state.selectedIds.clear(); state.error = ''; renderLoaded(root, state) })
  )
  root.replaceChildren(page)
}

export async function renderExerciseLibrary(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const exercises = await listExercises()
    const filters = filtersFromUrl(new URLSearchParams(window.location.search))
    renderLoaded(root, { exercises, filters, selecting: false, selectedIds: new Set(), busy: false, error: '' })
  } catch (error) {
    const view = errorView(readableApiError(error))
    bindPageRetry(view, () => { void renderExerciseLibrary(root) })
    root.replaceChildren(view)
  }
}

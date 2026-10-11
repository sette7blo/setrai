import { ChevronRight, Dumbbell, RefreshCw, Search, SlidersHorizontal, Star, Target } from 'lucide'
import { selectionToggle, selectionToolbar } from './selection.js'
import { readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { catalogDetail, catalogEntry, exerciseStatus, mergeExerciseCatalog, type CatalogEntry, type ExerciseCatalog } from './catalog.js'
import { exerciseFilterChips, exerciseFilterSheet } from './filter-sheet.js'
import { createExerciseCard } from './card.js'
import { pluralizeExercise } from './format.js'
import {
  activeFilterCount,
  filterExercises,
  filtersFromUrl,
  filtersToUrl,
  uniqueMuscles
} from './filters.js'
import { deleteExercise, listExercises, setExerciseFavourite } from './api.js'
import type { Exercise, ExerciseFilters } from './types.js'

interface PageState {
  exercises: Exercise[]
  filters: ExerciseFilters
  catalog?: ExerciseCatalog
  entries: CatalogEntry[]
  refreshing: boolean
  detail?: CatalogEntry
  selecting: boolean
  selectedIds: Set<number>
  busy: boolean
  error: string
}


function updateUrl(filters: ExerciseFilters): void {
  const params = filtersToUrl(filters)
  const nextUrl = params.toString() ? `/exercises?${params}` : '/exercises'
  if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState({}, '', nextUrl)
  }
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
  const section = document.createElement('section')
  section.className = 'exercise-page exercise-empty'
  section.innerHTML = `<p class="eyebrow">Exercise library</p><h1>Exercises unavailable</h1><p>${message}</p><button class="button button--primary" type="button" data-retry>Try again</button>`
  return section
}

function metric(icon: SVGElement, value: string, tone = ''): HTMLElement {
  const item = document.createElement('span')
  item.className = tone ? `library-metric ${tone}` : 'library-metric'
  item.append(icon, document.createTextNode(value))
  return item
}

function header(state: PageState): HTMLElement {
  const section = document.createElement('section')
  section.className = 'exercise-heading'
  const favoriteCount = state.exercises.filter((exercise) => exercise.favourite).length
  const muscleCount = uniqueMuscles(state.exercises).length
  section.innerHTML = `
    <div class="exercise-title-block">
      <h1>Exercises</h1>
    </div>
  `
  const library = document.createElement('a')
  library.className = 'library-summary-card'
  library.href = '#exercise-results'
  library.append(
    Object.assign(document.createElement('span'), { className: 'library-summary-icon' }),
    Object.assign(document.createElement('div'), { className: 'library-summary-copy' }),
    iconElement(ChevronRight)
  )
  const icon = library.querySelector('.library-summary-icon') as HTMLElement
  icon.append(iconElement(Dumbbell))
  const copy = library.querySelector('.library-summary-copy') as HTMLElement
  const title = document.createElement('strong')
  title.textContent = 'Exercise library'
  const row = document.createElement('span')
  row.className = 'library-summary-metrics'
  row.append(
    metric(iconElement(Dumbbell), pluralizeExercise(state.exercises.length)),
    metric(iconElement(Star), `${favoriteCount} fav`, 'gold'),
    metric(iconElement(Target), `${muscleCount} muscles`, 'green')
  )
  copy.append(title, row)
  section.append(library)
  return section
}

function controls(state: PageState, onFilter: (filters: ExerciseFilters) => void, onRefresh: () => void, onToggle: (opener: HTMLButtonElement) => void, onSelectMode: () => void): HTMLElement {
  const wrap = document.createElement('section')
  wrap.className = 'exercise-controls'
  const searchLabel = document.createElement('label')
  searchLabel.className = 'exercise-search'
  searchLabel.append(iconElement(Search))
  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = 'Search exercises...'
  search.value = state.filters.search
  search.setAttribute('aria-label', 'Search exercises')
  search.addEventListener('input', () => onFilter({ ...state.filters, search: search.value }))
  searchLabel.append(search)
  wrap.append(searchLabel)

  const favourites = document.createElement('button')
  favourites.type = 'button'
  favourites.className = state.filters.favouritesOnly ? 'filter-icon filter-icon--active' : 'filter-icon'
  favourites.setAttribute('aria-label', 'Show favorites')
  favourites.setAttribute('aria-pressed', String(state.filters.favouritesOnly))
  favourites.append(iconElement(Star))
  favourites.addEventListener('click', () => onFilter({ ...state.filters, favouritesOnly: !state.filters.favouritesOnly }))

  const filterToggle = document.createElement('button')
  filterToggle.type = 'button'
  filterToggle.className = activeFilterCount(state.filters) > 0 ? 'filter-icon filter-icon--active' : 'filter-icon'
  filterToggle.setAttribute('aria-label', 'Filters')
  filterToggle.setAttribute('aria-haspopup', 'dialog')
  filterToggle.addEventListener('click', () => onToggle(filterToggle))
  filterToggle.append(iconElement(SlidersHorizontal))

  const reset = selectionToggle(state.selecting, state.busy, onSelectMode)
  wrap.append(favourites, filterToggle, reset)
  if (state.catalog) {
    wrap.classList.add('exercise-controls--catalog')
    const refresh = document.createElement('button')
    refresh.type = 'button'
    refresh.className = 'filter-icon'
    refresh.setAttribute('aria-label', 'Refresh exercises')
    refresh.title = 'Refresh web exercises'
    refresh.disabled = state.refreshing || state.busy
    refresh.append(iconElement(RefreshCw))
    refresh.addEventListener('click', onRefresh)
    wrap.insertBefore(refresh, reset)
  }
  return wrap
}

function resultsView(state: PageState, onFavourite: (exercise: Exercise) => void, onReset: () => void, onSelect: (exercise: Exercise) => void, onSelectAll: () => void, onDelete: () => void, onCancelSelect: () => void, onOpen: (entry: CatalogEntry) => void, onImport: () => void, onUpdate: (entry: CatalogEntry) => void): HTMLElement {
  const filtered = filterExercises(mergeExerciseCatalog(state.exercises, state.entries), state.filters)
  const wrapper = document.createElement('section')
  wrapper.className = 'exercise-results'
  wrapper.id = 'exercise-results'
  const count = document.createElement('p')
  count.className = 'exercise-count'
  count.textContent = `${pluralizeExercise(filtered.length)}${state.refreshing ? ' · Loading web exercises…' : ''}`
  count.setAttribute('role', 'status')
  wrapper.append(count)
  if (state.error) {
    const error = document.createElement('p')
    error.className = 'exercise-action-error'
    error.textContent = state.error
    wrapper.append(error)
  }
  if (state.selecting) wrapper.append(selectionToolbar(state, filtered, onSelectAll, onDelete, onCancelSelect, onImport))
  if (filtered.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'exercise-empty'
    empty.innerHTML = '<h2>No exercises match these filters.</h2><p>Clear search and filters to browse all exercises.</p>'
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
  filtered.forEach((exercise) => {
    const entry = catalogEntry(exercise, state.entries, state.exercises)
    const status = exerciseStatus(exercise, entry)
    grid.append(createExerciseCard(exercise, onFavourite, {
      status,
      onOpen: entry && status === 'Web' ? () => onOpen(entry) : undefined,
      onUpdate: entry && status === 'Update' ? () => onUpdate(entry) : undefined,
      busy: state.busy || state.refreshing,
      selectable: state.selecting,
      selected: state.selectedIds.has(exercise.id),
      onSelect
    }))
  })
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
      const replacement = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[aria-label]')).find((element) => element.getAttribute('aria-label') === label)
      replacement?.focus()
      if (replacement instanceof HTMLInputElement && cursor !== null) replacement.setSelectionRange(cursor, cursor)
    }
  }
  async function toggleFavourite(exercise: Exercise): Promise<void> {
    const updated = await setExerciseFavourite(exercise.id, !exercise.favourite)
    state.exercises = state.exercises.map((item) => item.id === updated.id ? updated : item)
    renderLoaded(root, state)
  }
  function toggleSelect(exercise: Exercise): void {
    if (state.busy || state.refreshing) return
    state.error = ''
    if (state.selectedIds.has(exercise.id)) state.selectedIds.delete(exercise.id)
    else state.selectedIds.add(exercise.id)
    renderLoaded(root, state)
  }
  const visible = filterExercises(mergeExerciseCatalog(state.exercises, state.entries), state.filters)
  function toggleSelectAllVisible(): void {
    state.error = ''
    const allVisible = visible.length > 0 && visible.every((exercise) => state.selectedIds.has(exercise.id))
    for (const exercise of visible) {
      if (allVisible) state.selectedIds.delete(exercise.id)
      else state.selectedIds.add(exercise.id)
    }
    renderLoaded(root, state)
  }
  async function deleteSelected(): Promise<void> {
    const ids = [...state.selectedIds].filter(id => id > 0)
    if (!ids.length || state.busy) return
    const count = ids.length
    if (!window.confirm(`Delete ${count} selected exercise${count === 1 ? '' : 's'}? Programs and workout history keep their snapshots.`)) return
    state.busy = true
    state.error = ''
    renderLoaded(root, state)
    try {
      await Promise.all(ids.map((id) => deleteExercise(id)))
      state.exercises = state.exercises.filter((exercise) => !state.selectedIds.has(exercise.id))
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
    controls(state, commit, () => { void refreshCatalog(root, state, true) }, () => {
      const dialog = exerciseFilterSheet(mergeExerciseCatalog(state.exercises, state.entries), () => state.filters, commit,
        () => root.querySelector<HTMLButtonElement>('[aria-label="Filters"]')?.focus())
      document.body.append(dialog)
      dialog.showModal()
    }, () => {
      state.selecting = !state.selecting
      if (!state.selecting) state.selectedIds.clear()
      state.error = ''
      renderLoaded(root, state)
    }),
    exerciseFilterChips(mergeExerciseCatalog(state.exercises, state.entries), state.filters, commit),
    resultsView(
      state,
      (exercise) => { void toggleFavourite(exercise).catch(() => renderLoaded(root, state)) },
      () => commit(resetFilters),
      toggleSelect,
      toggleSelectAllVisible,
      () => { void deleteSelected() },
      () => { state.selecting = false; state.selectedIds.clear(); state.error = ''; renderLoaded(root, state) },
      entry => { state.detail = entry; renderLoaded(root, state); window.scrollTo(0, 0) },
      () => { void importSelected(root, state) },
      entry => { void saveCatalog(root, state, entry, true) }
    )
  )
  if (state.detail) {
    const entry = state.detail
    page.replaceChildren(header(state), catalogDetail(entry, () => { void saveCatalog(root, state, entry) },
      () => { state.detail = undefined; renderLoaded(root, state) }, state.busy))
    if (state.error) {
      const error = document.createElement('p'); error.setAttribute('role', 'alert'); error.textContent = state.error; page.append(error)
    }
  }
  root.replaceChildren(page)
}

async function refreshCatalog(root: HTMLElement, state: PageState, force = false): Promise<void> {
  if (!state.catalog || state.refreshing) return
  state.selectedIds.clear()
  state.refreshing = true; renderLoaded(root, state)
  try { state.entries = await state.catalog.load(force); state.error = '' }
  catch (error) { state.error = readableApiError(error) }
  finally { state.refreshing = false; renderLoaded(root, state) }
}

async function saveCatalog(root: HTMLElement, state: PageState, entry: CatalogEntry, replaceImage = false): Promise<void> {
  if (!state.catalog || state.busy) return
  state.busy = true; state.error = ''; renderLoaded(root, state)
  try {
    const saved = await state.catalog.save(entry.eventId, entry.localId !== null, replaceImage)
    state.exercises = [...state.exercises.filter(item => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name))
    entry.localId = saved.id; entry.updateAvailable = false; state.detail = undefined
  } catch (error) { state.error = readableApiError(error) }
  finally { state.busy = false; renderLoaded(root, state) }
}

async function importSelected(root: HTMLElement, state: PageState): Promise<void> {
  if (!state.catalog || state.busy) return
  const entries = mergeExerciseCatalog(state.exercises, state.entries)
    .filter(item => item.id < 0 && state.selectedIds.has(item.id))
    .map(item => catalogEntry(item, state.entries, state.exercises)!)
  state.busy = true; state.error = ''; renderLoaded(root, state)
  try {
    for (const entry of entries) {
      const saved = await state.catalog.save(entry.eventId)
      state.exercises.push(saved); entry.localId = saved.id; entry.updateAvailable = false
    }
    state.exercises.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) { state.error = readableApiError(error) }
  finally { state.busy = false; state.selectedIds.clear(); renderLoaded(root, state) }
}

export async function renderExerciseLibrary(root: HTMLElement, catalog?: ExerciseCatalog): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const exercises = await listExercises()
    const filters = filtersFromUrl(new URLSearchParams(window.location.search))
    const state: PageState = {
      exercises,
      filters,
      catalog, entries: [], refreshing: false,
      selecting: false,
      selectedIds: new Set(),
      busy: false,
      error: ''
    }
    renderLoaded(root, state)
    await refreshCatalog(root, state)
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderExerciseLibrary(root, catalog) })
    root.replaceChildren(view)
  }
}

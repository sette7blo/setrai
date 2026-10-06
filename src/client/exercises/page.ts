import { CheckSquare, ChevronRight, Dumbbell, Search, SlidersHorizontal, Star, Target } from 'lucide'
import { readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { createExerciseCard } from './card.js'
import { displayName, pluralizeExercise } from './format.js'
import {
  activeFilterCount,
  filterExercises,
  filtersFromUrl,
  filtersToUrl,
  uniqueDifficulties,
  uniqueEquipment,
  uniqueMuscles
} from './filters.js'
import { listExercises, setExerciseFavourite } from './api.js'
import type { Exercise, ExerciseFilters } from './types.js'

interface PageState {
  exercises: Exercise[]
  filters: ExerciseFilters
}

function selectControl(labelText: string, value: string, options: string[], onChange: (value: string) => void): HTMLElement {
  const label = document.createElement('label')
  label.className = 'filter-control'
  const span = document.createElement('span')
  span.textContent = labelText
  const select = document.createElement('select')
  select.value = value
  select.setAttribute('aria-label', labelText)
  select.append(new Option('All', ''))
  options.forEach((option) => select.append(new Option(displayName(option), option)))
  select.addEventListener('change', () => onChange(select.value))
  label.append(span, select)
  return label
}

function updateUrl(filters: ExerciseFilters): void {
  const params = filtersToUrl(filters)
  window.history.replaceState({}, '', params.toString() ? `/exercises?${params}` : '/exercises')
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
      <nav class="exercise-tabs" aria-label="Exercise sections">
        <a class="exercise-tab exercise-tab--active" href="/exercises" aria-current="page">Library</a>
        <span class="exercise-tab" aria-disabled="true">Discover</span>
      </nav>
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
    metric(iconElement(Star), `${favoriteCount} ${favoriteCount === 1 ? 'favorite' : 'favorites'}`, 'gold'),
    metric(iconElement(Target), `${muscleCount} muscles`, 'green')
  )
  copy.append(title, row)
  section.append(library)
  return section
}

function controls(state: PageState, onFilter: (filters: ExerciseFilters) => void, onReset: () => void): HTMLElement {
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
  filterToggle.append(iconElement(SlidersHorizontal))

  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'filter-icon'
  reset.setAttribute('aria-label', 'Reset filters')
  reset.disabled = activeFilterCount(state.filters) === 0
  reset.append(iconElement(CheckSquare))
  reset.addEventListener('click', onReset)
  wrap.append(favourites, filterToggle, reset)
  return wrap
}

function filterBar(state: PageState, onFilter: (filters: ExerciseFilters) => void): HTMLElement {
  const bar = document.createElement('section')
  bar.className = 'exercise-filters'
  bar.setAttribute('aria-label', 'Exercise filters')
  bar.append(
    selectControl('Muscle', state.filters.muscle, uniqueMuscles(state.exercises), (muscle) => onFilter({ ...state.filters, muscle })),
    selectControl('Equipment', state.filters.equipment, uniqueEquipment(state.exercises), (equipment) => onFilter({ ...state.filters, equipment })),
    selectControl('Difficulty', state.filters.difficulty, uniqueDifficulties(state.exercises), (difficulty) => onFilter({ ...state.filters, difficulty }))
  )
  return bar
}

function resultsView(state: PageState, onFavourite: (exercise: Exercise) => void, onReset: () => void): HTMLElement {
  const filtered = filterExercises(state.exercises, state.filters)
  const wrapper = document.createElement('section')
  wrapper.className = 'exercise-results'
  wrapper.id = 'exercise-results'
  const count = document.createElement('p')
  count.className = 'exercise-count'
  count.textContent = activeFilterCount(state.filters) > 0 ? pluralizeExercise(filtered.length) : `${pluralizeExercise(filtered.length)} in the built-in library`
  wrapper.append(count)
  if (filtered.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'exercise-empty'
    empty.innerHTML = '<h2>No exercises match these filters.</h2><p>Clear search and filters to return to the full seeded library.</p>'
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
  filtered.forEach((exercise) => grid.append(createExerciseCard(exercise, onFavourite)))
  wrapper.append(grid)
  return wrapper
}

function renderLoaded(root: HTMLElement, state: PageState): void {
  const resetFilters = { search: '', favouritesOnly: false, muscle: '', equipment: '', difficulty: '' }
  function commit(nextFilters: ExerciseFilters): void {
    state.filters = nextFilters
    updateUrl(state.filters)
    renderLoaded(root, state)
  }
  async function toggleFavourite(exercise: Exercise): Promise<void> {
    const updated = await setExerciseFavourite(exercise.id, !exercise.favourite)
    state.exercises = state.exercises.map((item) => item.id === updated.id ? updated : item)
    renderLoaded(root, state)
  }
  const page = document.createElement('div')
  page.className = 'exercise-page'
  page.append(
    header(state),
    controls(state, commit, () => commit(resetFilters)),
    filterBar(state, commit),
    resultsView(state, (exercise) => { void toggleFavourite(exercise).catch(() => renderLoaded(root, state)) }, () => commit(resetFilters))
  )
  root.replaceChildren(page)
}

export async function renderExerciseLibrary(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const exercises = await listExercises()
    renderLoaded(root, { exercises, filters: filtersFromUrl(new URLSearchParams(window.location.search)) })
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderExerciseLibrary(root) })
    root.replaceChildren(view)
  }
}

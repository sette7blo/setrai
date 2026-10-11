import { readableApiError } from '../shared/api/errors.js'
import { CheckSquare, ChevronRight, Database, Download, RefreshCw, Search, SlidersHorizontal, X } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { exerciseTabsMarkup } from '../exercises/tabs.js'
import { createExerciseDetailView } from '../exercises/detail-view.js'
import { filterExercises } from '../exercises/filters.js'
import { selectControl } from '../exercises/filter-control.js'
import { uniqueEquipment, uniqueMuscles } from '../exercises/filters.js'
import { discoverCard } from './card.js'
import { importCatalogExercise, loadCatalog, type DiscoveredExercise } from './api.js'

export function discoverHero(status: string): HTMLElement {
  const hero = document.createElement('section')
  hero.className = 'library-summary-card discover-summary-card'
  const icon = document.createElement('span')
  icon.className = 'library-summary-icon'
  icon.append(iconElement(Download))
  const copy = document.createElement('div')
  copy.className = 'library-summary-copy'
  const title = document.createElement('strong')
  title.textContent = 'Setrai catalogue'
  const stats = document.createElement('span')
  stats.className = 'library-summary-metrics'
  const line = document.createElement('span')
  line.className = 'library-metric'
  const statusText = document.createElement('span')
  statusText.id = 'discover-status'
  statusText.className = 'discover-status'
  statusText.textContent = status
  line.append(iconElement(Database), statusText)
  stats.append(line)
  copy.append(title, stats)
  hero.append(icon, copy, iconElement(ChevronRight))
  return hero
}

export async function renderDiscoverPage(root: HTMLElement, enabled: boolean): Promise<void> {
  if (!enabled) {
    root.innerHTML = '<section class="exercise-empty"><h1>Discover is unavailable</h1><a class="button" href="/exercises">Exercise library</a></section>'
    return
  }
  let items: DiscoveredExercise[] = []
  let search = ''
  let muscle = ''
  let equipment = ''
  const busy = new Set<string>()
  let notice = ''
  let detail: DiscoveredExercise | null = null
  let ready = false
  let filtersOpen = false
  let selecting = false
  const selectedEvents = new Set<string>()

  const importItem = async (item: DiscoveredExercise): Promise<void> => {
    if (busy.has(item.eventId) || item.localId) return
    busy.add(item.eventId)
    notice = ''
    render()
    try {
      const exercise = await importCatalogExercise(item.eventId)
      item.localId = exercise.id
      notice = `${exercise.name} added to your library.`
    } catch (error) { notice = readableApiError(error) }
    finally { busy.delete(item.eventId); render() }
  }
  const refresh = async (): Promise<void> => {
    ready = false
    render()
    try { items = await loadCatalog(true); notice = '' }
    catch (error) { notice = readableApiError(error) }
    finally { ready = true; render() }
  }
  const importSelected = async (): Promise<void> => {
    const selected = items.filter((item) => selectedEvents.has(item.eventId) && !item.localId)
    if (!selected.length) return
    for (const item of selected) await importItem(item)
    selectedEvents.clear()
    selecting = false
    render()
  }
  function render(): void {
    const page = document.createElement('div')
    page.className = 'exercise-page discover-page'
    const heading = document.createElement('section')
    heading.className = 'exercise-heading'
    heading.innerHTML = `<div class="exercise-title-block"><h1>Exercises</h1>${exerciseTabsMarkup('discover', true)}</div>`
    page.append(heading)
    const statusText = notice || (ready ? `Loaded ${items.length} Setrai exercises` : 'Loading the Setrai catalogue…')
    const hero = discoverHero(statusText)
    hero.querySelector('.discover-status')?.setAttribute('role', 'status')
    page.append(hero)
    if (detail) {
      const item = detail
      const action = busy.has(item.eventId) ? 'Importing…' : item.localId ? 'In library' : 'Import exercise'
      const view = createExerciseDetailView(item.exercise, () => { void importItem(item) }, action)
      const back = view.querySelector<HTMLAnchorElement>('.detail-back')!
      back.href = '/exercises/discover'
      back.textContent = 'Back to Discover'
      back.addEventListener('click', event => { event.preventDefault(); detail = null; render() })
      view.querySelector<HTMLButtonElement>('.detail-favourite')!.disabled = Boolean(item.localId) || busy.has(item.eventId)
      page.append(view)
      root.replaceChildren(page)
      return
    }
    const controls = document.createElement('div')
    controls.className = 'discover-controls'
    const searchLabel = document.createElement('label')
    searchLabel.className = 'exercise-search'
    searchLabel.append(iconElement(Search))
    const input = document.createElement('input')
    input.type = 'search'
    input.placeholder = 'Search exercises…'
    input.setAttribute('aria-label', 'Search Discover exercises')
    input.value = search
    input.addEventListener('input', () => { search = input.value; renderResults() })
    searchLabel.append(input)
    const filterButton = document.createElement('button')
    filterButton.type = 'button'
    filterButton.className = (muscle || equipment || filtersOpen) ? 'program-toolbar-action filter-icon filter-icon--active' : 'program-toolbar-action filter-icon'
    filterButton.setAttribute('aria-label', 'Filter exercises')
    filterButton.setAttribute('aria-expanded', String(filtersOpen))
    filterButton.append(iconElement(SlidersHorizontal))
    filterButton.addEventListener('click', () => { filtersOpen = !filtersOpen; render() })
    const refreshButton = document.createElement('button')
    refreshButton.type = 'button'
    refreshButton.className = 'program-toolbar-action filter-icon'
    refreshButton.setAttribute('aria-label', 'Refresh Setrai catalogue')
    refreshButton.title = 'Refresh catalogue'
    refreshButton.disabled = !ready
    refreshButton.append(iconElement(RefreshCw))
    refreshButton.addEventListener('click', () => { void refresh() })
    const selectButton = document.createElement('button')
    selectButton.type = 'button'
    selectButton.className = selecting ? 'program-toolbar-action filter-icon filter-icon--active' : 'program-toolbar-action filter-icon'
    selectButton.setAttribute('aria-label', selecting ? 'Exit selection mode' : 'Select exercises')
    selectButton.setAttribute('aria-pressed', String(selecting))
    selectButton.disabled = !items.some((item) => !item.localId)
    selectButton.append(iconElement(CheckSquare))
    selectButton.addEventListener('click', () => { selecting = !selecting; if (!selecting) selectedEvents.clear(); render() })
    controls.append(searchLabel, filterButton, refreshButton, selectButton)
    page.append(controls)
    const exercises = items.map(item => item.exercise)
    const filters = document.createElement('div')
    filters.className = 'discover-filters'
    filters.hidden = !filtersOpen
    filters.append(
      selectControl('Muscle', muscle, uniqueMuscles(exercises), value => { muscle = value; renderResults() }),
      selectControl('Equipment', equipment, uniqueEquipment(exercises), value => { equipment = value; renderResults() })
    )
    page.append(filters)
    const selectedCount = selectedEvents.size
    const actionBar = document.createElement('section')
    actionBar.className = 'exercise-selection-bar'
    const allVisible = document.createElement('button')
    allVisible.type = 'button'
    allVisible.className = 'button button--secondary'
    const selectedLabel = document.createElement('strong')
    selectedLabel.textContent = selectedCount ? `${selectedCount} selected` : 'Select exercises'
    const importButton = document.createElement('button')
    importButton.type = 'button'
    importButton.className = 'button button--primary exercise-bulk-delete'
    importButton.disabled = selectedCount === 0
    importButton.append(iconElement(Download), document.createTextNode(`Import (${selectedCount})`))
    importButton.addEventListener('click', () => { void importSelected() })
    const doneButton = document.createElement('button')
    doneButton.type = 'button'
    doneButton.className = 'button button--secondary exercise-select-cancel'
    doneButton.append(iconElement(X), document.createTextNode('Done'))
    doneButton.addEventListener('click', () => { selecting = false; selectedEvents.clear(); render() })
    actionBar.append(selectedLabel, allVisible, importButton, doneButton)
    if (selecting) page.append(actionBar)
    const results = document.createElement('div')
    results.className = 'exercise-grid'
    const renderResults = (): void => {
      const matching = new Set(filterExercises(exercises, { search, muscle, equipment, difficulty: '', favouritesOnly: false }))
      const visible = items.filter(item => matching.has(item.exercise))
      const importableVisible = visible.filter((item) => !item.localId)
      const allSelected = importableVisible.length > 0 && importableVisible.every((item) => selectedEvents.has(item.eventId))
      allVisible.textContent = allSelected ? 'Clear all' : 'Select all'
      allVisible.disabled = importableVisible.length === 0
      allVisible.onclick = () => {
        if (allSelected) importableVisible.forEach((item) => selectedEvents.delete(item.eventId))
        else importableVisible.forEach((item) => selectedEvents.add(item.eventId))
        render()
      }
      results.replaceChildren()
      visible.forEach(item => {
        const card = discoverCard(item, () => { detail = item; render(); window.scrollTo(0, 0) }, () => { void importItem(item) }, {
          selectable: selecting && !item.localId,
          selected: selectedEvents.has(item.eventId),
          onSelect: () => { if (selectedEvents.has(item.eventId)) selectedEvents.delete(item.eventId); else selectedEvents.add(item.eventId); render() }
        })
        if (busy.has(item.eventId)) {
          const action = card.querySelector<HTMLButtonElement>('.discover-card__import')!
          action.disabled = true
          action.textContent = 'Importing…'
        }
        results.append(card)
      })
      if (ready && !results.children.length) {
        const empty = document.createElement('p')
        empty.className = 'exercise-empty'
        empty.textContent = items.length ? 'No exercises match your filters.' : 'No exercises available. Try refreshing the catalog.'
        results.append(empty)
      }
    }
    renderResults()
    page.append(results)
    root.replaceChildren(page)
  }
  render()
  try { items = await loadCatalog() }
  catch (error) { notice = readableApiError(error) }
  finally { ready = true; render() }
}

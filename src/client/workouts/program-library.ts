import { readableApiError } from '../shared/api/errors.js'
import { getProfile } from '../profile/api.js'
import { listExercises } from '../exercises/api.js'
import type { Exercise } from '../exercises/types.js'
import { listPrograms, listSessions, startProgramSession, duplicateProgram, deleteProgram } from './api.js'
import { loadProgramCatalog, importCatalogProgram } from './discovery-api.js'
import { createProgramCard, type ProgramCardActions } from './program-card.js'
import { programHero, programToolbar, programFilterChips, programFilterSheet } from './program-browser.js'
import { emptyProgramFilters, matchesProgram, programTaxonomy } from './program-taxonomy.js'
import { mergeProgramCatalog } from './program-catalog.js'
import { openProgramUpdate } from './program-update.js'
import { openProgramBuilder } from './program-builder.js'
import type { Program, Session } from './types.js'

function enrich(programs: Program[], exercises: Exercise[]): Program[] {
  return programs.map(program => ({ ...program, exercises: program.exercises.map(entry => ({
    ...entry, exercise: entry.exercise ?? exercises.find(item => item.id === entry.exerciseId || item.slug === entry.exerciseSlug)
  })) }))
}

export async function renderProgramLibrary(page: HTMLElement, enabled: boolean, sessionLinks: (sessions: Session[]) => HTMLElement): Promise<void> {
  const status = document.createElement('p')
  status.className = 'workout-browser-status'; status.setAttribute('role', 'status'); status.textContent = 'Loading workouts...'
  page.append(status)
  const params = new URLSearchParams(window.location.search)
  const filters = emptyProgramFilters()
  for (const key of Object.keys(filters) as (keyof typeof filters)[]) filters[key] = params.get(key) ?? ''
  const [saved, initialExercises, sessions, profile] = await Promise.all([listPrograms(), listExercises(), listSessions(),
    getProfile().catch(() => ({ equipment: [] as string[] }))])
  let exercises = initialExercises
  let local = enrich(saved, exercises)
  let remote: Program[] = []
  let refreshing = false
  let fetchedAt = 0
  let hero = programHero(local, false)
  const chips = document.createElement('div')
  const results = document.createElement('div'); results.className = 'program-list'
  const updateHero = (): void => {
    const next = programHero(local, false)
    if (enabled) {
      const count = mergeProgramCatalog(local, remote).filter(card => card.status === 'Web').length
      const web = document.createElement('span'); web.textContent = `${count} web workouts`
      next.querySelector('.program-browse-metrics')?.append(web)
      if (fetchedAt) next.title = `Web catalog updated ${new Date(fetchedAt).toLocaleTimeString()}`
    }
    hero.replaceWith(next); hero = next
  }
  const syncUrl = (): void => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value)
    const next = `/workouts${query.size ? `?${query}` : ''}`
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState({}, '', next)
  }
  const reload = async (): Promise<void> => {
    const [programs, updatedExercises] = await Promise.all([listPrograms(), listExercises()])
    exercises = updatedExercises
    local = enrich(programs, exercises)
    // Reconcile status against the newly saved version without relying on stale relay localId values.
    remote = remote.map(latest => ({ ...latest, localId: local.find(item => item.nostrAddress === latest.nostrAddress)?.id ?? null,
      updateAvailable: local.some(item => item.nostrAddress === latest.nostrAddress && item.nostrEventId !== latest.nostrEventId && latest.updateAvailable) }))
    updateHero(); renderResults()
  }
  const localActions: ProgramCardActions = {
    start: async program => {
      if (!program.exercises.length) throw new Error('Add exercises before starting this workout.')
      const session = await startProgramSession(program.id); window.location.href = `/sessions/${session.id}`
    },
    edit: program => openProgramBuilder(exercises, program, reload),
    duplicate: async program => { await duplicateProgram(program.id); await reload(); status.textContent = 'Workout duplicated.' },
    remove: async program => {
      if (!window.confirm(`Delete ${program.name}? Your workout history is kept.`)) return
      await deleteProgram(program.id); await reload(); status.textContent = 'Workout deleted.'
    }
  }
  const renderResults = (): number => {
    if (!page.isConnected) return 0
    const cards = mergeProgramCatalog(local, remote)
    const matches = cards.filter(card => matchesProgram(card.program, filters, profile.equipment))
    syncUrl()
    chips.replaceChildren(programFilterChips(filters, renderResults))
    const open = new Set(Array.from(results.querySelectorAll<HTMLDetailsElement>('.workout-card[open]'), card => card.dataset.programKey))
    results.replaceChildren()
    for (const entry of matches) {
      const actions: ProgramCardActions = entry.status === 'Web' ? {
        import: async program => {
          await importCatalogProgram(program.nostrEventId!); await reload()
          status.textContent = `${program.name} added to Library.`
        }
      } : { ...localActions, ...(entry.status === 'Update' && entry.latest ? {
        review: () => openProgramUpdate(entry.program, entry.latest!, reload)
      } : {}) }
      const wrapper = createProgramCard(entry.program, actions, entry.status)
      const card = wrapper.querySelector<HTMLDetailsElement>('.workout-card')!
      card.dataset.programKey = entry.program.nostrAddress || `local:${entry.program.id}`
      card.open = open.has(card.dataset.programKey); results.append(wrapper)
    }
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'workout-browser-empty'
      empty.textContent = cards.length ? 'No workouts match. Clear a filter or try another search.'
        : refreshing ? 'Loading web workouts...' : 'No workouts yet. Create one with +.'
      results.append(empty)
    }
    const count = Object.entries(filters).filter(([key, value]) => key !== 'search' && value).length
    toolbar.querySelector('[aria-label="Filter programs"]')?.setAttribute('data-count', count ? String(count) : '')
    return matches.length
  }
  const refresh = async (force = false): Promise<void> => {
    if (!enabled || refreshing) return
    refreshing = true; status.textContent = 'Loading web workouts...'
    toolbar.querySelector<HTMLButtonElement>('[aria-label="Refresh web workouts"]')!.disabled = true
    renderResults()
    try {
      const catalog = await loadProgramCatalog(force)
      remote = catalog.programs; fetchedAt = catalog.fetchedAt
      status.textContent = catalog.unavailableRelays ? 'Some relays are unavailable; saved workouts remain available.' : ''
      updateHero()
    } catch (error) {
      status.replaceChildren(document.createTextNode(`${readableApiError(error)} Saved workouts remain available.`))
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'button button--secondary'; retry.textContent = 'Try again'
      retry.addEventListener('click', () => { void refresh(true) }); status.append(retry)
    } finally {
      refreshing = false
      toolbar.querySelector<HTMLButtonElement>('[aria-label="Refresh web workouts"]')!.disabled = false
      renderResults()
    }
  }
  const toolbar = programToolbar(false, filters, renderResults, opener => {
    const equipment = [...new Set(mergeProgramCatalog(local, remote).flatMap(card => programTaxonomy(card.program).equipment))].sort()
    const dialog = programFilterSheet(filters, equipment, profile.equipment.length > 0, renderResults, opener)
    document.body.append(dialog); dialog.showModal()
  }, () => openProgramBuilder(exercises, undefined, reload), enabled ? () => { void refresh(true) } : undefined)
  page.append(hero, toolbar, chips, results, sessionLinks(sessions))
  status.textContent = ''; renderResults(); updateHero()
  await refresh()
}

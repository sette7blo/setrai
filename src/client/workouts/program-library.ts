import { pageEmpty } from '../shared/page-states.js'
import { getProfile } from '../profile/api.js'
import { listExercises } from '../exercises/api.js'
import type { Exercise } from '../exercises/types.js'
import { listPrograms, listSessions, startProgramSession, duplicateProgram, deleteProgram } from './api.js'
import { createProgramCard, type ProgramCardActions } from './program-card.js'
import { programHero, programToolbar, programFilterChips, programFilterSheet } from './program-browser.js'
import { emptyProgramFilters, matchesProgram, programTaxonomy } from './program-taxonomy.js'
import { openProgramBuilder } from './program-builder.js'
import type { Program, Session } from './types.js'

function enrich(programs: Program[], exercises: Exercise[]): Program[] {
  return programs.map(program => ({ ...program, exercises: program.exercises.map(entry => ({
    ...entry, exercise: entry.exercise ?? exercises.find(item => item.id === entry.exerciseId || item.slug === entry.exerciseSlug)
  })) }))
}

export async function renderProgramLibrary(page: HTMLElement, sessionLinks: (sessions: Session[]) => HTMLElement): Promise<void> {
  const status = document.createElement('p')
  status.className = 'workout-browser-status'
  status.setAttribute('role', 'status')
  status.textContent = 'Loading your library…'
  page.append(status)
  const params = new URLSearchParams(window.location.search)
  const filters = emptyProgramFilters()
  for (const key of Object.keys(filters) as (keyof typeof filters)[]) filters[key] = params.get(key) ?? ''
  const [saved, initialExercises, sessions, profile] = await Promise.all([
    listPrograms(), listExercises(), listSessions(), getProfile().catch(() => ({ equipment: [] as string[] }))
  ])
  let exercises = initialExercises
  let programs = enrich(saved, exercises)
  let hero = programHero(programs)
  const chips = document.createElement('div')
  const results = document.createElement('div')
  results.className = 'program-list'
  const syncUrl = (): void => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value)
    const next = `/workouts${query.size ? `?${query}` : ''}`
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState({}, '', next)
  }
  const updateHero = (): void => {
    const next = programHero(programs)
    hero.replaceWith(next)
    hero = next
  }
  const reload = async (): Promise<void> => {
    const [nextPrograms, nextExercises] = await Promise.all([listPrograms(), listExercises()])
    exercises = nextExercises
    programs = enrich(nextPrograms, exercises)
    updateHero()
    renderResults()
  }
  const actions: ProgramCardActions = {
    start: async program => {
      if (!program.exercises.length) throw new Error('Add exercises before starting this workout.')
      const session = await startProgramSession(program.id)
      window.location.href = `/sessions/${session.id}`
    },
    edit: program => openProgramBuilder(exercises, program, reload),
    duplicate: async program => { await duplicateProgram(program.id); await reload(); status.textContent = 'Workout duplicated.' },
    remove: async program => {
      if (!window.confirm(`Delete ${program.name}? Your workout history is kept.`)) return
      await deleteProgram(program.id)
      await reload()
      status.textContent = 'Workout deleted.'
    }
  }
  const renderResults = (): number => {
    if (!page.isConnected) return 0
    const matches = programs.filter(program => matchesProgram(program, filters, profile.equipment))
    syncUrl()
    chips.replaceChildren(programFilterChips(filters, renderResults))
    const open = new Set(Array.from(results.querySelectorAll<HTMLDetailsElement>('.workout-card[open]'), card => card.dataset.programKey))
    results.replaceChildren()
    for (const program of matches) {
      const card = createProgramCard(program, actions)
      card.dataset.programKey = `local:${program.id}`
      ;(card as HTMLDetailsElement).open = open.has(card.dataset.programKey)
      results.append(card)
    }
    if (!matches.length) {
      results.append(pageEmpty({
        title: programs.length ? 'No workouts match.' : 'No workouts yet.',
        description: programs.length ? 'Clear a filter or try another search.' : 'Create one with +.',
        compact: true,
        className: 'workout-browser-empty'
      }))
    }
    const count = Object.entries(filters).filter(([key, value]) => key !== 'search' && value).length
    toolbar.querySelector('[aria-label="Filter programs"]')?.setAttribute('data-count', count ? String(count) : '')
    return matches.length
  }
  const toolbar = programToolbar(filters, renderResults, opener => {
    const equipment = [...new Set(programs.flatMap(program => programTaxonomy(program).equipment))].sort()
    const dialog = programFilterSheet(filters, equipment, profile.equipment.length > 0, renderResults, opener)
    document.body.append(dialog)
    dialog.showModal()
  }, () => openProgramBuilder(exercises, undefined, reload))
  page.append(hero, sessionLinks(sessions), toolbar, chips, results)
  status.textContent = ''
  renderResults()
}

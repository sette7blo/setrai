import type { Program } from './types.js'

export interface ProgramCatalogCard { program: Program; latest?: Program; status: 'Local' | 'Update' | 'Web' }

export function mergeProgramCatalog(local: Program[], remote: Program[]): ProgramCatalogCard[] {
  const savedIds = new Set(local.map(program => program.id))
  const savedAddresses = new Set(local.map(program => program.nostrAddress).filter(Boolean))
  const cards: ProgramCatalogCard[] = local.map(program => {
    const latest = remote.find(item => program.nostrAddress && item.nostrAddress === program.nostrAddress || item.localId === program.id)
    return { program, latest, status: latest?.updateAvailable ? 'Update' : 'Local' }
  })
  const seen = new Set<string>()
  for (const program of remote) {
    const key = program.nostrAddress || program.nostrEventId || ''
    if (savedAddresses.has(program.nostrAddress) || program.localId && savedIds.has(program.localId) || key && seen.has(key)) continue
    seen.add(key)
    cards.push({ program, latest: program, status: 'Web' })
  }
  const order = { Local: 0, Update: 1, Web: 2 }
  return cards.sort((a, b) => order[a.status] - order[b.status] || a.program.name.localeCompare(b.program.name))
}

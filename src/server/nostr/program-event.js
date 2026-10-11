import { verifyEvent } from 'nostr-tools/pure'
import { WORKSTR_AUTHOR } from './exercise-event.js'
import { parseProgramBlocks } from './program-blocks.js'

export const PROGRAM_KIND = 33402
const OFFICIAL = 'workstr:program:'
const CREATOR = 'workstr:beastmode:program:'
const INCIDENT_AUTHOR = '0a6c41ba921a01e0139aaf6bb7cd344c3e5b7d35a035b186456648149138e728'

function text(value, max = 300) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Invalid program text')
  return value.trim()
}

function number(value, fallback, maximum, integer = true) {
  if (value === undefined || value === null || value === '') return fallback
  const result = Number(value)
  if (!Number.isFinite(result) || result < 0 || result > maximum || (integer && !Number.isInteger(result))) throw new Error('Invalid prescription')
  return result
}

function image(value) {
  if (!value) return ''
  const url = new URL(text(value, 2048))
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid image')
  return url.href
}

function member(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid member')
  const address = text(raw.address ?? raw.nostrAddress ?? '', 400)
  if (!/^(33401:[a-f0-9]{64}:)?workstr:exercise:[a-z0-9][a-z0-9-]{0,180}$/.test(address)) throw new Error('Invalid exercise address')
  const sets = number(raw.sets, 3, 100)
  if (!sets) throw new Error('Invalid sets')
  const reps = text(String(raw.reps || '8-12'), 40)
  if (!/^[0-9][0-9a-zA-Z .,/–-]{0,39}$/.test(reps)) throw new Error('Invalid reps')
  return {
    address, name: text(raw.exerciseName ?? raw.name ?? ''),
    muscleGroup: text(raw.muscleGroup ?? '').toLowerCase().replace(/[ _]+/g, '-'),
    imageUrl: image(raw.imageUrl), notes: text(raw.notes ?? '', 5000), sets, reps,
    restSec: number(raw.restSec ?? raw.rest, 90, 3600),
    weight: number(raw.weight, null, 10000, false)
  }
}

export function programFromEvent(event) {
  try {
    if (!event || event.kind !== PROGRAM_KIND || !/^[a-f0-9]{64}$/.test(event.pubkey) ||
        !/^[a-f0-9]{64}$/.test(event.id) || !/^[a-f0-9]{128}$/.test(event.sig) ||
        !Number.isInteger(event.created_at) || event.created_at < 0 || event.created_at > Date.now() / 1000 + 300 ||
        typeof event.content !== 'string' || event.content.length > 100000 ||
        !Array.isArray(event.tags) || event.tags.length > 512) return null
    if (event.tags.some(tag => !Array.isArray(tag) || tag.length > 32 || tag.some(part => typeof part !== 'string' || part.length > 100000))) return null
    // Verify the actual fields, ignoring any cached verification marker on a reused object.
    if (!verifyEvent({ id: event.id, sig: event.sig, pubkey: event.pubkey, kind: event.kind,
      created_at: event.created_at, content: event.content, tags: event.tags })) return null
    const value = key => event.tags.find(tag => tag[0] === key)?.[1] || ''
    const values = key => event.tags.filter(tag => tag[0] === key).map(tag => tag[1]).filter(Boolean)
    const d = text(value('d'))
    const topics = values('t')
    const official = event.pubkey === WORKSTR_AUTHOR && d.startsWith(OFFICIAL)
    const creator = d.startsWith(CREATOR) && ['workstr', 'beastmode', 'workstr-program'].every(tag => topics.includes(tag))
    if (!official && !creator) return null
    if (event.pubkey === INCIDENT_AUTHOR && d === `${CREATOR}smoke-push-day`) return null
    const slug = d.slice(official ? OFFICIAL.length : CREATOR.length)
    if (!/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug)) return null
    const name = text(value('title'))
    if (!name) return null
    const meta = value('workstr_meta') ? JSON.parse(value('workstr_meta')) : {}
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
    const tags = meta.tags ?? topics.filter(tag => !['workstr', 'beastmode', 'workstr-program'].includes(tag))
    if (!Array.isArray(tags) || tags.length > 100) return null
    const raw = meta.exercises?.length ? meta.exercises : event.tags.filter(tag => tag[0] === 'exercise').map(row => ({
      address: row[1], name: row[2]?.startsWith('wss://') ? '' : row[2],
      weight: row[3], reps: row[4] || '8-12', restSec: row[5] || undefined
    }))
    if (!Array.isArray(raw) || !raw.length || raw.length > 100) return null
    const muscleMapUrl = meta.muscleMapUrl || value('workstr_muscle_map')
    return {
      slug, name, description: text(meta.description ?? event.content, 10000),
      difficulty: text(meta.difficulty ?? value('difficulty'), 40), tags: tags.map(tag => text(tag, 100)),
      exercises: raw.map(member), blocks: parseProgramBlocks(meta.blocks), muscleMapUrl: image(muscleMapUrl),
      sourceLabel: official ? 'Workstr' : 'Creator', eventId: event.id, pubkey: event.pubkey,
      address: `${PROGRAM_KIND}:${event.pubkey}:${d}`, createdAt: event.created_at
    }
  } catch { return null }
}

export function selectPrograms(events) {
  const addresses = new Map()
  for (const event of events) {
    const program = programFromEvent(event)
    if (!program) continue
    const current = addresses.get(program.address)
    if (!current || program.createdAt > current.createdAt ||
        (program.createdAt === current.createdAt && program.eventId < current.eventId)) addresses.set(program.address, program)
  }
  return [...addresses.values()].sort((a, b) => a.name.localeCompare(b.name))
}

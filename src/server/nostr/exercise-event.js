import { verifyEvent } from 'nostr-tools/pure'

export const WORKSTR_AUTHOR = 'ef24246321e47dd16cec960d4d374703af78505d0e59c532b054b5060e372bd6'
export const EXERCISE_KIND = 33401
const PREFIX = 'workstr:exercise:'

function text(value, maximum = 300) {
  if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new Error('Invalid exercise text')
  }
  return value.trim()
}

function strings(value, maximum = 100, length = 300) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error('Invalid exercise list')
  return value.filter(item => item !== null).map(item => text(item, length)).filter(Boolean)
}

function integer(value, fallback, min, max) {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid exercise prescription')
  return value
}

function muscle(value) {
  return text(value).toLowerCase().replace(/[ _]+/g, '-')
}

function equipment(value) {
  const normalized = muscle(value)
  return ({ 'body-weight': 'bodyweight', dumbbell: 'dumbbells', 'pullup-bar': 'pull-up-bar' })[normalized] || normalized
}

function imageUrl(value) {
  if (!value) return ''
  const url = new URL(text(value, 2048))
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid exercise image URL')
  return url.href
}

// Parse only verified official Workstr exercise events; discard invalid remote input.
export function exerciseFromEvent(event) {
  try {
    if (!event || event.kind !== EXERCISE_KIND || event.pubkey !== WORKSTR_AUTHOR ||
        !/^[a-f0-9]{64}$/.test(event.id) || !/^[a-f0-9]{128}$/.test(event.sig) ||
        !Number.isInteger(event.created_at) || event.created_at < 0 || event.created_at > Date.now() / 1000 + 300 ||
        typeof event.content !== 'string' || event.content.length > 100000 ||
        !Array.isArray(event.tags) || event.tags.length > 256) return null
    if (event.tags.some(tag => !Array.isArray(tag) || tag.length > 32 || tag.some(part => typeof part !== 'string' || part.length > 50000))) return null
    if (!verifyEvent(event)) return null
    const value = key => event.tags.find(tag => tag[0] === key)?.[1] || ''
    const values = key => event.tags.filter(tag => tag[0] === key).map(tag => tag[1]).filter(Boolean)
    const d = text(value('d'))
    if (!d.startsWith(PREFIX) || !/^[a-z0-9][a-z0-9-]{0,180}$/.test(d.slice(PREFIX.length))) return null
    const name = text(value('title'))
    if (!name) return null
    const meta = value('workstr_meta') ? JSON.parse(value('workstr_meta')) : {}
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
    const rows = event.tags.filter(tag => tag[0] === 'workstr_muscle' && tag[1])
    const primary = rows.find(tag => tag[2] === 'primary')?.[1] || rows[0]?.[1] || 'core'
    const images = event.tags.filter(tag => tag[0] === 'imeta').flatMap(tag => tag.slice(1))
    const image = images.find(part => part.startsWith('url '))?.slice(4) || value('image')
    const reps = meta.defaultReps === undefined ? '8-12' : String(meta.defaultReps)
    if (!/^[0-9][0-9a-zA-Z .,/–-]{0,39}$/.test(reps)) return null
    const tags = strings(meta.tags ?? values('t').filter(tag => tag !== 'workstr'))
    const movementType = muscle(meta.movementType ?? '') ||
      (tags.map(tag => tag.toLowerCase()).find(tag => tag === 'compound' || tag === 'isolation') ?? '')
    if (movementType && movementType !== 'compound' && movementType !== 'isolation') return null
    return {
      slug: d.slice(PREFIX.length), name,
      description: text(meta.description ?? '', 5000),
      category: muscle(meta.category ?? values('t').find(tag => tag !== 'workstr') ?? 'strength'),
      muscle_group: muscle(primary), muscles: [...new Set(rows.map(tag => muscle(tag[1])))],
      equipment: strings(meta.equipment ?? values('equipment')).map(equipment),
      difficulty: muscle(meta.difficulty ?? value('difficulty')),
      movement_type: movementType,
      tags,
      instructions: strings(meta.instructions ?? event.content.split('\n'), 100, 5000),
      image_url: imageUrl(image),
      default_sets: integer(meta.defaultSets, 3, 1, 100),
      default_reps: reps, default_rest: integer(meta.defaultRest, 90, 0, 3600),
      source_type: 'imported', status: 'active', favourite: false,
      nostr_event_id: event.id, nostr_pubkey: event.pubkey,
      nostr_address: `${event.kind}:${event.pubkey}:${d}`,
      nostr_published_at: new Date(event.created_at * 1000).toISOString()
    }
  } catch { return null }
}

export function selectExercises(events) {
  const addresses = new Map()
  const seen = new Set()
  for (const event of events) {
    if (seen.has(event?.id)) continue
    const exercise = exerciseFromEvent(event)
    if (!exercise) continue
    seen.add(event.id)
    const existing = addresses.get(exercise.nostr_address)
    if (!existing || exercise.nostr_published_at > existing.nostr_published_at ||
        (exercise.nostr_published_at === existing.nostr_published_at && exercise.nostr_event_id < existing.nostr_event_id)) {
      addresses.set(exercise.nostr_address, exercise)
    }
  }
  // Match Workstr's one-card-per-title catalog, preferring its stable clean slug.
  const titles = new Map()
  for (const exercise of addresses.values()) {
    const title = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const current = titles.get(title)
    if (!current || (exercise.slug === title && current.slug !== title) ||
        ((exercise.slug === title) === (current.slug === title) && exercise.nostr_published_at > current.nostr_published_at)) titles.set(title, exercise)
  }
  return [...titles.values()].sort((a, b) => a.name.localeCompare(b.name))
}

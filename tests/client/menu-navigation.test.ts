import assert from 'node:assert/strict'
import test from 'node:test'
import { menuDestination } from '../../src/client/app/menu-navigation.js'
import { DESKTOP_NAVIGATION_ITEMS, NAVIGATION_ITEMS } from '../../src/client/app/navigation.js'
import { primaryNavPath } from '../../src/client/app/router.js'
import { createRouteTransition } from '../../src/client/app/route-transition.js'

test('desktop Settings uses the profile route while mobile retains its header gear', () => {
  const settings = DESKTOP_NAVIGATION_ITEMS.find(item => item.label === 'Settings')
  assert.equal(settings?.path, '/profile')
  assert.ok(settings?.icon)
  assert.equal(primaryNavPath('/profile'), settings?.path)
  assert.equal(menuDestination(settings!.path, 'http://localhost:3191/exercises')?.pathname, '/profile')
  assert.deepEqual(NAVIGATION_ITEMS.map(item => item.path), ['/statistics', '/library/exercises'])
})

const current = 'http://localhost:3191/exercises'
test('same-origin menu destinations support navigation without reloading', () => {
  assert.equal(menuDestination('/library/programs', current)?.pathname, '/library/programs')
  assert.equal(menuDestination('/', current)?.pathname, '/')
  assert.equal(menuDestination('/statistics?range=week', current)?.search, '?range=week')
})
test('external, hash, download and new-tab links keep native browser behavior', () => {
  assert.equal(menuDestination('https://example.com/', current), null)
  assert.equal(menuDestination('#results', current), null)
  assert.equal(menuDestination('/profile', current, '_blank'), null)
  assert.equal(menuDestination('/profile', current, '', true), null)
})
test('live session navigation preserves timer teardown through document navigation', () => {
  assert.equal(menuDestination('/sessions/1', current), null)
  assert.equal(menuDestination('/library/programs', 'http://localhost:3191/sessions/1'), null)
})

test('route transitions retain current content until the latest route is ready', async () => {
  const classes = new Set<string>()
  const attributes = new Map<string, string>()
  let replacement: HTMLElement | null = null
  const currentRoute = {
    classList: { add: (value: string) => classes.add(value) },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    replaceWith: (next: HTMLElement) => { replacement = next },
  } as unknown as HTMLElement
  const staleRoute = {} as HTMLElement
  const latestRoute = {} as HTMLElement
  let finishStale!: () => void
  const stalePreparation = new Promise<void>(resolve => { finishStale = resolve })
  const transition = createRouteTransition()

  const stale = transition(currentRoute, staleRoute, () => stalePreparation)
  assert.equal(replacement, null)
  assert.equal(classes.has('route-container--loading'), true)
  assert.equal(attributes.get('aria-busy'), 'true')

  const latest = await transition(currentRoute, latestRoute, async () => {})
  assert.equal(latest, latestRoute)
  assert.equal(replacement, latestRoute)
  finishStale()
  assert.equal(await stale, null)
  assert.equal(replacement, latestRoute)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { THEME_COLORS, THEME_STORAGE_KEY, applyTheme, normalizeTheme, saveTheme, storedTheme } from '../../src/client/shared/theme.js'

function withBrowser(storage: Storage | null, run: (root: { dataset: Record<string, string> }, metas: Array<{ dataset: Record<string, string>, content: string }>) => void): void {
  const originalDocument = globalThis.document
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const root = { dataset: {} as Record<string, string> }
  const metas = [{ dataset: { scheme: 'light' }, content: THEME_COLORS.light }, { dataset: { scheme: 'dark' }, content: THEME_COLORS.dark }]
  try {
    globalThis.document = { documentElement: root, querySelectorAll: () => metas } as unknown as Document
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { if (!storage) throw new Error('blocked'); return storage } })
    run(root, metas)
  } finally {
    globalThis.document = originalDocument
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else delete (globalThis as { localStorage?: Storage }).localStorage
  }
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  } as unknown as Storage
}

test('only light and dark are forced themes; anything else follows the device', () => {
  assert.equal(normalizeTheme('light'), 'light')
  assert.equal(normalizeTheme('dark'), 'dark')
  for (const value of ['system', '', null, undefined, 'sepia']) assert.equal(normalizeTheme(value), 'system')
})

test('a forced theme sets the root attribute and both status bar colours, and system restores them', () => {
  withBrowser(memoryStorage(), (root, metas) => {
    applyTheme('dark')
    assert.equal(root.dataset.theme, 'dark')
    assert.deepEqual(metas.map(meta => meta.content), [THEME_COLORS.dark, THEME_COLORS.dark])
    applyTheme('light')
    assert.equal(root.dataset.theme, 'light')
    assert.deepEqual(metas.map(meta => meta.content), [THEME_COLORS.light, THEME_COLORS.light])
    applyTheme('system')
    assert.equal('theme' in root.dataset, false)
    assert.deepEqual(metas.map(meta => meta.content), [THEME_COLORS.light, THEME_COLORS.dark])
  })
})

test('the choice persists on the device and system clears it', () => {
  const storage = memoryStorage()
  withBrowser(storage, () => {
    saveTheme('dark')
    assert.equal(storage.getItem(THEME_STORAGE_KEY), 'dark')
    assert.equal(storedTheme(), 'dark')
    saveTheme('system')
    assert.equal(storage.getItem(THEME_STORAGE_KEY), null)
    assert.equal(storedTheme(), 'system')
  })
})

test('with storage unavailable the theme still applies for this visit', () => {
  withBrowser(null, (root) => {
    assert.equal(storedTheme(), 'system')
    assert.doesNotThrow(() => saveTheme('dark'))
    assert.equal(root.dataset.theme, 'dark')
  })
})

test('the pre-paint script and stylesheet agree with the theme module', () => {
  const html = readFileSync('index.html', 'utf8')
  const tokens = readFileSync('src/client/app/styles/tokens.css', 'utf8')
  assert.match(html, new RegExp(`localStorage\\.getItem\\('${THEME_STORAGE_KEY}'\\)`))
  assert.ok(html.indexOf('<script>') < html.indexOf('type="module"'))
  assert.match(html, new RegExp(`content="${THEME_COLORS.light}" media="\\(prefers-color-scheme: light\\)"`))
  assert.match(html, new RegExp(`content="${THEME_COLORS.dark}" media="\\(prefers-color-scheme: dark\\)"`))
  assert.match(tokens, new RegExp(`--color-bg: ${THEME_COLORS.light};`))
  const dark = tokens.split(':root:not([data-theme="light"]) {')[1].split('}')[0].replace(/\s+/g, ' ').trim()
  const forced = tokens.split(':root[data-theme="dark"] {')[1].split('}')[0].replace(/\s+/g, ' ').trim()
  assert.equal(dark, forced)
  assert.match(dark, new RegExp(`--color-bg: ${THEME_COLORS.dark};`))
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

test('PWA manifest is installability-ready for Setrai', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'))
  assert.equal(manifest.name, 'Setrai')
  assert.equal(manifest.short_name, 'Setrai')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.display, 'standalone')
  assert.ok(Array.isArray(manifest.icons))
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(root, 'public', icon.src.replace(/^\//, ''))))
  }
})

test('HTML advertises manifest, theme color, and viewport-fit', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(html, /name="theme-color"/)
  assert.match(html, /viewport-fit=cover/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

test('app header has a neutral settings link without a fabricated identity', () => {
  const shell = fs.readFileSync(path.join(root, 'src/client/app/application.ts'), 'utf8')
  assert.match(shell, /aria-label="Open settings"/)
  assert.doesNotMatch(shell, /Settebello|settebello-reference|profile-pill__avatar/)
  const profile = fs.readFileSync(path.join(root, 'src/client/profile/page.ts'), 'utf8')
  assert.doesNotMatch(profile, /Settebello/)
  assert.match(profile, /if \(state\.profile\.avatarUrl\) identity\.append/)
})

test('PWA manifest is installability-ready for Setrai', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'))
  assert.equal(manifest.name, 'Setrai')
  assert.equal(manifest.short_name, 'Setrai')
  assert.equal(manifest.start_url, '/statistics')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.background_color, '#f7f6f1')
  assert.equal(manifest.theme_color, '#f7f6f1')
  assert.ok(Array.isArray(manifest.icons))
  assert.deepEqual(manifest.icons.map((icon: { src: string }) => icon.src), [
    '/icons/setrai-icon-192.png',
    '/icons/setrai-icon-512.png',
    '/icons/setrai-icon-512.png'
  ])
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png')
    assert.ok(fs.existsSync(path.join(root, 'public', icon.src.replace(/^\//, ''))))
  }
})

test('HTML advertises manifest, theme color, viewport-fit, and iOS icons', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(html, /<link rel="icon" href="\/icons\/setrai-icon-32\.png" sizes="32x32" type="image\/png"/)
  assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/setrai-icon-180\.png" sizes="180x180"/)
  assert.match(html, /name="apple-mobile-web-app-title" content="Setrai"/)
  assert.match(html, /name="theme-color" content="#f7f6f1"/)
  assert.match(html, /viewport-fit=cover/)
})

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fitText, shareFont, shareMuscleMapStyle, type SharePalette } from '../../src/client/shared/share-canvas.js'

const IMAGE_MODULES = [
  'src/client/workouts/session-summary-share.ts',
  'src/client/workouts/monthly-recap-image.ts',
  'src/client/statistics/record-share-image.ts',
  'src/client/statistics/volume-share-image.ts',
  'src/client/statistics/body-share-image.ts',
]

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|css)$/.test(entry.name) ? [path] : []
  })
}

test('share images use the app typeface, condensed for titles and numerals', () => {
  assert.equal(shareFont(400, 24), '400 24px Archivo, sans-serif')
  assert.equal(shareFont(800, 76, true), '800 condensed 76px Archivo, sans-serif')
})

test('long share text is shortened with an ellipsis instead of squeezed', () => {
  const context = { measureText: (text: string) => ({ width: text.length * 10 }) } as unknown as CanvasRenderingContext2D
  assert.equal(fitText(context, 'Bench Press', 200), 'Bench Press')
  assert.equal(fitText(context, 'Standing Bent-Over Two-Arm Dumbbell Triceps Extension', 200), 'Standing Bent-Over…')
})

test('the shared body diagram style is the target scheme, built from the palette', () => {
  const palette = { border: 'B', surface: 'S', text: 'T', borderStrong: 'G' } as unknown as SharePalette
  const style = shareMuscleMapStyle(palette)
  assert.match(style, /polygon\{fill:B;stroke:S/)
  assert.match(style, /\.muscle-map__primary\{fill:T\}/)
  assert.match(style, /\.muscle-map__secondary\{fill:G\}/)
})

test('no share image carries its own colours, a system font, a gradient or the old tagline', () => {
  for (const path of [...IMAGE_MODULES, 'src/client/shared/share-canvas.ts']) {
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b|rgba?\(/i, `${path} has a literal colour`)
    assert.doesNotMatch(source, /system-ui|ui-monospace/, `${path} names a fallback font`)
    assert.doesNotMatch(source, /createLinearGradient|createRadialGradient/, `${path} draws a gradient`)
    assert.ok(source.split('\n').length <= 400, `${path} is over 400 lines`)
  }
  for (const path of sourceFiles('src/client')) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /AI TRAINING COACH/i, `${path} still has the tagline`)
  }
})

test('the palette comes from the light tokens so images stay light in the dark theme', () => {
  const kit = readFileSync('src/client/shared/share-canvas.ts', 'utf8')
  const tokens = readFileSync('src/client/app/styles/tokens.css', 'utf8')
  assert.match(kit, /probe\.className = 'theme-light'/)
  assert.match(tokens, /:root, \.theme-light \{/)
  for (const token of kit.matchAll(/'(--[a-z-]+)'/g)) assert.ok(tokens.includes(`${token[1]}:`), `${token[1]} is not a design token`)
})

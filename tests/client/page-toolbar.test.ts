import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

test('Exercises and Workouts library toolbars share density tokens and classes', () => {
  const tokens = fs.readFileSync(path.join(root, 'src/client/app/styles/tokens.css'), 'utf8')
  for (const key of ['--toolbar-size', '--toolbar-gap', '--toolbar-radius', '--toolbar-icon', '--toolbar-action-icon']) {
    assert.match(tokens, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  const toolbar = fs.readFileSync(path.join(root, 'src/client/shared/page-toolbar.css'), 'utf8')
  assert.match(toolbar, /\.page-toolbar/)
  assert.match(toolbar, /\.exercise-controls/)
  assert.match(toolbar, /\.program-toolbar/)
  assert.match(toolbar, /\.page-toolbar-search/)
  assert.match(toolbar, /\.page-toolbar-action/)
  assert.match(toolbar, /var\(--toolbar-size\)/)
  assert.match(toolbar, /var\(--toolbar-gap\)/)

  const main = fs.readFileSync(path.join(root, 'src/client/app/main.ts'), 'utf8')
  assert.match(main, /page-toolbar\.css/)

  const exercises = fs.readFileSync(path.join(root, 'src/client/exercises/page.ts'), 'utf8')
  assert.match(exercises, /page-toolbar exercise-controls/)
  assert.match(exercises, /page-toolbar-search exercise-search/)
  assert.match(exercises, /page-toolbar-action filter-icon/)

  const workouts = fs.readFileSync(path.join(root, 'src/client/workouts/program-browser.ts'), 'utf8')
  assert.match(workouts, /page-toolbar program-toolbar/)
  assert.match(workouts, /page-toolbar-search program-search/)
  assert.match(workouts, /page-toolbar-action program-toolbar-action/)

  // History/Recovery intentionally do not use this search toolbar.
  const history = fs.readFileSync(path.join(root, 'src/client/workouts/page.ts'), 'utf8')
  assert.doesNotMatch(history, /programToolbar\(/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

const BANNED_UI = [
  'Exercise library',
  'Training statistics',
  'Statistics date range',
  'Statistics sections',
  'building your statistics',
  'Add equipment in Profile',
]

test('user-facing client copy follows Home / Library / Settings glossary', () => {
  const files = [
    'src/client/app/navigation.ts',
    'src/client/app/application.ts',
    'src/client/app/router.ts',
    'src/client/app/section-navigation.ts',
    'src/client/exercises/page.ts',
    'src/client/exercises/detail-view.ts',
    'src/client/exercises/detail-page.ts',
    'src/client/statistics/page.ts',
    'src/client/statistics/body-tab.ts',
    'src/client/profile/page.ts',
    'src/client/quick-workout/recovery-panel.ts',
    'index.html',
    'public/manifest.webmanifest',
  ]

  for (const relative of files) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8')
    for (const banned of BANNED_UI) {
      assert.equal(text.includes(banned), false, `${relative} still contains "${banned}"`)
    }
  }

  const navigation = fs.readFileSync(path.join(root, 'src/client/app/navigation.ts'), 'utf8')
  assert.match(navigation, /label: 'Home'/)
  assert.match(navigation, /label: 'Library'/)
  assert.match(navigation, /label: 'Quick'/)
  assert.doesNotMatch(navigation, /label: 'Profile'/)
  assert.doesNotMatch(navigation, /label: 'Statistics'/)

  const exercises = fs.readFileSync(path.join(root, 'src/client/exercises/page.ts'), 'utf8')
  assert.match(exercises, /title: 'Exercises'/)

  const home = fs.readFileSync(path.join(root, 'src/client/statistics/page.ts'), 'utf8')
  const homeNavigation = fs.readFileSync(path.join(root, 'src/client/app/section-navigation.ts'), 'utf8')
  assert.match(home, /Training date range/)
  assert.match(homeNavigation, /title: 'Home'/)
  assert.match(homeNavigation, /label: 'History'/)
  assert.match(homeNavigation, /label: 'Recovery'/)
})

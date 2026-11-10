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

test('user-facing client copy follows Today / Progress / Library / Settings glossary', () => {
  const files = [
    'src/client/app/navigation.ts',
    'src/client/app/application.ts',
    'src/client/app/shell-navigation.ts',
    'src/client/app/today-page.ts',
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
  assert.match(navigation, /label: 'Today'/)
  assert.match(navigation, /label: 'Progress'/)
  assert.match(navigation, /label: 'Library'/)
  assert.doesNotMatch(navigation, /label: 'Quick'|label: 'Resume'|label: 'Home'/)
  assert.doesNotMatch(navigation, /label: 'Profile'/)
  assert.doesNotMatch(navigation, /label: 'Statistics'/)

  const home = fs.readFileSync(path.join(root, 'src/client/statistics/page.ts'), 'utf8')
  const homeNavigation = fs.readFileSync(path.join(root, 'src/client/app/section-navigation.ts'), 'utf8')
  assert.match(home, /Training date range/)
  assert.match(homeNavigation, /title: 'Progress'/)
  assert.match(homeNavigation, /label: 'History'/)
  assert.match(homeNavigation, /label: 'Exercises'/)
  assert.doesNotMatch(homeNavigation, /label: 'Recovery'/)

  // The product makes no AI claim until an AI feature ships.
  const shell = fs.readFileSync(path.join(root, 'src/client/app/shell-navigation.ts'), 'utf8')
  assert.doesNotMatch(shell, /AI Training Coach/)
})

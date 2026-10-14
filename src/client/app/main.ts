import './styles/base.css'
import './styles/tokens.css'
import './styles/layout.css'
import '../exercises/styles.css'
import '../workouts/styles.css'
import '../workouts/browser.css'
import '../workouts/builder.css'
import '../workouts/live-session.css'
import '../workouts/live-rest.css'
import '../statistics/styles.css'
import '../recovery/styles.css'
import '../profile/styles.css'
import '../quick-workout/recovery-panel.css'
import './styles/editorial.css'
import './styles/design-system.css'
import '../shared/page-chrome.css'
import '../shared/page-chips.css'
import '../shared/page-toolbar.css'
import '../shared/page-states.css'
import '../shared/filter-sheet.css'

import { bootSetraiApp } from './application.js'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('Setrai app root was not found')
}

void bootSetraiApp(root)

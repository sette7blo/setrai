import './styles/base.css'
import './styles/tokens.css'
import './styles/layout.css'
import '../exercises/styles.css'
import '../workouts/styles.css'
import '../statistics/styles.css'
import '../recovery/styles.css'
import '../profile/styles.css'
import '../quick-workout/styles.css'

import { bootSetraiApp } from './application.js'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('Setrai app root was not found')
}

void bootSetraiApp(root)

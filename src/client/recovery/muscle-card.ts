import { lastTrainedText, muscleLabel, recoveryPercent, statusLabel } from './format.js'
import type { RecoveryMuscle } from './types.js'

export function muscleCard(item: RecoveryMuscle): HTMLElement {
  const article = document.createElement('article')
  article.className = `recovery-card recovery-card--${item.status}`
  const percent = Math.round(item.recovery * 100)
  article.innerHTML = `
    <div class="recovery-card__top">
      <h2>${muscleLabel(item.muscle)}</h2>
      <strong>${recoveryPercent(item.recovery)}</strong>
    </div>
    <p>${statusLabel(item.status)}</p>
    <div class="recovery-meter" aria-label="${percent}% recovered"><i style="width:${percent}%"></i></div>
    <small>${lastTrainedText(item.lastTrainedAt)}</small>
  `
  return article
}

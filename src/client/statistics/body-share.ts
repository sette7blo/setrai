import { Share2, X } from 'lucide'

import { iconElement } from '../app/navigation.js'
import type { Profile } from '../profile/types.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import { shareImage } from '../shared/image-share.js'
import { createBodyProgressImage } from './body-share-image.js'
import type { BodyShareOptions, BodyShareRange } from './body-share-image.js'

export { bodyShareImageName, filterBodyShareEntries } from './body-share-image.js'

export function createBodyShareExperience(entries: BodyWeightEntry[], profile: Profile): { button: HTMLButtonElement, dialog: HTMLDialogElement } {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button quiet small body-share-open'
  button.append(iconElement(Share2), Object.assign(document.createElement('span'), { textContent: 'Share progress' }))

  const dialog = document.createElement('dialog')
  dialog.className = 'body-share-sheet'
  dialog.setAttribute('aria-labelledby', 'body-share-title')
  dialog.innerHTML = `<div class="body-share-sheet__surface"><header><div><small>BODY PROGRESS</small><h2 id="body-share-title">Share progress</h2></div><button type="button" class="body-share-close" aria-label="Close"></button></header><div class="body-share-preview" aria-live="polite"><span>Preparing preview…</span></div><fieldset class="body-share-range"><legend>Date range</legend><div></div></fieldset><div class="body-share-options"><label><span>Show exact weights</span><input type="checkbox" name="weights" checked></label><label><span>Include BMI</span><input type="checkbox" name="bmi"></label><label><span>Include goal</span><input type="checkbox" name="goal" checked></label></div><p class="body-share-status" aria-live="polite"></p><button type="button" class="button button--primary body-share-submit"></button></div>`
  dialog.querySelector('.body-share-close')?.append(iconElement(X))
  dialog.querySelector('.body-share-submit')?.append(iconElement(Share2), Object.assign(document.createElement('span'), { textContent: 'Share image' }))
  const rangeRow = dialog.querySelector('.body-share-range div') as HTMLElement
  const ranges: BodyShareRange[] = ['4w', '3m', '1y', 'all']
  let options: BodyShareOptions = { range: '4w', includeWeights: true, includeBmi: false, includeGoal: Boolean(profile.targetWeightKg) }
  let previewUrl = ''
  let cachedFile: File | null = null
  let renderVersion = 0

  ranges.forEach(range => {
    const choice = document.createElement('button')
    choice.type = 'button'
    choice.textContent = range === 'all' ? 'All' : range.toUpperCase()
    choice.dataset.range = range
    choice.setAttribute('aria-pressed', String(range === options.range))
    choice.addEventListener('click', () => {
      options = { ...options, range }
      rangeRow.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String((item as HTMLElement).dataset.range === range)))
      void renderPreview()
    })
    rangeRow.append(choice)
  })

  const preview = dialog.querySelector('.body-share-preview') as HTMLElement
  const status = dialog.querySelector('.body-share-status') as HTMLElement
  const submit = dialog.querySelector('.body-share-submit') as HTMLButtonElement
  const bmiInput = dialog.querySelector<HTMLInputElement>('[name="bmi"]') as HTMLInputElement
  const goalInput = dialog.querySelector<HTMLInputElement>('[name="goal"]') as HTMLInputElement
  goalInput.checked = options.includeGoal
  if (!profile.heightCm) {
    bmiInput.disabled = true
    bmiInput.closest('label')?.querySelector('span')?.append(' · add height first')
  }
  if (!profile.targetWeightKg) {
    goalInput.disabled = true
    goalInput.closest('label')?.querySelector('span')?.append(' · add a goal first')
  }
  const renderPreview = async (): Promise<void> => {
    const version = ++renderVersion
    cachedFile = null
    submit.disabled = true
    preview.innerHTML = '<span>Preparing preview…</span>'
    status.textContent = ''
    try {
      const file = await createBodyProgressImage(entries, profile, options)
      if (version !== renderVersion) return
      cachedFile = file
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      previewUrl = URL.createObjectURL(file)
      const image = document.createElement('img')
      image.src = previewUrl
      image.alt = 'Preview of the Body progress share image'
      preview.replaceChildren(image)
      submit.disabled = false
    } catch (error) {
      if (version !== renderVersion) return
      preview.innerHTML = '<span>Not enough entries in this range.</span>'
      status.textContent = error instanceof Error ? error.message : 'Could not prepare image.'
    }
  }

  dialog.querySelectorAll<HTMLInputElement>('.body-share-options input').forEach(input => {
    input.addEventListener('change', () => {
      options = {
        ...options,
        includeWeights: (dialog.querySelector('[name="weights"]') as HTMLInputElement).checked,
        includeBmi: (dialog.querySelector('[name="bmi"]') as HTMLInputElement).checked,
        includeGoal: (dialog.querySelector('[name="goal"]') as HTMLInputElement).checked,
      }
      void renderPreview()
    })
  })

  button.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    void renderPreview()
  })
  dialog.querySelector('.body-share-close')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    status.textContent = ''
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = ''
  })
  submit.addEventListener('click', async () => {
    if (!cachedFile) return
    submit.disabled = true
    status.textContent = 'Opening share sheet…'
    const result = await shareImage(cachedFile)
    status.textContent = result === 'shared' ? 'Image shared.' : result === 'downloaded' ? 'Image saved. Attach it to your post on X.' : ''
    submit.disabled = false
  })

  return { button, dialog }
}
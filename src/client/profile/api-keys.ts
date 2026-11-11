import { Copy, KeyRound, Plus, Trash2 } from 'lucide'

import { iconElement } from '../app/navigation.js'
import { readableApiError } from '../shared/api/errors.js'
import { createApiKey, listApiKeys, revokeApiKey, type ApiKey } from './api-keys-api.js'
import { category, categoryBody, row, subsection } from './settings-layout.js'

interface ApiKeysState {
  keys: ApiKey[] | null
  revealed: string
  message: string
  busy: boolean
}

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS" without a zone marker.
function formatDate(value: string | null): string {
  if (!value) return 'never'
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function summary(keys: ApiKey[] | null): string {
  if (keys === null) return 'Keys for the Omarchy plugin and other apps.'
  if (keys.length === 0) return 'No keys yet.'
  return keys.length === 1 ? '1 active key' : `${keys.length} active keys`
}

// navigator.clipboard only exists in secure contexts; plain-HTTP tailnet
// addresses fall back to selecting the field and using execCommand.
async function copyText(field: HTMLInputElement): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(field.value)
      return true
    }
  } catch { /* fall through to the selection fallback */ }
  field.focus()
  field.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  }
}

function button(label: string, icon: Parameters<typeof iconElement>[0], variant: string): HTMLButtonElement {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = `button ${variant} settings-row-button`
  element.append(iconElement(icon), document.createTextNode(label))
  return element
}

function revealBox(state: ApiKeysState, render: () => void): HTMLElement {
  const box = document.createElement('div')
  box.className = 'settings-api-key-reveal'
  const warning = document.createElement('p')
  warning.textContent = 'Copy this key now. Setrai stores only a hash and cannot show it again.'
  const field = document.createElement('input')
  field.type = 'text'
  field.readOnly = true
  field.value = state.revealed
  field.spellcheck = false
  field.setAttribute('aria-label', 'New API key')
  field.addEventListener('focus', () => field.select())
  const copy = button('Copy', Copy, 'button--secondary')
  copy.addEventListener('click', () => {
    void copyText(field).then(copied => {
      copy.lastChild!.textContent = copied ? 'Copied' : 'Select and copy manually'
    })
  })
  const done = document.createElement('button')
  done.type = 'button'
  done.className = 'button button--secondary settings-row-button'
  done.textContent = 'Done'
  done.addEventListener('click', () => {
    state.revealed = ''
    render()
  })
  const actions = document.createElement('div')
  actions.className = 'settings-api-key-actions'
  actions.append(copy, done)
  box.append(warning, field, actions)
  return box
}

function createForm(state: ApiKeysState, render: () => void): HTMLFormElement {
  const form = document.createElement('form')
  form.className = 'settings-api-key-form'
  const name = document.createElement('input')
  name.type = 'text'
  name.name = 'name'
  name.required = true
  name.maxLength = 60
  name.placeholder = 'setrai-omarchy'
  name.setAttribute('aria-label', 'Key name')
  const generate = button(state.busy ? 'Generating…' : 'Generate key', Plus, 'button--primary')
  generate.type = 'submit'
  generate.disabled = state.busy
  const control = document.createElement('span')
  control.className = 'settings-api-key-create'
  control.append(name, generate)
  form.append(row('Generate a key', 'Name it after the app that will use it.', control))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    state.busy = true
    render()
    void createApiKey(name.value.trim()).then(created => {
      state.keys = [created.apiKey, ...(state.keys ?? [])]
      state.revealed = created.key
      state.message = ''
    }).catch(error => {
      state.message = readableApiError(error)
    }).finally(() => {
      state.busy = false
      render()
    })
  })
  return form
}

function keyRow(key: ApiKey, state: ApiKeysState, render: () => void): HTMLElement {
  const revoke = button('Revoke', Trash2, 'button--secondary')
  revoke.addEventListener('click', () => {
    if (!window.confirm(`Revoke "${key.name}"? Anything using it loses access immediately.`)) return
    void revokeApiKey(key.id).then(() => {
      state.keys = (state.keys ?? []).filter(item => item.id !== key.id)
      state.message = `Revoked ${key.name}.`
    }).catch(error => {
      state.message = readableApiError(error)
    }).finally(render)
  })
  const help = `${key.prefix}… · ${key.scope} · created ${formatDate(key.createdAt)} · last used ${formatDate(key.lastUsedAt)}`
  return row(key.name, help, revoke)
}

export function apiKeysSection(): HTMLDetailsElement {
  const state: ApiKeysState = { keys: null, revealed: '', message: '', busy: false }
  const details = category(KeyRound, 'API keys', summary(null))
  const body = categoryBody(details)

  function render(): void {
    const small = details.querySelector('summary .settings-category-copy small')
    if (small) small.textContent = summary(state.keys)
    const notice = document.createElement('p')
    notice.className = 'section-help'
    notice.textContent = 'An API key gives another app, such as the setrai-omarchy plugin, full admin access to the Setrai API: it can read all data and create exercises and programs. Send it as "Authorization: Bearer <key>".'
    const children: HTMLElement[] = [notice]
    if (state.revealed) children.push(revealBox(state, render))
    children.push(createForm(state, render))
    if (state.message) {
      const status = document.createElement('p')
      status.className = 'settings-backup-status'
      status.setAttribute('role', 'status')
      status.textContent = state.message
      children.push(status)
    }
    children.push(subsection('Active keys'))
    if (state.keys === null) {
      const loading = document.createElement('p')
      loading.className = 'section-help'
      loading.textContent = 'Loading keys…'
      children.push(loading)
    } else if (state.keys.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'section-help'
      empty.textContent = 'No API keys. Revoked keys stop working immediately.'
      children.push(empty)
    } else {
      for (const key of state.keys) children.push(keyRow(key, state, render))
    }
    body.replaceChildren(...children)
  }

  render()
  void listApiKeys().then(keys => {
    state.keys = keys
  }).catch(error => {
    state.keys = []
    state.message = readableApiError(error)
  }).finally(render)
  return details
}

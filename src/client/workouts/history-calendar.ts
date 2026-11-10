import { ChevronLeft, ChevronRight } from 'lucide'
import { iconElement } from '../app/navigation.js'
import type { Session } from './types.js'
import { pageEmpty } from '../shared/page-states.js'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function addDays(key: string, days: number): string {
  const date = parseKey(key)
  if (!date) return key
  return dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

function addMonths(month: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return month
  return monthKey(new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1))
}

function startOfWeek(key: string): string {
  const date = parseKey(key)
  if (!date) return key
  return addDays(key, -((date.getDay() + 6) % 7))
}

function sessionDay(session: Session): string | null {
  const stamp = session.finishedAt ?? session.startedAt
  const date = new Date(stamp.endsWith('Z') ? stamp : `${stamp}Z`)
  return Number.isNaN(date.getTime()) ? null : dateKey(date)
}


interface HistoryDay {
  key: string
  sessions: Session[]
  setCount: number
  intensity: 1 | 2 | 3
}

function groupSessions(sessions: Session[]): Map<string, HistoryDay> {
  const days = new Map<string, HistoryDay>()
  for (const session of sessions.filter(item => item.finishedAt)) {
    const key = sessionDay(session)
    if (!key) continue
    const setCount = session.sets.filter(set => set.done).length
    const existing = days.get(key)
    if (existing) {
      existing.sessions.push(session)
      existing.setCount += setCount
      existing.intensity = intensity(existing.setCount)
    } else days.set(key, { key, sessions: [session], setCount, intensity: intensity(setCount) })
  }
  return days
}

function intensity(setCount: number): 1 | 2 | 3 {
  if (setCount < 8) return 1
  return setCount < 16 ? 2 : 3
}



function monthLabel(month: string): string {
  const date = parseKey(`${month}-01`)
  return date ? date.toLocaleDateString([], { month: 'long', year: 'numeric' }) : month
}

function makeButton(label: string, icon: Parameters<typeof iconElement>[0]): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'history-cal-nav'
  button.setAttribute('aria-label', label)
  button.append(iconElement(icon))
  return button
}

function dayButton(key: string, day: number, inMonth: boolean, today: string, selected: string | null, data: HistoryDay | null): HTMLElement {
  if (!inMonth) {
    const padCell = document.createElement('span')
    padCell.className = 'history-cal-day pad'
    return padCell
  }
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'history-cal-day'
  button.dataset.historyDate = key
  button.dataset.intensity = String(data?.intensity ?? 0)
  if (data) button.classList.add('done')
  if (key === today) button.classList.add('today')
  if (key === selected) button.classList.add('selected')
  if (key > today) button.classList.add('future')
  button.disabled = !data || key > today
  const label = parseKey(key)?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) ?? key
  button.setAttribute('aria-label', data ? `${label}, ${data.sessions.length} workout${data.sessions.length === 1 ? '' : 's'}, ${data.setCount} sets` : `${label}, no workout`)
  const number = document.createElement('span')
  number.className = 'history-cal-num'
  number.textContent = String(day)
  button.append(number)
  if (data) {
    const marks = document.createElement('span')
    marks.className = 'history-cal-marks'
    const dots = document.createElement('span')
    dots.className = 'history-cal-dots'
    for (let index = 0; index < data.intensity; index += 1) dots.append(document.createElement('i'))
    marks.append(dots)
    if (data.sessions.length > 1) {
      const count = document.createElement('span')
      count.className = 'history-cal-count'
      count.setAttribute('aria-hidden', 'true')
      count.title = `${data.sessions.length} workouts`
      count.textContent = String(data.sessions.length)
      marks.append(count)
    }
    button.append(marks)
  }
  return button
}

export function createHistoryCalendar(
  sessions: Session[],
  selected: string | null,
  onSelect: (date: string | null) => void,
  onMonthChange?: (month: string) => void,
): HTMLElement {
  const today = dateKey(new Date())
  const params = new URLSearchParams(window.location.search)
  let month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month')! : monthKey(new Date())
  let activeDate = selected
  const days = groupSessions(sessions)
  const root = document.createElement('section')
  root.className = 'history-calendar'

  const render = (): void => {
    root.replaceChildren()
    onMonthChange?.(month)
    const head = document.createElement('div')
    head.className = 'history-cal-head'
    const prev = makeButton('Previous month', ChevronLeft)
    const next = makeButton('Next month', ChevronRight)
    const titleGroup = document.createElement('div')
    titleGroup.className = 'history-cal-title-group'
    const title = document.createElement('div')
    title.className = 'history-cal-title'
    title.textContent = monthLabel(month)
    const goToday = document.createElement('button')
    goToday.type = 'button'
    goToday.className = 'history-cal-today'
    goToday.textContent = 'Today'
    goToday.hidden = month === monthKey(new Date())
    prev.addEventListener('click', () => { month = addMonths(month, -1); render() })
    next.addEventListener('click', () => { month = addMonths(month, 1); render() })
    goToday.addEventListener('click', () => { month = monthKey(new Date()); activeDate = null; onSelect(null); render() })
    titleGroup.append(title, goToday)
    head.append(prev, titleGroup, next)

    const grid = document.createElement('div')
    grid.className = 'history-cal-grid'
    const weekdayRow = document.createElement('div')
    weekdayRow.className = 'history-cal-week history-cal-weekdays'
    for (const day of WEEKDAYS) {
      const label = document.createElement('span')
      label.textContent = day
      weekdayRow.append(label)
    }
    grid.append(weekdayRow)
    const first = parseKey(`${month}-01`) ?? new Date()
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    let cursor = startOfWeek(dateKey(first))
    const end = addDays(startOfWeek(dateKey(last)), 6)
    while (cursor <= end) {
      const row = document.createElement('div')
      row.className = 'history-cal-week'
      for (let index = 0; index < 7; index += 1) {
        const key = cursor
        const date = parseKey(key)!
        const cell = dayButton(key, date.getDate(), monthKey(date) === month, today, activeDate, days.get(key) ?? null)
        if (cell instanceof HTMLButtonElement && !cell.disabled) {
          cell.addEventListener('click', () => { activeDate = key; onSelect(key); render() })
        }
        row.append(cell)
        cursor = addDays(cursor, 1)
      }
      grid.append(row)
    }
    root.append(head, grid)
    if (!days.size) {
      root.append(pageEmpty({
        title: 'No completed workouts yet.',
        description: 'Finish a session and the day fills in here.',
        compact: true,
        className: 'history-cal-empty',
      }))
    }
  }
  root.addEventListener('history-clear', () => { activeDate = null; render() })
  render()
  return root
}

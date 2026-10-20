import { pageHeading } from '../shared/page-chrome.js'

export type HomeSection = 'training' | 'history' | 'body' | 'recovery'
export type LibrarySection = 'exercises' | 'programs'

export function homeHeading(section: HomeSection): HTMLElement {
  return pageHeading({
    title: 'Home',
    className: 'statistics-page-head',
    tabsLabel: 'Home sections',
    tabs: [
      { id: 'training', label: 'Training', href: '/statistics', active: section === 'training' },
      { id: 'history', label: 'History', href: '/statistics/history', active: section === 'history' },
      { id: 'body', label: 'Body', href: '/statistics/body', active: section === 'body' },
      { id: 'recovery', label: 'Recovery', href: '/statistics/recovery', active: section === 'recovery' },
    ],
  })
}

export function libraryHeading(section: LibrarySection): HTMLElement {
  return pageHeading({
    title: 'Library',
    className: 'library-page-head',
    tabsLabel: 'Library sections',
    tabs: [
      { id: 'exercises', label: 'Exercises', href: '/library/exercises', active: section === 'exercises' },
      { id: 'programs', label: 'Programs', href: '/library/programs', active: section === 'programs' },
    ],
  })
}

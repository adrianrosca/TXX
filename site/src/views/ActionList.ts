import m from 'mithril'
import type { Action, Status } from '../types'
import { loadActions } from '../api'

const STATUS_LABEL: Record<Status, string> = {
  planned: 'Planned',
  inprogress: 'In Progress',
  done: 'Done',
}

interface State {
  actions: Action[]
  loading: boolean
  error: string | null
  query: string
}

const state: State = {
  actions: [],
  loading: true,
  error: null,
  query: '',
}

async function load() {
  state.loading = true
  state.error = null
  try {
    state.actions = await loadActions()
  } catch (e: any) {
    state.error = e.message
  } finally {
    state.loading = false
    m.redraw()
  }
}

function filtered(): Action[] {
  if (!state.query) return state.actions
  const q = state.query.toLowerCase()
  return state.actions.filter(a =>
    a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
  )
}

function renderCard(a: Action): m.Vnode {
  return m('.action-card', {
    key: a.slug,
    onclick() { m.route.set('/actions/:slug', { slug: a.slug }) },
  }, [
    m('.card-num', a.id),
    m('.card-body', [
      m('.card-name', a.name),
      m('.card-slug', a.slug),
    ]),
    m(`span.status.status-${a.status}`, STATUS_LABEL[a.status]),
    a.files.length > 0
      ? m('.card-badge', `${a.files.length} file${a.files.length > 1 ? 's' : ''}`)
      : null,
  ])
}

function renderLists(list: Action[]): m.Vnode[] {
  const active = list.filter(a => a.status !== 'done')
  const done = list.filter(a => a.status === 'done')

  return [
    active.length > 0
      ? m('.action-cards', active.map(renderCard))
      : m('.empty', 'No active actions.'),
    done.length > 0
      ? m('.done-section', [
          m('h2.section-title', 'Done'),
          m('.action-cards', done.map(renderCard)),
        ])
      : null,
  ] as m.Vnode[]
}

export const ActionList: m.Component = {
  oninit: load,

  view() {
    const list = filtered()

    return m('.action-list', [
      m('h1.page-title', 'Actions'),

      m('.filters', [
        m('input.search', {
          type: 'text',
          placeholder: 'Search actions...',
          value: state.query,
          oninput(e: Event) {
            state.query = (e.target as HTMLInputElement).value
          },
        }),
      ]),

      state.loading
        ? m('.loading', 'Loading actions...')
        : state.error
          ? m('.error', `Error: ${state.error}`)
          : list.length === 0
            ? m('.empty', 'No actions found.')
            : renderLists(list),
    ])
  },
}

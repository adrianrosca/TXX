import m from 'mithril'
import type { Action, Status } from '../types'
import { getAction } from '../api'

const STATUS_LABEL: Record<Status, string> = {
  planned: 'Planned',
  inprogress: 'In Progress',
  done: 'Done',
}

interface State {
  action: Action | null
  loading: boolean
  error: string | null
}

const state: State = {
  action: null,
  loading: true,
  error: null,
}

async function load(slug: string) {
  state.loading = true
  state.error = null
  state.action = null
  try {
    const a = await getAction(slug)
    if (!a) throw new Error('Action not found')
    state.action = a
  } catch (e: any) {
    state.error = e.message
  } finally {
    state.loading = false
    m.redraw()
  }
}

/** Minimal markdown → HTML: headings, bold, lists, hr, paragraphs */
function renderMarkdown(md: string): m.Vnode {
  const lines = md.split('\n')
  const nodes: m.Vnode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (hMatch) {
      const level = hMatch[1].length
      nodes.push(m(`h${level}`, parseLine(hMatch[2])))
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(m('hr'))
      i++
      continue
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: m.Vnode[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(m('li', parseLine(lines[i].replace(/^[-*]\s+/, ''))))
        i++
      }
      nodes.push(m('ul', items))
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph
    nodes.push(m('p', parseLine(line)))
    i++
  }

  return m('.md', nodes)
}

/** Inline: bold and links */
function parseLine(text: string): (string | m.Vnode)[] {
  const parts: (string | m.Vnode)[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(m('strong', match[1]))
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export const ActionDetail: m.Component = {
  oninit() {
    load(m.route.param('slug'))
  },

  view() {
    if (state.loading) return m('.loading', 'Loading action...')
    if (state.error) return m('.error', [
      m('a.back', { href: '#!/' }, '\u2190 Back'),
      m('p', `Error: ${state.error}`),
    ])

    const a = state.action!

    return m('.action-detail', [
      m('a.back', { href: '#!/' }, '\u2190 Back to list'),

      m('.detail-header', [
        m('h1', [
          m('span.action-id', `#${a.id}`),
          ' ',
          a.name,
        ]),
        m(`span.status.status-${a.status}`, STATUS_LABEL[a.status]),
      ]),

      m('.detail-meta', [
        m('.meta-grid', [
          m('.meta-item', [m('label', 'Slug'), m('span', a.slug)]),
          m('.meta-item', [m('label', 'Files'), m('span', `${a.files.length} file(s)`)]),
        ]),
      ]),

      a.files.length === 0
        ? m('.empty', 'No files in this action.')
        : a.files.map(f =>
            m('.detail-section', { key: f.name }, [
              m('h3', f.name),
              renderMarkdown(f.content),
            ])
          ),
    ])
  },
}

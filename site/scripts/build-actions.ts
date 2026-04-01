import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, basename } from 'path'

interface ActionFile {
  name: string
  content: string
}

type Status = 'planned' | 'inprogress' | 'done'

interface Action {
  id: number
  slug: string
  name: string
  status: Status
  files: ActionFile[]
}

const actionsDir = join(import.meta.dir, '..', '..', 'actions')
const outDir = join(import.meta.dir, '..', 'public', 'data')

const statusPath = join(actionsDir, 'status.json')
const statuses: Record<string, Status> = existsSync(statusPath)
  ? JSON.parse(readFileSync(statusPath, 'utf-8'))
  : {}

const entries = readdirSync(actionsDir).filter(d =>
  statSync(join(actionsDir, d)).isDirectory()
)

const actions: Action[] = entries.map(dir => {
  const match = dir.match(/^(\d+)_(.+)$/)
  const id = match ? parseInt(match[1], 10) : 0
  const name = match ? match[2].replace(/_/g, ' ') : dir

  const dirPath = join(actionsDir, dir)
  const files: ActionFile[] = readdirSync(dirPath)
    .filter(f => statSync(join(dirPath, f)).isFile())
    .map(f => ({
      name: f,
      content: readFileSync(join(dirPath, f), 'utf-8'),
    }))

  const explicit = statuses[dir]
  const status: Status = explicit === 'done'
    ? 'done'
    : files.length > 0 ? 'inprogress' : 'planned'

  return { id, slug: dir, name, status, files }
}).sort((a, b) => {
  const order: Record<Status, number> = { inprogress: 0, planned: 1, done: 2 }
  const s = order[a.status] - order[b.status]
  return s !== 0 ? s : a.id - b.id
})

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'actions.json'), JSON.stringify(actions, null, 2))

console.log(`Built ${actions.length} actions → public/data/actions.json`)

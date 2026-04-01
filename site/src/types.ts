export interface ActionFile {
  name: string
  content: string
}

export type Status = 'planned' | 'inprogress' | 'done'

export interface Action {
  id: number
  slug: string
  name: string
  status: Status
  files: ActionFile[]
}

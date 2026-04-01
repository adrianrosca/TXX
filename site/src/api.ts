import type { Action } from './types'

let cache: Action[] | null = null

export async function loadActions(): Promise<Action[]> {
  if (cache) return cache
  const res = await fetch('/data/actions.json')
  cache = await res.json()
  return cache!
}

export async function getAction(slug: string): Promise<Action | undefined> {
  const actions = await loadActions()
  return actions.find(a => a.slug === slug)
}

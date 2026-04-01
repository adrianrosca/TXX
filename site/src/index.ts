import m from 'mithril'
import { ActionList } from './views/ActionList'
import { ActionDetail } from './views/ActionDetail'

const root = document.getElementById('app')!

m.route(root, '/', {
  '/': ActionList,
  '/actions/:slug': ActionDetail,
})

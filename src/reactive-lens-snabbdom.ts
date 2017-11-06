import * as S from "snabbdom"

import { VNode } from "snabbdom/vnode"
import { Store } from "reactive-lens"

export type Patcher = (vnode: VNode) => void
export type Patch = (oldVnode: VNode | Element, vnode: VNode) => VNode

export interface ManagedApp {
  view: () => VNode,
  services?: (() => void)[]
}

export function attach<S>(patcher: Patcher, store: Store<S>, manage: (store: Store<S>) => ManagedApp): () => void {
  const managed = manage(store)
  function redraw() {
    store.transaction(() => {
      patcher(managed.view())
    })
  }
  const off = store.on(redraw)
  redraw()
  return () => (off(), (managed.services || []).forEach((off => off())))
}


export function setup(patch: Patch, root: HTMLElement): Patcher {
  while (root.lastChild) {
    root.removeChild(root.lastChild)
  }

  const container = document.createElement('div')
  root.appendChild(container)
  let vnode = patch(container, S.h('div'))

  return new_vnode => { vnode = patch(vnode, new_vnode) }
}


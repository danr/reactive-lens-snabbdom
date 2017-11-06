import { tag, Content as S } from "snabbis"
import { Store, Lens, Omit } from "reactive-lens"
import { VNode } from "snabbdom/vnode"
import * as Model from "./Model"
import { State, Todo, Visibility } from "./Model"

export {Model}

const CatchSubmit = (cb: () => void, ...bs: S[]) =>
  tag('form',
    S.on('submit')((e: Event) => {
        cb()
        e.preventDefault()
      }),
    ...bs)

const InputField = (store: Store<string>, ...bs: S[]) =>
  tag('input',
    S.props({ value: store.get() }),
    S.on('input')((e: Event) => store.set((e.target as HTMLInputElement).value)),
    ...bs)

// actually not a checkbox
const Checkbox =
  (value: boolean, update: (new_value: boolean) => void, ...bs: S[]) =>
  tag('span',
    S.classes({checked: value}),
    S.on('click')((_: MouseEvent) => update(!value)),
    S.on('input')((_: Event) => update(!value)),
    S.styles({cursor: 'pointer'}),
    ...bs)

export const App = (store: Store<State>) => ({
  view: () => View(store),
  services: [
    ((window as any).store = store, () => void 0),
    connect_storage(store),
    connect_hash(Model.to_hash, Model.from_hash, store.at('visibility')),
    store.on(x => console.log(JSON.stringify(x, undefined, 2))),
  ]
})

export const View = (store: Store<State>): VNode => {
  const {todos, visibility} = store.get()
  const todos_store = store.at('todos')

  const Header =
    tag('header .header',
      tag('h1', 'todos'),
      CatchSubmit(
        () => store.modify(Model.new_todo),
        InputField(
          store.at('new_input'),
          S.attrs({
            placeholder: 'What needs to be done?',
            autofocus: true
          }),
          S.classed('new-todo'))))

  const TodoView =
    (todo_store: Store<Todo>, {completed, text, editing, id}: Todo, rm: () => void) =>
      tag('li .todo',
        S.key(id),
        S.classes({ completed, editing }),
        tag('div',
          S.classes({ view: !editing }),
          Checkbox(
            completed,
            (v) => todo_store.at('completed').set(v),
            S.classed('toggle'),
            S.style('height', '40px')),
          editing || tag('label',
            text,
            S.styles({cursor: 'pointer'}),
            S.on('dblclick')((e: MouseEvent) => {
              todo_store.at('editing').set(true)
            }),
          ),
          editing && CatchSubmit(
            () => todo_store.at('editing').set(false),
            InputField(
              todo_store.at('text'),
              S.classed('edit'),
              S.on('blur')(() => todo_store.at('editing').set(false))
            ),
          ),
          tag('button .destroy', S.on('click')(rm))),
        )

  const Main =
    todos.length > 0 &&
    tag('section .main',
      Checkbox(
        Model.all_completed(todos),
        (b: boolean) => todos_store.modify(Model.set_all(!b)),
        S.classed('toggle-all'),
        S.id('toggle-all')),
      tag('ul .todo-list',
        Store.each(todos_store).map(
          (ref, i) => {
            const todo = ref.get()
            const rm = () => todos_store.modify(Model.remove_todo(i))
            if (Model.todo_visible(todo, visibility)) {
              return TodoView(ref, todo, rm)
            }
          })))

  const Footer =
    tag('footer .footer',
      tag('span .todo-count', todos.length.toString()),
      tag('ul .filters',
        Model.visibilites.map((opt: Visibility) =>
          tag('li',
            tag('a',
              S.classes({selected: visibility == opt}),
              S.attrs({href: '#/' + opt}),
              opt)))))

  // todo: clear completed

  return tag('section .todoapp #todoapp', Header, Main, Footer)
}

function connect_storage<S>(store: Store<S>): () => void {
  const stored = window.localStorage.getItem('state')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      store.set(parsed)
    } catch (_) {
      // pass
    }
  }
  return store.on(s => window.localStorage.setItem('state', JSON.stringify(s)))
}

function connect_hash<S>(to_hash: (state: S) => string, from_hash: (hash: string) => S | undefined, store: Store<S>): () => void {
  let self = false
  window.onhashchange = () => {
    if (!self) {
      const updated = from_hash(window.location.hash)
      if (updated !== undefined) {
        store.set(updated)
      } else {
        // gibberish, just revert it to what is now
        self = true
        window.location.hash = to_hash(store.get())
      }
    } else {
      self = false
    }
  }
  return store.on(x => {
    const hash = to_hash(x)
    if (hash != window.location.hash) {
      self = true // we don't need to react on this
      window.location.hash = hash
    }
  })
}

/*

S.hook({
  insert(vn: VNode) {
    vn.elm instanceof HTMLElement && update(store.at('sizes').zoom(Lens.key(id.toString())), vn.elm)
  },
  postpatch(_: any, vn: VNode) {
    vn.elm instanceof HTMLElement && update(store.at('sizes').zoom(Lens.key(id.toString())), vn.elm)
  }
}),

export interface Pos {
  left: number,
  top: number,
  width: number,
  height: number
}

export const hmid = (p: Pos) => p.left + p.width / 2

export const vmid = (p: Pos) => p.top + p.height / 2

export const bot = (p: Pos) => p.top + p.height

const eq_pos = (p: Pos, q: Pos) => Object.getOwnPropertyNames(p).every((i: keyof Pos) => p[i] == q[i])

const update = (pos: Store<Pos | undefined>, x: HTMLElement) => {
  const p = {
    left: x.offsetLeft,
    top: x.offsetTop,
    width: x.offsetWidth,
    height: x.offsetHeight
  }
  const now = pos.get()
  if (now === undefined || !eq_pos(p, now)) {
    pos.set(p)
  }
}


*/

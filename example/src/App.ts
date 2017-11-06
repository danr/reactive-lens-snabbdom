import { tag, Content as S } from "snabbis"
import { Store, Lens, Omit } from "reactive-lens"
import { VNode } from "snabbdom/vnode"

export type Visibility = 'all' | 'complete' | 'incomplete'

const visibilites = ['all', 'complete', 'incomplete'] as Visibility[]

export interface Todo {
  id: number,
  text: string,
  completed: boolean
}

export interface RawState {
  state: State,
  off: (() => void)[],
}

export interface State {
  next_id: number,
  todos: Todo[],
  new_input: string,
  visibility: Visibility,
  sizes: Record<string, Pos>,
  version: string
}

export const init: RawState = ({
  state: {
    next_id: 0,
    todos: [],
    new_input: '',
    visibility: 'all',
    sizes: {},
    version: '0.2',
  },
  off: [],
})

function visibility_from_hash(hash: string): Visibility | undefined {
  const bare = hash.slice(2)
  if (visibilites.some(x => x == bare)) {
    return bare as Visibility
  } else {
    return undefined
  }
}

function visibility_to_hash(vis: Visibility) {
  return '#/' + vis as string
}


function new_todo(s: State): State {
  if (s.new_input != '') {
    return {
      ...s,
      next_id: s.next_id + 1,
      new_input: '',
      todos:
        [...s.todos, {
          id: s.next_id,
          text: s.new_input,
          completed: false
        }],
    }
  } else {
    return s
  }
}

const remove_todo =
  (id: number) =>
  (todos: Todo[]) =>
  todos.filter(t => t.id != id)

const CatchSubmit = (cb: () => void, ...bs: S[]) =>
  tag('form',
    S.on('submit')((e: Event) => {
        cb()
        e.preventDefault()
      }),
    ...bs)

const InputField = (store: Store<string>, ...bs: S[]) =>
  tag('input',
    S.attrs({
      type: 'text',
      value: store.get()
    }),
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

export const App = (store: Store<RawState>): (store: Store<RawState>) => VNode => {
  const state = store.at('state')
  store.at('off').get().forEach(off => off())
  store.at('off').set([
    connect_storage(state),
    state.on(x => console.log(JSON.stringify(x, undefined, 2))),
    connect_hash(visibility_to_hash, visibility_from_hash, state.at('visibility'))
  ])
  return () => View(state)
}

export const View = (store: Store<State>): VNode => {
  const {todos, visibility} = store.get()
  const todos_store = store.at('todos')

  const Header =
    tag('header .header',
      tag('h1', 'todos'),
      CatchSubmit(
        () => store.modify(new_todo),
        InputField(
          store.at('new_input'),
          S.attrs({
            placeholder: 'What needs to be done?',
            autofocus: true
          }),
          S.classed('new-todo'))))

   const TodoView =
     (todo_store: Store<Todo>, {completed, id, text}: Todo) =>
       tag('li .todo',
         S.hook({
           insert(vn: VNode) {
             vn.elm instanceof HTMLElement && update(store.at('sizes').zoom(Lens.key(id.toString())), vn.elm)
           },
           postpatch(_: any, vn: VNode) {
             vn.elm instanceof HTMLElement && update(store.at('sizes').zoom(Lens.key(id.toString())), vn.elm)
           }
         }),
         S.classes({ completed }),
         tag('div .view',
           Checkbox(
             completed,
             (v) => todo_store.at('completed').set(v),
             S.classed('toggle'),
             S.style('height', '40px')),
           tag('label', text),
           tag('button .destroy',
             S.on('click')(_ => todos_store.modify(remove_todo(id))))),
         InputField(todo_store.at('text'), S.classed('edit')))

   const Main =
     todos.length == 0 ? null :
     tag('section .main',
       Checkbox(
         todos.some(todo => !todo.completed),
         (b: boolean) => todos_store.modify(
           todos => todos.map(todo => ({...todo, completed: !b}))),
         S.classed('toggle-all'),
         S.id('toggle-all')),
       tag('ul .todo-list',
         Store.each(todos_store)
         .map(ref => ({ref, todo: ref.get()}))
         .filter(({todo}) => visibility != (todo.completed ? 'incomplete' : 'complete'))
         .map(({ref, todo}) => TodoView(ref, todo))))

  const Footer =
    tag('footer .footer',
      tag('span .todo-count', todos.length.toString()),
      tag('ul .filters',
        visibilites.map((opt: Visibility) =>
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
      if ('version' in parsed && parsed.version == init.state.version) {
        store.set(parsed)
      }
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



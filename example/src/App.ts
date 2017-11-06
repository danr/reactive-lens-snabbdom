import { tag, Content as S } from "snabbis"
import { Store, Lens } from "reactive-lens"
import { VNode } from "snabbdom/vnode"

export type Visibility = 'all' | 'complete' | 'incomplete'

const visibilites = ['all', 'complete', 'incomplete'] as Visibility[]

export interface Todo {
  id: number,
  text: string,
  completed: boolean
}

export type State = {
  next_id: number,
  todos: Todo[],
  new_input: string,
  visibility: Visibility
}

function visibility_from_hash(hash: string, s: State): State {
  const bare = hash.slice(2)
  if (visibilites.some(x => x == bare)) {
    return {
      ...s,
      visibility: bare as Visibility
    }
  } else {
    return s
  }
}

export const init: State = stored_or({
  next_id: 0,
  todos: [],
  new_input: '',
  visibility: 'all',
})

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

export const view = (store: Store<State>): VNode => {
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

function stored_or<S>(s: S) {
  const stored = window.localStorage.getItem('state')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      return s
    }
  } else {
    return s
  }
}

export function route<S, R>(
    populate_hash: (h: string, s: S) => S,
    get_hash: (s: S) => string,
    view: (store: Store<S>) => R): (store: Store<S>) => R {
  return store => {
    window.onhashchange = () => {
      store.modify(s => populate_hash(window.location.hash, s))
    }
    window.location.hash = get_hash(store.get())
    return view(store)
  }
}



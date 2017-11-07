import { tag, Content as S } from "snabbis"
import { Store, Lens, Undo } from "reactive-lens"
import { VNode } from "snabbdom/vnode"
// import * as Model from "./Model"
// import { State, Todo, Visibility } from "./Model"

export interface State {
  slide: number,
  slides: Slides
}

export interface Slides {
  title: string,
  input: {
    a: string,
    b: string,
  },
  table: Undo<Table>,
}

export interface Table {
  headers: string[],
  table: Record<string, string>[]
}

export const init: State = {
  slide: 0,
  slides: {
    title: "reactive-lens",
    input: {
      a: "",
      b: ""
    },
    table: Undo.advance(Undo.init({
      headers: ["word", "pos"],
      table: [
        {word: "Gunilla", pos:"PM", msd:"PM.NOM", lemma:"|Gunilla|", lex:"|Gunilla..pm.1|", saldo:"|Gunilla..1|", prefix:"|", suffix:"|", ref:"1", dephead:"2", deprel:"SS"},
        {word: "går", pos:"VB", msd:"VB.PRS.AKT", lemma:"|gå|", lex:"|gå..vb.1|", saldo:"|gå..1|gå..10|gå..11|gå..2|gå..3|gå..4|gå..5|gå..6|gå..7|gå..8|gå..9|", prefix:"|", suffix:"|", ref:"2", deprel:"ROOT"},
        {word: "till", pos:"PP", msd:"PP", lemma:"|till|", lex:"|till..pp.1|", saldo:"|till..1|", prefix:"|", suffix:"|", ref:"3", dephead:"2", deprel:"OA"},
        {word: "kvarterskrogen", pos:"NN", msd:"NN.UTR.SIN.DEF.NOM", lemma:"|", lex:"|", saldo:"|", prefix:"|kvarter..nn.1|", suffix:"|krog..nn.1|", ref:"4", dephead:"3", deprel:"PA"},
        {word: ".", pos:"MAD", msd:"MAD", lemma:"|", lex:"|", saldo:"|", prefix:"|", suffix:"|", ref:"5", dephead:"2", deprel:"IP"},
      ]
    })),
  }
}


const slides = 6

const json = (x: any) => JSON.stringify(x, undefined, 2)

function Views(slide: number, store: Store<Slides>): VNode {
  const input = store.at('input')
  const table = store.at('table').via(Undo.now())
  const history = store.at('table')
  switch (slide) {
    case 0: return tag('span', store.at('title').get())
    case 1: return tag('div',
      tag('div', 'a: ', InputField(input.at('a'))),
      tag('div', 'b: ', InputField(input.at('b')))
    )
    case 2: return tag('div', tag('div', Views(slide - 1, store)), Textarea(input))
    case 3: return Tabulate(history)
    case 4: return tag('div', tag('div', Views(slide - 1, store)), Textarea(table))
    case 5: return (
      tag('div',
        tag('div', Views(slide - 2, store)),
        tag('div',
          Button(() => history.modify(Undo.undo), 'undo'),
          Button(() => history.modify(Undo.redo), 'redo')
        ),
        Textarea(history)))
    default: return tag('div', 'no more slides!')
  }
}

function Tabulate(history: Store<Undo<Table>>) {
  const store = history.via(Undo.now())
  const {headers, table} = store.get()
  const advance = () => {
    const prev = history.get().tip.pop
    const now = history.get().tip.top
    if (prev == null || (prev.top != now)) {
      history.modify(Undo.advance)
    }
  }
  const blur_advance = S.on('blur')(advance)
  return tag('table',
    tag('thead',
      tag('tr',
        Button(() => store.transaction(() => {
            advance()
            Store.arr(store.at('headers'), 'unshift')(headers.length.toString())
          }),
          '+'),
        headers.map(
          (h, i) =>
            tag('th',
              InputField(
                store.at('headers').via(Lens.index(i)),
                blur_advance),
              Button(() => store.transaction(() => {
                  advance()
                  Store.arr(store.at('headers'), 'splice')(i, 1)
                }),
                '-'),
              Button(() => store.transaction(() => {
                  advance()
                  Store.arr(store.at('headers'), 'splice')(i+1, 0, headers.length.toString())
                }),
                '+'),
            )))),
    tag('tbody',
      table.map(
        (row, i) =>
          tag('tr',
            tag('td', i),
            headers.map(
              (h, j) =>
                tag('td',
                  InputField(
                    store
                      .at('table')
                      .via(Lens.index(i))
                      .via(Lens.key(h))
                      .via(Lens.def('')),
                    blur_advance))))),
      tag('tr',
        tag('td', S.attrs({colspan: headers.length + 1}),
          Button(() => store.transaction(() => {
              advance()
              Store.arr(store.at('table'), 'push')({})
            }),
            '+')))))
}

function Button(cb: () => void, label: string = '', ...bs: S[]) {
  return tag('input',
    S.attrs({
      'type': 'button',
      value: label
    }),
    S.on('click')(cb),
    ...bs)
 }

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

const CheckBox = (store: Store<boolean>, ...bs: S[]) =>
  tag('input',
    S.attrs({ type: 'checkbox' }),
    S.props({ value: store.get() }),
    S.on('input')((e: Event) => store.set((e.target as HTMLInputElement).value == 'true')),
    ...bs)

const Textarea = (store: Store<any>, ...bs: S[]) =>
  tag('textarea',
    S.props({value: json(store.get())}),
    S.attrs({rows: 10, cols: 60}),
    S.on('input')((e: Event) => {
      try {
        const obj = JSON.parse((e.target as any).value)
        store.set(obj)
      } catch (e) {
        // pass
      }
    })
  )


export const App = (root: Store<State>) => {
  const global = window as any
  global.reset = () => root.set(init)
  global.Store = Store
  global.Lens = Lens
  global.Undo = Undo
  const store = root.at('slides')
  global.root = root
  global.slide = root.at('slide')
  global.store = store
  global.title_store = store.at('title')
  global.ab_store = store.at('input')
  global.table_store = store.at('table').via(Undo.now())
  global.history_store = store.at('table')
  return {
    view: () => tag('div .Slide' + root.at('slide').get(), Views(root.at('slide').get(), store)),
    services: [
      connect_storage(store),
      connect_hash(to_hash, from_hash, root.at('slide')),
      // store.on(x => console.log(JSON.stringify(x, undefined, 2))),
    ]
  }
}



// export const View = (store: Store<State>): VNode => {

/*

// actually not a checkbox
const Checkbox =
  (value: boolean, update: (new_value: boolean) => void, ...bs: S[]) =>
  tag('span',
    S.classes({checked: value}),
    S.on('click')((_: MouseEvent) => update(!value)),
    S.on('input')((_: Event) => update(!value)),
    S.styles({cursor: 'pointer'}),
    ...bs)

export const App = (store: Store<State>) => {
  const global = window as any
  global.store = store
  global.reset = () => store.set(Model.init)
  return {
    view: () => View(store),
    services: [
      connect_storage(store),
      connect_hash(Model.to_hash, Model.from_hash, store.at('visibility')),
      store.on(x => console.log(JSON.stringify(x, undefined, 2))),
    ]
  }
}

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

*/

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
  function update() {
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
  window.onhashchange = () => update()
  update()
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
    vn.elm instanceof HTMLElement && update(store.at('sizes').via(Lens.key(id.toString())), vn.elm)
  },
  postpatch(_: any, vn: VNode) {
    vn.elm instanceof HTMLElement && update(store.at('sizes').via(Lens.key(id.toString())), vn.elm)
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

export function from_hash(hash: string): number | undefined {
  const n = parseInt(hash.slice(1))
  console.log(hash, n, slides)
  if (n >= 0 && n < slides) {
    return n
  } else {
    return undefined
  }
}

export function to_hash(slide: number): string {
  return '#' + slide.toString()
}


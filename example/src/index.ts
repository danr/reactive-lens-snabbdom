import * as App from "./App"
import { Store } from "reactive-lens"
import { attach, reattach } from "reactive-lens-snabbdom"
import { patch } from "snabbis"

const store = Store.init(App.init)
const root = document.getElementById('root') as HTMLElement

const patcher = attach(patch, root, store, App.view)

declare const module: any;
declare const require: any;
declare const Debug: boolean

if (Debug) {
  if (module.hot) {
    module.hot.accept('./App.ts', (_: any) => {
      try {
        const App_view = require('./App.ts').view
        reattach(patcher, store, App_view)
      } catch (e) {
        console.error(e)
      }
    })
  }
}

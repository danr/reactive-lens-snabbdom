import * as App from "./App"
import { Store } from "reactive-lens"
import { setup, attach } from "reactive-lens-snabbdom"
import { patch } from "snabbis"

const store = Store.init(App.Model.init)
const root = document.getElementById('root') as HTMLElement

const patcher = setup(patch, root)
let off = attach(patcher, store, App.App)

declare const module: any;
declare const require: any;
declare const Debug: boolean

if (Debug) {
  if (module.hot) {
    module.hot.accept('./App.ts', (_: any) => {
      try {
        const NewApp = require('./App.ts').App
        off()
        off = attach(patcher, store, NewApp)
      } catch (e) {
        console.error(e)
      }
    })
  }
}

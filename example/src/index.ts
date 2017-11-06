import * as App from "./App"
import { attach } from "reactive-lens-snabbdom"

const store = Store.init(App.init)
const root = document.getElementById('root') as HTMLElement

attach(root, store, App.view)

declare const module: any;
declare const require: any;
declare const Debug: boolean

if (Debug) {
  if (module.hot) {
    module.hot.accept('./App.ts', (_: any) => {
      try {
        const App_view = require('./App.ts').attach
        reattach(root, store, App_view)
      } catch (e) {
        console.error(e)
      }
    })
  }
}

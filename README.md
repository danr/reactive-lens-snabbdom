# reactive-lens-snabbdom

> snabbdom integration for reactive-lens


## API overview
* Patcher
* Patch
* interface ManagedApp
  * view
  * services
* attach
* setup
## Documentation
* **Patcher**: `undefined`

  
* **Patch**: `undefined`

  
### interface ManagedApp


* **view**: `() => VNode`

  
* **services**: `Array<() => void>`

  
* **attach**: `<S>(patcher: Patcher, store: Store<S>, manage: (store: Store<S>) => ManagedApp) => () => void`

  
* **setup**: `(patch: Patch, root: HTMLElement) => Patcher`

  

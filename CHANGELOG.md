# Changelog

## [0.3.0](https://github.com/tai-kun/use-machine-ts/compare/v0.2.3...v0.3.0) (2024-09-13)


### Features

* export all guard utils as `guards` ([bb51db8](https://github.com/tai-kun/use-machine-ts/commit/bb51db80378536a28aebd9146f4ccb39cc86d786))


### Reverts

* bf88c87 ([aaf30b8](https://github.com/tai-kun/use-machine-ts/commit/aaf30b8357d130da30a6fedec2ba33b4aa1e9084))


### Documentation

* rebuild ([44d6e00](https://github.com/tai-kun/use-machine-ts/commit/44d6e00af64440604a69bb5f9f75a86486eef3d1))


### Miscellaneous Chores

* **deps-dev:** bump the dev-dependencies group across 1 directory with 4 updates ([bf88c87](https://github.com/tai-kun/use-machine-ts/commit/bf88c87bbb7e901ad1c4c164ec929e5e4f77173d))
* Improve texts ([2d34784](https://github.com/tai-kun/use-machine-ts/commit/2d34784d0116b1d6e01f7121d2157729dffd280f))
* **scripts:** Improve format checking of commit messages ([09e6f0e](https://github.com/tai-kun/use-machine-ts/commit/09e6f0e8a178b9e4b2876a15c191ccbfecb2683e))


### Code Refactoring

* change coding style ([b6f6703](https://github.com/tai-kun/use-machine-ts/commit/b6f6703544946b6ad6935e963adb0e8cff04a3f6))


### Continuous Integration

* replace existing release workflow with release-please ([72f56f5](https://github.com/tai-kun/use-machine-ts/commit/72f56f5c6a4776852fd56e3ed1abd60b928dc9b2))

## <small>v0.2.3 (2024-08-18)</small>

Drop peerDependencies.

## <small>v0.2.2 (2024-05-31)</small>

Improved documentation.

## <small>v0.2.1 (2024-05-13)</small>

Improved log messages.

## <small>v0.2.0 (2024-03-30)</small>

### Features

- `useSyncExternalStore` now accepts `getServerState` as an option. This is passed to `getServerSnapshot`, the third argument of `React.useSyncExternalStore`. ([5021f01](https://github.com/tai-kun/use-machine-ts/commit/5021f01311698a7b9cec78dbb5b62815979963cf))

### Breaking changes

- `transfer`, `isTransfer`, and `Transfer` are no longer needed. The new syntax allows only one optional argument to the function that creates the state machine, but eliminates the need to mark individually transferable values. ([75ca0f8](https://github.com/tai-kun/use-machine-ts/commit/75ca0f804ff84f40f77084817f3ce0b7641a38d9))

Previous transfer syntax:

```ts
import { createMachine, type Transfer, transfer } from "use-machine-ts"

function machine(props: Transfer<object>) {
  return createMachine({ /* ... */ }, {
    effects: {
      onChange: () => {
        const { onChange } = props.current
        onChange?.()
      },
    },
  })
}

function ReactComponent(props: object) {
  const [state, send] = useMachine(machine, [transfer(props)])
  // ...
}
```

New transfer syntax:

```ts
import { createMachine } from "use-machine-ts"

function machine(props: () => object) {
  return createMachine({ /* ... */ }, {
    effects: {
      onChange: () => {
        const { onChange } = props()
        onChange?.()
      },
    },
  })
}

function ReactComponent(props: object) {
  const [state, send] = useMachine(machine, props)
  // ...
}
```

## <small>v0.1.4 (2024-03-19)</small>

Please refer to [README.md](https://github.com/tai-kun/use-machine-ts/blob/v0.1.4/README.md) for details.

## <small>v0.1.0 (2024-03-15)</small>

First release.

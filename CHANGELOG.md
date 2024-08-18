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

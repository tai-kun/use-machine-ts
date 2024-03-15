# use-machine-ts

**The tiny _state machine_ hook for React**

[![Test](https://github.com/tai-kun/use-machine-ts/actions/workflows/test.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/test.yaml)
[![Release on NPM](https://github.com/tai-kun/use-machine-ts/actions/workflows/release.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/release.yaml)
[![Canary Release on NPM](https://github.com/tai-kun/use-machine-ts/actions/workflows/canary-release.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/canary-release.yaml)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/use-machine-ts)
[![npm version](https://img.shields.io/npm/v/use-machine-ts)](https://www.npmjs.com/package/use-machine-ts)
![npm canary version](https://img.shields.io/npm/v/use-machine-ts/canary)

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)

<p align="center">English (MT) | <a href="./README.ja.md">日本語</a></p>

use-machine-ts is a tiny hook for designing state machines in React. Easily manage state transitions by following the idiomatic React patterns you're already familiar with.

## Respect

use-machine-ts is inspired by [@cassiozen/usestatemachine](https://github.com/cassiozen/useStateMachine).

## Basic Features

- useMachine: Essentially a wrapper around `useState` and `useEffect`. Manages state transitions, similar to `useState`.
- useSharedMachine: Essentially a wrapper around `usuSyncExternalState` and `useEffect`. You can also manage state transitions from outside your React component.
- useSyncedMachine: Similar to useMachine, but does not trigger a re-render on every state transition. This hook provides a function that returns a snapshot of the state rather than the current state.
- createMachine: Create a state machine. This is useful for reusing State Machine Definitions in different components. Can be used with useMachine and useSyncedMachine.
- createSharedMachine: Similar to createMachine, but only available with useSharedMachine.

## Installation

To install the latest stable version:

```sh
npm install use-machine-ts
```

To install the canary version:

```sh
npm install use-machine-ts@canary
```

## Sample Usage

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: "isReady",
          },
        },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    guards: {
      isReady: () => true,
    },
    effects: {
      onActive: () => {
        console.log("Now in the 'active' state!")

        return () => {
          console.log("Now in the 'inactive' state!")
        }
      },
    },
  },
)

console.log(state)
// { value: "inactive", context: undefined,
//   event: { type: "$init" }, nextEvents: ["TOGGLE"] }

send("TOGGLE")
// Logs: Now in the 'active' state!

console.log(state)
// { value: "active", context: undefined,
//   event: { type: "TOGGLE" }, nextEvents: ["TOGGLE"] }
```

# API

## useMachine

To create an improvised state machine:

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)
```

To use a pre-built state machine:

```ts
import { useMachine, createMachine } from "use-machine-ts"

const machine = /* @__PURE__ */ createMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)

const [state, send] = useMachine(machine)
```

or:

```ts
import { useMachine, createMachine } from "use-machine-ts"

function machine() {
  return createMachine(
    /* State Machine Definition */,
    /* State Machine Configuration (Optional) */,
  )
}

const [state, send] = useMachine(machine)
```

### state

The state machine's `state` consists of four properties: `value`, `event`, `nextEvents`, and `context`.

| Properties   | Type       | Description                                                                                                                         |
| :----------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `value`      | `string`   | Current state. For example, `"inactive"` or `"active"`.                                                                             |
| `event`      | `object`   | The last sent event that caused the current state. For example, `{ type: "TOGGLE" }`. However, initially it is `{ type: "$init" }`. |
| `nextEvents` | `string[]` | List of events that can be sent in the current state. For example, `["TOGGLE"]`.                                                    |
| `context`    | `any`      | The extended state of the state machine. See [Extended State](#extended-state).                                                     |

### send

The `send` function is used to send events to the state machine. It takes one argument and passes a string (e.g. `"TOGGLE"`) or an object (e.g. `{ type: "TOGGLE" }`) representing the type of event.

If the current state accepts the event and the transition is possible (see [Guards](#using-guards)), the state machine state is updated and the associated effects (see [Effects](#using-effects)) are It will be executed.

You can send additional data using object-style events (e.g. `{ type: "TOGGLE", value: 10 }`). See [Schema](#schema) for how to define event types.

### State Machine Definition

| Property  | Type     | Required | Description                                                                                                                |
| :-------- | :------- | :------- | :------------------------------------------------------------------------------------------------------------------------- |
| `initial` | `string` | ✅       | Defines the initial state of the state machine.                                                                            |
| `states`  | `object` | ✅       | Defines the finite states that the state machine can take. (See: [Defining States](#defining-states))                      |
| `on`      | `object` |          | Defines the transition for events that cannot be accepted in the current state. (See: [Defining States](#defining-states)) |
| `context` | `any`    |          | Defines the extended state of the state machine. (See: [Extended State](#extended-state))                                  |
| `$schema` | `object` |          | Defines the state machine schema as a type. (Reference: [Schema](#schema))                                                 |

### State Machine Configuration

| Properties | Type                  | Description                                                                         |
| :--------- | :-------------------- | :---------------------------------------------------------------------------------- |
| `guards`   | `object`              | Defines guard functions for the state machine. (See: [Using Guards](#using-guards)) |
| `effects`  | `object`              | Defines the state machine effect functions. (See: [Using Effects](#using-effects))  |
| `verbose`  | `boolean` `0` `1` `2` | Enables debug logging. (Reference: [Logging](#logging))                             |
| `console`  | `object`              | Defines a custom console for outputting logs. (Reference: [Logging](#logging))      |

### Defining States

A state machine can only be in one of a finite number of states. Also, state only changes due to events.

States are defined as keys in the `states` object, and event types are defined as keys in each state object's `on` object.

```ts
{
  states: {
    // state name: state object
    inactive: {
      on: { // event definition
        TOGGLE: "active", // Event type: Destination state value
      },
    },
    active: {
      on: {
        TOGGLE: "inactive",
      },
    },
  },
}
```

In event definitions, you can use objects with a `target` property to have more control over state transitions (such as adding guards).

```ts
{
  on: {
    TOGGLE: {
      target: "active",
      guard: "isReady",
    },
  },
}
```

### Using Guards

A guard is a function that is executed before the actual state transition. If the guard returns `true`, the state transition is allowed. If the guard returns `false`, the state transition is rejected.

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: "isReady",
          },
        },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    guards: {
      isReady: () => true,
    },
  },
)
```

use-machine-ts provides three helper functions: `and`, `or`, and `not`. You can use these functions to create complex guards.

```ts
import { and, not, or, useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: or("isReady", and("isStopped", not("isDestroyed"))),
          },
        },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    guards: {
      isReady: () => true,
      isStopped: () => true,
      isDestroyed: () => true,
    },
  },
)
```

The `and` function can simply be replaced with an array.

```ts
or("isReady", and("isStopped", not("isDestroyed")))
// equals
or("isReady", ["isStopped", not("isDestroyed")])
```

If `guard` eventually returns `false`, you will see a log similar to the following:

```text
Transition from 'inactive' to 'active' denied by guard.
(isReady || (isStopped && !isDestroyed))
                           ^^^^^^^^^^^^
Event { type: "TOGGLE" }
Context undefined
```

`^` indicates the reason why the guard rejected the state transition. In the example above, we can see that the state transition was rejected because `isDestroyed` returned `true`.

> [!IMPORTANT]
> `and` with no guards always returns `true`. Similarly, `or` with no guards always returns `false`.

### Using Effects

An effect is a function that is executed when the state machine enters a particular state. If you return a function from an effect, that function will be executed when you leave the state. This works similar to the `useEffect` hook in React.

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "active",
    states: {
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    effects: {
      onActive: entryParams => {
        console.log("Entered 'active' state!")

        return exitParams => {
          console.log("Left from 'active' state!")
        }
      },
    },
  },
)
```

You can also pass an array to the `effect` property instead of a string.

```ts
{
   effect: [
     "onActive",
     "onTransition",
   ],
}
```

The effect function takes as a parameter an object (`entryParams`) with four properties:

| Properties   | Type       | Description                                                                                                                                                                          |
| :----------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event`      | `object`   | The event that caused the transition to the current state. Events always use object format (e.g. `{ type: "TOGGLE" }`).                                                              |
| `context`    | `any`      | The extended state of the state machine.                                                                                                                                             |
| `send`       | `function` | Function for sending events to the state machine.                                                                                                                                    |
| `setContext` | `function` | Function for updating the extended state of the state machine. Since it returns an object with a `send` property, you can write `context` updates and state transitions in one line. |

The function returned by the effect function takes as a parameter an object (`exitParams`) with four properties:

| Properties   | Type       | Description                                                                                                                                                                          |
| :----------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event`      | `object`   | The event that caused the transition from the current state. Events always use object format (e.g. `{ type: "TOGGLE" }`).                                                            |
| `context`    | `any`      | The extended state of the state machine.                                                                                                                                             |
| `send`       | `function` | Function for sending events to the state machine.                                                                                                                                    |
| `setContext` | `function` | Function for updating the extended state of the state machine. Since it returns an object with a `send` property, you can write `context` updates and state transitions in one line. |

The following example updates `retryCount` each time it enters a failure state, and transitions to an error state when the limit is reached.

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "loading",
    context: { retryCount: 0 },
    states: {
      loading: {
        on: {
          FAILURE: "failure",
          DONE: "done",
        },
      },
      failure: {
        on: {
          RETRY: "loading",
          ERROR: "error",
        },
        effect: "onFailure",
      },
      error: {
        on: {
          RETRY: "loading",
        },
        effect: [
          "onError",
          "resetRetryCount",
        ],
      },
      done: {},
    },
  },
  {
    effects: {
      onFailure: ({ context, send, setContext }) => {
        if (context.retryCount < 3) {
          setContext(ctx => ({ retryCount: ctx.retryCount + 1 })).send("RETRY")
        } else {
          send("ERROR")
        }

        return ({ event }) => {
          if (event.type === "RETRY") {
            console.log("Retrying...")
          } else {
            console.log("The number of retries has reached the upper limit!")
          }
        }
      },
      onError: () => {
        console.log("Error state entered!")
      },
      resetRetryCount: ({ setContext }) => {
        setContext(() => ({ retryCount: 0 }))
      },
    },
  },
)
```

> [!WARNING]
> State machine definitions and configurations are immutable. It cannot be changed midway. Functions defined with `effects`, `guards`, etc. continue to refer to the values they had when they were first defined. Therefore, care should be taken when directly monitoring state changes, for example.

The following example shows how to use React's `useEffect` hook to update the state of a component when the state of the state machine changes. This works correctly.

```ts
function Component(props: { onActive: () => void }) {
  const { onActive } = props
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
        },
      },
    },
  )

  useEffect(() => {
    if (state.value === "active") {
      onActive()
    }
  }, [state])
}
```

You might find the above example redundant and end up writing code like this: However, this can lead to serious bugs.

```ts
function Component(props: { onActive: () => void }) {
  const { onActive } = props
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
          // If props.onActive is changed, the change will not be reflected.
          // Always refers to the first defined value, which can lead to serious bugs.
          onActive()
        },
      },
    },
  )
}
```

You can also work around this problem by using `useRef` to always refer to the latest function, like this:

```ts
function Component(props: { onActive: () => void }) {
  const onActive = React.useRef(props.onActive)
  onActive.current = props.onActive
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
          onActive.current()
        },
      },
    },
  )
}
```

However, there is still the possibility of human error. For practical purposes, we recommend using the `transfer` function to transfer values that depend on React components. See [transfer](#transfer) for details.

### Extended State

In addition to a finite number of states, a state machine can have extended states (called contexts). Define the initial extension state using the `context` property and update the extension state using the `setContext` function.

```ts
const [state, send] = useMachine(
  {
    initial: "inactive",
    context: { toggleCount: 0 },
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    effects: {
      onActive: ({ setContext }) => {
        setContext(ctx => ({ toggleCount: ctx.toggleCount + 1 }))
      },
    },
  },
)

console.log(state.context) // { toggleCount: 0 }

send("TOGGLE")

console.log(state.context) // { toggleCount: 1 }
```

### Schema

TypeScript automatically infers context and event types, but you can also explicitly define a state machine's schema using the `$schema` property. This object is never used at runtime.

The `$schema` property has three properties: `context`, `events`, and `strict`.

| Property  | Type      | Required | Description                                                                                                                                                     |
| :-------- | :-------- | :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `context` | `any`     |          | Defines the type of extended state of the state machine.                                                                                                        |
| `events`  | `object`  |          | Defines the type of state machine events.                                                                                                                       |
| `strict`  | `boolean` |          | Enable strict mode for the schema. When set to `true`, automatic inference is disabled and contexts and events not defined in the schema result in type errors. |

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    $schema: {} as {
      context: {
        toggleCount: number
      }
      events: {
        TOGGLE: {
          timestamp: Date
        }
      }
    },
    context: { toggleCount: 0 },
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    effects: {
      onActive: ({ event, setContext }) => {
        console.log(event)
        setContext(ctx => ({ toggleCount: ctx.toggleCount + 1 }))
      },
    },
  },
)

send("TOGGLE") // Type Error !

send({ type: "TOGGLE", timestamp: new Date() }) // OK (^_^)b

// Logs: { type: "TOGGLE", timestamp: 2024-01-01T00:00:00.000Z }
```

### Logging

You can enable state machine logging if needed. Use the `verbose` property to set the verbosity of the log. .

| Value          | Description                                         |
| :------------- | :-------------------------------------------------- |
| `0` or `false` | Disable logging.                                    |
| `1`            | Outputs only errors to the log. (default)           |
| `2` or `true`  | Output errors and debugging information to the log. |

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    verbose: 2,
  },
)
```

> [!NOTE]
> Logging is disabled when `process.env.NODE_ENV` is `"production"`.

## useSharedMachine

To use `useSharedMachine`, you need to use a state machine created with `createSharedMachine`.

```ts
import { useSharedMachine, createSharedMachine } from "use-machine-ts"

const sharedMachine = createSharedMachine(
   /* State Machine Definition */,
   /* State Machine Configuration (Optional) */,
)

const [state, send] = useSharedMachine(sharedMachine)
```

`useSharedMachine` works similarly to `useMachine`, but allows you to manage state transitions externally. It's essentially a wrapper around `useSyncExternalState` and `useEffect`. If I may borrow your knowledge, I can give an analogy with the relationship between `atom` and `useAtom`.

```ts
const machineAtom = atom() /* Initial State */
const [state, setState] = useAtom(machineAtom)

const send = event => {
  const nextState = eventToNextState(event, state)
  setState(nextState)
}
```

A shared state machine is an object with six properties: `instance`, `dispatch`, `send`, `setContext`, `getState`, and `subscribe`.

| Properties   | Type                           | Description                                                                                          |
| :----------- | :----------------------------- | :--------------------------------------------------------------------------------------------------- |
| `instance`   | `[Definition, Configuration?]` | An instance of the state machine.                                                                    |
| `dispatch`   | `function`                     | A function to send events to the state machine. Primitive functions used by `send` and `setContext`. |
| `send`       | `function`                     | Function for sending events to the state machine.                                                    |
| `setContext` | `function`                     | Function for updating the extended state of the state machine.                                       |
| `getState`   | `function`                     | A function to get the current state of the state machine.                                            |
| `subscribe`  | `function`                     | A function to monitor state changes in the state machine.                                            |

## useSyncedMachine

Similar to `useMachine`, but does not trigger a re-render on every state transition. This hook provides a function that returns a snapshot of the state rather than the current state.

```ts
import { useSyncedMachine } from "use-machine-ts"

const [getState, send] = useSyncedMachine({
  initial: "inactive",
  states: {
    inactive: {
      on: { TOGGLE: "active" },
    },
    active: {
      on: { TOGGLE: "inactive" },
    },
  },
})

console.log(getState())
// { value: "inactive", context: undefined,
// event: { type: "$init" }, nextEvents: ["TOGGLE"] }

send("TOGGLE")

console.log(getState())
// { value: "active", context: undefined,
// event: { type: "TOGGLE" }, nextEvents: ["TOGGLE"] }
```

## transfer

When using a state machine pre-created with `createMachine` in a React hook, you can use the `transfer` function to transfer dependent values to the React component.

`Transfer` marks the arguments of the function that creates the state machine as transferable. When used in React hooks, you need to use the `transfer` function to transfer values. For transferable values, a reference is created with `useRef`, and the state machine uses the value via that reference. Therefore, the argument must be of fixed length. Also, you cannot dynamically mix transportable and non-transferable values.

```ts
import { createMachine, type Transfer, transfer } from "use-machine-ts"

function machine(
  initial: "inactive" | "active",
  onToggle: Transfer<((isActive: boolean) => void) | undefined>,
) {
  return createMachine(
    {
      initial,
      states: {
        inactive: {
          on: { TOGGLE: "active" },
          effect: "onInactive",
        },
        active: {
          on: { TOGGLE: "inactive" },
          effect: "onActive",
        },
      },
    },
    {
      effects: {
        onActive: ({ context }) => {
          onToggle.current?.(true)
        },
        onInactive: ({ context }) => {
          onToggle.current?.(false)
        },
      },
    },
  )
}

function ToggleButton(props: { onToggle?: (isActive: boolean) => void }) {
  const [state, send] = useMachine(
    machine,
    [
      "inactive",
      transfer(props.onToggle),
    ],
  )
}
```

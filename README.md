**The tiny _state machine_ hook for React**

[![CI](https://github.com/tai-kun/use-machine-ts/actions/workflows/ci.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/ci.yaml)

[![npm bundle size](https://img.shields.io/bundlephobia/minzip/use-machine-ts/latest)](https://bundlephobia.com/package/use-machine-ts)
[![npm version](https://img.shields.io/npm/v/use-machine-ts)](https://www.npmjs.com/package/use-machine-ts)

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)

<p align="center">English (MT) | <a href="./README.ja.md">日本語</a></p>

use-machine-ts is a tiny hook for designing state machines in React. It follows the familiar idiomatic React patterns, making it easy to manage state transitions.

<details>
<summary>Bundle Size</summary>

```typescript
// 973 B
import { useMachine } from "use-machine-ts"

// 1.37 KB
import * from "use-machine-ts"

// 1 KB
import * from "use-machine-ts/standard"

// 1.04 KB
import * from "use-machine-ts/shared"

// 1.08 KB
import * from "use-machine-ts/synced"

// 11.12 KB
import { createMachine } from "xstate@5.9.1"
import { useMachine } from "@xstate/react@4.1.0"
```
</details>

## Respect

use-machine-ts is inspired by [@cassiozen/usestatemachine](https://github.com/cassiozen/useStateMachine).

<details>
<summary>Difference between use-machine-ts and @cassiozen/usestatemachine</summary>

- The state machine definition is split into one or two parts.
  The separated items are debug-related settings and the actual implementations of guard and effect functions.
  Since the implementation is not included within the state transition definitions, you get the following benefits:
    - You can focus on deliberating state transitions.
    - The logs when state transitions are guarded become clear, making debugging easier.
      (See: [Using Guards](#using-guards))
- The special function `t` for defining context and event types is no longer needed.
  Instead, you can define schema types using `{} as <types...>`.
- You can create state machines in advance.
- Asynchronous state updates for state machines have become relatively safer.
  Specifically, behavior has improved when the component is already unmounted.
  (See: [Async Orchestration](#async-orchestration))
- Besides `useMachine`, two additional convenient hooks are provided:
    - `useSharedMachine`:
      Allows sharing state between multiple React components.
      You can also manage state transitions from outside React components.
    - `useSyncedMachine`:
      Re-rendering is not triggered when the state transitions.
      This hook provides a function that returns a snapshot of the state rather than the current state.
- 😢 The required version of React has been raised from 16.8 to 18.
- 😢 The bundle size has increased. Compared to `useMachine`, there's an increase of about 400 bytes (+60%).
</details>

## Basic Features

- `useMachine`:
  Essentially a wrapper around `useState` and `useEffect`.
  Manages state transitions in the same way as `useState`.
- `useSharedMachine`:
  Essentially a wrapper around `useSyncExternalStore` and `useEffect`.
  Allows sharing state between multiple React components.
  You can also manage state transitions from outside React components.
- `useSyncedMachine`:
  Similar to `useMachine`, but re-rendering is not triggered every time the state transitions.
  This hook provides a function that returns a snapshot of the state rather than the current state.
- `createMachine`:
  Creates a state machine. Useful for reusing state machine definitions across different components.
  Can be used with `useMachine` and `useSyncedMachine`.
- `createSharedMachine`:
  Similar to `createMachine`, but can only be used with `useSharedMachine`.

## Installation

To install the latest stable version:

```sh
npm install use-machine-ts
```

## Sample Usage

```typescript
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

## Contents

- [API](#api)
  - [useMachine](#usemachine)
    - [state](#state)
    - [send](#send)
    - [State Machine Definition](#state-machine-definition)
    - [Defining States](#defining-states)
    - [Using Guards](#using-guards)
    - [Using Effects](#using-effects)
    - [Extended State](#extended-state)
    - [Schema](#Schema)
    - [Logging](#logging)
  - [useSharedMachine](#usesharedmachine)
  - [useSyncedMachine](#usesyncedmachine)
- [Async Orchestration](#async-orchestration)
  - [useMachine](#usemachine-1)
  - [useSharedMachine](#usesharedmachine-1)
  - [useSyncedMachine](#usesyncedmachine-1)

# API

[API Reference](https://tai-kun.github.io/use-machine-ts/)

## useMachine

[API Reference](https://tai-kun.github.io/use-machine-ts/functions/useMachine.html)

To create an ad-hoc state machine:

```typescript
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)
```

To use a pre-built state machine:

```typescript
import { useMachine, createMachine } from "use-machine-ts"

const machine = /* @__PURE__ */ createMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)

const [state, send] = useMachine(machine)
```

Or use the constructor:

```typescript
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

`state` consists of four properties: `value`, `event`, `nextEvents`, and `context`.

| Property     | Type     | Description |
| :--          | :--      | :-- |
| `value`      | `string` | The current state, such as `"inactive"` or `"active"`. |
| `event`      | `object` | The last event that was sent, causing the current state. For example, `{ type: "TOGGLE" }`. Initially, it is `{ type: "$init" }`. |
| `nextEvents` | `string[]` | A list of events that can be sent in the current state, such as `["TOGGLE"]`. |
| `context`    | `any`    | The extended state of the state machine. See [Extended State](#extended-state). |

### send

The `send` function is used to send events to the state machine. It takes a single argument, which can be a string representing the event type (e.g., `"TOGGLE"`) or an object (e.g., `{ type: "TOGGLE" }`).

If the current state accepts the event and a transition is possible (see [Guards](#using-guards)), the state machine's state will be updated, and any associated effects will be executed (see [Effects](#using-effects)).

You can send additional data using the object format for events (e.g., `{ type: "TOGGLE", value: 10 }`). For information on defining event types, see [Schema](#schema).

### State Machine Definition

| Property   | Type     | Required | Description |
| :--        | :--      | :--      | :-- |
| `initial`  | `string` | ✅       | Defines the initial state of the state machine. |
| `states`   | `object` | ✅       | Defines the finite states the state machine can be in. (See: [Defining States](#defining-states)) |
| `on`       | `object` |          | Defines transitions for events not accepted in the current state. (See: [Defining States](#defining-states)) |
| `context`  | `any`    |          | Defines the extended state of the state machine. (See: [Extended State](#extended-state)) |
| `$schema`  | `object` |          | Defines the schema of the state machine by type. (See: [Schema](#schema)) |

### State Machine Configuration

| Property  | Type                  | Description |
| :--       | :--                   | :-- |
| `guards`  | `object`              | Defines guard functions for the state machine. (See: [Using Guards](#using-guards)) |
| `effects` | `object`              | Defines effect functions for the state machine. (See: [Using Effects](#using-effects)) |
| `verbose` | `boolean` `0` `1` `2` | Enables debug logging. (See: [Logging](#logging)) |
| `console` | `object`              | Defines a custom console for logging output. (See: [Logging](#logging)) |

### Defining States

A state machine can only be in one of a finite number of states at any given time. Additionally, states can only change in response to events.

States are defined as keys in the `states` object, and event types are defined as keys in the `on` object within each state.

```typescript
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

In event definitions, you can use objects with a `target` property to control state transitions in more detail (such as adding guards).

```typescript
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

Guards are functions that execute before a state transition occurs. If a guard returns `true`, the state transition is allowed. If a guard returns `false`, the state transition is denied.

```typescript
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

```typescript
import { and, not, or, useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: and(or("isReady", "isStopped"), not("isDestroyed")),
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

The `and` function can be replaced with a simple array.

```typescript
and(or("isReady", "isStopped"), not("isDestroyed"))
// equals
[or("isReady", "isStopped"), not("isDestroyed")]
```

If a guard ultimately returns `false`, the following log will be output:

```console
Transition from 'inactive' to 'active' denied by guard.
((isReady || isStopped) && !isDestroyed)
                           ^^^^^^^^^^^^ 
Event { type: "TOGGLE" }
Context undefined
```

The `^` indicates the guard that caused the state transition to be denied. In the example above, `isDestroyed` returning `true` caused the state transition to be denied.

> [!IMPORTANT]  
> `and` without any guards always returns `true`.
> `or` without any guards always returns `false`.

### Using Effects

Effects are functions that execute when the state machine enters a specific state. If the effect returns a function, that function is executed when leaving that state. This behavior is similar to the `useEffect` hook in React.

```typescript
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

The `effect` property can accept an array instead of a string.

```typescript
{
   effect: [
     "onActive",
     "onTransition",
   ],
}
```

Effect functions receive an object (`entryParams`) with the following four properties as a parameter:

| Property   | Type     | Description |
| :--        | :--      | :-- |
| `event`    | `object` | The event that triggered the transition to the current state. The event is always in object format (e.g., `{ type: "TOGGLE" }`). |
| `context`  | `any`    | The extended state of the state machine. |
| `send`     | `function` | A function to send events to the state machine. |
| `setContext` | `function` | A function to update the extended state of the state machine. It returns an object with the `send` property, allowing you to update the `context` and transition states in one line. |
| `isMounted` | `function` | A function to check if the component is mounted. |

The function returned by the effect function receives an object (`exitParams`) with the following four properties as a parameter:

| Property   | Type     | Description |
| :--        | :--      | :-- |
| `event`    | `object` | The event that triggered the transition from the current state. The event is always in object format (e.g., `{ type: "TOGGLE" }`). |
| `context`  | `any`    | The extended state of the state machine. |
| `send`     | `function` | A function to send events to the state machine. |
| `setContext` | `function` | A function to update the extended state of the state machine. It returns an object with the `send` property, allowing you to update the `context` and transition states in one line. |
| `isMounted` | `function` | A function to check if the component is mounted. |

In the following example, the `retryCount` is updated every time the state changes to `failure`, and if the limit is reached, it transitions to an error state.

```typescript
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
> The state machine's definition and configuration cannot be changed midway. Functions defined in `effects` and `guards` will continue to reference the values they had when initially defined. Therefore, caution is needed when directly observing state changes.

Here is an example of how to use the React `useEffect` hook to update the component's state when the state machine's state changes. This works correctly.

```typescript
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

You might find the above example redundant and be tempted to write code like this. However, this could lead to bugs.

```typescript
function Component(props: { onToggle: (isActive: boolean) => void }) {
  const { onToggle } = props
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
          // If props.onToggle is changed, the change will not be reflected.
          // Always refers to the first defined value, which can lead to serious bugs.
          onToggle()
        },
      },
    },
  )
}
```

Using `useRef` to always reference the latest function can avoid this issue.

```typescript
function Component(props: { onToggle: (isActive: boolean) => void }) {
  const onToggle = React.useRef(props.onToggle)
  onToggle.current = props.onToggle
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
          onToggle.current(true)
        },
      },
    },
  )
}
```

However, the potential for human error still exists. Practically, it is recommended to use the constructor to transfer values dependent on React components.

```typescript
import { createMachine } from "use-machine-ts"

function machine(
  props: () => {
    initial: "inactive" | "active"
    onToggle: ((isActive: boolean) => void) | undefined
  }
) {
  return createMachine(
    {
      initial: props().initial,
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
          const { onToggle } = props()
          onToggle?.(true)
        },
        onInactive: ({ context }) => {
          const { onToggle } = props()
          onToggle?.(false)
        },
      },
    },
  )
}

function ToggleButton(props: { onToggle?: (isActive: boolean) => void }) {
  const [state, send] = useMachine(machine, {
    initial: "inactive",
    onToggle: props.onToggle,
  })
}
```

A pre-defined machine in function form can accept a single argument. This argument must be a function. This function is a thin wrapper around `useRef` and always returns the latest value.

### Extended State

In addition to a finite number of states, a state machine can have extended states (known as context). The `context` property is used to define the initial extended state, and the `setContext` function is used to update the extended state.

```typescript
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

TypeScript automatically infers the types of context and events, but you can also explicitly define the state machine schema using the `$schema` property. This object is not used by the runtime.

The `$schema` property has three properties: `context`, `events`, and `strict`.

| Property  | Type | Required | Description |
| :--       | :--  | :--      | :--         |
| `context` | `any`     | Defines the type of the state machine's extended state. |
| `events`  | `object`  | Defines the type of the state machine's events. |
| `strict`  | `boolean` | Enables strict mode for the schema. When set to `true`, automatic inference is disabled, and any context and events not defined in the schema will cause a type error. |

```typescript
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

You can enable logging for your state machine if needed. Use the `verbose` property to set the logging level.

| Value | Description |
| :--   | :--         |
| `0` or `false` | Disables logging. |
| `1`            | Logs onlyerrors. (Default) |
| `2` or `true`  | Logs errors and debug information. |

```typescript
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
> Logging is disabled if `process.env.NODE_ENV` is `"production"`.

## useSharedMachine

[API Reference](https://tai-kun.github.io/use-machine-ts/functions/useSharedMachine.html)

To use `useSharedMachine`, you must use a state machine created with `createSharedMachine`.

```typescript
import { useSharedMachine, createSharedMachine } from "use-machine-ts"

const sharedMachine = createSharedMachine(
   /* State Machine Definition */,
   /* State Machine Configuration (Optional) */,
)

const [state, send] = useSharedMachine(sharedMachine)
```

`useSharedMachine` works similarly to `useMachine`, but it allows you to manage state transitions from outside. It is essentially a wrapper around `useSyncExternalState` and `useEffect`. It can be likened to the relationship between `atom` and `useAtom`.

```typescript
const machineAtom = atom() /* Initial State */
const [state, setState] = useAtom(machineAtom)

const send = event => {
  const nextState = eventToNextState(event, state)
  setState(nextState)
}
```

A shared state machine is an object with six properties: `instance`, `dispatch`, `send`, `setContext`, `getState`, and `subscribe`.

| Properties | Type | Description |
| :--        | :--  | :--         |
| `instance`   | `[Definition, Configuration?]` | The state machine instance. |
| `dispatch`   | `function` | A function to send events to the state machine. It is the primitive function used by send and setContext. |
| `send`       | `function` | A function to send events to the state machine. |
| `setContext` | `function` | A function to update the state machine's extended state. |
| `getState`   | `function` | A function to get the current state of the state machine. |
| `subscribe`  | `function` | A function to watch for state changes in the state machine. |

## useSyncedMachine

[API Reference](https://tai-kun.github.io/use-machine-ts/functions/useSyncedMachine.html)

Unlike `useMachine`, it does not trigger re-rendering every time the state transitions. This hook provides a function that returns a snapshot of the state, not the current state.

```typescript
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

# Async Orchestration

> [!WARNING]
> Whenever possible, avoid updating state asynchronously in use-machine-ts.

When updating state asynchronously, several considerations arise depending on the specific hook used: `useMachine`, `useSharedMachine`, or `useSyncedMachine`.

## useMachine

Within `useMachine`, you can call the `send` and `setContext` functions asynchronously as long as the component remains mounted. However, if the component has already been unmounted, these functions will instead display an error message indicating that the state cannot be updated:

```console
Cannot dispatch an action to the state machine after the component is unmounted.
Action { type: "SEND", payload: { type: "TOGGLE" } }
```

For `setContext`, the `type` property value will be `"SET_CONTEXT"`.

To check if the component is unmounted beforehand, you can utilize the `isMounted` property within the parameter passed to the `effect` function. The `isMounted` function returns `true` if the component is mounted, and `false` otherwise.

```typescript
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
    effects: {
      onActive: ({ send, isMounted }) => {
        setTimeout(() => {
          if (isMounted()) {
            send("TOGGLE")
          }
        }, 1000)
      },
    },
  },
)
```

## useSharedMachine

In `useSharedMachine`, you can call `send`, `setContext`, or the shared machine's `dispatch` asynchronously regardless of the component's mount state. No error or warning messages will be displayed. To check if the component is unmounted beforehand, you can use the `isMounted` function similarly to `useMachine`.

## useSyncedMachine

Within `useSyncedMachine`, you cannot call the `send` and `setContext` functions asynchronously regardless of the component's mount state. These functions are unlocked at the beginning of an effect and locked after its completion. Calling these functions while locked will result in an error message:

```console
Send function not available. Must be used synchronously within an effect.
State { value: "inactive", event: { type: "$init" }, nextEvents: ["TOGGLE"], context: undefined }
Event: { type: "TOGGLE" }
```

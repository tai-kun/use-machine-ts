import { log } from "./core/devutils"
import {
  type Action,
  applyDispatch,
  createInitialState,
  useInstance,
  useIsMounted,
  useSingleton,
  useSyncState,
} from "./core/logic"
import { useState } from "./core/react"
import type { Config, Definition, Machine, Send, State } from "./types"

/**
 * Uses a state machine with the constructor.
 *
 * Each time the state machine transitions to a new state,
 * `React.setState` is called internally, triggering a re-render of the component.
 *
 * The state machine constructor is executed only once per hook.
 * It is idempotent unless it depends on external mutable values within the constructor.
 *
 * @template D - The type of state machine definition.
 * @param machine - The state machine constructor.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useMachine, createMachine } from "use-machine-ts"
 *
 * function machine() {
 *   return createMachine({
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *           effect: "onInactive",
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *           effect: "onActive",
 *         },
 *       },
 *     },
 *     // configuration
 *     {
 *       effects: {
 *         onActive: () => {
 *           console.log("Just activated!")
 *         },
 *         onInactive: () => {
 *           console.log("Just deactivated!")
 *         },
 *       },
 *     },
 *   })
 * }
 *
 * function ToggleButton(props: {}) {
 *   const [state, send] = useMachine(machine)
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Now: {state.value}
 *     </button>
 *   )
 * }
 * ```
 */
function useMachine<D>(
  machine: () => Machine<D>,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Uses a state machine with the constructor and props.
 *
 * Each time the state machine transitions to a new state,
 * `React.setState` is called internally, triggering a re-render of the component.
 *
 * The state machine constructor is executed only once per hook.
 * It is idempotent unless it depends on external mutable values within the constructor.
 *
 * The `props` passed to the state machine constructor are different from the `props` of a React component; they are represented as a function.
 * When this function is executed, it returns a reference to the `props` passed to the hook.
 * This mechanism is implemented using `React.useRef`, ensuring that it always returns a reference to the latest `props`.
 *
 * @template D - The type of state machine definition.
 * @template P - The type of props for the state machine constructor.
 * @param machine - The state machine constructor.
 * @param props - The props for the state machine constructor.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useMachine, createMachine } from "use-machine-ts"
 *
 * function machine(props: () => { onToggle }) {
 *   return createMachine({
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *           effect: "onInactive",
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *           effect: "onActive",
 *         },
 *       },
 *     },
 *     // configuration
 *     {
 *       effects: {
 *         onActive: () => {
 *           const { onToggle } = props()
 *           onToggle("active")
 *         },
 *         onInactive: () => {
 *           const { onToggle } = props()
 *           onToggle("inactive")
 *         },
 *       },
 *     },
 *   })
 * }
 *
 * function ToggleButton(props: { onToggle: (value: "active" | "inactive") => void }) {
 *   const [state, send] = useMachine(machine, props)
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Now: {state.value}
 *     </button>
 *   )
 * }
 * ```
 */
function useMachine<D, P>(
  machine: (props: () => P) => Machine<D>,
  props: P,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Uses a state machine with the pre-created instance.
 *
 * Each time the state machine transitions to a new state,
 * `React.setState` is called internally, triggering a re-render of the component.
 *
 * We can use a pre-created state machine instance with the hook.
 * It is idempotent unless it depends on external mutable values within the `effect`.
 * In most cases, it is better to define the state machine using the constructor instead.
 *
 * To enable tree shaking, you can indicate to the bundler that this function has no side effects
 * by using the `@__PURE__` or `#__PURE__` annotation as needed.
 *
 * @template D - The type of state machine definition.
 * @param machine - The state machine instance.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useMachine, createMachine } from "use-machine-ts"
 *
 * const machine = createMachine({
 *   // definition
 *   {
 *     initial: "inactive",
 *     states: {
 *       inactive: {
 *         on: { TOGGLE: "active" },
 *         effect: "onInactive",
 *       },
 *       active: {
 *         on: { TOGGLE: "inactive" },
 *         effect: "onActive",
 *       },
 *     },
 *   },
 *   // configuration
 *   {
 *     effects: {
 *       onActive: () => {
 *         console.log("Just activated!")
 *       },
 *       onInactive: () => {
 *         console.log("Just deactivated!")
 *       },
 *     },
 *   },
 * })
 *
 * function ToggleButton(props: {}) {
 *   const [state, send] = useMachine(machine)
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Now: {state.value}
 *     </button>
 *   )
 * }
 * ```
 */
function useMachine<D>(
  machine: Machine<D>,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Define a state machine and uses it.
 *
 * Each time the state machine transitions to a new state,
 * `React.setState` is called internally, triggering a re-render of the component.
 *
 * This approach is useful when you want to quickly define and use a simple state machine on the spot.
 * For complex definitions, it is usually better to write them in a separate file and import it.
 * However, if the definition does not impair readability, keeping it within the component can actually make it more readable.
 *
 * @template D - The type of state machine definition.
 * @param definition - The state machine definition.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useMachine } from "use-machine-ts"
 *
 * function ToggleButton(props: {}) {
 *   const [state, send] = useMachine(
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *         },
 *       },
 *     },
 *   )
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Now: {state.value}
 *     </button>
 *   )
 * }
 * ```
 */
function useMachine<D extends Definition.Shape<D, never, never>>(
  definition: Definition.Exact<D>,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Define a state machine and uses it.
 *
 * Each time the state machine transitions to a new state,
 * `React.setState` is called internally, triggering a re-render of the component.
 *
 * This approach is useful when you want to quickly define and use a simple state machine on the spot.
 * For complex definitions, it is usually better to write them in a separate file and import it.
 * However, if the definition does not impair readability, keeping it within the component can actually make it more readable.
 *
 * @template D - The type of state machine definition.
 * @template G - The type of guards for state machine functions.
 * @template E - The type of effects for state machine functions.
 * @param definition - The state machine definition.
 * @param config - The state machine configuration.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useMachine } from "use-machine-ts"
 *
 * function ToggleButton(props: {}) {
 *   const [state, send] = useMachine(
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *           effect: "onInactive",
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *           effect: "onActive",
 *         },
 *       },
 *     },
 *     // configuration
 *     {
 *       effects: {
 *         onActive: () => {
 *           console.log("Just activated!")
 *         },
 *         onInactive: () => {
 *           console.log("Just deactivated!")
 *         },
 *       },
 *     },
 *   )
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Now: {state.value}
 *     </button>
 *   )
 * }
 * ```
 */
function useMachine<
  D extends Definition.Shape<D, G, E>,
  const G extends string,
  const E extends string,
>(
  definition: Definition.Exact<D>,
  config: Config.Exact<D, G, E>,
): [
  state: State<D>,
  send: Send<D>,
]

function useMachine(arg0: any, arg1?: any): [any, any] {
  const isMounted = useIsMounted()

  const [def, conf = {}] = useInstance(arg0, arg1)
  const [state, setState] = useState(() => createInitialState(def))
  const { send, dispatch } = useSingleton(() => {
    function dispatch(action: Action) {
      if (isMounted.current) {
        setState(currState => applyDispatch(def, conf, currState, action))
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "Cannot dispatch an action to the state machine "
            + "after the component is unmounted.",
          ["Action", action],
        )
      }
    }

    return {
      send(payload: Config.Sendable.Signature) {
        dispatch({
          type: "SEND",
          payload,
        })
      },
      dispatch,
    }
  })

  useSyncState(def, conf, state, dispatch, isMounted)

  return [state, send]
}

export { useMachine }
export { and, guards, not, or } from "./core/guard"
export { createMachine } from "./createMachine"
export type * from "./types"

import { log } from "./core/devutils"
import {
  useInstance,
  useIsMounted,
  useSingleton,
  useSyncState,
} from "./core/hooks"
import { type Action, applyDispatch, createInitialState } from "./core/logic"
import { useState } from "./core/react"
import type { Config, Definition, Machine, Send, State } from "./types"

/**
 * Use a state machine using a pre-created machine.
 *
 * @template D - The type of state machine definition.
 * @param machine - The state machine factory.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useMachine<D>(
  machine: () => Machine<D>,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Use a state machine using a pre-created machine.
 *
 * @template D - The type of state machine definition.
 * @template A - The type of arguments for the state machine factory.
 * @param machine - The state machine factory.
 * @param args - The arguments for the state machine factory.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useMachine<D, A extends readonly any[]>(
  machine: (...args: A) => Machine<D>,
  args: A,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Create a state machine and use it.
 *
 * @template D - The type of state machine definition.
 * @param definition - The state machine definition.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useMachine<D extends Definition.Shape<D, never, never>>(
  definition: Definition.Exact<D>,
): [
  state: State<D>,
  send: Send<D>,
]

/**
 * Create a state machine and use it.
 *
 * @template D - The type of state machine definition.
 * @template G - The type of guards for state machine functions.
 * @template E - The type of effects for state machine functions.
 * @param definition - The state machine definition.
 * @param config - The state machine configuration.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
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

/**
 * Use a state machine using a pre-created machine.
 *
 * @template D - The type of state machine definition.
 * @param machine - The state machine.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useMachine<D>(
  machine: Machine<D>,
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
          "Cannot dispatch an action to the state machine after it is unmounted.",
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
export { isTransfer, type Transfer, transfer } from "./core/hooks"
export { and, not, or } from "./core/logic"
export { createMachine } from "./createMachine"
export type * from "./types"

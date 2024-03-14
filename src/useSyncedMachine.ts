import { log } from "./core/devutils"
import { useInstance, useIsMounted, useSingleton } from "./core/hooks"
import {
  type Action,
  applyDispatch,
  applyEffect,
  createInitialState,
} from "./core/logic"
import { useEffect, useRef } from "./core/react"
import type { Config, Definition, Machine, Send, State } from "./types"

/**
 * Create a state machine and use it.
 *
 * @template D - The type of state machine definition.
 * @param definition - The state machine definition.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSyncedMachine<D extends Definition.Shape<D, never, never>>(
  definition: Definition.Exact<D>,
): [
  getState: () => State<D>,
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
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSyncedMachine<
  D extends Definition.Shape<D, G, E>,
  const G extends string,
  const E extends string,
>(
  definition: Definition.Exact<D>,
  config: Config.Exact<D, G, E>,
): [
  getState: () => State<D>,
  send: Send<D>,
]

/**
 * Use a state machine using a pre-created machine.
 *
 * @template D - The type of state machine definition.
 * @param machine - The state machine.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSyncedMachine<D>(
  machine: Machine<D>,
): [
  getState: () => State<D>,
  send: Send<D>,
]

/**
 * Use a state machine using a pre-created machine.
 *
 * @template D - The type of state machine definition.
 * @param machine - The state machine factory.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSyncedMachine<D>(
  machine: () => Machine<D>,
): [
  getState: () => State<D>,
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
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSyncedMachine<D, A extends readonly any[]>(
  machine: (...args: A) => Machine<D>,
  args: A,
): [
  getState: () => State<D>,
  send: Send<D>,
]

function useSyncedMachine(arg0: any, arg1?: any): [any, any] {
  const isMounted = useIsMounted()

  const exitFnRef = useRef<void | (() => void)>()
  const [def, conf = {}] = useInstance(arg0, arg1)
  const [reqSync, api] = useSingleton(() => {
    const queue: ((prevState: State.Signature) => State.Signature)[] = []
    let machineState = createInitialState(def)
    let previousDeps: readonly unknown[] | undefined

    /**
     * Runs a callback when the dependencies change.
     *
     * @param callback The callback to run when the dependencies change.
     * @param nextDeps The new dependencies to compare with the current dependencies.
     */
    function sideEffect(
      callback: () => void | (() => void),
      deps: readonly unknown[],
    ): void {
      if (previousDeps?.every((dep, i) => Object.is(dep, deps[i])) !== true) {
        exitFnRef.current?.()
        exitFnRef.current = callback()
        previousDeps = deps
      }
    }

    /**
     * Requests a synchronization of the state machine.
     */
    function flushSync(): void {
      const state = machineState // bind to the current state

      sideEffect(
        () => {
          const cleanup = applyEffect(
            def,
            conf,
            state,
            dispatch,
            isMounted,
            true,
          )

          return typeof cleanup !== "function" ? undefined : () => {
            const { event, context } = machineState // stateRef.current!
            cleanup({ event, context })
          }
        },
        [state.value, state.event],
      )
    }

    /**
     * Processes the queue of actions and synchronizes the state machine.
     *
     * @param render A function that renders the state machine.
     */
    function act(render: () => void): void {
      render()

      while (queue.length) {
        while (queue.length) {
          const action = queue.shift()!
          machineState = action(machineState)
        }

        flushSync()
      }
    }

    /**
     * Dispatches an action to the state machine.
     * No action is taken immediately.
     * The action is enqueued and will be processed later in the `act` function.
     *
     * @param action The action to dispatch to the state machine.
     */
    function dispatch(action: Action): void {
      if (isMounted.current) {
        // `queue.push` means `React.useState`
        queue.push(prevState => applyDispatch(def, conf, prevState, action))
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "Cannot dispatch an action to the state machine after it is unmounted.",
          ["Action", action],
        )
      }
    }

    return [
      () => act(flushSync),
      [
        () => machineState,
        function send(payload: Config.Sendable.Signature) {
          act(() => {
            dispatch({
              type: "SEND",
              payload,
            })
          })
        },
      ] satisfies [any, any],
    ]
  })

  useEffect(
    () => {
      reqSync()

      return () => {
        exitFnRef.current?.()
      }
    },
    [],
  )

  return api
}

export { useSyncedMachine }
export { isTransfer, type Transfer, transfer } from "./core/hooks"
export { and, not, or } from "./core/logic"
export { createMachine } from "./createMachine"
export type * from "./types"

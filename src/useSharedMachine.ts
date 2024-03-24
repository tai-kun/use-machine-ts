import { useIsMounted, useSyncState } from "./core/logic"
import { useSyncExternalStore } from "./core/react"
import type { Send, SharedMachine, State } from "./types"

/**
 * Use a shared state machine.
 *
 * @template D - The type of state machine definition.
 * @param machine - The shared state machine.
 * @param getServerState - A function that returns the state on the server.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSharedMachine<D>(
  machine: SharedMachine<D>,
  getServerState?: () => State<D>,
): [
  state: State<D>,
  send: Send<D>,
] {
  const isMounted = useIsMounted()

  const {
    instance: [def, conf = {}],
    dispatch,
    getState,
    subscribe,
  } = machine as unknown as SharedMachine.Signature
  const state = useSyncExternalStore(
    subscribe,
    getState,
    (getServerState as () => State.Signature) || getState,
  ) as State.Signature

  useSyncState(def, conf, state, dispatch, isMounted)

  return [state as any, machine.send]
}

export { useSharedMachine }
export { and, not, or } from "./core/logic"
export { createSharedMachine } from "./createSharedMachine"
export type * from "./types"

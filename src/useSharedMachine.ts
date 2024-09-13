import { useIsMounted, useSyncState } from "./core/logic"
import { useSyncExternalStore } from "./core/react"
import type { Send, SharedMachine, State } from "./types"

/**
 * Uses a shared state machine.
 *
 * This hook allows a state machine to be shared between hooks or between hooks and external asynchronous events.
 * You need to create a state machine specifically for this hook using `createSharedMachine`.
 * The shared state machine returned by `createSharedMachine` includes functions such as `.send()` to trigger state transitions and `.getState()` to return a snapshot of the current state.
 * These mechanisms are implemented using `React.useSyncExternalStore`.
 *
 * @template D - The type of state machine definition.
 * @param machine - The shared state machine.
 * @param getServerState - A function that returns the state on the server.
 * @returns An array with two elements:
 * - The first element is the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useSharedMachine, createSharedMachine } from "use-machine-ts"
 *
 * const network = createSharedMachine({
 *   // definition
 *   {
 *     initial: "inactive",
 *     states: {
 *       inactive: {
 *         on: { ONLINE: "active" },
 *       },
 *       active: {
 *         on: { OFFLINE: "inactive" },
 *       },
 *     },
 *   },
 * })
 *
 * window.addEventListener("online", () => network.send("ONLINE"))
 * window.addEventListener("offline", () => network.send("OFFLINE"))
 *
 * function NetworkStatus() {
 *   const [state] = useSharedMachine(network)
 *
 *   return (
 *     <p>
 *       Network status: {state.value}
 *     </p>
 *   )
 * }
 * ```
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
export { and, guards, not, or } from "./core/guard"
export { createSharedMachine } from "./createSharedMachine"
export type * from "./types"

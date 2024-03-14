import { useIsMounted, useSyncState } from "./core/hooks"
import { useSyncExternalStore } from "./core/react"
import type { Send, SharedMachine, State } from "./types"

function useSharedMachine<D>(machine: SharedMachine<D>): [
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
    getState,
  ) as State.Signature

  useSyncState(def, conf, state, dispatch, isMounted)

  return [state as any, machine.send]
}

export { useSharedMachine }
export { and, not, or } from "./core/logic"
export { createSharedMachine } from "./createSharedMachine"
export type * from "./types"

import { applyDispatch, createInitialState } from "./core/logic"
import { createMachine } from "./createMachine"
import type {
  Action,
  Config,
  Definition,
  Machine,
  SharedMachine,
  State,
} from "./types"

/**
 * Create a shared state machine.
 *
 * @template D - The type of shared state machine definition.
 * @param definition - The shared state machine definition.
 * @returns The shared state machine.
 */
function createSharedMachine<D extends Definition.Shape<D, never, never>>(
  definition: Definition.Exact<D>,
): SharedMachine<D>

/**
 * Create a shared state machine.
 *
 * This function is used in conjunction with `useSharedMachine`.
 * It cannot be used with `useMachine` or `useSyncedMachine`.
 * In those cases, use `createMachine` instead.
 *
 * @template D - The type of shared state machine definition.
 * @template G - The type of guards for shared state machine functions.
 * @template E - The type of effects for shared state machine functions.
 * @param definition - The shared state machine definition.
 * @param config - The shared state machine configuration.
 * @returns The shared state machine.
 */
function createSharedMachine<
  D extends Definition.Shape<D, G, E>,
  const G extends string = never,
  const E extends string = never,
>(
  definition: Definition.Exact<D>,
  config: Config.Exact<D, G, E>,
): SharedMachine<D>

function createSharedMachine(...args: [any, any?]) {
  const instance = createMachine(...args) as unknown as Machine.Signature
  const [def, conf = {}] = instance
  let state = createInitialState(def)
  const callbacks = new Set<(state: State.Signature) => void>()

  function dispatch(action: Action.Signature) {
    const nextState = applyDispatch(def, conf, state, action)

    if (!Object.is(state, nextState)) {
      state = nextState

      for (const callback of callbacks) {
        callback(state)
      }
    }
  }

  function send(event: Config.Sendable.Signature) {
    dispatch({
      type: "SEND",
      payload: event,
    })
  }

  const machine: SharedMachine.Signature = {
    send,
    instance,
    dispatch,
    getState() {
      return state
    },
    subscribe(callback: (state: State.Signature) => void) {
      callbacks.add(callback)

      return () => {
        callbacks.delete(callback)
      }
    },
    setContext(action: Config.SetContextAction.Signature) {
      dispatch({
        type: "SET_CONTEXT",
        payload: action,
      })

      return { send }
    },
  }

  return machine as any
}

export { createSharedMachine }
export { and, not, or } from "./core/guard"
export type * from "./types"

if (cfgTest && cfgTest.url === import.meta.url) {
  const { expectType } = await import("tsd")
  const { assert, describe, sinon, test } = cfgTest
  const { stub } = sinon

  describe("src/createSharedMachine", () => {
    test("strict: false", () => {
      const machine = createSharedMachine(
        {
          initial: "inactive",
          states: {
            inactive: {
              on: {
                TOGGLE: {
                  target: "active",
                  guard: "isOk",
                },
              },
              effect: "onInactive",
            },
            active: {
              on: {
                TOGGLE: "inactive",
                PING: "active",
              },
              effect: "onActive",
            },
          },
        },
        {
          guards: {
            isOk: params => {
              expectType<"TOGGLE">(params.event.type)

              return true
            },
          },
          effects: {
            onInactive: params => {
              expectType<"TOGGLE" | "$init">(params.event.type)

              return params => {
                expectType<"TOGGLE">(params.event.type)
              }
            },
            onActive: params => {
              expectType<"TOGGLE" | "PING">(params.event.type)

              return params => {
                expectType<"TOGGLE" | "PING">(params.event.type)
              }
            },
          },
        },
      )

      assert.deepEqual(Object.keys(machine), [
        "send",
        "instance",
        "dispatch",
        "getState",
        "subscribe",
        "setContext",
      ])
    })

    test("strict: true", () => {
      const machine = createSharedMachine(
        {
          $schema: {} as {
            strict: true
            events: {
              TOGGLE: {}
              PING: {
                timestamp: number
              }
            }
          },
          initial: "inactive",
          states: {
            inactive: {
              on: {
                TOGGLE: {
                  target: "active",
                  guard: "isOk",
                },
              },
              effect: "onInactive",
            },
            active: {
              on: {
                TOGGLE: "inactive",
                PING: "active",
              },
              effect: "onActive",
            },
          },
        },
        {
          guards: {
            isOk: params => {
              expectType<"TOGGLE">(params.event.type)

              return true
            },
          },
          effects: {
            onInactive: params => {
              expectType<"TOGGLE" | "$init">(params.event.type)

              return params => {
                expectType<"TOGGLE">(params.event.type)
              }
            },
            onActive: params => {
              expectType<"TOGGLE" | "PING">(params.event.type)

              if (params.event.type === "PING") {
                expectType<number>(params.event.timestamp)
              }

              return params => {
                expectType<"TOGGLE" | "PING">(params.event.type)
              }
            },
          },
        },
      )

      assert.deepEqual(Object.keys(machine), [
        "send",
        "instance",
        "dispatch",
        "getState",
        "subscribe",
        "setContext",
      ])
    })

    test("it should call the subscribe callback when the state changes", () => {
      const machine = createSharedMachine({
        initial: "a",
        states: {
          a: { on: { NEXT: "b" } },
          b: { on: { NEXT: "a" } },
        },
      })

      const callback = stub()
      const unsubscribe = machine.subscribe(callback)

      machine.send("NEXT")

      assert.equal(callback.callCount, 1)
      assert.deepEqual(
        callback.getCalls().map(call => call.args),
        [
          [
            {
              event: { type: "NEXT" },
              value: "b",
              context: undefined,
              nextEvents: ["NEXT"],
            },
          ],
        ],
      )

      callback.reset()
      unsubscribe()

      machine.send("NEXT")

      assert.equal(callback.callCount, 0)
    })
  })
}

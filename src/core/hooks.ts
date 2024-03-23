import type { Config, Definition, Machine, State } from "../types"
import {
  assertNever,
  isPlainObject,
  log,
  type LogOptions,
  useDetectChanges,
} from "./devutils"
import { type Action, applyEffect } from "./logic"
import { useEffect, useLayoutEffect, useMemo, useRef } from "./react"

const useIsomorphicLayoutEffect = typeof document === "undefined"
  ? useEffect
  : useLayoutEffect

/**
 * A reference to an object.
 *
 * @template T - The type of the object.
 */
type SyncedRefObject<T = unknown> = {
  /**
   * The current value of the reference.
   */
  readonly current: T
}

/**
 * Like `useRef`, but the `current` value is always in sync with the value passed to the hook.
 *
 * @template T - The type of the object.
 * @param value - The value of the reference.
 * @returns - A reference to the value.
 */
function useSyncedRef<T>(value: T): SyncedRefObject<T> {
  const ref = useRef(value)

  ref.current = value

  return ref
}

/**
 * This React hook is used to memoize a value that is expensive to compute.
 * Similar to `useMemo`, but also does not have a dependency list and is computed only once, the first time.
 *
 * @template T - The type of the memoized value.
 * @param compute - A function that computes the memoized value.
 * @returns The memoized value.
 */
export function useSingleton<T>(compute: () => T): T {
  return useMemo(compute, [])
}

/**
 * A hook that returns whether the component is mounted.
 *
 * @returns A reference to a boolean that is `true` if the component is mounted, otherwise `false`.
 */
export function useIsMounted(): { readonly current: boolean } {
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
  }, [])

  useIsomorphicLayoutEffect(() => () => {
    // Destructor for useInsertionEffect runs before useEffect.
    // Prevent state machine events to unmounted components.
    isMounted.current = false
  }, [])

  return isMounted
}

/**
 * A hook to use a state machine definition and configuration.
 *
 * @param arg0 - The state machine definition or factory.
 * @param arg1 - The state machine configuration or arguments for the factory.
 * @returns An array with two elements:
 * - The first element is the state machine definition.
 * - The second element is the state machine configuration.
 */
export function useInstance(
  arg0:
    | Definition.Signature
    | Machine.Signature
    | ((props?: () => any) => Machine.Signature),
  arg1: Config.Signature | {/* props */} | undefined,
): Machine.Signature {
  if (__DEV__) {
    useDetectChanges(
      arg0,
      (curr, next) => {
        log(
          { ...logOptions, level: "error" },
          "Cannot change the definition or machine after the machine is used.",
          ["Current", curr],
          ["Next", next],
        )
      },
      {
        equalityFn(curr, next) {
          switch (true) {
            case isPlainObject(curr):
              return isPlainObject(next)

            case Array.isArray(curr):
              return Array.isArray(next) && curr.length === next.length

            case typeof curr === "function":
              return typeof next === "function"

            default:
              assertNever(curr)
          }
        },
      },
    )
  }

  let logOptions: LogOptions | undefined
  const propsRef = useRef<{}>()

  if (typeof arg0 === "function") {
    propsRef.current = arg1
  } else if (!Array.isArray(arg0)) {
    arg0 = arg1 ? [arg0, arg1] : [arg0]
  }

  const machine = useSingleton(() =>
    typeof arg0 === "function"
      ? arg0(() => propsRef.current)
      : arg0 as Machine.Signature // cast for tsd
  )

  if (__DEV__) {
    ;[, logOptions] = machine
  }

  return machine
}

/**
 * A hook to use a state machine state.
 *
 * @param def - The state machine definition.
 * @param conf - The state machine configuration.
 * @param state - The state machine state.
 * @param dispatch - The state machine dispatch function.
 * @param isMounted - A reference to a boolean that is `true` if the component is mounted, otherwise `false`.
 */
export function useSyncState(
  def: Definition.Signature,
  conf: Config.Signature,
  state: State.Signature,
  dispatch: (action: Action) => void,
  isMounted: { readonly current: boolean },
): void {
  const stateRef = useSyncedRef(state)

  useEffect(
    () => {
      const cleanup = applyEffect(def, conf, state, dispatch, isMounted)

      return typeof cleanup !== "function" ? undefined : () => {
        const { event, context } = stateRef.current
        cleanup({ event, context })
      }
    },
    [state.value, state.event],
  )
}

if (cfgTest && cfgTest.url === import.meta.url) {
  await import("global-jsdom/register")
  const { renderHook } = await import("@testing-library/react")
  const { createInitialState } = await import("./logic")
  const { assert, describe, mock, test } = cfgTest

  describe("src/core/hooks", () => {
    describe("useIsMounted", () => {
      test("should return a reference to a boolean that is true if the component is mounted, otherwise false", () => {
        const trace = {
          effect: {
            entry: undefined as boolean | undefined,
            exit: undefined as boolean | undefined,
          },
        }
        const { unmount } = renderHook(() => {
          const isMounted = useIsMounted()

          useEffect(() => {
            trace.effect.entry = isMounted.current

            return () => {
              trace.effect.exit = isMounted.current
            }
          })
        })

        assert.deepEqual(trace, {
          effect: {
            entry: true,
            exit: undefined,
          },
        })

        unmount()

        assert.deepEqual(trace, {
          effect: {
            entry: true,
            exit: false,
          },
        })
      })
    })

    describe("useInstance", () => {
      test("should return the state machine definition and configuration", () => {
        const def: any = {}
        const conf = { verbose: true }
        const { result } = renderHook(() => useInstance([def, conf], []))

        assert.deepEqual(result.current, [def, conf])
      })
    })

    describe("useSyncState", () => {
      test("should apply the effect", () => {
        const cleanup = mock.fn()
        const effect = mock.fn(() => cleanup)
        const def: Definition.Signature = {
          initial: "a",
          states: {
            a: {
              on: {
                NEXT: "b",
              },
              effect: "effect",
            },
            b: {},
          },
        }
        const conf: Config.Signature = {
          effects: {
            effect,
          },
        }
        const { rerender } = renderHook(({ state }) => {
          const isMounted = useIsMounted()
          useSyncState(def, conf, state, () => {}, isMounted)
        }, {
          initialProps: {
            state: createInitialState(def),
          },
        })

        assert.equal(effect.mock.callCount(), 1)
        assert.equal(cleanup.mock.callCount(), 0)

        const params: Config.EffectParams.Signature = effect.mock
          .calls.at(0)!.arguments.at(0)!

        assert.deepEqual(params.event, { type: "$init" })

        rerender({
          state: {
            value: "b",
            context: undefined,
            event: { type: "NEXT" },
            nextEvents: ["NEXT"],
          },
        })

        assert.equal(effect.mock.callCount(), 1)
        assert.equal(cleanup.mock.callCount(), 1)

        const cleanupParams: Config.EffectCleanupParams.Signature = cleanup.mock
          .calls.at(0)!.arguments.at(0)!

        assert.deepEqual(cleanupParams.event, { type: "NEXT" })
      })
    })
  })
}

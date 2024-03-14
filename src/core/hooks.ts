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

const $tf = Symbol("$tf")

/**
 * A value to transfer so that the state machine can reference the component's value.
 *
 * @template T - The type of the value to transfer.
 */
export type Transfer<T = unknown> = {
  /**
   * The current value of the reference.
   */
  readonly current: T
  /**
   * ! Do not remove this property.
   */
  readonly [$tf]: never
}

/**
 * Transfers a value to a state machine.
 *
 * @template T - The type of the value.
 * @param value - The value to transfer.
 * @returns The value with a transfer marker.
 */
export function transfer<T>(value: T): Transfer<T> {
  return Object.freeze({
    current: value,
    [$tf]: 0 as never,
  })
}

/**
 * Checks if a value is a transferable value.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a transferable value, otherwise `false`.
 */
export function isTransfer(value: unknown): value is Transfer {
  return typeof value === "object" && value !== null && $tf in value
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
    | ((...args: any) => Machine.Signature),
  arg1: Config.Signature | readonly any[] | undefined,
): readonly [Definition.Signature, Config.Signature?] {
  let logOptions: LogOptions | undefined

  if (arg1 && !Array.isArray(arg1)) {
    arg0 = [arg0 as Definition.Signature, arg1]
    arg1 = undefined
  }

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
    useDetectChanges(
      arg1 || [],
      (curr, next) => {
        if (curr.length !== next.length) {
          log(
            { ...logOptions, level: "error" },
            "Cannot change the arguments after the machine is used.",
            ["Current", curr],
            ["Next", next],
          )
        }

        curr.forEach((arg, i) => {
          if (isTransfer(arg) !== isTransfer(next[i])) {
            log(
              { ...logOptions, level: "error" },
              [
                "A state machine hook is changing ",
                `from a ${isTransfer(arg) ? "" : "non-"}transferable value `,
                `to a ${isTransfer(next[i]) ? "" : "non-"}transferable value `,
                `at index ${i} of the argument list.`,
                "Each transferable argument is transferred by useRef, ",
                "so their order and number cannot be changed.",
              ].join(""),
              ["Index of argument", i],
              ["Current", arg],
              ["Next", next[i]],
            )
          }
        })
      },
      {
        equalityFn(curr, next) {
          return curr.length === next.length
            && curr.every((arg, i) => isTransfer(arg) === isTransfer(next[i]))
        },
      },
    )
  }

  const params = arg1?.map(arg =>
    isTransfer(arg)
      ? useSyncedRef(arg.current)
      : arg
  )

  if (__DEV__) {
    const [def, ...other] = useSingleton(() =>
      typeof arg0 === "function"
        ? arg0(...params || [])
        : Array.isArray(arg0)
        ? arg0
        : [arg0]
    )
    const [conf = {}] = other
    logOptions = {
      ...("verbose" in conf ? { verbose: conf.verbose } : {}),
      ...("console" in conf ? { console: conf.console } : {}),
    }

    return [def, ...other]
  }

  return useSingleton(() =>
    typeof arg0 === "function"
      ? arg0(...params || [])
      : Array.isArray(arg0)
      ? arg0
      : [arg0]
  )
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

    describe("transfer, isTransfer", () => {
      test("should return a transferable value", () => {
        const value = { foo: "bar" }
        const transferred = transfer(value)

        assert.deepEqual(transferred, {
          current: value,
          [$tf]: 0,
        })
      })

      test("transferred object is Transfer", () => {
        const value = { foo: "bar" }
        const transferred = transfer(value)

        assert(isTransfer(transferred))
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

import type { Config, Definition, Machine, State } from "../types"
import type { Tagged } from "../types/utils"
import {
  assertNever,
  isPlainObject,
  log,
  type LogOptions,
  useDetectChanges,
} from "./devutils"
import { useEffect, useLayoutEffect, useMemo, useRef } from "./react"

/**
 * Creates a initial state machine state.
 *
 * @param def - The state machine definition.
 * @returns Initial state machine state.
 */
export function createInitialState(
  def: Definition.Signature,
): State.Signature {
  return {
    event: { type: "$init" as Tagged<string, "EventType"> },
    value: def.initial,
    context: def.context,
    nextEvents: Object.keys({ ...def.states[def.initial]!.on, ...def.on }),
  }
}

/**
 * Inverts the boolean value returned by the guard function.
 *
 * @template G - The type of the guard.
 * @param guard - The guard to invert.
 * @returns The inverted guard.
 */
export function not<const G extends string>(
  guard: Definition.Guard<G>,
): Definition.Guard.Not<G> {
  return {
    op: "not",
    value: guard,
  }
}

/**
 * Combines multiple guards into a single guard using the logical `&&` operator.
 *
 * @template G - The type of the guard.
 * @param guards - The guards to combine.
 * @returns The combined guard.
 */
export function and<const G extends string>(
  ...guards: Definition.Guard<G>[]
): Definition.Guard.And<G> {
  return guards
}

/**
 * Combines multiple guards into a single guard using the logical `||` operator.
 *
 * @template G - The type of the guard.
 * @param guards - The guards to combine.
 * @returns The combined guard.
 */
export function or<const G extends string>(
  ...guards: Definition.Guard<G>[]
): Definition.Guard.Or<G> {
  return {
    op: "or",
    value: guards,
  }
}

/**
 * Checks if the guard passes.
 *
 * @param conf - The configuration of the state machine.
 * @param guard - The guard to check.
 * @param params - The parameters to pass to the guard.
 * @returns `true` if the guard passes, `false` otherwise.
 */
function doGuard(
  conf: Config.Signature,
  guard: Definition.Guard.Signature,
  params: Config.GuardParams.Signature,
): boolean {
  return typeof guard === "string"
    ? conf.guards![guard]!(params)
    : Array.isArray(guard)
    ? guard.every(g => doGuard(conf, g, params))
    : guard.op === "not"
    ? !doGuard(conf, guard.value, params)
    : guard.value.some(g => doGuard(conf, g, params))
}

/**
 * The type of the result of a guard for development.
 */
type GuardResult =
  & (
    | { op: "eq"; source: string }
    | { op: "not"; source: GuardResult }
    | { op: "and"; source: GuardResult[] }
    | { op: "or"; source: GuardResult[] }
  )
  & {
    /** Whether the cause of the failure. */
    cause: boolean
    /** Whether the guard has passed. */
    allow: boolean | undefined
  }

/**
 * Checks if the guard passes for development.
 *
 * @param conf - The configuration of the state machine.
 * @param guard - The guard to check.
 * @param params - The parameters to pass to the guard.
 * @returns The result of the guard.
 */
function doGuardForDev(
  conf: Config.Signature,
  guard: Definition.Guard.Signature,
  params: Config.GuardParams.Signature,
  memo: {
    /** Whether the guard has passed. */
    pass?: true | undefined
    /** Whether the guard has failed. */
    cause?: true | undefined
  } = {},
): GuardResult {
  if (typeof guard === "string") {
    let result: boolean | undefined

    return {
      op: "eq",
      source: guard,
      allow: memo.pass ? undefined : (result = conf.guards![guard]!(params)),
      cause: result === false && !memo.cause && (memo.cause = true),
    }
  } else if (Array.isArray(guard)) {
    const { pass } = memo
    const { source, allow } = guard.reduce(
      (acc, g) => {
        const res = doGuardForDev(conf, g, params, memo)
        acc.source.push(res)

        if (res.allow === false) {
          acc.allow = false
          memo.pass = true

          if (!memo.cause) {
            res.cause = true
            memo.cause = true
          }
        }

        return acc
      },
      {
        source: [] as GuardResult[],
        allow: true,
      },
    )
    memo.pass = pass
    allow === false && (memo.pass = true)

    return {
      op: "and",
      source,
      cause: false,
      allow: pass ? undefined : allow,
    }
  } else if (guard.op === "not") {
    const { pass } = memo
    const result = doGuardForDev(conf, guard.value, params, memo)

    return {
      op: "not",
      source: result,
      cause: result.allow === true && !memo.cause && (memo.cause = true),
      allow: pass ? undefined : !result.allow,
    }
  } else {
    const { pass, cause } = memo
    memo.cause = true // lock cause
    const { source, allow } = guard.value.reduce(
      (acc, g) => {
        const res = doGuardForDev(conf, g, params, memo)
        acc.source.push(res)

        if (res.allow === true) {
          acc.allow = true
          memo.pass = true
        }

        return acc
      },
      {
        source: [] as GuardResult[],
        allow: false,
      },
    )
    memo.cause = cause // unlock cause
    memo.pass = pass
    allow === false && (memo.pass = true)

    return {
      op: "or",
      source,
      cause: allow === false && !pass && !memo.cause && (memo.cause = true),
      allow: pass ? undefined : allow,
    }
  }
}

/**
 * Formats the result of the guard for development.
 *
 * @param result - The result of the guard.
 * @param acc - State for the recursive function.
 * @returns The formatted result of the guard.
 */
function innerFormatGuardResult(
  result: GuardResult,
  acc: { cause: string },
): string {
  const char = result.cause ? "^" : " "

  switch (result.op) {
    case "eq": {
      const code = result.source
      acc.cause += char.repeat(code.length)

      return code
    }

    case "not": {
      const acc2 = { cause: " " }
      const code = `!${innerFormatGuardResult(result.source, acc2)}`
      acc.cause += acc2.cause.includes("^")
        ? acc2.cause
        : char.repeat(code.length)

      return code
    }

    case "and": {
      const JOIN = " && "
      const acc2 = { cause: " ".repeat("(".length) }
      const code = `(${
        result.source
          .map((res, idx, src) => {
            const str = innerFormatGuardResult(res, acc2)
            idx < src.length - 1 && (acc2.cause += " ".repeat(JOIN.length))

            return str
          })
          .join(JOIN)
      })`
      acc.cause += acc2.cause.includes("^")
        ? acc2.cause + " ".repeat(")".length)
        : char.repeat(code.length)

      return code
    }

    case "or": {
      const JOIN = " || "
      const acc2 = { cause: " ".repeat("(".length) }
      const code = `(${
        result.source
          .map((res, idx, src) => {
            const str = innerFormatGuardResult(res, acc2)
            idx < src.length - 1 && (acc2.cause += " ".repeat(JOIN.length))

            return str
          })
          .join(JOIN)
      })`
      acc.cause += acc2.cause.includes("^")
        ? acc2.cause + " ".repeat(")".length)
        : char.repeat(code.length)

      return code
    }

    default:
      assertNever(result)
  }
}

/**
 * Formats the result of the guard for development.
 *
 * @param result - The result of the guard.
 * @returns The formatted result of the guard.
 */
function formatGuardResult(result: GuardResult): string {
  const acc = { cause: "" }
  const code = innerFormatGuardResult(result, acc)

  return acc.cause.includes("^")
    ? [code, acc.cause].join("\n")
    : code
}

/**
 * Basic action type.
 *
 * @template T - The typeof action.
 * @template P - The typeof action payload.
 */
type ActionType<T extends string, P> = {
  readonly type: T
  readonly payload: P
}

/**
 * Actions to update state machine state.
 */
export type Action =
  | ActionType<"SEND", Config.Sendable.Signature>
  | ActionType<"SET_CONTEXT", Config.SetContextAction.Signature>

/**
 * Applies the action to the state machine.
 *
 * @param def - The state machine definition.
 * @param conf - The state machine configuration.
 * @param state - The current state of the state machine.
 * @param action - The action to apply to the state machine.
 * @returns The next state of the state machine.
 */
export function applyDispatch(
  def: Definition.Signature,
  conf: Config.Signature,
  state: State.Signature,
  action: Action,
): State.Signature {
  switch (action.type) {
    case "SEND": {
      const { payload } = action
      const event = typeof payload === "string" ? { type: payload } : payload
      const stateDef = def.states[state.value]!

      if (__DEV__) {
        if (!stateDef) {
          log(
            { ...conf, level: "error" },
            `State '${state.value}' not defined.`,
            ["State", state],
            ["Event", event],
          )

          return state
        }
      }

      const transition = stateDef.on?.[event.type] || def.on?.[event.type]

      if (!transition) {
        if (__DEV__) {
          log(
            { ...conf, level: "debug" },
            `Current state '${state.value}'`
              + ` doesn't listen to event type '${event.type}'.`,
            ["State", state],
            ["Event", event],
          )
        }

        return state
      }

      const { context } = state
      const [nextStateValue, guardResult] = typeof transition === "string"
        ? [
          transition,
          { allow: true },
        ]
        : __DEV__
        ? [
          transition.target,
          transition.guard === undefined
            ? { allow: true }
            : doGuardForDev(
              conf,
              transition.guard,
              { event, context },
            ),
        ]
        : [
          transition.target,
          {
            allow: transition.guard === undefined || doGuard(
              conf,
              transition.guard,
              { event, context },
            ),
          },
        ]

      if (__DEV__) {
        if (
          typeof transition !== "string"
          && typeof guardResult.allow === "boolean"
        ) {
          const prodGuardResult = {
            allow: transition.guard === undefined || doGuard(
              conf,
              transition.guard,
              { event, context },
            ),
          }

          if (guardResult.allow !== prodGuardResult.allow) {
            console.error(
              "!!! EMERGENCY (use-machine-ts) !!!\n"
                + "Guard results differ between development and production environments. "
                + "This is probably a serious bug in the library. "
                + "Could you please let me know under what conditions this bug occurs?\n\n"
                + "Issue: https://github.com/tai-kun/use-machine-ts/issues/new\n\n"
                + "Thank you,\n"
                + "tai-kun\n",
              "Event",
              event,
              "Transition",
              transition,
              "Guard Result (Development)",
              guardResult,
              "Guard Result (Production)",
              prodGuardResult,
            )
          }
        }
      }

      if (!guardResult.allow) {
        if (__DEV__) {
          log(
            { ...conf, level: "debug" },
            `Transition from '${state.value}' to '${nextStateValue}'`
              + " denied by guard.",
            [
              `%c${formatGuardResult(guardResult as GuardResult)}`,
              "font-family: monospace",
            ],
            ["Event", event],
            ["Context", context],
          )
        }

        return state
      }

      return {
        event,
        value: nextStateValue,
        context,
        nextEvents: Object.keys({
          ...def.states[nextStateValue]?.on,
          ...def.on,
        }),
      }
    }

    case "SET_CONTEXT": {
      const nextContext = action.payload(state.context)

      if (__DEV__) {
        log(
          { ...conf, level: "debug" },
          "Context updated.",
          ["Prev Context", state.context],
          ["Next Context", nextContext],
        )
      }

      return {
        ...state,
        context: nextContext,
      }
    }

    default:
      assertNever(action)
  }
}

/**
 * Apply effects to the state machine.
 *
 * @param def - The state machine definition.
 * @param conf - The state machine configuration.
 * @param state - The current state of the state machine.
 * @param dispatch - The function to dispatch an action to the state machine.
 * @param isMounted - A reference to a boolean that is `true` if the component is mounted, otherwise `false`.
 * @param syncMode - Whether to run the effects synchronously.
 * @returns The cleanup function to clean up the effects.
 */
export function applyEffect(
  def: Definition.Signature,
  conf: Config.Signature,
  state: State.Signature,
  dispatch: (action: Action) => void,
  isMounted: { readonly current: boolean },
  syncMode: boolean = false,
): void | {
  (
    params: Pick<Config.EffectCleanupParams.Signature, "event" | "context">,
  ): void
} {
  const { effect = [] } = def.states[state.value] || {}
  const entryFns = typeof effect === "string" ? [effect] : effect

  if (entryFns.length) {
    if (__DEV__) {
      if (!conf.effects) {
        log(
          { ...conf, level: "error" },
          `Effects not defined for state '${state.value}'.`,
          ["Event", state.event],
          ["Context", state.context],
        )

        return
      }
    }

    function send(event: Config.Sendable.Signature) {
      if (__DEV__) {
        if (typeof event !== "string" && !isPlainObject(event)) {
          log(
            { ...conf, level: "error" },
            "Event must be a plain object.",
            ["State", state],
            ["Event", event],
          )

          return
        }
      }

      if (!isLocked) {
        dispatch({
          type: "SEND",
          payload: event,
        })
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "Send function not available. "
            + "Must be used synchronously within an effect.",
          ["State", state],
          ["Event", event],
        )
      }
    }

    function setContext(action: Config.SetContextAction.Signature) {
      if (!isLocked) {
        dispatch({
          type: "SET_CONTEXT",
          payload: action,
        })
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "Set context function not available. "
            + "Must be used synchronously within an effect.",
          ["State", state],
          ["Action", action],
        )
      }

      return {
        send,
      }
    }

    let isLocked = false
    const exitFns = entryFns.map(effectName => {
      if (__DEV__) {
        if (typeof conf.effects![effectName] !== "function") {
          log(
            { ...conf, level: "error" },
            `Effect '${effectName}' not defined for state '${state.value}'.`,
            ["Event", state.event],
            ["Context", state.context],
          )

          return
        }
      }

      return conf.effects![effectName]!({
        send,
        event: state.event,
        context: state.context,
        setContext,
        isMounted() {
          return isMounted.current
        },
      })
    })
    isLocked = syncMode

    return params => {
      isLocked = false
      exitFns.forEach(exit => {
        if (typeof exit === "function") {
          exit({
            ...params,
            send,
            setContext,
            isMounted() {
              return isMounted.current
            },
          })
        }
      })
      isLocked = syncMode
    }
  }
}

const useIsomorphicLayoutEffect = typeof document === "undefined"
  ? useEffect
  : useLayoutEffect

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
  const stateRef = useRef(state)
  stateRef.current = state

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
  const { assert, describe, mock, test } = cfgTest

  describe("src/core/logic", () => {
    describe("createInitialState", () => {
      test("should return the initial state", () => {
        const def = {
          initial: "idle",
          context: {},
          states: {
            idle: {
              on: {
                FETCH: "loading",
              },
            },
            loading: {
              on: {
                RESOLVE: "idle",
                REJECT: "idle",
              },
            },
          },
        }
        const res = createInitialState(def)

        assert.deepEqual(res, {
          event: { type: "$init" },
          value: "idle",
          context: {},
          nextEvents: ["FETCH"],
        })
      })
    })

    describe("doGuardForDev", () => {
      test("should return the result of the guard", () => {
        const guards = {
          isOk: () => true,
        }
        const cond = "isOk"
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "eq",
          source: "isOk",
          cause: false,
          allow: true,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "isOk",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("should return the result of the guard", () => {
        const guards = {
          isOk: () => false,
        }
        const cond = "isOk"
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "eq",
          source: "isOk",
          cause: true,
          allow: false,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "isOk",
            "^^^^",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("should return the result of the guard with not", () => {
        const guards = {
          isOk: () => true,
        }
        const cond = not("isOk")
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "not",
          source: {
            op: "eq",
            source: "isOk",
            cause: false,
            allow: true,
          },
          cause: true,
          allow: false,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "!isOk",
            "^^^^^",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("should return the result of the guard with and", () => {
        const guards = {
          isOk: () => true,
        }
        const cond = and("isOk", "isOk")
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "and",
          source: [
            {
              op: "eq",
              source: "isOk",
              cause: false,
              allow: true,
            },
            {
              op: "eq",
              source: "isOk",
              cause: false,
              allow: true,
            },
          ],
          cause: false,
          allow: true,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "(isOk && isOk)",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("should return the result of the guard with or", () => {
        const guards = {
          isOk: () => true,
        }
        const cond = or("isOk", "isOk")
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "or",
          source: [
            {
              op: "eq",
              source: "isOk",
              cause: false,
              allow: true,
            },
            // No further validation is performed
            // because the previous condition returned true in the or.
            {
              op: "eq",
              source: "isOk",
              cause: false,
              allow: undefined,
            },
          ],
          cause: false,
          allow: true,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "(isOk || isOk)",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("should return the result of the guard with not, and, or", () => {
        const guards = {
          isOk: () => true,
        }
        const cond = not(or("isOk", and("isOk", "isOk")))
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "not",
          source: {
            op: "or",
            source: [
              {
                op: "eq",
                source: "isOk",
                cause: false,
                allow: true,
              },
              // No further validation is performed
              // because the previous condition returned true in the or.
              {
                op: "and",
                source: [
                  {
                    op: "eq",
                    source: "isOk",
                    cause: false,
                    allow: undefined,
                  },
                  {
                    op: "eq",
                    source: "isOk",
                    cause: false,
                    allow: undefined,
                  },
                ],
                cause: false,
                allow: undefined,
              },
            ],
            cause: false,
            allow: true,
          },
          cause: true,
          allow: false,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "!(isOk || (isOk && isOk))",
            "^^^^^^^^^^^^^^^^^^^^^^^^^",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("should return the result of the guard with not, and, or", () => {
        const guards = {
          isOk: () => true,
        }
        const cond = and("isOk", or(not("isOk"), not("isOk")), "isOk")
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        assert.deepEqual(res, {
          op: "and",
          source: [
            {
              op: "eq",
              source: "isOk",
              cause: false,
              allow: true,
            },
            {
              op: "or",
              source: [
                {
                  op: "not",
                  source: {
                    op: "eq",
                    source: "isOk",
                    cause: false,
                    allow: true,
                  },
                  cause: false,
                  allow: false,
                },
                {
                  op: "not",
                  source: {
                    op: "eq",
                    source: "isOk",
                    cause: false,
                    allow: true,
                  },
                  cause: false,
                  allow: false,
                },
              ],
              cause: true,
              allow: false,
            },
            // No further validation is performed
            // because the previous condition returned false in the and.
            {
              op: "eq",
              source: "isOk",
              cause: false,
              allow: undefined,
            },
          ],
          cause: false,
          allow: false,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "(isOk && (!isOk || !isOk) && isOk)",
            "         ^^^^^^^^^^^^^^^^         ",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })

      test("readme example", () => {
        const guards = {
          isReady: () => true,
          isStopped: () => true,
          isDestroyed: () => true,
        }
        const cond = and(or("isReady", "isStopped"), not("isDestroyed"))
        const res = doGuardForDev(
          { guards },
          cond,
          {} as Config.GuardParams.Signature,
        )

        console.debug(JSON.stringify(res, null, 2))

        assert.deepEqual(res, {
          op: "and",
          source: [
            {
              op: "or",
              source: [
                {
                  op: "eq",
                  source: "isReady",
                  cause: false,
                  allow: true,
                },
                {
                  op: "eq",
                  source: "isStopped",
                  cause: false,
                  allow: undefined,
                },
              ],
              cause: false,
              allow: true,
            },
            {
              op: "not",
              source: {
                op: "eq",
                source: "isDestroyed",
                cause: false,
                allow: true,
              },
              cause: true,
              allow: false,
            },
          ],
          cause: false,
          allow: false,
        })
        assert.equal(
          formatGuardResult(res),
          [
            "((isReady || isStopped) && !isDestroyed)",
            "                           ^^^^^^^^^^^^ ",
          ].join("\n"),
        )
        assert.equal(
          res.allow,
          doGuard({ guards }, cond, {} as Config.GuardParams.Signature),
        )
      })
    })

    describe("applyDispatch", () => {
      describe("SEND", () => {
        test("should return the next state", () => {
          const def = {
            initial: "idle",
            context: {},
            states: {
              idle: {
                on: {
                  FETCH: "loading",
                },
              },
              loading: {
                on: {
                  RESOLVE: "idle",
                  REJECT: "idle",
                },
              },
            },
          }
          const conf = {}
          const state = createInitialState(def)
          const action: Action = {
            type: "SEND",
            payload: "FETCH",
          }
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          )

          assert.deepEqual(newState, {
            event: { type: "FETCH" },
            value: "loading",
            context: {},
            nextEvents: ["RESOLVE", "REJECT"],
          })
        })

        test("should return the same state", () => {
          const def = {
            initial: "idle",
            context: {},
            states: {
              idle: {
                on: {
                  IDLE: "idle",
                },
              },
            },
          }
          const conf = {}
          const state = {
            event: { type: "IDLE" },
            value: "idle",
            context: {},
            nextEvents: ["IDLE"],
          }
          const action: Action = {
            type: "SEND",
            payload: "IDLE",
          }
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          )

          assert.notEqual(newState, state)
          assert.deepEqual(newState, state)
        })

        test("should log the event type not found", () => {
          const logMock = mock.fn(() => {})
          const def = {
            initial: "idle",
            context: {},
            states: {
              idle: {},
            },
          }
          const conf = {
            verbose: true,
            console: {
              log: logMock,
              group: logMock,
              groupEnd() {},
            },
          }
          const state = createInitialState(def)
          const action: Action = {
            type: "SEND",
            payload: "FETCH",
          }
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          )

          assert.deepEqual(newState, state)
          assert.deepEqual(
            logMock.mock.calls.map(call => ({
              args: call.arguments,
            })),
            [
              {
                args: [
                  "Current state 'idle' doesn't listen to event type 'FETCH'.",
                ],
              },
              {
                args: ["State", state],
              },
              {
                args: ["Event", { type: "FETCH" }],
              },
            ],
          )
        })

        test("should log the transition denied by guard", () => {
          const logMock = mock.fn(() => {})
          const def = {
            initial: "idle",
            context: {},
            states: {
              idle: {
                on: {
                  FETCH: {
                    target: "loading",
                    guard: "isAllowed",
                  },
                },
              },
              loading: {},
            },
          }
          const conf = {
            verbose: true,
            guards: {
              isAllowed: () => false,
            },
            console: {
              log: logMock,
              group: logMock,
              groupEnd() {},
            },
          }
          const state = createInitialState(def)
          const action: Action = {
            type: "SEND",
            payload: "FETCH",
          }
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          )

          assert.deepEqual(newState, state)
          assert.deepEqual(
            logMock.mock.calls.map(call => ({
              args: call.arguments,
            })),
            [
              {
                args: [
                  "Transition from 'idle' to 'loading' denied by guard.",
                ],
              },
              {
                args: [
                  [
                    // dprint-ignore
                    "%c" +
                    "isAllowed",
                    "^^^^^^^^^",
                  ].join("\n"),
                  "font-family: monospace",
                ],
              },
              {
                args: ["Event", { type: "FETCH" }],
              },
              {
                args: ["Context", {}],
              },
            ],
          )
        })
      })

      describe("SET_CONTEXT", () => {
        test("should update the context", () => {
          const logMock = mock.fn(() => {})
          const def = {
            initial: "idle",
            context: {
              foo: 1,
            },
            states: {
              idle: {},
            },
          }
          const conf = {
            verbose: true,
            console: {
              log: logMock,
              group: logMock,
              groupEnd() {},
            },
          }
          const state = createInitialState(def)
          const action: Action = {
            type: "SET_CONTEXT",
            payload: (ctx: any) => ({ ...ctx, bar: 2 }),
          }
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          )

          assert.deepEqual(newState, {
            event: { type: "$init" },
            value: "idle",
            context: {
              foo: 1,
              bar: 2,
            },
            nextEvents: [],
          })
          assert.deepEqual(
            logMock.mock.calls.map(call => ({
              args: call.arguments,
            })),
            [
              {
                args: ["Context updated."],
              },
              {
                args: ["Prev Context", { foo: 1 }],
              },
              {
                args: ["Next Context", { foo: 1, bar: 2 }],
              },
            ],
          )
        })
      })
    })

    describe("applyEffect", () => {
      test("should apply the effect", () => {
        const cleanupMock = mock.fn(() => {})
        const dispatchMock = mock.fn(() => {})
        const def = {
          initial: "idle",
          context: {},
          states: {
            idle: {
              effect: "onIdle",
            },
          },
        }
        const conf = {
          effects: {
            onIdle: ({ send }: Config.EffectParams.Signature) => {
              send({
                type: "FETCH",
              })

              return cleanupMock
            },
          },
        }
        const state = createInitialState(def)
        const isMounted = { current: true }
        const cleanup = applyEffect(def, conf, state, dispatchMock, isMounted)
        cleanup!({
          event: { type: "FETCH" },
          context: {},
        })

        assert.deepEqual(
          dispatchMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: [
                {
                  type: "SEND",
                  payload: {
                    type: "FETCH",
                  },
                },
              ],
            },
          ],
        )
        assert.equal(cleanupMock.mock.callCount(), 1)
        const params: Config.EffectParams.Signature = cleanupMock.mock
          .calls!.at(0)!.arguments.at(0)!
        assert.equal(typeof params.send, "function")
        assert.equal(typeof params.setContext, "function")
        assert.deepEqual(params.event, { type: "FETCH" })
        assert.deepEqual(params.context, {})
      })

      test("should error if dispatch is called asynchronously in sync mode", async () => {
        const { promise, resolve } = Promise.withResolvers<void>()
        const errorMock = mock.fn(() => {})
        const dispatchMock = mock.fn(() => {})
        const def = {
          initial: "idle",
          context: {},
          states: {
            idle: {
              on: {
                FETCH: "loading",
              },
              effect: "onIdle",
            },
            loading: {},
          },
        }
        const conf = {
          console: {
            log() {},
            error: errorMock,
          },
          effects: {
            onIdle: ({ send }: Config.EffectParams.Signature) => {
              setTimeout(
                () => {
                  send("FETCH")
                  resolve()
                },
                0,
              )
            },
          },
        }
        const state = createInitialState(def)
        const isMounted = { current: true }
        applyEffect(def, conf, state, dispatchMock, isMounted, true)

        await promise

        assert.equal(dispatchMock.mock.callCount(), 0)
        assert.deepEqual(
          errorMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: [
                "Send function not available. Must be used synchronously within an effect.",
              ],
            },
            {
              args: [
                "State",
                {
                  context: {},
                  event: {
                    type: "$init",
                  },
                  nextEvents: [
                    "FETCH",
                  ],
                  value: "idle",
                },
              ],
            },
            {
              args: [
                "Event",
                "FETCH",
              ],
            },
          ],
        )
      })
    })

    describe("useIsMounted", () => {
      test("should return a reference to a boolean that is true if the component is mounted, otherwise false", () => {
        const capture = {
          effect: {
            entry: undefined as boolean | undefined,
            exit: undefined as boolean | undefined,
          },
        }
        const { unmount } = renderHook(() => {
          const isMounted = useIsMounted()

          useEffect(() => {
            capture.effect.entry = isMounted.current

            return () => {
              capture.effect.exit = isMounted.current
            }
          })
        })

        assert.deepEqual(capture, {
          effect: {
            entry: true,
            exit: undefined,
          },
        })

        unmount()

        assert.deepEqual(capture, {
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

import type { Config, Definition } from "../types"
import { assertNever } from "./devutils"

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
export function doGuard(
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
export function doGuardForDev(
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
export function formatGuardResult(result: GuardResult): string {
  const acc = { cause: "" }
  const code = innerFormatGuardResult(result, acc)

  return acc.cause.includes("^")
    ? [code, acc.cause].join("\n")
    : code
}

if (cfgTest && cfgTest.url === import.meta.url) {
  const { assert, describe, test } = cfgTest

  describe("src/core/guard", () => {
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
}

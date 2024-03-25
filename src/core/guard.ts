import type { Config, Definition } from "../types"
import type { Tagged } from "../types/utils"
import { assertNever, log } from "./devutils"

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

type GuardResult =
  & (
    | { op: "eq"; by: Tagged<string, "GuardName"> }
    | { op: "or"; by: GuardResult[] }
    | { op: "and"; by: GuardResult[] }
    | { op: "not"; by: GuardResult }
  )
  & { ok: boolean | undefined }

type GuardContext = {
  done: boolean
  end(): void
  revert(): void
  doGuard(name: Tagged<string, "GuardName">): boolean
}

/**
 * Checks if the guard passes for development.
 *
 * @param ctx - The context of the guard.
 * @param guard - The guard to check.
 * @returns The result of the guard.
 */
function innerDoGuardForDev(
  ctx: GuardContext,
  guard: Definition.Guard.Signature,
): GuardResult {
  if (typeof guard === "string") {
    const { done } = ctx

    return {
      op: "eq",
      ok: done ? undefined : ctx.doGuard(guard),
      by: guard,
    }
  } else if (Array.isArray(guard)) {
    const { done } = ctx
    const by = guard.map(g => {
      const res = innerDoGuardForDev(ctx, g)

      if (res.ok === false) {
        ctx.end()
      }

      return res
    })

    if (!done) {
      ctx.revert()
    }

    return {
      op: "and",
      ok: done ? undefined : by.every(b => b.ok !== false),
      by,
    }
  } else if (guard.op === "not") {
    const { done } = ctx
    const by = innerDoGuardForDev(ctx, guard.value)

    return {
      op: "not",
      ok: done ? undefined : !by.ok,
      by,
    }
  } else if (guard.op === "or") {
    const { done } = ctx
    const by = guard.value.map(g => {
      const res = innerDoGuardForDev(ctx, g)

      if (res.ok === true) {
        ctx.end()
      }

      return res
    })

    if (!done) {
      ctx.revert()
    }

    return {
      op: "or",
      ok: done ? undefined : by.some(b => b.ok !== false),
      by,
    }
  } else {
    assertNever(guard)
  }
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
): GuardResult {
  let done = false
  const ctx: GuardContext = {
    get done() {
      return done
    },
    end() {
      done = true
    },
    revert() {
      done = false
    },
    doGuard(name) {
      if (__DEV__) {
        if (typeof conf.guards?.[name] !== "function") {
          log(
            { ...conf, level: "error" },
            "The guard function is not defined in the configuration.",
            ["Guard name", name],
            ["Configuration", conf],
          )
        }
      }

      return !!conf.guards?.[name]?.(params)
    },
  }

  return innerDoGuardForDev(ctx, guard)
}

type FormatContext = {
  code: string
  cause: string
}

function innerFormatGuardResult(ctx: FormatContext, res: GuardResult): void {
  switch (res.op) {
    case "eq":
      ctx.code += res.by
      ctx.cause += res.ok === false
        ? "^".repeat(res.by.length)
        : " ".repeat(res.by.length)

      break

    case "and":
      ctx.code += "("
      ctx.cause += " ".repeat("(".length)

      res.by.forEach((r, i) => {
        innerFormatGuardResult(ctx, r)

        if (i < res.by.length - 1) {
          ctx.code += " && "
          ctx.cause += " ".repeat(" && ".length)
        }
      })

      ctx.code += ")"
      ctx.cause += " ".repeat(")".length)

      break

    case "or": {
      let { code, cause } = ctx
      ctx.code += "("
      ctx.cause = ""

      res.by.forEach((r, i) => {
        innerFormatGuardResult(ctx, r)

        if (i < res.by.length - 1) {
          ctx.code += " || "
        }
      })

      ctx.code += ")"
      ctx.cause = cause + (
        res.ok === false
          ? "^".repeat(ctx.code.length - code.length)
          : " ".repeat(ctx.code.length - code.length)
      )

      break
    }

    case "not": {
      let { cause } = ctx
      ctx.code += "!"
      ctx.cause = " ".repeat("!".length)

      innerFormatGuardResult(ctx, res.by)

      ctx.cause = cause + (
        res.ok === false && (ctx.cause.trim() === "" || /^\^+$/.test(ctx.cause))
          ? "^".repeat(ctx.cause.length)
          : " ".repeat(ctx.cause.length)
      )

      break
    }

    default:
      assertNever(res)
  }
}

/**
 * Formats the result of the guard for development.
 *
 * @param result - The result of the guard.
 * @returns The formatted result of the guard.
 */
export function formatGuardResult(result: GuardResult): string {
  const ctx: FormatContext = { code: "", cause: "" }

  innerFormatGuardResult(ctx, result)

  return ctx.cause.includes("^")
    ? [ctx.code, ctx.cause].join("\n")
    : ctx.code
}

if (cfgTest && cfgTest.url === import.meta.url) {
  const { assert, describe, test } = cfgTest

  function doGuardForTest(
    setup: {
      guards: NonNullable<Config.Signature["guards"]>
      guard: Definition.Guard.Signature
      params?: Config.GuardParams.Signature
    },
  ) {
    const { guards, guard, params = {} as Config.GuardParams.Signature } = setup
    const dev = doGuardForDev({ guards }, guard, params)

    return {
      prd: doGuard({ guards }, guard, params),
      dev,
      fmt: formatGuardResult(dev).split("\n"),
    }
  }

  describe("src/core/guard", () => {
    describe("eq", () => {
      test("should return true if the guard passes", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: "isOk",
          }),
          {
            prd: true,
            dev: {
              op: "eq",
              ok: true,
              by: "isOk",
            },
            fmt: [
              "isOk",
            ],
          },
        )
      })

      test("should return false if the guard fails", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => false },
            guard: "isOk",
          }),
          {
            prd: false,
            dev: {
              op: "eq",
              ok: false,
              by: "isOk",
            },
            fmt: [
              "isOk",
              "^^^^",
            ],
          },
        )
      })
    })

    describe("and", () => {
      test("array means and", () => {
        assert.deepEqual(
          ["isOk", "isOk"],
          and("isOk", "isOk"),
        )
      })

      test("should return true if all guards pass", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: ["isOk", "isOk"],
          }),
          {
            prd: true,
            dev: {
              op: "and",
              ok: true,
              by: [
                {
                  op: "eq",
                  ok: true,
                  by: "isOk",
                },
                {
                  op: "eq",
                  ok: true,
                  by: "isOk",
                },
              ],
            },
            fmt: [
              "(isOk && isOk)",
            ],
          },
        )
      })

      test("should return false if one of the guards fails", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => false },
            guard: ["isOk", "isOk"],
          }),
          {
            prd: false,
            dev: {
              op: "and",
              ok: false,
              by: [
                {
                  op: "eq",
                  ok: false,
                  by: "isOk",
                },
                {
                  op: "eq",
                  ok: undefined,
                  by: "isOk",
                },
              ],
            },
            fmt: [
              "(isOk && isOk)",
              " ^^^^         ",
            ],
          },
        )
      })

      test("nesting", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: and("isOk", and("isOk", and("isOk", "isOk"))),
          }),
          {
            prd: true,
            dev: {
              op: "and",
              ok: true,
              by: [
                {
                  op: "eq",
                  ok: true,
                  by: "isOk",
                },
                {
                  op: "and",
                  ok: true,
                  by: [
                    {
                      op: "eq",
                      ok: true,
                      by: "isOk",
                    },
                    {
                      op: "and",
                      ok: true,
                      by: [
                        {
                          op: "eq",
                          ok: true,
                          by: "isOk",
                        },
                        {
                          op: "eq",
                          ok: true,
                          by: "isOk",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            fmt: [
              "(isOk && (isOk && (isOk && isOk)))",
            ],
          },
        )
      })
    })

    describe("or", () => {
      test("should return true if one of the guards passes", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: or("isOk", "isOk"),
          }),
          {
            prd: true,
            dev: {
              op: "or",
              ok: true,
              by: [
                {
                  op: "eq",
                  ok: true,
                  by: "isOk",
                },
                {
                  op: "eq",
                  ok: undefined,
                  by: "isOk",
                },
              ],
            },
            fmt: [
              "(isOk || isOk)",
            ],
          },
        )
      })

      test("should return false if all guards fail", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => false },
            guard: or("isOk", "isOk"),
          }),
          {
            prd: false,
            dev: {
              op: "or",
              ok: false,
              by: [
                {
                  op: "eq",
                  ok: false,
                  by: "isOk",
                },
                {
                  op: "eq",
                  ok: false,
                  by: "isOk",
                },
              ],
            },
            fmt: [
              "(isOk || isOk)",
              "^^^^^^^^^^^^^^",
            ],
          },
        )
      })

      test("nesting", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: or(or(or("isOk", "isOk"))),
          }),
          {
            prd: true,
            dev: {
              op: "or",
              ok: true,
              by: [
                {
                  op: "or",
                  ok: true,
                  by: [
                    {
                      op: "or",
                      ok: true,
                      by: [
                        {
                          op: "eq",
                          ok: true,
                          by: "isOk",
                        },
                        {
                          op: "eq",
                          ok: undefined,
                          by: "isOk",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            fmt: [
              "(((isOk || isOk)))",
            ],
          },
        )
      })
    })

    describe("not", () => {
      test("should return true if the guard fails", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => false },
            guard: not("isOk"),
          }),
          {
            prd: true,
            dev: {
              op: "not",
              ok: true,
              by: {
                op: "eq",
                ok: false,
                by: "isOk",
              },
            },
            fmt: [
              "!isOk",
            ],
          },
        )
      })

      test("should return false if the guard passes", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: not("isOk"),
          }),
          {
            prd: false,
            dev: {
              op: "not",
              ok: false,
              by: {
                op: "eq",
                ok: true,
                by: "isOk",
              },
            },
            fmt: [
              "!isOk",
              "^^^^^",
            ],
          },
        )
      })

      test("nesting", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: not(not(not("isOk"))),
          }),
          {
            prd: false,
            dev: {
              op: "not",
              ok: false,
              by: {
                op: "not",
                ok: true,
                by: {
                  op: "not",
                  ok: false,
                  by: {
                    op: "eq",
                    ok: true,
                    by: "isOk",
                  },
                },
              },
            },
            fmt: [
              "!!!isOk",
              "^^^^^^^",
            ],
          },
        )
      })
    })

    describe("complex", () => {
      test("or(and(not('isOk')), 'isOk')", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: or(and(not("isOk")), "isOk"),
          }),
          {
            prd: true,
            dev: {
              op: "or",
              ok: true,
              by: [
                {
                  op: "and",
                  ok: false,
                  by: [
                    {
                      op: "not",
                      ok: false,
                      by: {
                        op: "eq",
                        ok: true,
                        by: "isOk",
                      },
                    },
                  ],
                },
                {
                  op: "eq",
                  ok: true,
                  by: "isOk",
                },
              ],
            },
            fmt: [
              "((!isOk) || isOk)",
            ],
          },
        )
      })

      test("and('isOk', or(not('isOk'), not('isOk')), 'isOk')", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: { isOk: () => true },
            guard: and("isOk", or(not("isOk"), not("isOk")), "isOk"),
          }),
          {
            prd: false,
            dev: {
              op: "and",
              ok: false,
              by: [
                {
                  op: "eq",
                  ok: true,
                  by: "isOk",
                },
                {
                  op: "or",
                  ok: false,
                  by: [
                    {
                      op: "not",
                      ok: false,
                      by: {
                        op: "eq",
                        ok: true,
                        by: "isOk",
                      },
                    },
                    {
                      op: "not",
                      ok: false,
                      by: {
                        op: "eq",
                        ok: true,
                        by: "isOk",
                      },
                    },
                  ],
                },
                {
                  op: "eq",
                  ok: undefined,
                  by: "isOk",
                },
              ],
            },
            fmt: [
              "(isOk && (!isOk || !isOk) && isOk)",
              "         ^^^^^^^^^^^^^^^^         ",
            ],
          },
        )
      })

      test("and(or('isReady', 'isStopped'), not('isDestroyed'))", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: {
              isReady: () => true,
              isStopped: () => true,
              isDestroyed: () => true,
            },
            guard: and(or("isReady", "isStopped"), not("isDestroyed")),
          }),
          {
            prd: false,
            dev: {
              op: "and",
              ok: false,
              by: [
                {
                  op: "or",
                  ok: true,
                  by: [
                    {
                      op: "eq",
                      ok: true,
                      by: "isReady",
                    },
                    {
                      op: "eq",
                      ok: undefined,
                      by: "isStopped",
                    },
                  ],
                },
                {
                  op: "not",
                  ok: false,
                  by: {
                    op: "eq",
                    ok: true,
                    by: "isDestroyed",
                  },
                },
              ],
            },
            fmt: [
              "((isReady || isStopped) && !isDestroyed)",
              "                           ^^^^^^^^^^^^ ",
            ],
          },
        )
      })

      test("and(not('isDestroyed'), or('isReady', 'isStopped'))", () => {
        assert.deepEqual(
          doGuardForTest({
            guards: {
              isReady: () => true,
              isStopped: () => true,
              isDestroyed: () => true,
            },
            guard: and(not("isDestroyed"), or("isReady", "isStopped")),
          }),
          {
            prd: false,
            dev: {
              op: "and",
              ok: false,
              by: [
                {
                  op: "not",
                  ok: false,
                  by: {
                    op: "eq",
                    ok: true,
                    by: "isDestroyed",
                  },
                },
                {
                  op: "or",
                  ok: undefined,
                  by: [
                    {
                      op: "eq",
                      ok: undefined,
                      by: "isReady",
                    },
                    {
                      op: "eq",
                      ok: undefined,
                      by: "isStopped",
                    },
                  ],
                },
              ],
            },
            fmt: [
              "(!isDestroyed && (isReady || isStopped))",
              " ^^^^^^^^^^^^                           ",
            ],
          },
        )
      })
    })
  })
}

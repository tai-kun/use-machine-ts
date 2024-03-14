import type { Config } from "../types"
import { useMemo } from "./react"

/**
 * The options for logging.
 *
 * @internal
 */
export type LogOptions = Pick<Config.Signature, "verbose" | "console">

/**
 * Logs messages to the console.
 *
 * @internal
 * @param options - The options for logging.
 * @param groupLabel - The label for the group of messages.
 * @param messages - The messages to log.
 */
export function log(
  options: LogOptions & {
    /**
     * The level of logging.
     */
    level: "debug" | "error"
  },
  groupLabel: string | readonly [string, ...string[]],
  ...messages: readonly (readonly [string, unknown])[]
): void {
  const {
    level,
    console: cons = console,
    verbose = 1,
  } = options

  if (!verbose || (level === "debug" && verbose === 1) || !messages.length) {
    return
  }

  if (typeof groupLabel === "string") {
    groupLabel = [groupLabel]
  }

  const isCollapsible = !!(cons.group || cons.groupCollapsed) && !!cons.groupEnd

  if (isCollapsible) {
    ;(cons.group || cons.groupCollapsed)!(...groupLabel)
  } else {
    switch (level) {
      case "debug":
        cons.log(...groupLabel)

        break

      case "error":
        ;(cons.error || cons.log)(...groupLabel)

        break

      default:
        assertNever(level)
    }
  }

  for (const [label, value] of messages) {
    switch (level) {
      case "debug":
        cons.log(label, value)

        break

      case "error":
        ;(cons.error || cons.log)(label, value)

        break

      default:
        assertNever(level)
    }
  }

  if (isCollapsible) {
    cons.groupEnd!()
  }
}

/**
 * Calls the callback when the value changes.
 *
 * @internal
 * @template T - The type of the value.
 * @param value - The value to detect changes.
 * @param callback - The callback to call when the value changes.
 * @param options - The options for detecting changes.
 */
export function useDetectChanges<T>(
  value: T,
  callback: (curr: T, next: T) => void,
  options?: {
    equalityFn?: (curr: T, next: T) => boolean
  },
): void {
  const ref = useMemo<{ current?: T }>(() => ({}), [])

  if ("current" in ref) {
    if (!(options?.equalityFn || Object.is)(ref.current, value)) {
      callback(ref.current, value)
    }
  } else {
    ref.current = value
  }
}

/**
 * Checks if the value is a plain object.
 *
 * @template T - The type of the value to check.
 * @param value - The value to check.
 * @returns `true` if the value is a plain object, or `false` otherwise.
 */
export function isPlainObject<T>(value: T): value is Exclude<
  Extract<T, Record<string, any>>,
  | Function
  | readonly any[]
> {
  return (
    typeof value === "object"
    && value !== null
    && (value.constructor === Object || value.constructor === undefined)
  )
}

/**
 * Throws an error if the value is never.
 *
 * @param cause - Cause of the error.
 */
export function assertNever(
  cause: never,
): never {
  throw new Error("Reached code that should be unreachable", { cause })
}

if (cfgTest && cfgTest.url === import.meta.url) {
  await import("global-jsdom/register")
  const { renderHook } = await import("@testing-library/react")
  const { assert, describe, mock, test } = cfgTest

  describe("src/core/devutils", () => {
    describe("log", () => {
      test("Should log messages", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: true,
          console: {
            log: logMock,
          },
        }

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(
          logMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: ["Group label"],
            },
            {
              args: ["Label", "Value"],
            },
          ],
        )
      })

      test("Should log messages with group label", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: true,
          console: {
            log: logMock,
            group: logMock,
            groupEnd: logMock,
          },
        }

        log(
          { ...options, level: "debug" },
          ["Group label", "Sub label"],
          ["Label", "Value"],
        )

        assert.deepEqual(
          logMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: ["Group label", "Sub label"],
            },
            {
              args: ["Label", "Value"],
            },
            {
              args: [],
            },
          ],
        )
      })

      test("should not log messages if verbose is false", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: false,
          console: {
            log: logMock,
          },
        }

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(logMock.mock.calls, [])
      })

      test("should not log messages if level is debug and verbose is 1", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: 1,
          console: {
            log: logMock,
          },
        }

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(logMock.mock.calls, [])
      })

      test("should log messages if level is error", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: 1,
          console: {
            log: () => {},
            error: logMock,
          },
        }

        log(
          { ...options, level: "error" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(
          logMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: ["Group label"],
            },
            {
              args: ["Label", "Value"],
            },
          ],
        )
      })

      test("should fallback to log if error is not available", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: 1,
          console: {
            log: logMock,
          },
        }

        log(
          { ...options, level: "error" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(
          logMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: ["Group label"],
            },
            {
              args: ["Label", "Value"],
            },
          ],
        )
      })

      test("should not group messages if groupEnd is not available", () => {
        const logMock = mock.fn()
        const options: LogOptions = {
          verbose: true,
          console: {
            log: logMock,
            group: logMock,
          },
        }

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(
          logMock.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: ["Group label"],
            },
            {
              args: ["Label", "Value"],
            },
          ],
        )
      })

      test("should use global.console if console is not defined", () => {
        const options: LogOptions = {
          verbose: 2,
        }
        const consoleLogMock = mock.method(console, "log", () => {})
        const consoleGroupMock = mock.method(console, "group", () => {})
        const consoleGroupEndMock = mock.method(console, "groupEnd", () => {})

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        )

        assert.deepEqual(
          [
            ...consoleGroupMock.mock.calls.map(call => ({
              args: call.arguments,
            })),
            ...consoleLogMock.mock.calls.map(call => ({
              args: call.arguments,
            })),
            ...consoleGroupEndMock.mock.calls.map(call => ({
              args: call.arguments,
            })),
          ],
          [
            {
              args: ["Group label"],
            },
            {
              args: ["Label", "Value"],
            },
            {
              args: [],
            },
          ],
        )

        consoleLogMock.mock.restore()
        consoleGroupMock.mock.restore()
        consoleGroupEndMock.mock.restore()
      })
    })

    describe("useDetectChanges", () => {
      test("Should call the callback when the value changes", () => {
        const callback = mock.fn()
        const { rerender } = renderHook(
          ({ value }) => {
            useDetectChanges(value, callback)
          },
          {
            initialProps: {
              value: 1,
            },
          },
        )

        rerender({
          value: 2,
        })

        assert.deepEqual(
          callback.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: [1, 2],
            },
          ],
        )
      })

      test("Should call the callback with the custom equality function", () => {
        const callback = mock.fn()
        const { rerender } = renderHook(
          props => {
            useDetectChanges<{ prop: number }>(props, callback, {
              equalityFn: (curr, next) => curr.prop === next.prop,
            })
          },
          {
            initialProps: {
              prop: 1,
            },
          },
        )

        rerender({
          prop: 1,
        })

        assert.deepEqual(callback.mock.calls, [])

        rerender({
          prop: 2,
        })

        assert.deepEqual(
          callback.mock.calls.map(call => ({
            args: call.arguments,
          })),
          [
            {
              args: [{ prop: 1 }, { prop: 2 }],
            },
          ],
        )
      })
    })

    describe("isPlainObject", () => {
      test("Should return true if the value is a plain object", () => {
        assert(isPlainObject({}))
        assert(isPlainObject(Object.create(null)))
      })

      test("Should return false if the value is not a plain object", () => {
        assert(!isPlainObject([]))
        assert(!isPlainObject(() => {}))
        assert(!isPlainObject(null))
        assert(!isPlainObject(undefined))
        assert(!isPlainObject(1))
        assert(!isPlainObject("string"))
        assert(!isPlainObject(Symbol()))
      })
    })

    describe("assertNever", () => {
      test("Should throw an error", () => {
        assert.throws(
          () => {
            assertNever("value" as never)
          },
          {
            message: "Reached code that should be unreachable",
          },
        )
      })
    })
  })
}

import type { Config } from "../types";
import { useMemo } from "./react";

/**
 * The options for logging.
 *
 * @internal
 */
export type LogOptions = Pick<Config.Signature, "verbose" | "console">;

/**
 * Logs messages to the console.
 *
 * @internal
 * @param options The options for logging.
 * @param groupLabel The label for the group of messages.
 * @param messages The messages to log.
 */
export function log(
  options: LogOptions & {
    /**
     * The level of logging.
     */
    readonly level: "debug" | "error";
  },
  groupLabel: string | readonly [string, ...string[]],
  ...messages: readonly (readonly [string, unknown?])[]
): void {
  const {
    level,
    console: cons = console,
    verbose = 1,
  } = options;

  if (!verbose || (level === "debug" && verbose === 1) || !messages.length) {
    return;
  }

  if (typeof groupLabel === "string") {
    groupLabel = [groupLabel];
  }

  const isCollapsible = !!(cons.groupCollapsed || cons.group)
    && !!cons.groupEnd;

  if (isCollapsible) {
    (cons.groupCollapsed || cons.group)!(...groupLabel);
  } else {
    switch (level) {
      case "debug":
        cons.log(...groupLabel);
        break;

      case "error":
        (cons.error || cons.log)(...groupLabel);
        break;

      default:
        unreachable(level);
    }
  }

  for (const message of messages) {
    switch (level) {
      case "debug":
        cons.log(...message);
        break;

      case "error":
        (cons.error || cons.log)(...message);
        break;

      default:
        unreachable(level);
    }
  }

  if (isCollapsible) {
    cons.groupEnd!();
  }
}

/**
 * Calls the callback when the value changes.
 *
 * @internal
 * @template T The type of the value.
 * @param value The value to detect changes.
 * @param callback The callback to call when the value changes.
 * @param options The options for detecting changes.
 */
export function useDetectChanges<T>(
  value: T,
  callback: (curr: T, next: T) => void,
  options?: {
    equalityFn?: (curr: T, next: T) => boolean;
  },
): void {
  const ref = useMemo<{ current?: T }>(() => ({}), []);

  if ("current" in ref) {
    if (!(options?.equalityFn || Object.is)(ref.current, value)) {
      callback(ref.current, value);
    }
  } else {
    ref.current = value;
  }
}

/**
 * Checks if the value is a plain object.
 *
 * @template T The type of the value to check.
 * @param value The value to check.
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
  );
}

/**
 * Throws an error if the value is never.
 *
 * @param cause Cause of the error.
 */
export function unreachable(cause: never): never {
  throw new Error("unreachable", { cause });
}

if (cfgTest && cfgTest.url === import.meta.url) {
  await import("global-jsdom/register");
  const { renderHook } = await import("@testing-library/react");
  const { assert, describe, sinon, test } = cfgTest;
  const { spy } = sinon;

  describe("src/core/devutils", () => {
    describe("log", () => {
      test("it should log messages", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: true,
          console: {
            log: logSpy,
          },
        };

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(
          logSpy.getCalls().map(call => call.args),
          [
            ["Group label"],
            ["Label", "Value"],
          ],
        );
      });

      test("it should log messages with group label", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: true,
          console: {
            log: logSpy,
            group: logSpy,
            groupEnd: logSpy,
          },
        };

        log(
          { ...options, level: "debug" },
          ["Group label", "Sub label"],
          ["Label", "Value"],
        );

        assert.deepEqual(
          logSpy.getCalls().map(call => call.args),
          [
            ["Group label", "Sub label"],
            ["Label", "Value"],
            [],
          ],
        );
      });

      test("it should not log messages if verbose is false", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: false,
          console: {
            log: logSpy,
          },
        };

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(logSpy.getCalls(), []);
      });

      test("it should not log messages if level is debug and verbose is 1", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: 1,
          console: {
            log: logSpy,
          },
        };

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(logSpy.getCalls(), []);
      });

      test("it should log messages if level is error", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: 1,
          console: {
            log: () => {},
            error: logSpy,
          },
        };

        log(
          { ...options, level: "error" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(
          logSpy.getCalls().map(call => call.args),
          [
            ["Group label"],
            ["Label", "Value"],
          ],
        );
      });

      test("it should fallback to log if error is not available", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: 1,
          console: {
            log: logSpy,
          },
        };

        log(
          { ...options, level: "error" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(
          logSpy.getCalls().map(call => call.args),
          [
            ["Group label"],
            ["Label", "Value"],
          ],
        );
      });

      test("it should not group messages if groupEnd is not available", () => {
        const logSpy = spy();
        const options: LogOptions = {
          verbose: true,
          console: {
            log: logSpy,
            group: logSpy,
          },
        };

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(
          logSpy.getCalls().map(call => call.args),
          [
            ["Group label"],
            ["Label", "Value"],
          ],
        );
      });

      test("it should use global.console if console is not defined", () => {
        const options: LogOptions = {
          verbose: 2,
        };
        const consoleLogSpy = spy(console, "log");
        const consoleGroupSpy = spy(console, "group");
        const consoleGroupEndSpy = spy(console, "groupEnd");

        log(
          { ...options, level: "debug" },
          "Group label",
          ["Label", "Value"],
        );

        assert.deepEqual(
          [
            ...consoleGroupSpy.getCalls().map(call => call.args),
            ...consoleLogSpy.getCalls().map(call => call.args),
            ...consoleGroupEndSpy.getCalls().map(call => call.args),
          ],
          [
            ["Group label"],
            ["Label", "Value"],
            [],
          ],
        );

        consoleLogSpy.restore();
        consoleGroupSpy.restore();
        consoleGroupEndSpy.restore();
      });
    });

    describe("useDetectChanges", () => {
      test("it should call the callback when the value changes", () => {
        const callback = spy();
        const { rerender } = renderHook(
          ({ value }) => {
            useDetectChanges(value, callback);
          },
          {
            initialProps: {
              value: 1,
            },
          },
        );

        rerender({
          value: 2,
        });

        assert.deepEqual(
          callback.getCalls().map(call => call.args),
          [
            [1, 2],
          ],
        );
      });

      test("it should call the callback with the custom equality function", () => {
        const callback = spy();
        const { rerender } = renderHook(
          props => {
            useDetectChanges<{ prop: number }>(props, callback, {
              equalityFn: (curr, next) => curr.prop === next.prop,
            });
          },
          {
            initialProps: {
              prop: 1,
            },
          },
        );

        rerender({
          prop: 1,
        });

        assert.deepEqual(callback.getCalls(), []);

        rerender({
          prop: 2,
        });

        assert.deepEqual(
          callback.getCalls().map(call => call.args),
          [
            [{ prop: 1 }, { prop: 2 }],
          ],
        );
      });
    });

    describe("isPlainObject", () => {
      test("it should return true if the value is a plain object", () => {
        assert(isPlainObject({}));
        assert(isPlainObject(Object.create(null)));
      });

      test("it should return false if the value is not a plain object", () => {
        assert(!isPlainObject([]));
        assert(!isPlainObject(() => {}));
        assert(!isPlainObject(null));
        assert(!isPlainObject(undefined));
        assert(!isPlainObject(1));
        assert(!isPlainObject("string"));
        assert(!isPlainObject(Symbol()));
      });
    });

    describe("unreachable", () => {
      test("it should throw an error", () => {
        assert.throws(
          () => {
            unreachable("value" as never);
          },
          {
            message: "unreachable",
          },
        );
      });
    });
  });
}

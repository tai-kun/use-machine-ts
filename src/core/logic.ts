import type { Config, Definition, Machine, State } from "../types";
import type { Tagged } from "../types/utils";
import {
  isPlainObject,
  log,
  type LogOptions,
  unreachable,
  useDetectChanges,
} from "./devutils";
import { doGuard, doGuardForDev, formatGuardResult } from "./guard";
import { useEffect, useLayoutEffect, useMemo, useRef } from "./react";

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
  };
}

/**
 * Basic action type.
 *
 * @template T - The typeof action.
 * @template P - The typeof action payload.
 */
type ActionType<T extends string, P> = {
  readonly type: T;
  readonly payload: P;
};

/**
 * Actions to update state machine state.
 */
export type Action =
  | ActionType<"SEND", Config.Sendable.Signature>
  | ActionType<"SET_CONTEXT", Config.SetContextAction.Signature>;

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
      const { payload } = action;
      const event = typeof payload === "string" ? { type: payload } : payload;
      const stateDef = def.states[state.value]!;

      if (__DEV__) {
        if (!stateDef) {
          log(
            { ...conf, level: "error" },
            `State '${state.value}' not defined.`,
            ["State", state],
            ["Event", event],
          );

          return state;
        }
      }

      const transition = stateDef.on?.[event.type] || def.on?.[event.type];

      if (!transition) {
        if (__DEV__) {
          log(
            { ...conf, level: "debug" },
            `Current state '${state.value}'`
              + ` doesn't listen to event type '${event.type}'.`,
            ["State", state],
            ["Event", event],
          );
        }

        return state;
      }

      const { context } = state;
      const [nextStateValue, guardResult] = typeof transition === "string"
        ? [
          transition,
          { ok: true },
        ]
        : __DEV__
        ? [
          transition.target,
          transition.guard === undefined
            ? { ok: true }
            : doGuardForDev(
              conf,
              transition.guard,
              { event, context },
            ),
        ]
        : [
          transition.target,
          {
            ok: transition.guard === undefined || doGuard(
              conf,
              transition.guard,
              { event, context },
            ),
          },
        ];

      if (__DEV__) {
        if (
          typeof transition !== "string"
          && typeof guardResult.ok === "boolean"
        ) {
          const prodGuardResult = {
            ok: transition.guard === undefined || doGuard(
              conf,
              transition.guard,
              { event, context },
            ),
          };

          if (guardResult.ok !== prodGuardResult.ok) {
            console.error(
              "!!! EMERGENCY (use-machine-ts) !!!\n"
                + "Guard results differ between development and production environments. "
                + "This is probably a serious bug in the library. "
                + "Could you please let me know under what conditions this bug occurs?\n"
                + "  Issue: https://github.com/tai-kun/use-machine-ts/issues/new \n"
                + "Thank you very much for your help!\n",
              "Event",
              event,
              "Transition",
              transition,
              "Guard Result (Development)",
              guardResult,
              "Guard Result (Production)",
              prodGuardResult,
            );
          }
        }
      }

      if (!guardResult.ok) {
        if (__DEV__) {
          log(
            { ...conf, level: "debug" },
            `Transition from '${state.value}' to '${nextStateValue}'`
              + " denied by guard.",
            [
              `%c${formatGuardResult(guardResult as any)}`,
              "font-family: monospace",
            ],
            ["Event", event],
            ["Context", context],
          );
        }

        return state;
      }

      return {
        event,
        value: nextStateValue,
        context,
        nextEvents: Object.keys({
          ...def.states[nextStateValue]?.on,
          ...def.on,
        }),
      };
    }

    case "SET_CONTEXT": {
      const nextContext = action.payload(state.context);

      if (__DEV__) {
        log(
          { ...conf, level: "debug" },
          "Context updated.",
          ["Prev Context", state.context],
          ["Next Context", nextContext],
        );
      }

      return {
        ...state,
        context: nextContext,
      };
    }

    default:
      unreachable(action);
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
  ): void;
} {
  const { effect = [] } = def.states[state.value] || {};
  const entryFns = typeof effect === "string" ? [effect] : effect;

  if (entryFns.length) {
    if (__DEV__) {
      if (!conf.effects) {
        log(
          { ...conf, level: "error" },
          `Effects not defined for state '${state.value}'.`,
          ["Event", state.event],
          ["Context", state.context],
        );

        return;
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
          );

          return;
        }
      }

      if (!isLocked) {
        dispatch({
          type: "SEND",
          payload: event,
        });
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "`send()` not available. "
            + "Must be used synchronously within an effect.",
          ["State", state],
          ["Event", event],
        );
      }
    }

    function setContext(action: Config.SetContextAction.Signature) {
      if (!isLocked) {
        dispatch({
          type: "SET_CONTEXT",
          payload: action,
        });
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "`setContext()` not available. "
            + "Must be used synchronously within an effect.",
          ["State", state],
          ["Action", action],
        );
      }

      return {
        send,
      };
    }

    let isLocked = false;
    const exitFns = entryFns.map(effectName => {
      if (__DEV__) {
        if (typeof conf.effects![effectName] !== "function") {
          log(
            { ...conf, level: "error" },
            `Effect '${effectName}' not defined for state '${state.value}'.`,
            ["Event", state.event],
            ["Context", state.context],
          );

          return;
        }
      }

      return conf.effects![effectName]!({
        send,
        event: state.event,
        context: state.context,
        setContext,
        isMounted() {
          return isMounted.current;
        },
      });
    });
    isLocked = syncMode;

    return params => {
      isLocked = false;
      exitFns.forEach(exit => {
        if (typeof exit === "function") {
          exit({
            ...params,
            send,
            setContext,
            isMounted() {
              return isMounted.current;
            },
          });
        }
      });
      isLocked = syncMode;
    };
  }
}

const useIsomorphicLayoutEffect = typeof document === "undefined"
  ? useEffect
  : useLayoutEffect;

/**
 * This React hook is used to memoize a value that is expensive to compute.
 * Similar to `useMemo`, but also does not have a dependency list and is computed only once, the first time.
 *
 * @template T - The type of the memoized value.
 * @param compute - A function that computes the memoized value.
 * @returns The memoized value.
 */
export function useSingleton<T>(compute: () => T): T {
  return useMemo(compute, []);
}

/**
 * A hook that returns whether the component is mounted.
 *
 * @returns A reference to a boolean that is `true` if the component is mounted, otherwise `false`.
 */
export function useIsMounted(): { readonly current: boolean } {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
  }, []);

  useIsomorphicLayoutEffect(() => () => {
    // Destructor for useInsertionEffect runs before useEffect.
    // Prevent state machine events to unmounted components.
    isMounted.current = false;
  }, []);

  return isMounted;
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
        );
      },
      {
        equalityFn(curr, next) {
          switch (true) {
            case isPlainObject(curr):
              return isPlainObject(next);

            case Array.isArray(curr):
              return Array.isArray(next) && curr.length === next.length;

            case typeof curr === "function":
              return typeof next === "function";

            default:
              unreachable(curr);
          }
        },
      },
    );
  }

  let logOptions: LogOptions | undefined;
  const propsRef = useRef<{}>(undefined);

  if (typeof arg0 === "function") {
    propsRef.current = arg1;
  } else if (!Array.isArray(arg0)) {
    arg0 = arg1 ? [arg0, arg1] : [arg0];
  }

  const machine = useSingleton(() =>
    typeof arg0 === "function"
      ? arg0(() => propsRef.current)
      : arg0 as Machine.Signature // cast for tsd
  );

  if (__DEV__) {
    [, logOptions] = machine;
  }

  return machine;
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
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(
    () => {
      const cleanup = applyEffect(def, conf, state, dispatch, isMounted);

      return typeof cleanup !== "function" ? undefined : () => {
        const { event, context } = stateRef.current;
        cleanup({ event, context });
      };
    },
    [state.value, state.event],
  );
}

if (cfgTest && cfgTest.url === import.meta.url) {
  await import("global-jsdom/register");
  const { renderHook } = await import("@testing-library/react");
  const { assert, describe, sinon, test } = cfgTest;
  const { spy } = sinon;

  describe("src/core/logic", () => {
    describe("createInitialState", () => {
      test("it should return the initial state", () => {
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
        };
        const res = createInitialState(def);

        assert.deepEqual(res, {
          event: { type: "$init" },
          value: "idle",
          context: {},
          nextEvents: ["FETCH"],
        });
      });
    });

    describe("applyDispatch", () => {
      describe("SEND", () => {
        test("it should return the next state", () => {
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
          };
          const conf = {};
          const state = createInitialState(def);
          const action: Action = {
            type: "SEND",
            payload: "FETCH",
          };
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          );

          assert.deepEqual(newState, {
            event: { type: "FETCH" },
            value: "loading",
            context: {},
            nextEvents: ["RESOLVE", "REJECT"],
          });
        });

        test("it should return the same state", () => {
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
          };
          const conf = {};
          const state = {
            event: { type: "IDLE" },
            value: "idle",
            context: {},
            nextEvents: ["IDLE"],
          };
          const action: Action = {
            type: "SEND",
            payload: "IDLE",
          };
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          );

          assert.notEqual(newState, state);
          assert.deepEqual(newState, state);
        });

        test("it should log the event type not found", () => {
          const logSpy = spy();
          const def = {
            initial: "idle",
            context: {},
            states: {
              idle: {},
            },
          };
          const conf = {
            verbose: true,
            console: {
              log: logSpy,
              group: logSpy,
              groupEnd() {},
            },
          };
          const state = createInitialState(def);
          const action: Action = {
            type: "SEND",
            payload: "FETCH",
          };
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          );

          assert.deepEqual(newState, state);
          assert.deepEqual(
            logSpy.getCalls().map(call => call.args),
            [
              ["Current state 'idle' doesn't listen to event type 'FETCH'."],
              ["State", state],
              ["Event", { type: "FETCH" }],
            ],
          );
        });

        test("it should log the transition denied by guard", () => {
          const logSpy = spy();
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
          };
          const conf = {
            verbose: true,
            guards: {
              isAllowed: () => false,
            },
            console: {
              log: logSpy,
              group: logSpy,
              groupEnd() {},
            },
          };
          const state = createInitialState(def);
          const action: Action = {
            type: "SEND",
            payload: "FETCH",
          };
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          );

          assert.deepEqual(newState, state);
          assert.deepEqual(
            logSpy.getCalls().map(call => call.args),
            [
              ["Transition from 'idle' to 'loading' denied by guard."],
              [
                [
                  // dprint-ignore
                  "%c" +
                  "isAllowed",
                  "^^^^^^^^^",
                ].join("\n"),
                "font-family: monospace",
              ],
              ["Event", { type: "FETCH" }],
              ["Context", {}],
            ],
          );
        });
      });

      describe("SET_CONTEXT", () => {
        test("it should update the context", () => {
          const logSpy = spy();
          const def = {
            initial: "idle",
            context: {
              foo: 1,
            },
            states: {
              idle: {},
            },
          };
          const conf = {
            verbose: true,
            console: {
              log: logSpy,
              group: logSpy,
              groupEnd() {},
            },
          };
          const state = createInitialState(def);
          const action: Action = {
            type: "SET_CONTEXT",
            payload: (ctx: any) => ({ ...ctx, bar: 2 }),
          };
          const newState = applyDispatch(
            def,
            conf,
            state,
            action,
          );

          assert.deepEqual(newState, {
            event: { type: "$init" },
            value: "idle",
            context: {
              foo: 1,
              bar: 2,
            },
            nextEvents: [],
          });
          assert.deepEqual(
            logSpy.getCalls().map(call => call.args),
            [
              ["Context updated."],
              ["Prev Context", { foo: 1 }],
              ["Next Context", { foo: 1, bar: 2 }],
            ],
          );
        });
      });
    });

    describe("applyEffect", () => {
      test("it should apply the effect", () => {
        const cleanupSpy = spy<Config.EffectCleanup.Signature>(() => {});
        const dispatchSpy = spy();
        const def = {
          initial: "idle",
          context: {},
          states: {
            idle: {
              effect: "onIdle",
            },
          },
        };
        const conf = {
          effects: {
            onIdle: ({ send }: Config.EffectParams.Signature) => {
              send({
                type: "FETCH",
              });

              return cleanupSpy;
            },
          },
        };
        const state = createInitialState(def);
        const isMounted = { current: true };
        const cleanup = applyEffect(def, conf, state, dispatchSpy, isMounted);
        cleanup!({
          event: { type: "FETCH" },
          context: {},
        });

        assert.deepEqual(
          dispatchSpy.getCalls().map(call => call.args),
          [
            [
              {
                type: "SEND",
                payload: {
                  type: "FETCH",
                },
              },
            ],
          ],
        );
        assert.equal(cleanupSpy.callCount, 1);

        const params = cleanupSpy.getCall(0).args[0];

        assert.equal(typeof params.send, "function");
        assert.equal(typeof params.setContext, "function");
        assert.deepEqual(params.event, { type: "FETCH" });
        assert.deepEqual(params.context, {});
      });

      test("it should error if dispatch is called asynchronously in sync mode", async () => {
        const { promise, resolve } = Promise.withResolvers<void>();
        const errorSpy = spy();
        const dispatchSpy = spy();
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
        };
        const conf = {
          console: {
            log() {},
            error: errorSpy,
          },
          effects: {
            onIdle: ({ send }: Config.EffectParams.Signature) => {
              setTimeout(
                () => {
                  send("FETCH");
                  resolve();
                },
                0,
              );
            },
          },
        };
        const state = createInitialState(def);
        const isMounted = { current: true };
        applyEffect(def, conf, state, dispatchSpy, isMounted, true);

        await promise;

        assert.equal(dispatchSpy.callCount, 0);
        assert.deepEqual(
          errorSpy.getCalls().map(call => call.args),
          [
            [
              "`send()` not available. Must be used synchronously within an effect.",
            ],
            [
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
            ["Event", "FETCH"],
          ],
        );
      });
    });

    describe("useIsMounted", () => {
      test("it should return a reference to a boolean that is true if the component is mounted, otherwise false", () => {
        const capture = {
          effect: {
            entry: undefined as boolean | undefined,
            exit: undefined as boolean | undefined,
          },
        };
        const { unmount } = renderHook(() => {
          const isMounted = useIsMounted();

          useEffect(() => {
            capture.effect.entry = isMounted.current;

            return () => {
              capture.effect.exit = isMounted.current;
            };
          });
        });

        assert.deepEqual(capture, {
          effect: {
            entry: true,
            exit: undefined,
          },
        });

        unmount();

        assert.deepEqual(capture, {
          effect: {
            entry: true,
            exit: false,
          },
        });
      });
    });

    describe("useInstance", () => {
      test("it should return the state machine definition and configuration", () => {
        const def: any = {};
        const conf = { verbose: true };
        const { result } = renderHook(() => useInstance([def, conf], []));

        assert.deepEqual(result.current, [def, conf]);
      });
    });

    describe("useSyncState", () => {
      test("it should apply the effect", () => {
        const cleanup = spy<Config.EffectCleanup.Signature>(() => {});
        const effect = spy<Config.Effect.Signature>(() => cleanup);
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
        };
        const conf: Config.Signature = {
          effects: {
            effect,
          },
        };
        const { rerender } = renderHook(({ state }) => {
          const isMounted = useIsMounted();
          useSyncState(def, conf, state, () => {}, isMounted);
        }, {
          initialProps: {
            state: createInitialState(def),
          },
        });

        assert.equal(effect.callCount, 1);
        assert.equal(cleanup.callCount, 0);

        const params = effect.getCall(0).args[0];

        assert.deepEqual(params.event, { type: "$init" });

        rerender({
          state: {
            value: "b",
            context: undefined,
            event: { type: "NEXT" },
            nextEvents: ["NEXT"],
          },
        });

        assert.equal(effect.callCount, 1);
        assert.equal(cleanup.callCount, 1);

        const cleanupParams = cleanup.getCall(0).args[0];

        assert.deepEqual(cleanupParams.event, { type: "NEXT" });
      });
    });
  });
}

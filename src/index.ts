export { and, not, or } from "./core/guard"
export { createMachine } from "./createMachine"
export { createSharedMachine } from "./createSharedMachine"
export type * from "./types"
export { useMachine } from "./useMachine"
export { useSharedMachine } from "./useSharedMachine"
export { useSyncedMachine } from "./useSyncedMachine"

if (cfgTest && cfgTest.url === import.meta.url) {
  const tty = await import("node:tty")
  const { Console } = await import("node:console")
  await import("global-jsdom/register")
  const {
    createElement,
    useEffect,
    useMemo,
    useSyncExternalStore,
  } = await import("react")
  const {
    act,
    fireEvent,
    render,
    renderHook,
  } = await import("@testing-library/react")
  const { createMachine } = await import("./createMachine")
  const { createSharedMachine } = await import("./createSharedMachine")
  const { useMachine } = await import("./useMachine")
  const { useSharedMachine } = await import("./useSharedMachine")
  const { useSyncedMachine } = await import("./useSyncedMachine")
  const { assert, describe, mock, test } = cfgTest

  function createInvocationCallOrder() {
    const order: string[] = []

    return {
      get current() {
        return order
      },
      register(name: string): (...args: any) => void {
        return () => {
          order.push(name)
        }
      },
    }
  }

  function useMachineUsingMachineFactory(...args: [any]) {
    const machine = useMemo(() => () => createMachine(...args), [])

    return useMachine(machine)
  }

  function useMachineUsingPredefinedMachine(...args: [any]) {
    const machine = useMemo(() => createMachine(...args), [])

    return useMachine(machine)
  }

  function useMachineUsingUseSharedMachine(...args: [any]) {
    const machine = useMemo(() => createSharedMachine(...args), [])

    return useSharedMachine(machine)
  }

  function useMachineUsingUseSyncedMachine(...args: [any]) {
    const [state, send] = useSyncedMachine(...args)
    const { subscribe, sendAndNotify } = useMemo(
      () => {
        const callbacks = new Set<() => void>()

        return {
          subscribe(callback: () => void) {
            callbacks.add(callback)

            return () => {
              callbacks.delete(callback)
            }
          },
          sendAndNotify(event: any) {
            send(event)

            for (const callback of callbacks) {
              callback()
            }
          },
        }
      },
      [],
    )

    return [
      useSyncExternalStore(subscribe, state, state),
      sendAndNotify,
    ]
  }

  const hooks = {
    useMachineOrigin: useMachine,
    useMachineUsingMachineFactory,
    useMachineUsingPredefinedMachine,
    useMachineUsingUseSharedMachine,
    useMachineUsingUseSyncedMachine,
  } as unknown as Record<string, typeof useMachine>

  for (const [hookName, useHook] of Object.entries(hooks)) {
    describe(hookName, () => {
      // These tests are based on the following file:
      // https://github.com/cassiozen/useStateMachine/blob/main/test/index.test.ts

      describe("States & Transitions", () => {
        test("should set initial state", () => {
          const { result } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: { ACTIVATE: "active" },
                },
                active: {
                  on: { DEACTIVATE: "inactive" },
                },
              },
            })
          )
          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: { type: "$init" },
            value: "inactive",
            nextEvents: ["ACTIVATE"],
          })
        })

        test("should transition", () => {
          const { result } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: { ACTIVATE: "active" },
                },
                active: {
                  on: { DEACTIVATE: "inactive" },
                },
              },
            })
          )
          const [, send] = result.current

          act(() => {
            send("ACTIVATE")
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: {
              type: "ACTIVATE",
            },
            value: "active",
            nextEvents: ["DEACTIVATE"],
          })
        })

        test("should transition using a top-level `on`", () => {
          const { result } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: { ACTIVATE: "active" },
                },
                active: {
                  on: { DEACTIVATE: "inactive" },
                },
              },
              on: {
                FORCE_ACTIVATE: "active",
              },
            })
          )
          const [, send] = result.current

          act(() => {
            send("FORCE_ACTIVATE")
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: {
              type: "FORCE_ACTIVATE",
            },
            value: "active",
            nextEvents: ["DEACTIVATE", "FORCE_ACTIVATE"],
          })
        })

        test("should transition using an object event", () => {
          const { result } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: { ACTIVATE: "active" },
                },
                active: {
                  on: { DEACTIVATE: "inactive" },
                },
              },
            })
          )
          const [, send] = result.current

          act(() => {
            send({ type: "ACTIVATE" })
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: {
              type: "ACTIVATE",
            },
            value: "active",
            nextEvents: ["DEACTIVATE"],
          })
        })

        test("should ignore unexisting events", () => {
          const { result } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: { TOGGLE: "active" },
                },
                active: {
                  on: { TOGGLE: "inactive" },
                },
              },
            })
          )
          const [, send] = result.current

          act(() => {
            // TypeScript won"t allow me to type "ON" because it knows it"s not a valid event
            // @ts-expect-error
            send("ON")
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: { type: "$init" },
            value: "inactive",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should transition with object syntax", () => {
          const { result } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: {
                    TOGGLE: {
                      target: "active",
                    },
                  },
                },
                active: {
                  on: {
                    TOGGLE: {
                      target: "inactive",
                    },
                  },
                },
              },
            })
          )
          const [, send] = result.current

          act(() => {
            send("TOGGLE")
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: {
              type: "TOGGLE",
            },
            value: "active",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should invoke effect callbacks", () => {
          const invocationCallOrder = createInvocationCallOrder()
          const entry = mock.fn(invocationCallOrder.register("entry"))
          const exit = mock.fn(invocationCallOrder.register("exit"))
          const { result } = renderHook(() =>
            useHook(
              {
                initial: "inactive",
                states: {
                  inactive: {
                    on: { TOGGLE: "active" },
                    effect: "onInactive",
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                    effect: "onActive",
                  },
                },
              },
              {
                effects: {
                  onInactive: () => {
                    entry("inactive")

                    return exit.bind(null, "inactive")
                  },
                  onActive: () => {
                    entry("active")

                    return exit.bind(null, "active")
                  },
                },
              },
            )
          )
          const [, send] = result.current

          act(() => {
            send("TOGGLE")
          })

          assert.equal(entry.mock.callCount(), 2)
          assert.equal(exit.mock.callCount(), 1)

          assert.deepEqual(invocationCallOrder.current, [
            "entry",
            "exit",
            "entry",
          ])

          assert.equal(entry.mock.calls.at(0)?.arguments[0], "inactive")
          assert.equal(entry.mock.calls.at(1)?.arguments[0], "active")

          assert.equal(exit.mock.calls.at(0)?.arguments[0], "inactive")
        })

        test("should transition from effect", () => {
          const { result } = renderHook(() =>
            useHook(
              {
                initial: "inactive",
                states: {
                  inactive: {
                    on: { TOGGLE: "active" },
                    effect: "onInactive",
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                  },
                },
              },
              {
                effects: {
                  onInactive: ({ send }) => {
                    send("TOGGLE")
                  },
                },
              },
            )
          )
          const [state] = result.current

          assert.deepEqual(state, {
            context: undefined,
            event: {
              type: "TOGGLE",
            },
            value: "active",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should get payload sent with event object", () => {
          const effect = mock.fn()
          const { result } = renderHook(() =>
            useHook(
              {
                $schema: {} as {
                  events: {
                    ACTIVATE: { number: number }
                  }
                },
                context: undefined,
                initial: "inactive",
                states: {
                  inactive: {
                    on: { ACTIVATE: "active" },
                  },
                  active: {
                    on: { DEACTIVATE: "inactive" },
                    effect: "onActivate",
                  },
                },
              },
              {
                effects: {
                  onActivate: effect,
                },
              },
            )
          )
          const [, send] = result.current

          act(() => {
            send({
              type: "ACTIVATE",
              number: 10,
            })
          })

          assert.deepEqual(effect.mock.calls.at(0)?.arguments[0].event, {
            type: "ACTIVATE",
            number: 10,
          })
        })

        test("should invoke effect with context as a parameter", () => {
          const finalEffect = mock.fn()
          const initialEffect = mock.fn(({ setContext }) => {
            setContext((context: boolean) => !context)
              .send("TOGGLE")
          })

          renderHook(() =>
            useHook(
              {
                context: false,
                initial: "inactive",
                states: {
                  inactive: {
                    on: { TOGGLE: "active" },
                    effect: "onInactive",
                  },
                  active: {
                    effect: "onActive",
                  },
                },
              },
              {
                effects: {
                  onActive: finalEffect,
                  onInactive: initialEffect,
                },
              },
            )
          )

          assert.equal(initialEffect.mock.callCount(), 1)
          assert.equal(
            initialEffect.mock.calls.at(0)?.arguments[0].context,
            false, // initial context
          )

          assert.equal(finalEffect.mock.callCount(), 1)
          assert.equal(finalEffect.mock.calls.at(0)?.arguments[0].context, true)
        })
      })

      describe("guarded transitions", () => {
        test("should block transitions with guard returning false", () => {
          const guard = mock.fn(() => false)
          const { result } = renderHook(() =>
            useHook(
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
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                  },
                },
              },
              {
                guards: {
                  isOk: guard,
                },
              },
            )
          )
          const [, send] = result.current

          act(() => {
            send("TOGGLE")
          })

          const [state] = result.current

          assert.equal(guard.mock.callCount(), 2) // Called twice in development environment
          assert.deepEqual(state, {
            context: undefined,
            event: { type: "$init" },
            value: "inactive",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should allow transitions with guard returning true", () => {
          const guard = mock.fn(() => true)
          const { result } = renderHook(() =>
            useHook(
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
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                  },
                },
              },
              {
                guards: {
                  isOk: guard,
                },
              },
            )
          )
          const [, send] = result.current

          act(() => {
            send("TOGGLE")
          })

          const [state] = result.current

          assert.equal(guard.mock.callCount(), 2) // Called twice in development environment
          assert.deepEqual(state, {
            context: undefined,
            event: {
              type: "TOGGLE",
            },
            value: "active",
            nextEvents: ["TOGGLE"],
          })
        })
      })

      describe("Extended State", () => {
        test("should set initial context", () => {
          const { result } = renderHook(() =>
            useHook({
              context: { foo: "bar" },
              initial: "inactive",
              states: {
                inactive: {
                  on: { TOGGLE: "active" },
                },
                active: {
                  on: { TOGGLE: "inactive" },
                },
              },
            })
          )
          const [state] = result.current

          assert.deepEqual(state, {
            context: { foo: "bar" },
            event: { type: "$init" },
            value: "inactive",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should get the context inside effects", () => {
          const effect = mock.fn()
          const { result } = renderHook(() =>
            useHook(
              {
                context: { foo: "bar" },
                initial: "inactive",
                states: {
                  inactive: {
                    on: { TOGGLE: "active" },
                    effect: "onInactive",
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                  },
                },
              },
              {
                effects: {
                  onInactive: effect,
                },
              },
            )
          )

          assert.equal(effect.mock.callCount(), 1)
          assert.deepEqual(effect.mock.calls.at(0)?.arguments[0].context, {
            foo: "bar",
          })
          assert.deepEqual(effect.mock.calls.at(0)?.arguments[0].event, {
            type: "$init",
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: { foo: "bar" },
            event: { type: "$init" },
            value: "inactive",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should update context on entry", () => {
          const { result } = renderHook(() =>
            useHook(
              {
                context: { toggleCount: 0 },
                initial: "inactive",
                states: {
                  inactive: {
                    on: { TOGGLE: "active" },
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                    effect: "onActive",
                  },
                },
              },
              {
                effects: {
                  onActive: ({ setContext }) => {
                    setContext(c => ({ toggleCount: c.toggleCount + 1 }))
                  },
                },
              },
            )
          )

          const [, send] = result.current

          act(() => {
            send("TOGGLE")
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: { toggleCount: 1 },
            event: {
              type: "TOGGLE",
            },
            value: "active",
            nextEvents: ["TOGGLE"],
          })
        })

        test("should update context on exit", () => {
          const { result } = renderHook(() =>
            useHook(
              {
                context: { toggleCount: 0 },
                initial: "inactive",
                states: {
                  inactive: {
                    on: { TOGGLE: "active" },
                    effect: "onInactive",
                  },
                  active: {
                    on: { TOGGLE: "inactive" },
                  },
                },
              },
              {
                effects: {
                  onInactive: () => ({ setContext }) => {
                    setContext(c => ({ toggleCount: c.toggleCount + 1 }))
                  },
                },
              },
            )
          )

          const [, send] = result.current

          act(() => {
            send("TOGGLE")
          })

          const [state] = result.current

          assert.deepEqual(state, {
            context: { toggleCount: 1 },
            event: {
              type: "TOGGLE",
            },
            value: "active",
            nextEvents: ["TOGGLE"],
          })
        })
      })

      describe("Logger", () => {
        function format(...xs: any[]) {
          return xs.reduce(
            (a, x) =>
              [
                a,
                typeof x === "string"
                  ? x
                  : JSON.stringify(x),
              ].join(""),
            "",
          )
        }

        function createConsole() {
          const console_ = {
            log: mock.fn(format),
            error: mock.fn(format),
            group: mock.fn(format),
            groupEnd() {},
          }

          return {
            ...console_,
            get results() {
              return {
                group: console_.group.mock.calls.map(c => c.result),
                error: console_.error.mock.calls.map(c => c.result),
                log: console_.log.mock.calls.map(c => c.result),
              }
            },
          }
        }

        test("should log when invalid event is provided as string", () => {
          const console_ = createConsole()
          renderHook(() =>
            useHook(
              {
                initial: "idle",
                states: {
                  idle: {
                    effect: "onIdle",
                  },
                },
              },
              {
                verbose: true,
                console: console_,
                effects: {
                  onIdle: ({ send }) => {
                    // @ts-expect-error
                    send("invalid")
                  },
                },
              },
            )
          )

          assert.deepEqual(console_.results, {
            group: [
              "Current state 'idle' doesn't listen to event type 'invalid'.",
            ],
            error: [],
            log: [
              "State{\"event\":{\"type\":\"$init\"},\"value\":\"idle\",\"nextEvents\":[]}",
              "Event{\"type\":\"invalid\"}",
            ],
          })
        })

        test("should log when invalid event is provided as object", () => {
          const console_ = createConsole()
          renderHook(() =>
            useHook(
              {
                initial: "idle",
                states: {
                  idle: {
                    effect: "onIdle",
                  },
                },
              },
              {
                verbose: true,
                console: console_,
                effects: {
                  onIdle: ({ send }) => {
                    // @ts-expect-error
                    send({ type: "invalid" })
                  },
                },
              },
            )
          )

          assert.deepEqual(console_.results, {
            group: [
              "Current state 'idle' doesn't listen to event type 'invalid'.",
            ],
            error: [],
            log: [
              "State{\"event\":{\"type\":\"$init\"},\"value\":\"idle\",\"nextEvents\":[]}",
              "Event{\"type\":\"invalid\"}",
            ],
          })
        })
      })

      describe("React performance", () => {
        test("should provide a stable `send`", () => {
          const { result, rerender } = renderHook(() =>
            useHook({
              initial: "inactive",
              states: {
                inactive: {
                  on: { TOGGLE: "active" },
                },
                active: {
                  on: { TOGGLE: "inactive" },
                },
              },
            })
          )

          const [, send1] = result.current

          act(() => {
            rerender()
          })

          const [, send2] = result.current

          assert.equal(send1, send2)
        })
      })
    })
  }

  // These tests are the original tests for use-machine-ts.

  describe("useMachine", () => {
    test("definition and config should be immutable", () => {
      const onToggle1 = mock.fn()
      const onToggle2 = mock.fn()
      const { result, rerender } = renderHook(
        ({ onToggle }) =>
          useMachine(
            {
              initial: "inactive",
              states: {
                inactive: {
                  on: { TOGGLE: "active" },
                  effect: "onToggle",
                },
                active: {
                  on: { TOGGLE: "inactive" },
                  effect: "onToggle",
                },
              },
            },
            {
              effects: {
                onToggle: () => {
                  onToggle()
                },
              },
            },
          ),
        {
          initialProps: {
            onToggle: onToggle1,
          },
        },
      )
      const callCountOfOnToggle1 = onToggle1.mock.callCount()

      assert(callCountOfOnToggle1 > 0)

      rerender({
        onToggle: onToggle2,
      })

      const [, send] = result.current

      act(() => {
        send("TOGGLE")
      })

      assert(onToggle1.mock.callCount() > callCountOfOnToggle1)
      assert(onToggle2.mock.callCount() === 0)
    })

    test("should transfer props to state machine", () => {
      const machine = (props: () => { onToggle: any }) => {
        return createMachine(
          {
            initial: "inactive",
            states: {
              inactive: {
                on: { TOGGLE: "active" },
                effect: "onToggle",
              },
              active: {
                on: { TOGGLE: "inactive" },
                effect: "onToggle",
              },
            },
          },
          {
            effects: {
              onToggle: () => {
                const { onToggle } = props()
                onToggle()
              },
            },
          },
        )
      }
      const onToggle1 = mock.fn()
      const onToggle2 = mock.fn()
      const { result, rerender } = renderHook(
        ({ onToggle }) => useMachine(machine, { onToggle }),
        {
          initialProps: {
            onToggle: onToggle1,
          },
        },
      )
      const callCountOfOnToggle1 = onToggle1.mock.callCount()

      assert(callCountOfOnToggle1 > 0)

      rerender({
        onToggle: onToggle2,
      })

      const [, send] = result.current

      act(() => {
        send("TOGGLE")
      })

      assert(onToggle1.mock.callCount() === callCountOfOnToggle1)
      assert(onToggle2.mock.callCount() > 0)
    })

    test("should logs when `send` function is called asynchronously", () => {
      const groupSpy = mock.fn()
      const errorSpy = mock.fn()
      let sendFn: () => void
      const { unmount } = renderHook(() =>
        useMachine(
          {
            $schema: {} as {
              events: {
                TOGGLE: {
                  mount: boolean
                }
              }
            },
            initial: "inactive",
            states: {
              inactive: {
                on: { TOGGLE: "active" },
                effect: "entry",
              },
              active: {},
            },
          },
          {
            effects: {
              entry: ({ send, isMounted }) => {
                sendFn = () => {
                  send({
                    type: "TOGGLE",
                    mount: isMounted(),
                  })
                }
              },
            },
            console: {
              log() {},
              error: errorSpy,
              group: groupSpy,
              groupEnd() {},
            },
          },
        )
      )
      unmount()
      sendFn!()

      assert.deepEqual(
        groupSpy.mock.calls.map(call => call.arguments),
        [
          [
            "Cannot dispatch an action to the state machine after it is unmounted.",
          ],
        ],
      )
      assert.deepEqual(
        errorSpy.mock.calls.map(call => call.arguments),
        [
          [
            "Action",
            {
              type: "SEND",
              payload: {
                type: "TOGGLE",
                mount: false,
              },
            },
          ],
        ],
      )
    })
  })

  describe("useSharedMachine", () => {
    test("should share state machine state between hooks", () => {
      const machine = createSharedMachine({
        initial: "inactive",
        states: {
          inactive: {
            on: { TOGGLE: "active" },
          },
          active: {
            on: { TOGGLE: "inactive" },
          },
        },
      })
      const { result: result1 } = renderHook(() => useSharedMachine(machine))
      const [state1, sendFrom1] = result1.current

      assert.deepEqual(state1, {
        context: undefined,
        event: { type: "$init" },
        value: "inactive",
        nextEvents: ["TOGGLE"],
      })

      act(() => {
        sendFrom1("TOGGLE")
      })

      const [state1_2] = result1.current

      assert.deepEqual(state1_2, {
        context: undefined,
        event: { type: "TOGGLE" },
        value: "active",
        nextEvents: ["TOGGLE"],
      })

      const { result: result2 } = renderHook(() => useSharedMachine(machine))
      const [state2, sendFrom2] = result2.current

      assert.deepEqual(state2, {
        context: undefined,
        event: { type: "TOGGLE" },
        value: "active",
        nextEvents: ["TOGGLE"],
      })

      act(() => {
        sendFrom2("TOGGLE")
      })

      const [state2_2] = result2.current
      const [state1_3] = result1.current

      assert.deepEqual(state2_2, {
        context: undefined,
        event: { type: "TOGGLE" },
        value: "inactive",
        nextEvents: ["TOGGLE"],
      })
      assert.deepEqual(state2_2, state1_3)
    })
  })

  describe("useSyncedMachine", () => {
    test("should not be re-rendered even after state transition", () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        const machine = useSyncedMachine({
          initial: "inactive",
          states: {
            inactive: {
              on: { TOGGLE: "active" },
            },
            active: {
              on: { TOGGLE: "inactive" },
            },
          },
        })
        useEffect(() => {
          renderCount++
        })

        return machine
      })
      const [state1, send] = result.current

      assert.equal(renderCount, 1)
      assert.deepEqual(state1(), {
        context: undefined,
        event: { type: "$init" },
        value: "inactive",
        nextEvents: ["TOGGLE"],
      })

      act(() => {
        send("TOGGLE")
      })

      const [state2] = result.current

      assert.equal(renderCount, 1)
      assert.deepEqual(state2(), {
        context: undefined,
        event: { type: "TOGGLE" },
        value: "active",
        nextEvents: ["TOGGLE"],
      })
      assert.equal(state1, state2)
    })

    test("should update the state synchronously", () => {
      const logs: unknown[] = []
      const stdout = new tty.WriteStream(1)
      const console = new Console(stdout)
      mock.method(stdout, "write", (data: any) => {
        logs.push(
          (data = data.toString().trim()).startsWith("<JSON> ")
            ? JSON.parse(data.slice("<JSON> ".length))
            : data,
        )

        return true // Keep the stream open
      })

      function Switch(_: {}) {
        const [getState, send] = useSyncedMachine({
          initial: "off",
          context: 0,
          states: {
            off: {
              on: { TOGGLE: "on" },
              effect: "onChange",
            },
            on: {
              on: { TOGGLE: "off" },
              effect: "onChange",
            },
          },
        }, {
          effects: {
            onChange: ({ setContext }) => {
              console.count("entryEffect")

              setContext(ctx => ctx + 1)

              return () => {
                console.count("exitEffect")
              }
            },
          },
        })

        console.debug("render")

        return createElement("button", {
          type: "button",
          onClick() {
            console.count("beforeSend")
            console.debug("<JSON>", JSON.stringify(getState()))

            send("TOGGLE")

            console.count("afterSend")
            console.debug("<JSON>", JSON.stringify(getState()))
          },
        })
      }

      const { getByRole, unmount } = render(createElement(Switch))
      const button = getByRole("button")
      fireEvent.click(button)
      unmount()

      assert.deepEqual(logs, [
        "render",
        // The first effect callback is invoked inside `React.useEffect`.
        "entryEffect: 1",
        // Clicking the button triggers the state transition.
        "beforeSend: 1",
        {
          event: { type: "$init" },
          value: "off",
          context: 1,
          nextEvents: ["TOGGLE"],
        },
        // The effect callback is invoked synchronously,
        // regardless of the React lifecycle.
        "exitEffect: 1",
        "entryEffect: 2",
        // The state has been updated at this point.
        "afterSend: 1",
        {
          event: { type: "TOGGLE" },
          value: "on",
          context: 2,
          nextEvents: ["TOGGLE"],
        },
        // The exit-effect callback is invoked when it is unmounted.
        "exitEffect: 2",
      ])
    })
  })
}

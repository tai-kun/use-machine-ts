import type { Config, Definition, Machine } from "./types"

/**
 * Create a state machine.
 *
 * @template D - The type of state machine definition.
 * @param definition - The state machine definition.
 * @returns The state machine.
 */
function createMachine<D extends Definition.Shape<D, never, never>>(
  definition: Definition.Exact<D>,
): Machine<D>

/**
 * Create a state machine.
 *
 * @template D - The type of state machine definition.
 * @template G - The type of guards for state machine functions.
 * @template E - The type of effects for state machine functions.
 * @param definition - The state machine definition.
 * @param config - The state machine configuration.
 * @returns The state machine.
 */
function createMachine<
  D extends Definition.Shape<D, G, E>,
  const G extends string = never,
  const E extends string = never,
>(
  definition: Definition.Exact<D>,
  config: Config.Exact<D, G, E>,
): Machine<D>

function createMachine(...args: any) {
  return args
}

export { createMachine }
export { and, not, or } from "./core/logic"
export type * from "./types"

if (cfgTest && cfgTest.url === import.meta.url) {
  const { expectType } = await import("tsd")
  const { assert, describe, test } = cfgTest

  describe("src/createMachine", () => {
    test("strict: false", () => {
      const machine = createMachine(
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

      assert.equal(machine.length, 2)
    })

    test("strict: true", () => {
      const machine = createMachine(
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

      assert.equal(machine.length, 2)
    })
  })
}

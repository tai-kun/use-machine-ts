// dprint-ignore-file

import type {
  Extends,
  Get,
  InferNarrowestValue,
  IsLiteralBoolean,
  IsLiteralString,
  IsPlainObject,
  RequiredKeysOf,
  Tagged,
} from "./utils"

/**
 * The type of reserved keywords for library use.
 * 
 * - `$init`: Initial state value.
 * - `Error:${any}`: String that reports an error.
 */
export type ReservedKeyword =
  | "$init"
  | `Error:${any}`

/**
 * The type of guard for state machine.
 * 
 * @template G - The type of guard names for state machine functions.
 */
export type Guard<G extends string> = G | Guard.Op<G>

export namespace Guard {
  export type Signature =
    | Tagged<string, "GuardName">
    | Op<Tagged<string, "GuardName">>

  /**
   * The type of guard for state machine.
   * Inverts the boolean value returned by the guard function.
   * 
   * @template G - The type of guard names for state machine functions.
   */
  export type Not<G extends string> = {
    readonly op: "not"
    readonly value: G | Op<G>
  }

  /**
   * The type of guard for state machine.
   * Combines the results of multiple guard functions using the logical `&&` operator.
   * 
   * **Note: An empty guards will be `true`.**
   * 
   * @template G - The type of guard names for state machine functions.
   */
  export type And<G extends string> = readonly (G | Op<G>)[]

  /**
   * The type of guard for state machine.
   * Combines the results of multiple guard functions using the logical `||` operator.
   * 
   * **Note: An empty guards will be `false`.**
   * 
   * @template G - The type of guard names for state machine functions.
   */
  export type Or<G extends string> = {
    readonly op: "or"
    readonly value: readonly (G | Op<G>)[]
  }

  /**
   * The type of guard for state machine.
   * 
   * @template G - The type of guard names for state machine functions.
   */
  export type Op<G extends string> = Not<G> | And<G> | Or<G>
}

/**
 * The type of transition for state machine.
 * 
 * @template D - The type of definition for state machine.
 * @template G - The type of guards for state machine functions.
 * @template _T - (internal) The type of state value.
 */
export type Transition<
  D,
  G extends string,
  _T = keyof Get<D, ["states"]>,
> =
  // If no guards are defined, return an error.
    [_T] extends [never]
  ? "Error: State values are not defined."
  // If the state value is not a literal string, return an error.
  : IsLiteralString<_T> extends false
  ? "Error: State values must be literal strings."
  // If the state value is reserved, return an error.
  : Extends<_T, ReservedKeyword> extends true
  ? `Error: State value '${Extract<_T, string>}' is reserved.`
  // Else, return the transition.
  : (
      | _T
      | {
          /**
           * The state value to transition to.
           */
          readonly target: _T
          /**
           * The guards to check before the transition.
           * Combines the results of multiple guard functions using the logical AND operator.
           * 
           * **Note: An empty guards will be `true`.**
           */
          readonly guard?:
            // If no guards are defined, return an error.
              [G] extends [never]
            ? "Error: Guards are not defined."
            // If the guard is not a literal string, return an error.
            : IsLiteralString<G> extends false
            ? "Error: Guards must be literal strings."
            //  If the guard is reserved, return an error.
            : Extends<G, ReservedKeyword> extends true
            ? `Error: Guard name '${G}' is reserved.`
            // Else, return the guard.
            : Guard<G>
        }
    )

export namespace Transition {
  export type Signature = Tagged<string, "StateValue"> | {
    /**
     * The state value to transition to.
     */
    readonly target: Tagged<string, "StateValue">
    /**
     * The guards to check before the transition.
     * Combines the results of multiple guard functions using the logical AND operator.
     * 
     * **Note: An empty guards will be `true`.**
     */
    readonly guard?: Guard.Signature
  }
}

/**
 * The type of event type constraint.
 * 
 * @template D - The type of definition for state machine.
 * @see {@link On}
 */
type _EventTypeConstraint<D> =
  Get<D, ["$schema", "strict"]> extends true
    ? keyof Get<D, ["$schema", "events"]>
    : string

declare const NEVER: unique symbol

/**
 * The type of definition how a state machine will transition when it receives a specific event.
 * 
 * @template D - The type of definition for state machine.
 * @template P - The type of path from definition root to here.
 * @template G - The type of guards for state machine functions.
 */
export type On<
  D,
  P extends ReadonlyArray<keyof any>,
  G extends string,
> =
    [keyof Get<D, P>] extends [never]
  ? { [NEVER]?: never }
  // If the event is not a literal string, return an error.
  : IsLiteralString<keyof Get<D, P>> extends false
  ? "Error: Event types must be literal strings."
  // Else, return the transitions.
  : {
      readonly [T in keyof Get<D, P>]:
        // If the event is reserved, return an error.
          T extends ReservedKeyword
        ? `Error: Event type '${T}' is reserved.`
        // If the event is not defined in `$schema.events`, return an error.
        : Extends<T, _EventTypeConstraint<D>> extends false
        ? "Error: Event type is not defined in `$schema.events`."
        // Else, return the transition.
        : Transition<D, G>
    }

export namespace On {
  export type Signature = {
    readonly [eventType: Tagged<string, "EventType">]: Transition.Signature
  }
}

/**
 * The type of effect for state machine.
 * 
 * @template E - The type of effect names for state machine functions.
 */
export type Effect<E extends string> = E | readonly E[]

export namespace Effect {
  export type Signature = Effect<Tagged<string, "EffectName">>
}

/**
 * The state definition.
 * 
 * @template D - The type of definition for state machine.
 * @template P - The type of path from definition root to here.
 * @template G - The type of guards for state machine functions.
 * @template E - The type of effects for state machine functions.
 */
export type State<
  D,
  P extends ReadonlyArray<keyof any>,
  G extends string,
  E extends string,
> = {
  /**
   * The type of definition how a state machine will transition when it receives a specific event.
   */
  readonly on?: On<D, [...P, "on"], G>
  /**
   * The actions to perform when the state is entered.
   */
  readonly effect?:
    // If no effects are defined, return an error.
      [E] extends [never]
    ? "Error: Effects are not defined."
    // If the effect is not a literal string, return an error.
    : IsLiteralString<E> extends false
    ? "Error: Effects must be literal strings."
    // Else, return the effect.
    : Effect<E>
}

export namespace State {
  export type Signature = {
    /**
     * The type of definition how a state machine will transition when it receives a specific event.
     */
    readonly on?: On.Signature
    /**
     * The actions to perform when the state is entered.
     */
    readonly effect?: Effect.Signature
  }
}

declare const ERROR: unique symbol

/**
 * The type of context for state machine.
 * 
 * @template D - The type of definition for state machine.
 */
export type Context<D> =
  // If in strict mode, the context should be satisfies the schema.
    Get<D, ["$schema", "strict"]> extends true
  ? "context" extends keyof Get<D, ["$schema"]>
    ? Get<D, ["$schema", "context"]>
    : { [ERROR]: "Error: `context` is not defined in `$schema`." }
  // Else, the context can be any type.
  : Get<
      // If the context schema is defined, return the context.
      D, ["$schema", "context"],
      Get<
        // If the context schema is not defined,
        // but the context is defined, return the context.
        D, ["context"],
        // Else, return `undefined`.
        undefined
      >
    >

export namespace Context {
  export type Signature = unknown
}

/**
 * The type of schema for state machine.
 * 
 * @template D - The type of definition for state machine.
 * @template P - The type of path from definition root to here.
 * @template _S - (internal) The type of schema.
 * @template _T - (internal) The type of `strict` property in schema.
 * @template _E - (internal) The type of `events` property in schema.
 * @template _C - (internal) The type of `context` property in schema.
 */
export type Schema<
  D,
  P extends ReadonlyArray<keyof any>,
  _S = Get<D, P>,
  _T = Get<_S, ["strict"]>,
  _E = Get<_S, ["events"]>,
  _C = Get<_S, ["context"]>,
> = {
  /**
   * - `true` - Reports errors for contexts and events that are not defined in the schema.
   * - `false` - Type inference is performed whenever possible.
   */
  readonly strict?:
    // If the `strict` property is not a literal boolean, return an error.
      IsLiteralBoolean<_T> extends false
    ? "Error: `strict` must be a `true` or `false`."
    // Else, return the `strict` property.
    : _T
  /**
   * The event types that are allowed in the state machine.
   */
  readonly events?:
    // If no events are defined, return an empty object.
      [keyof _E] extends [never]
    ? { [NEVER]?: never }
    // If the event type is not a literal string, return an error.
    : IsLiteralString<keyof _E> extends false
    ? "Error: Event types must be literal strings."
    // Else, return the event type.
    : {
        [T in keyof _E]:
          // If the event type is reserved, return an error.
            T extends ReservedKeyword
          ? `Error: Event type '${T}' is reserved.`
          // If the event is not a plain object, return an error.
          : IsPlainObject<_E[T]> extends false
          ? "Error: Event must be a plain object."
          // If the event has a property `type`, return an error.
          : "type" extends keyof _E[T]
          ? "Error: Event cannot have a reserved property 'type'."
          // Else, return the event.
          : _E[T]
      }
  /**
   * The context of the state machine.
   */
  readonly context?: _C
}

/**
 * The type of state machine definition.
 * 
 * @template D - The type of definition for state machine.
 * @template G - The type of guards for state machine functions.
 * @template E - The type of effects for state machine functions.
 * @template _S - (internal) The type of states.
 */
export type Shape<
  D,
  G extends string,
  E extends string,
  _S = Get<D, ["states"]>,
> = {
  /**
   * The initial state value.
   */
  readonly initial:
    // If no states are defined, return an error.
      IsPlainObject<_S> extends false
    ? "Error: States must be a plain object."
    // If no states are defined, return an error.
    : [keyof _S] extends [never]
    ? "Error: No states defined."
    // If the state value is not a literal string, return an error.
    : IsLiteralString<keyof _S> extends false
    ? "Error: States have no literal string value."
    // Else, return the initial state value.
    : keyof _S
  /**
   * The state definitions.
   */
  readonly states:
    // If no states are defined, return an error.
      IsPlainObject<_S> extends false
    ? "Error: States must be a plain object."
    // If no states are defined, return an empty object.
    : [keyof _S] extends [never]
    ? { [NEVER]?: never }
    // If the state value is not a literal string, return an error.
    : IsLiteralString<keyof _S> extends false
    ? "Error: State values must be literal strings."
    // Else, return the state definition.
    : {
        readonly [V in keyof _S]:
          // If the state value is reserved, return an error.
            V extends ReservedKeyword
          ? `Error: State value '${V}' is reserved.`
          // Else, return the state definition.
          : State<D, ["states", V], G, E>
      }
  /**
   * The definition how a state machine will transition when it receives a specific event.
   */
  readonly on?: On<D, ["on"], G>
  readonly $schema?: Schema<D, ["$schema"]>
} & (
  "context" extends keyof Get<D, ["$schema"]>
    ? {
      /**
       * The context of the state machine.
       */
      readonly context: Context<D>
    }
    : {
      /**
       * The context of the state machine.
       */
      readonly context?: Context<D>
    }
)

/**
 * Infer the narrowest type from the state machine definition.
 * 
 * @template D - The type of state machine definition.
 */
export type Exact<D> = {
  readonly [K in keyof D]:
    K extends "$schema"
      ? D[K]
      : InferNarrowestValue<D[K]>
}

export type Signature = {
  /**
   * The initial state value.
   */
  readonly initial: Tagged<string, "StateValue">
  /**
   * The state definitions.
   */
  readonly states: {
    readonly [stateValue: Tagged<string, "StateValue">]: State.Signature
  }
  /**
   * The definition how a state machine will transition when it receives a specific event.
   */
  readonly on?: On.Signature
  /**
   * The context of the state machine.
   */
  readonly context?: Context.Signature
}

if (cfgTest && cfgTest.url === import.meta.url) {
  const { expectType } = await import("tsd")
  const { describe, test } = cfgTest

  describe("src/types/definition", () => {
    describe("Transition", () => {
      test("should be inferred as an error when no states are defined", () => {
        type Expected = "Error: State values are not defined."
        type Actual = Transition<{}, never>

        expectType<Expected>({} as Actual)
      })

      test("should be inferred as an error when the state values are not literal strings", () => {
        type Expected = "Error: State values must be literal strings."
        type Actual = Transition<{ states: { [key: string]: {} } }, never>

        expectType<Expected>({} as Actual)
      })

      test("should be inferred as an error when the state value is reserved", () => {
        type Def = {
          states: {
            $init: {}
          }
        }
        type Expected = "Error: State value '$init' is reserved."
        type Actual = Transition<Def, never>

        expectType<Expected>({} as Actual)
      })

      test("`guard` should be inferred as an error when no guards are defined", () => {
        type Def = {
          states: {
            active: {
              target: "active"
              guard: "guard"
            }
          }
        }
        type Expected = "active" | {
          readonly target: "active"
          readonly guard?: "Error: Guards are not defined."
        }
        type Actual = Transition<Def, never>

        expectType<Expected>({} as Actual)
      })

      test("`guard` should be inferred as an error when the guard is not a literal string", () => {
        type Def = {
          states: {
            active: {
              target: "active"
              guard: "guard"
            }
          }
        }
        type Expected = "active" | {
          readonly target: "active"
          readonly guard?: "Error: Guards must be literal strings."
        }
        type Actual = Transition<Def, string>

        expectType<Expected>({} as Actual)
      })

      test("`guard` should be inferred as an error when the guard is reserved", () => {
        type Def = {
          states: {
            active: {
              target: "active"
              guard: "Error:"
            }
          }
        }
        type Expected = "active" | {
          readonly target: "active"
          readonly guard?: "Error: Guard name 'Error:' is reserved."
        }
        type Actual = Transition<Def, "Error:">

        expectType<Expected>({} as Actual)
      })

      test("should be inferred as an Transition object", () => {
        type Expected = "active" | {
          readonly target: "active"
          readonly guard?: Guard<"guard">
        }
        type Actual = Transition<{ states: { active: {} } }, "guard">

        expectType<Expected>({} as Actual)
      })
    })

    describe("On", () => {
      test("should be inferred as an empty object the event types are not defined", () => {
        type Expected = { [NEVER]?: never }
        type Actual = On<{}, ["on"], never>

        expectType<Expected>({} as Actual)
      })

      test("should be inferred as an error when the event types are not literal strings", () => {
        type Expected = "Error: Event types must be literal strings."
        type Actual = On<{ on: { 1: {} } }, ["on"], never>

        expectType<Expected>({} as Actual)
      })

      test("should be inferred as an error when the event types are reserved", () => {
        type Def = {
          on: {
            $init: {}
            "Error:": {}
            validEvent: {}
          }
        }
        type Expected = {
          readonly $init: "Error: Event type '$init' is reserved."
          readonly "Error:": "Error: Event type 'Error:' is reserved."
          readonly validEvent: Transition<Def, never>
        }
        type Actual = On<Def, ["on"], never>

        expectType<Expected>({} as Actual)
      })
    })

    describe("State", () => {
      test("`effect` should be inferred as an error when no effects are defined", () => {
        type Def = {
          states: {
            active: {
              effect: "effect"
            }
          }
        }
        type Expected = "Error: Effects are not defined." | undefined
        type Actual = State<Def, ["states", "active"], never, never>["effect"]

        expectType<Expected>({} as Actual)
      })

      test("`effect` should be inferred as an error when the effect is not a literal string", () => {
        type Def = {
          states: {
            active: {
              effect: "effect"
            }
          }
        }
        type Expected = "Error: Effects must be literal strings." | undefined
        type Actual = State<Def, ["states", "active"], never, string>["effect"]

        expectType<Expected>({} as Actual)
      })

      test("`effect` should be inferred as an Effect object", () => {
        type Def = {
          states: {
            active: {
              effect: "effect"
            }
          }
        }
        type Expected = "effect" | readonly "effect"[] | undefined
        type Actual = State<Def, ["states", "active"], never, "effect">["effect"]

        expectType<Expected>({} as Actual)
      })
    })

    describe("Context", () => {
      test("should be inferred as an error when `context` is not defined in `$schema` in strict-mode", () => {
        type Def = {
          $schema: {
            strict: true
          }
        }
        type Expected = { [ERROR]: "Error: `context` is not defined in `$schema`." }
        type Actual = Context<Def>

        expectType<Expected>({} as Actual)
      })

      test("should prefer the context schema over the context", () => {
        type Def = {
          $schema: {
            context: { a: 1 }
          }
          context: { a: 2 }
        }
        type Expected = { a: 1 }
        type Actual = Context<Def>

        expectType<Expected>({} as Actual)
      })
    })

    describe("Shape", () => {
      test("`initial `should be inferred as an error when no states are defined", () => {
        type Expected = "Error: No states defined."
        type Actual = Shape<{ states: {} }, never, never>["initial"]

        expectType<Expected>({} as Actual)
      })

      test("`initial` should be inferred as an error when the state values are not literal strings", () => {
        type Expected = "Error: States have no literal string value."
        type Actual = Shape<{ states: { [key: number]: {} } }, never, never>["initial"]

        expectType<Expected>({} as Actual)
      })

      test("`states` should be inferred as an error when the state values are not literal string", () => {
        type Expected = "Error: State values must be literal strings."
        type Actual = Shape<{ states: { [key: string]: {} } }, never, never>["states"]

        expectType<Expected>({} as Actual)
      })

      test("`states` should be inferred as an error when the state value is reserved", () => {
        type Def = {
          states: {
            $init: {}
            "Error:": {}
            validValue: {}
          }
        }
        type Expected = {
          readonly $init: "Error: State value '$init' is reserved."
          readonly "Error:": "Error: State value 'Error:' is reserved."
          readonly validValue: State<Def, ["states", "validValue"], never, never>
        }
        type Actual = Shape<Def, never, never>["states"]

        expectType<Expected>({} as Actual)
      })

      test("should require `context` when it is defined in `$schema`", () => {
        type DefHasNoCtx1 = {}
        type DefHasNoCtx2 = {
          $schema: {}
        }
        type DefHasCtx = {
          $schema: {
            context: {}
          }
        }
        type Actual<D> = RequiredKeysOf<Shape<D, never, never>>

        expectType<"initial" | "states">({} as Actual<DefHasNoCtx1>)
        expectType<"initial" | "states">({} as Actual<DefHasNoCtx2>)
        expectType<"initial" | "states" | "context">({} as Actual<DefHasCtx>)
      })
    })
  })
}

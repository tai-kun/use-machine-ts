// dprint-ignore-file

import type {
  Context,
  Effect as EffectDefinition,
  Guard as GuardDefinition,
  ReservedKeyword,
} from "./definition"
import type {
  AnyRoRec,
  Extends,
  Get,
  IsStringLiteral,
  Tagged,
  ValueOf,
} from "./utils"

/*******************************************************************************
 * 
 * Transition Event
 * 
 ******************************************************************************/

/**
 * Infer all event types from the state machine definition.
 * 
 * @template D - The type of definition for state machine.
 * @see {@link TransitionEvent}
 */
type _InferAllTransitionEventTypes<D> =
  // The event types defined in the root.
  | keyof Get<D, ["on"]>
  // The event types defined in each state.
  | ValueOf<{
      [V in keyof Get<D, ["states"]>]: keyof Get<D, ["states", V, "on"]>
    }>

/**
 * The type of event that triggered the transition.
 * 
 * @template T - The type of event type.
 * @see {@link TransitionEvent}
 */
type _TransitionEvent<T> = [T] extends [never] ? never : {
  /**
   * The event type. Initially, it is `$init`.
   */
  type: T
}

/**
 * The type of event that triggered the transition.
 * 
 * @template D - The type of state machine definition.
 * @template _S - (internal) The type of events schema.
 */
// Indicates that it is an event for a transition
// to avoid conflict with the global `Event` type.
type TransitionEvent<
  D,
  _S = Get<D, ["$schema", "events"], {}>,
> =
  // The event types defined in `$schema.events`.
  | ValueOf<{
      [T in keyof _S]:
        // If the event type is not a literal string, return `never`.
          IsStringLiteral<T> extends false
        ? never
        // If the event type is reserved, return `never`.
        : T extends ReservedKeyword
        ? never
        // If the event value is not object, return `never`.
        : Extends<_S[T], AnyRoRec> extends false
        ? never
        // Else, return the event type.
        : (_S[T] & {
            /**
             * The event type. Initially, it is `$init`.
             */
            type: T
          })
    }>
  // The event types defined in the root or in each state.
  | (
      // If in strict mode, return `never`.
        Get<D, ["$schema", "strict"]> extends true
      ? never
      // Else, return the inferred event type.
      : _TransitionEvent<
          Exclude<
            _InferAllTransitionEventTypes<D>,
            // Reserved event types.
            | ReservedKeyword
            // Predefined event types that don't require any inference.
            | keyof _S
          >
        >
    )

export namespace TransitionEvent {
  export type Signature = {
    /**
     * The event type. Initially, it is `$init`.
     */
    readonly type: Tagged<string, "EventType">
  } & {
    readonly [key: string]: unknown
  }
}

/*******************************************************************************
 * 
 * Transition Event for Type
 * 
 ******************************************************************************/

/**
 * The type of event that triggered the transition for the given event type.
 * 
 * @template E - The type of event to extract from.
 * @template T - The type of event type to extract.
 * @see {@link TransitionEventForType}
 */
type _TransitionEventForType<E, T> =
  E extends { readonly type: infer ET }
    ? ET extends T
      ? E
      : never
    : never

/**
 * The type of event that triggered the transition for the given event type.
 * 
 * @template D - The type of state machine definition.
 * @template T - The type of event type to extract.
 */
type TransitionEventForType<D, T> =
  _TransitionEventForType<TransitionEvent<D>, T>

/*******************************************************************************
 * 
 * Transition Event for State Value
 * 
 ******************************************************************************/

/**
 * Extract the target state value from the event.
 * 
 * @template E - The event type.
 * @see {@link _InferAllTransitionEventTypesForStateValue}
 */
type _InferTransitionTarget<E> =
  // If the event is string, return the event.
    E extends string
  ? E
  // If the event is an object, return the target.
  : Get<E, ["target"]> extends infer T extends string
  ? T
  // Else, return `never`.
  : never

/**
 * Infer all event types from the state machine definition for the given state value.
 * 
 * @template D - The state machine definition.
 * @template V - The state value.
 * @see {@link TransitionEventForStateValue}
 */
type _InferAllTransitionEventTypesForStateValue<D, V> =
  // The event types defined in the state.
  | ValueOf<{
      [SV in keyof Get<D, ["states"]>]: ValueOf<{
        [E in keyof Get<D, ["states", SV, "on"]>]:
          _InferTransitionTarget<Get<D, ["states", SV, "on", E]>> extends V
            ? E
            : never
      }>
    }>
  // The event types defined in the root.
  | ValueOf<{
      [E in keyof Get<D, ["on"]>]:
        _InferTransitionTarget<Get<D, ["on", E]>> extends V
          ? E
          : never
    }>

/**
 * The type of event that triggered the transition for the given state value.
 * 
 * @template D - The state machine definition.
 * @template V - The state value.
 */
export type TransitionEventForStateValue<D, V> =
  // Reserved event types.
  | (
      // If the state value is the initial state, return the initial event. 
        V extends Get<D, ["initial"]>
      ? {
          /**
           * The event type. Initially, it is `$init`.
           */
          type: "$init"
        }
      // Else, return `never`.
      : never
    )
  // The event types defined in the state or in the root.
  | TransitionEventForType<
      D,
      _InferAllTransitionEventTypesForStateValue<D, V>
    >

export namespace TransitionEventForStateValue {
  export type Signature = TransitionEvent.Signature
}

/*******************************************************************************
 * 
 * Guard Function
 * 
 ******************************************************************************/

/**
 * Infer the event type from the state machine definition for the given guard name.
 * 
 * @template D - The type of the state machine definition.
 * @template P - The type of path from definition root to here.
 * @template N - The type of guard name.
 * @template _O (Internal) The type of the `on` property.
 */
type _InferGuardEventType<
  D,
  P extends ReadonlyArray<keyof any>,
  N extends string,
  _O = Get<D, P>,
> = ValueOf<{
  [E in keyof _O]:
    // If the event has given guard name, return the event type.
      Get<_O, [E, "guard"]> extends GuardDefinition<infer G>
    ? N extends G
    ? E
    // Else, return `never`.
    : never
    : never
}>

/**
 * The type of event that triggered the transition for the given guard name.
 * 
 * @template D - The type of state machine definition.
 * @template N - The type of guard name.
 */
export type GuardEvent<
  D,
  N extends string,
> = TransitionEventForType<
  D,
  // Infer the state value from the guard name in each state.
  | ValueOf<{
      [V in keyof Get<D, ["states"]>]:
      _InferGuardEventType<D, ["states", V, "on"], N>
    }>
  // Infer the state value from the guard name in the root.
  | _InferGuardEventType<D, ["on"], N>
>

export namespace GuardEvent {
  export type Signature = TransitionEvent.Signature
}

/**
 * The type of parameters for the guard function.
 * 
 * @template D - The type of the state machine definition.
 * @template N - The type of guard name.
 */
export type GuardParams<
  D,
  N extends string,
> = {
  /**
   * The event that triggered the transition.
   */
  event: GuardEvent<D, N>
  /**
   * The current context of the state machine.
   */
  context: Context<D>
}

export namespace GuardParams {
  export type Signature = {
    /**
     * The event that triggered the transition.
     */
    readonly event: GuardEvent.Signature
    /**
     * The current context of the state machine.
     */
    readonly context: Context.Signature
  }
}

/**
 * The type of guard function to check before the transition.
 * 
 * @template D - The type of the state machine definition.
 * @template N - The type of guard name.
 */
export type Guard<
  D,
  N extends string,
> = {
  /**
   * Checks if the transition is allowed.
   * 
   * @param params - The parameters for the guard function.
   * @returns `true` if the transition is allowed, `false` otherwise.
   */
  (params: GuardParams<D, N>): boolean
}

export namespace Guard {
  /**
   * Checks if the transition is allowed.
   * 
   * @param params - The parameters for the guard function.
   * @returns `true` if the transition is allowed, `false` otherwise.
   */
  export type Signature = (params: GuardParams.Signature) => boolean
}

/*******************************************************************************
 * 
 * Send Function
 * 
 ******************************************************************************/

/**
 * The type of sendable event to send to the state machine.
 * 
 * @template D The type of the state machine definition.
 * @template _E (Internal) The type of the event.
 * @template _T (Internal) The type of the event type.
 */
export type Sendable<
  D,
  _E = TransitionEvent<D>,
  _T = Get<_E, ["type"]>
> =
  // If the event does not have a `type` property, return an error.
    IsStringLiteral<_T> extends false
  ? "Error: No event found with `type` property of literal string value."
  // If the event type is reserved, return an error.
  : _T extends ReservedKeyword
  ? `Error: Event type '${_T}' is reserved.`
  // If the event only has a `type` property, you can also send only a string.
  : keyof _E extends "type"
  ? (_E | _T)
  // Else, return the event and its type.
  : _E

export namespace Sendable {
  /**
   * The type of sendable event to send to the state machine.
   */
  export type Signature =
    | Tagged<string, "EventType">
    | TransitionEvent.Signature
}

/**
 * The type of the send function to send an event to the state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type Send<D> = {
  /**
   * Sends an event to the state machine.
   * 
   * @param event - The event to send to the state machine.
   */
  (event: Sendable<D>): void
}

export namespace Send {
  /**
   * Sends an event to the state machine.
   * 
   * @param event - The event to send to the state machine.
   */
  export type Signature = (event: Sendable.Signature) => void
}

/*******************************************************************************
 * 
 * Entry Event (Transition Event for Effect)
 * 
 ******************************************************************************/

/**
 * The type of event that triggered the transition.
 * 
 * @template D - The type of the state machine definition.
 * @template V - The type of state value.
 */
export type EntryEvent<D, V> = TransitionEventForStateValue<D, V>

export namespace EntryEvent {
  /**
   * The type of event that triggered the transition.
   */
  export type Signature = TransitionEvent.Signature
}

/*******************************************************************************
 * 
 * Exit Event (Transition Event for Effect)
 * 
 ******************************************************************************/

/**
 * The next event types for the given state value.
 * 
 * @template D - The type of state machine definition.
 * @template V - The type of state value.
 */
export type NextEventTypesForStateValue<
  D,
  V,
> =
  | keyof Get<D, ["states", V, "on"]>
  | keyof Get<D, ["on"]>

export namespace NextEventTypesForStateValue {
  /**
   * The next event types for the given state value.
   */
  export type Signature = Tagged<string, "EventType">
}

/**
 * The type of event that before the transition.
 * 
 * @template D - The type of state machine definition.
 * @template V - The type of state value.
 */
export type ExitEvent<D, V> = TransitionEventForType<
  D,
  NextEventTypesForStateValue<D, V>
>

export namespace ExitEvent {
  /**
   * The type of event that before the transition.
   */
  export type Signature = TransitionEvent.Signature
}

/*******************************************************************************
 * 
 * SetContext Function
 * 
 ******************************************************************************/

/**
 * The type of the function to update the context of the state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type SetContextAction<D> = {
  /**
   * The action to update the context of the state machine.
   * 
   * @param prevContext - The type of the previous context of the state machine.
   * @returns The type of the new context of the state machine.
   */
  (prevContext: Context<D>): Context<D>
}

export namespace SetContextAction {
  /**
   * The action to update the context of the state machine.
   * 
   * @param prevContext - The type of the previous context of the state machine.
   * @returns The type of the new context of the state machine.
   */
  export type Signature = (prevContext: Context.Signature) => Context.Signature
}

/**
 * The type of return value of the function to update the context of the state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type SetContextReturn<D> = {
  /**
   * The send function to send an event to the state machine.
   */
  readonly send: Send<D>
}

export namespace SetContextReturn {
  export type Signature = {
    /**
     * The send function to send an event to the state machine.
     */
    readonly send: Send.Signature
  }
}

/**
 * The type of the function to update the context of the state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type SetContext<D> = {
  /**
   * The function to update the context of the state machine.
   * 
   * @param action - The action to update the context of the state machine.
   * @returns The object with the `send` function to send an event to the state machine.
   */
  (action: SetContextAction<D>): SetContextReturn<D>
}

export namespace SetContext {
  /**
   * The function to update the context of the state machine.
   * 
   * @param action - The action to update the context of the state machine.
   * @returns The object with the `send` function to send an event to the state machine.
   */
  export type Signature = (
    action: SetContextAction.Signature
  ) => SetContextReturn.Signature
}

/*******************************************************************************
 * 
 * Effect Function
 * 
 ******************************************************************************/

/**
 * The type of the effect parameters.
 * 
 * @template D - The type of the state machine definition.
 * @template V - The type of state value.
 */
export type EffectParams<D, V> = {
  /**
   * The send function to send an event to the state machine.
   */
  readonly send: Send<D>
  /**
   * The event that triggered the effect.
   */
  readonly event: EntryEvent<D, V>
  /**
   * The current context of the state machine.
   */
  readonly context: Context<D>
  /**
   * The function to update the context of the state machine.
   */
  readonly setContext: SetContext<D>
  /**
   * The function to check if the component is mounted.
   */
  readonly isMounted: {
    /**
     * Check if the component is mounted.
     * 
     * @returns `true` if the component is mounted, `false` otherwise.
     */
    (): boolean
  }
}

export namespace EffectParams {
  export type Signature = {
    /**
     * The send function to send an event to the state machine.
     */
    readonly send: Send.Signature
    /**
     * The event that triggered the effect.
     */
    readonly event: EntryEvent.Signature
    /**
     * The current context of the state machine.
     */
    readonly context: Context.Signature
    /**
     * The function to update the context of the state machine.
     */
    readonly setContext: SetContext.Signature
    /**
     * The function to check if the component is mounted.
     */
    readonly isMounted: {
      /**
       * Check if the component is mounted.
       * 
       * @returns `true` if the component is mounted, `false` otherwise.
       */
      (): boolean
    }
  }
}

/**
 * The type of cleanup parameters for the effect.
 * 
 * @template D - The type of the state machine definition.
 * @template V - The type of state value.
 */
export type EffectCleanupParams<D, V> = {
  /**
   * The send function to send an event to the state machine.
   */
  readonly send: Send<D>
  /**
   * The event that triggered the effect.
   */
  readonly event: ExitEvent<D, V>
  /**
   * The current context of the state machine.
   */
  readonly context: Context<D>
  /**
   * The function to update the context of the state machine.
   */
  readonly setContext: SetContext<D>
  /**
   * The function to check if the component is mounted.
   */
  readonly isMounted: {
    /**
     * Check if the component is mounted.
     * 
     * @returns `true` if the component is mounted, `false` otherwise.
     */
    (): boolean
  }
}

export namespace EffectCleanupParams {
  export type Signature = {
    /**
     * The send function to send an event to the state machine.
     */
    readonly send: Send.Signature
    /**
     * The event that triggered the effect.
     */
    readonly event: ExitEvent.Signature
    /**
     * The current context of the state machine.
     */
    readonly context: Context.Signature
    /**
     * The function to update the context of the state machine.
     */
    readonly setContext: SetContext.Signature
    /**
     * The function to check if the component is mounted.
     */
    readonly isMounted: {
      /**
       * Check if the component is mounted.
       * 
       * @returns `true` if the component is mounted, `false` otherwise.
       */
      (): boolean
    }
  }
}

declare const UNDEFINED_VOID_ONLY: unique symbol

/**
 * The type of cleanup function for the effect.
 * 
 * @template D - The type of the state machine definition.
 * @template V - The type of state value.
 */
export type EffectCleanup<D, V> = {
  /**
   * The cleanup function for the effect.
   * 
   * @param params - The effect cleanup parameters.
   * @returns `void` or a cleanup function.
   */
  (params: EffectCleanupParams<D, V>): void | { [UNDEFINED_VOID_ONLY]: never }
}

export namespace EffectCleanup {
  /**
   * The cleanup function for the effect.
   * 
   * @param params - The effect cleanup parameters.
   * @returns `void` or a cleanup function.
   */
  export type Signature = (
    params: EffectCleanupParams.Signature
  ) => void | { [UNDEFINED_VOID_ONLY]: never }
}

/**
 * The type of return value of the effect function.
 * 
 * @template D - The type of the state machine definition.
 * @template V - The type of state value.
 */
export type EffectReturn<D, V> = void | EffectCleanup<D, V>

export namespace EffectReturn {
  /**
   * The type of return value of the effect function.
   */
  export type Signature = void | EffectCleanup.Signature
}

/**
 * The type of the effect function.
 * 
 * @template D - The type of the state machine definition.
 * @template V - The type of state value.
 * @see {@link Effect}
 */
type _Effect<D, V> = {
  /**
   * The effect function to perform when the state is entered.
   * 
   * @param params - The effect parameters.
   * @returns `void` or a cleanup function.
   */
  (params: EffectParams<D, V>): EffectReturn<D, V>
}

/**
 * The type of the effect function.
 * 
 * @template D - The type of the state machine definition.
 * @template N - The type of effect name.
 */
export type Effect<D, N> = _Effect<
  D,
  // Infer the state value from the effect name.
  ValueOf<{
    [V in keyof Get<D, ["states"]>]:
      Get<D, ["states", V, "effect"]> extends EffectDefinition<infer E>
        ? N extends E
          ? V
          : never
        : never
  }>
>

export namespace Effect {
  /**
   * The effect function to perform when the state is entered.
   * 
   * @param params - The effect parameters.
   * @returns `void` or a cleanup function.
   */
  export type Signature = (
    params: EffectParams.Signature
  ) => EffectReturn.Signature
}

/*******************************************************************************
 * 
 * Logging
 * 
 ******************************************************************************/

/**
 * The verbose level to log messages.
 * 
 * - `0` or `false`: No logs.
 * - `1`: Logs some messages.
 * - `2` or `true`: Logs all messages.
 */
export type Verbose = boolean | 0 | 1 | 2

/**
 * Interface for a console object.
 */
export type ConsoleInterface = {
  /**
   * Logs a message to the console.
   * 
   * @param format - A `printf`-like format string.
   * @param param - The parameter to log.
   */
  readonly log: (format: string, ...param: unknown[]) => void
  /**
   * Logs a message to the console.
   * 
   * @param format - A `printf`-like format string.
   * @param param - The parameter to log.
   */
  readonly error?: ((format: string, ...param: unknown[]) => void) | undefined
  /**
   * Increases indentation of subsequent lines by spaces for `groupIndentation`length.
   * 
   * @param label - If one or more `label`s are provided, those are printed first without the additional indentation.
   */
  readonly group?: ((...label: string[]) => void) | undefined
  /**
   * Decreases indentation of subsequent lines by spaces for `groupIndentation`length.
   */
  readonly groupEnd?: (() => void) | undefined
  /**
   * An alias for {@link group} in Node.js.
   */
  readonly groupCollapsed?: ((...label: string[]) => void) | undefined
}

/*******************************************************************************
 * 
 * Configuration
 * 
 ******************************************************************************/

/**
 * The type of state machine configuration.
 * 
 * @template D - The type of definition for state machine.
 * @template G - The type of guard names for state machine.
 * @template E - The type of effect names for state machine.
 */
export type Exact<
  D,
  G extends string,
  E extends string,
> = {
  /**
   * The guards to check before the transition.
   */
  readonly guards?: {
    readonly [N in G]: 
      // If the guard name is not a literal string, return an error.
        IsStringLiteral<N> extends false
      ? "Error: Guard name must be a literal string."
      // If the guard name is reserved, return an error.
      : N extends ReservedKeyword
      ? `Error: Guard name '${N}' is reserved.`
      // Else, return the guard function.
      : Guard<D, N>
  }
  /**
   * The actions to perform when the state is entered.
   */
  readonly effects?: {
    readonly [N in E]: 
      // If the effect name is not a literal string, return an error.
        IsStringLiteral<N> extends false
      ? "Error: Effect name must be a literal string."
      // If the effect name is reserved, return an error.
      : N extends ReservedKeyword
      ? `Error: Effect name '${N}' is reserved.`
      // Else, return the effect function.
      : Effect<D, N>
  }
  /**
   * The verbose level to log messages.
   * 
   * - `0` or `false`: No logs.
   * - `1`: Error messages only.
   * - `2` or `true`: All messages.
   * 
   * @default 1
   */
  readonly verbose?: Verbose
  /**
   * Interface for a console object.
   * 
   * @default console
   */
  readonly console?: ConsoleInterface
}

/**
 * The typeof signature for state machine configuration.
 */
export type Signature = {
  /**
   * The guards to check before the transition.
   */
  readonly guards?: {
    readonly [guardName: Tagged<string, "GuardName">]: Guard.Signature
  }
  /**
   * The actions to perform when the state is entered.
   */
  readonly effects?: {
    readonly [effectName: Tagged<string, "EffectName">]: Effect.Signature
  }
  /**
   * The verbose level to log messages.
   * 
   * - `0` or `false`: No logs.
   * - `1`: Error messages only.
   * - `2` or `true`: All messages.
   * 
   * @default 1
   */
  readonly verbose?: Verbose
  /**
   * Interface for a console object.
   * 
   * @default console
   */
  readonly console?: ConsoleInterface
}

if (cfgTest && cfgTest.url === import.meta.url) {
  // const { expectType } = await import("tsd")
  const { describe, test } = cfgTest

  describe("src/types/config", () => {
    test.skip("Should be tested", () => {})
  })
}


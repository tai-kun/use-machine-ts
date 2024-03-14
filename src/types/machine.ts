// dprint-ignore-file

import type * as Config from "./config"
import type * as Definition from "./definition"
import type { Get, Tagged } from "./utils"

/**
 * The current state of the state machine.
 * 
 * @template D - The type of definition for state machine.
 * @template V - The type of state value.
 */
export type State<
  D,
  V = keyof Get<D, ["states"]>,
> = {
  /**
   * The current state value.
   */
  readonly value: V
  /**
   * The current context.
   */
  readonly context: Definition.Context<D>
  /**
   * The event that caused the state transition.
   */
  readonly event: Config.TransitionEventForStateValue<D, V>
  /**
   * The next events that can be sent to the state machine.
   */
  readonly nextEvents: readonly Config.NextEventTypesForStateValue<D, V>[]
}

export namespace State {
  export type Signature = {
    /**
     * The current state value.
     */
    readonly value: Tagged<string, "StateValue">
    /**
     * The current context.
     */
    readonly context: Definition.Context.Signature
    /**
     * The event that caused the state transition.
     */
    readonly event: Config.TransitionEventForStateValue.Signature
    /**
     * The next events that can be sent to the state machine.
     */
    readonly nextEvents: readonly Config.NextEventTypesForStateValue.Signature[]
  }
}

/**
 * The send function to send an event to the state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type Send<D> = Config.Send<D>

export namespace Send {
  export type Signature = Config.Send.Signature
}

/**
 * The state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type Machine<D = Definition.Signature> = readonly [
  definition: D,
  config?: Config.Signature,
]

export namespace Machine {
  export type Signature = readonly [
    definition: Definition.Signature,
    config?: Config.Signature,
  ]
}

/**
 * The action to send an event to the shared state machine.
 * 
 * @template D - The type of the shared state machine definition.
 */
export type Action<D> = {
  readonly type: "SEND"
  readonly payload: Config.Sendable<D>
} | {
  readonly type: "SET_CONTEXT"
  readonly payload: Definition.Context<D>
}

export namespace Action {
  export type Signature = {
    readonly type: "SEND"
    readonly payload: Config.Sendable.Signature
  } | {
    readonly type: "SET_CONTEXT"
    readonly payload: Config.SetContextAction.Signature
  }
}

/**
 * The shared state machine.
 * 
 * @template D - The type of the shared state machine definition.
 */
export type SharedMachine<D = Definition.Signature> = {
  /**
   * Instance of the state machine.
   */
  readonly instance: Machine<D>
  /**
   * The dispatch function to send an event to the shared state machine.
   */
  readonly dispatch: {
    /**
     * Dispatch an action to the shared state machine.
     * 
     * @param action - The action to send to the shared state machine.
     */
    (action: Action<D>): void
  }
  /**
   * The send function to send an event to the shared state machine.
   */
  readonly send: Send<D>
  /**
   * The current state of the shared state machine.
   * 
   * @returns The current state of the shared state machine.
   */
  readonly getState: () => State<D>
  /**
   * Subscribes to state changes in the shared state machine.
   * 
   * @param callback A function that is called whenever the state machine changes state.
   * @returns A function to unsubscribe from state changes.
   */
  readonly subscribe: (callback: (state: State<D>) => void) => () => void
  /**
   * The function to set the context of the shared state machine.
   */
  readonly setContext: Config.SetContext<D>
}

export namespace SharedMachine {
  export type Signature = {
    /**
     * Instance of the state machine.
     */
    readonly instance: Machine.Signature
    /**
     * The dispatch function to send an event to the shared state machine.
     */
    readonly dispatch: {
      /**
       * Dispatch an action to the shared state machine.
       * 
       * @param action - The action to send to the shared state machine.
       */
      (action: Action.Signature): void
    }
    /**
     * The send function to send an event to the shared state machine.
     */
    readonly send: Send.Signature
    /**
     * The current state of the shared state machine.
     * 
     * @returns The current state of the shared state machine.
     */
    readonly getState: () => State.Signature
    /**
     * Subscribes to state changes in the shared state machine.
     * 
     * @param callback A function that is called whenever the state machine changes state.
     * @returns A function to unsubscribe from state changes.
     */
    readonly subscribe: (callback: (state: State.Signature) => void) => () => void
    /**
     * The function to set the context of the shared state machine.
     */
    readonly setContext: Config.SetContext.Signature
  }
}

if (cfgTest && cfgTest.url === import.meta.url) {
  // const { expectType } = await import("tsd")
  const { describe, test } = cfgTest

  describe("src/types/machine", () => {
    test.todo("Should be tested")
  })
}

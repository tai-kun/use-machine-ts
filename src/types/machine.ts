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
  readonly value: V;
  /**
   * The current context.
   */
  readonly context: Definition.Context<D>;
  /**
   * The event that caused the state transition.
   */
  readonly event: Config.TransitionEventForStateValue<D, V>;
  /**
   * The next events that can be sent to the state machine.
   */
  readonly nextEvents: readonly Config.NextEventTypesForStateValue<D, V>[];
};

/**
 * The current state of the state machine.
 */
export type StateSignature = {
  /**
   * The current state value.
   */
  readonly value: Tagged<string, "StateValue">;
  /**
   * The current context.
   */
  readonly context: Definition.ContextSignature;
  /**
   * The event that caused the state transition.
   */
  readonly event: Config.TransitionEventForStateValueSignature;
  /**
   * The next events that can be sent to the state machine.
   */
  readonly nextEvents: readonly Config.NextEventTypesForStateValueSignature[];
};

/**
 * The send function to send an event to the state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type Send<D> = Config.Send<D>;

/**
 * The send function to send an event to the state machine.
 */
export type SendSignature = Config.SendSignature;

/**
 * The state machine.
 * 
 * @template D - The type of the state machine definition.
 */
export type Machine<D = Definition.Signature> = readonly [
  definition: D,
  config?: Config.Signature,
];

/**
 * The state machine.
 */
export type MachineSignature = readonly [
  definition: Definition.Signature,
  config?: Config.Signature,
];

/**
 * The action to send an event to the shared state machine.
 * 
 * @template D - The type of the shared state machine definition.
 */
export type Action<D> = {
  readonly type: "SEND";
  readonly payload: Config.Sendable<D>;
} | {
  readonly type: "SET_CONTEXT";
  readonly payload: Definition.Context<D>;
};

/**
 * The action to send an event to the shared state machine.
 */
export type ActionSignature = {
  readonly type: "SEND";
  readonly payload: Config.SendableSignature;
} | {
  readonly type: "SET_CONTEXT";
  readonly payload: Config.SetContextActionSignature;
};

/**
 * The shared state machine.
 * 
 * @template D - The type of the shared state machine definition.
 */
export type SharedMachine<D = Definition.Signature> = {
  /**
   * Instance of the state machine.
   */
  readonly instance: Machine<D>;
  /**
   * The dispatch function to send an event to the shared state machine.
   */
  readonly dispatch: {
    /**
     * Dispatch an action to the shared state machine.
     * 
     * @param action - The action to send to the shared state machine.
     */
    (action: Action<D>): void;
  };
  /**
   * The send function to send an event to the shared state machine.
   */
  readonly send: Send<D>;
  /**
   * The current state of the shared state machine.
   * 
   * @returns The current state of the shared state machine.
   */
  readonly getState: () => State<D>;
  /**
   * Subscribes to state changes in the shared state machine.
   * 
   * @param callback A function that is called whenever the state machine changes state.
   * @returns A function to unsubscribe from state changes.
   */
  readonly subscribe: (callback: (state: State<D>) => void) => () => void;
  /**
   * The function to set the context of the shared state machine.
   */
  readonly setContext: Config.SetContext<D>;
};

/**
 * The shared state machine.
 */
export type SharedMachineSignature = {
  /**
   * Instance of the state machine.
   */
  readonly instance: MachineSignature;
  /**
   * The dispatch function to send an event to the shared state machine.
   */
  readonly dispatch: {
    /**
     * Dispatch an action to the shared state machine.
     * 
     * @param action - The action to send to the shared state machine.
     */
    (action: ActionSignature): void;
  };
  /**
   * The send function to send an event to the shared state machine.
   */
  readonly send: SendSignature;
  /**
   * The current state of the shared state machine.
   * 
   * @returns The current state of the shared state machine.
   */
  readonly getState: () => StateSignature;
  /**
   * Subscribes to state changes in the shared state machine.
   * 
   * @param callback A function that is called whenever the state machine changes state.
   * @returns A function to unsubscribe from state changes.
   */
  readonly subscribe: (callback: (state: StateSignature) => void) => () => void;
  /**
   * The function to set the context of the shared state machine.
   */
  readonly setContext: Config.SetContextSignature;
};

if (cfgTest && cfgTest.url === import.meta.url) {
  // const { expectType } = await import("tsd")
  const { describe, test } = cfgTest

  describe("src/types/machine", () => {
    test.skip("Should be tested", () => {})
  })
}

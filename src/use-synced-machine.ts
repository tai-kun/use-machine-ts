import { log } from "./core/devutils";
import {
  type Action,
  applyDispatch,
  applyEffect,
  createInitialState,
  useInstance,
  useIsMounted,
  useSingleton,
} from "./core/logic";
import { useEffect, useRef } from "./core/react";
import type {
  Config,
  Definition,
  Machine,
  Send,
  State,
  StateSignature,
} from "./types";

/**
 * Uses a synced state machine with the constructor.
 *
 * This hook can transition the state of the state machine without re-rendering.
 *
 * The state machine constructor is executed only once per hook.
 * It is idempotent unless it depends on external mutable values within the constructor.
 *
 * In most cases, `useSyncedMachine` used in conjunction with `props`.
 * It is intended to serve as a filter to determine whether multiple event sources,
 * including the DOM, have triggered a state transition.
 *
 * @template D The type of state machine definition.
 * @param machine The state machine factory.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useSyncedMachine, createMachine } from "use-machine-ts"
 *
 * function machine() {
 *   return createMachine({
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *           effect: "onInactive",
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *           effect: "onActive",
 *         },
 *       },
 *     },
 *     // configuration
 *     {
 *       effects: {
 *         onActive: () => {
 *           console.log("Just activated!")
 *         },
 *         onInactive: () => {
 *           console.log("Just deactivated!")
 *         },
 *       },
 *     },
 *   })
 * }
 *
 * function ToggleButton(props: {}) {
 *   const [getState, send] = useSyncedMachine(machine)
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Toggle
 *     </button>
 *   )
 * }
 * ```
 */
function useSyncedMachine<D>(
  machine: () => Machine<D>,
): [
  getState: () => State<D>,
  send: Send<D>,
];

/**
 * Uses a synced state machine with the constructor and props.
 *
 * This hook can transition the state of the state machine without re-rendering.
 *
 * The state machine constructor is executed only once per hook.
 * It is idempotent unless it depends on external mutable values within the constructor.
 *
 * The `props` passed to the state machine constructor are different from the `props` of a React component; they are represented as a function.
 * When this function is executed, it returns a reference to the `props` passed to the hook.
 * This mechanism is implemented using `React.useRef`, ensuring that it always returns a reference to the latest `props`.
 *
 * It is intended to serve as a filter to determine whether multiple event sources,
 * including the DOM, have triggered a state transition.
 *
 * @template D The type of state machine definition.
 * @template P The type of props for the state machine factory.
 * @param machine The state machine factory.
 * @param props The props for the state machine factory.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useSyncedMachine, createMachine } from "use-machine-ts"
 *
 * function machine(props: () => { onToggle }) {
 *   return createMachine({
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *           effect: "onInactive",
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *           effect: "onActive",
 *         },
 *       },
 *     },
 *     // configuration
 *     {
 *       effects: {
 *         onActive: () => {
 *           const { onToggle } = props()
 *           onToggle("active")
 *         },
 *         onInactive: () => {
 *           const { onToggle } = props()
 *           onToggle("inactive")
 *         },
 *       },
 *     },
 *   })
 * }
 *
 * function ToggleButton(props: { onToggle: (value: "active" | "inactive") => void }) {
 *   const [, send] = useSyncedMachine(machine, props)
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Toggle
 *     </button>
 *   )
 * }
 * ```
 */
function useSyncedMachine<D, P>(
  machine: (props: () => P) => Machine<D>,
  props: P,
): [
  getState: () => State<D>,
  send: Send<D>,
];

/**
 * Uses a synced state machine with the pre-created instance.
 *
 * This hook can transition the state of the state machine without re-rendering.
 *
 * We can use a pre-created state machine instance with the hook.
 * It is idempotent unless it depends on external mutable values within the `effect`.
 * In most cases, it is better to define the state machine using the constructor instead.
 *
 * To enable tree shaking, you can indicate to the bundler that this function has no side effects
 * by using the `@__PURE__` or `#__PURE__` annotation as needed.
 *
 * In most cases, `useSyncedMachine` used in conjunction with `props`.
 * It is intended to serve as a filter to determine whether multiple event sources,
 * including the DOM, have triggered a state transition.
 *
 * @template D The type of state machine definition.
 * @param machine The state machine.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useSyncedMachine, createMachine } from "use-machine-ts"
 *
 * const machine = createMachine({
 *   // definition
 *   {
 *     initial: "inactive",
 *     states: {
 *       inactive: {
 *         on: { TOGGLE: "active" },
 *         effect: "onInactive",
 *       },
 *       active: {
 *         on: { TOGGLE: "inactive" },
 *         effect: "onActive",
 *       },
 *     },
 *   },
 *   // configuration
 *   {
 *     effects: {
 *       onActive: () => {
 *         console.log("Just activated!")
 *       },
 *       onInactive: () => {
 *         console.log("Just deactivated!")
 *       },
 *     },
 *   },
 * })
 *
 * function ToggleButton(props: {}) {
 *   const [getState, send] = useSyncedMachine(machine)
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Toggle
 *     </button>
 *   )
 * }
 * ```
 */
function useSyncedMachine<D>(
  machine: Machine<D>,
): [
  getState: () => State<D>,
  send: Send<D>,
];

/**
 * Define a synced state machine and uses it.
 *
 * This hook can transition the state of the state machine without re-rendering.
 *
 * This approach is useful when you want to quickly define and use a simple state machine on the spot.
 * For complex definitions, it is usually better to write them in a separate file and import it.
 * However, if the definition does not impair readability, keeping it within the component can actually make it more readable.
 *
 * In most cases, `useSyncedMachine` used in conjunction with `props`.
 * It is intended to serve as a filter to determine whether multiple event sources,
 * including the DOM, have triggered a state transition.
 *
 * @template D The type of state machine definition.
 * @param definition The state machine definition.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 * @example
 * ```tsx
 * import { useSyncedMachine } from "use-machine-ts"
 *
 * function ToggleButton(props: {}) {
 *   const [getState, send] = useSyncedMachine(
 *     // definition
 *     {
 *       initial: "inactive",
 *       states: {
 *         inactive: {
 *           on: { TOGGLE: "active" },
 *         },
 *         active: {
 *           on: { TOGGLE: "inactive" },
 *         },
 *       },
 *     },
 *   )
 *
 *   return (
 *     <button onClick={() => send("TOGGLE")} type="button">
 *       Toggle
 *     </button>
 *   )
 * }
 * ```
 */
function useSyncedMachine<D extends Definition.Shape<D, never, never>>(
  definition: Definition.Exact<D>,
): [
  getState: () => State<D>,
  send: Send<D>,
];

/**
 * Define a synced state machine and uses it.
 *
 * This hook can transition the state of the state machine without re-rendering.
 *
 * This approach is useful when you want to quickly define and use a simple state machine on the spot.
 * For complex definitions, it is usually better to write them in a separate file and import it.
 * However, if the definition does not impair readability, keeping it within the component can actually make it more readable.
 *
 * In most cases, `useSyncedMachine` used in conjunction with `props`.
 * It is intended to serve as a filter to determine whether multiple event sources,
 * including the DOM, have triggered a state transition.
 *
 * @template D The type of state machine definition.
 * @template G The type of guards for state machine functions.
 * @template E The type of effects for state machine functions.
 * @param definition The state machine definition.
 * @param config The state machine configuration.
 * @returns An array with two elements:
 * - The first element is a function that returns the current state of the state machine.
 * - The second element is a function that sends an event to the state machine.
 */
function useSyncedMachine<
  D extends Definition.Shape<D, G, E>,
  const G extends string,
  const E extends string,
>(
  definition: Definition.Exact<D>,
  config: Config.Exact<D, G, E>,
): [
  getState: () => State<D>,
  send: Send<D>,
];

function useSyncedMachine(arg0: any, arg1?: any): [any, any] {
  const isMounted = useIsMounted();

  const exitFnRef = useRef<void | (() => void)>(undefined);
  const [def, conf = {}] = useInstance(arg0, arg1);
  const [reqSync, api] = useSingleton(() => {
    const queue: ((prevState: StateSignature) => StateSignature)[] = [];
    let machineState = createInitialState(def);
    let previousDeps: readonly unknown[] | undefined;

    /**
     * Runs a callback when the dependencies change.
     *
     * @param callback The callback to run when the dependencies change.
     * @param nextDeps The new dependencies to compare with the current dependencies.
     */
    function sideEffect(
      callback: () => void | (() => void),
      deps: readonly unknown[],
    ): void {
      if (previousDeps?.every((dep, i) => Object.is(dep, deps[i])) !== true) {
        exitFnRef.current?.();
        exitFnRef.current = callback();
        previousDeps = deps;
      }
    }

    /**
     * Requests a synchronization of the state machine.
     */
    function flushSync(): void {
      const state = machineState; // bind to the current state

      sideEffect(
        () => {
          const cleanup = applyEffect(
            def,
            conf,
            state,
            dispatch,
            isMounted,
            true,
          );

          return typeof cleanup !== "function" ? undefined : () => {
            const { event, context } = machineState; // stateRef.current!
            cleanup({ event, context });
          };
        },
        [state.value, state.event],
      );
    }

    /**
     * Processes the queue of actions and synchronizes the state machine.
     *
     * @param render A function that renders the state machine.
     */
    function act(render: () => void): void {
      render();

      while (queue.length) {
        while (queue.length) {
          const action = queue.shift()!;
          machineState = action(machineState);
        }

        flushSync();
      }
    }

    /**
     * Dispatches an action to the state machine.
     * No action is taken immediately.
     * The action is enqueued and will be processed later in the `act` function.
     *
     * @param action The action to dispatch to the state machine.
     */
    function dispatch(action: Action): void {
      if (isMounted.current) {
        // `queue.push` means `React.useState`
        queue.push(prevState => applyDispatch(def, conf, prevState, action));
      } else if (__DEV__) {
        log(
          { ...conf, level: "error" },
          "Cannot dispatch an action to the state machine "
            + "after the component is unmounted.",
          ["Action", action],
        );
      }
    }

    return [
      () => act(flushSync),
      [
        () => machineState,
        function send(payload: Config.SendableSignature) {
          act(() => {
            dispatch({
              type: "SEND",
              payload,
            });
          });
        },
      ] satisfies [any, any],
    ];
  });

  useEffect(
    () => {
      reqSync();

      return () => {
        exitFnRef.current?.();
      };
    },
    [],
  );

  return api;
}

export { useSyncedMachine };
export { and, guards, not, or } from "./core/guard";
export { createMachine } from "./create-machine";
export type * from "./types";

if (import.meta.vitest) {
  const { describe, test } = import.meta.vitest;

  describe("src/use-synced-machine", () => {
    test.skip("Should be tested");
  });
}

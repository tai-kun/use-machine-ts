/// <reference types="cfg-test/globals" />

declare const __DEV__: boolean;

declare module "global-jsdom/register" {
  // @ts-ignore
  export default void 0;
}

// Enhance type narrowing for `Array.isArray` and `Object.keys`.
// @ts-ignore
declare module globalThis {
  interface ArrayConstructor {
    isArray(arg: readonly any[] | any): arg is readonly any[];
  }

  interface ObjectConstructor {
    keys<T extends { readonly [key: string]: any }>(
      o: T,
    ): Extract<keyof T, string>[];
  }
}

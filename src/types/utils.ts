// dprint-ignore-file

/**
 * Get the value at the given path.
 * 
 * @template T The type of object to get the value from.
 * @template P The type of path to get the value at.
 * @template F The type of fallback value. Default is `undefined`.
 * @see {@link Get}
 */
type _Get<T, P, F> =
  P extends readonly [infer I, ...infer R]
    ? I extends keyof T
      ? _Get<T[I], R, F>
      : F
    : T extends undefined
      ? F
      : T

/**
 * Get the value at the given path.
 * 
 * @template T The type of object to get the value from.
 * @template P The type of path to get the value at.
 * @template F The type of fallback value. Default is `undefined`.
 */
export type Get<T, P extends ReadonlyArray<any>, F = undefined> = _Get<T, P, F>

/**
 * Check if the given type is a literal string.
 * 
 * @template T The type of value to check.
 */
export type IsStringLiteral<T> =
  T extends string
    ? string extends T ? false
    : true
  : false

/**
 * Check if the given type is a literal boolean.
 * 
 * @template T The type of value to check.
 */
export type IsBooleanLiteral<T> =
  [(T extends true ? 1 : 0) & (T extends false ? 1 : 0)] extends [never]
    ? true
    : false

/**
 * Check if the given type is a plain object.
 * 
 * @template T The type of value to check.
 */
export type IsPlainObject<T> =
  T extends Record<keyof any, any>
    ? T extends ReadonlyArray<any> ? false
    : T extends Function           ? false
    : true
  : false

/**
 * Check if the given type extends the other type.
 * 
 * @template T The type of value to check.
 * @template U The type to check against.
 */
export type Extends<T, U> = T extends U ? true : false

/**
 * Infer the value of the given object type.
 * 
 * @template T The type of object to infer the value from.
 */
export type ValueOf<T> = T[keyof T]

/**
 * The type of any readonly record.
 */
export type AnyRoRec = {
  readonly [key: string]: any
}

/**
 * Infer the narrowest type of an object.
 * 
 * @template T The type of object.
 * @see {@link InferNarrowestValue}
 */
export type InferNarrowestObject<T> = {
  readonly [P in keyof T]: InferNarrowestValue<T[P]>
}

/**
 * Infer the narrowest type.
 * 
 * @template T The type of value to infer the narrowest type.
 * @see {@link InferNarrowestObject}
 */
export type InferNarrowestValue<T> =
  T extends any
    ? (
      T extends readonly any[]          ? T :
      T extends ((...args: any) => any) ? T :
      T extends AnyRoRec                ? InferNarrowestObject<T> :
      T
    )
    : never

type Primitive = string | number | boolean | null | undefined

/**
 * Brand a value with a tag.
 */
export type Tagged<V extends Primitive, T extends string> = V & { __tag?: T }

/**
 * Extract all required keys from the given type.
 * 
 * @see https://github.com/sindresorhus/type-fest/blob/main/source/required-keys-of.d.ts
 */
export type RequiredKeysOf<T extends object> = Exclude<ValueOf<{
  [P in keyof T]: T extends Record<P, T[P]>
    ? P
    : never
}>, undefined>

if (cfgTest && cfgTest.url === import.meta.url) {
  const { expectType } = await import("tsd")
  const { describe, test } = cfgTest

  describe("src/types/utils", () => {
    describe("Get", () => {
      test("it should get the value at the given path", () => {
        expectType<
          Get<
            { a: { b: { c: string } } },
            ["a", "b", "c"]
          >
        >({} as string)
        expectType<
          Get<
            { a: { b: { c: string } } },
            ["a", "b"]
          >
        >({} as {
          c: string
        })
      })

      test("it should return `undefined` if the path is not found", () => {
        expectType<
          Get<
            { a: { b: { c: string } } },
            ["a", "c"]
          >
        >(undefined)
      })

      test("it should return the fallback value if the path is not found", () => {
        expectType<
          Get<
            { a: { b: { c: string } } },
            ["a", "c"],
            "fallback"
          >
        >({} as "fallback")
      })
    })

    describe("IsStringLiteral", () => {
      test("it should return `true` if the given type is a literal string", () => {
        expectType<
          IsStringLiteral<"a">
        >(true as const)
      })

      test("it should return `false` if the given type is not a literal string", () => {
        expectType<
          IsStringLiteral<string>
        >(false as const)
      })
    })

    describe("IsBooleanLiteral", () => {
      test("it should return `true` if the given type is a literal boolean", () => {
        expectType<
          IsBooleanLiteral<true>
        >(true as const)
      })

      test("it should return `false` if the given type is not a literal boolean", () => {
        expectType<
          IsBooleanLiteral<boolean>
        >(false as const)
      })
    })

    describe("IsPlainObject", () => {
      test("it should return `true` if the given type is a plain object", () => {
        expectType<
          IsPlainObject<{}>
        >(true as const)
        // ! This is a known limitation of TypeScript.
        // ! Non-plain objects should be rejected at runtime.
        expectType<
          IsPlainObject<Date>
        >(true as const)
      })

      test("it should return `false` if the given type is not a plain object", () => {
        expectType<
          IsPlainObject<string>
        >(false as const)
        expectType<
          IsPlainObject<any[]>
        >(false as const)
        expectType<
          IsPlainObject<() => void>
        >(false as const)
      })
    })

    describe("Extends", () => {
      test("it should return `true` if the given type extends the other type", () => {
        expectType<
          Extends<"a", string>
        >(true as const)
      })

      test("it should return `false` if the given type does not extend the other type", () => {
        expectType<
          Extends<"a", number>
        >(false as const)
      })
    })

    describe("ValueOf", () => {
      test("it should infer the value of the given object type", () => {
        expectType<
          ValueOf<{
            a: string
            b: number
          }>
        >({} as string | number)
      })
    })

    describe("RequiredKeysOf", () => {
      test("it should extract all required keys from the given type", () => {
        expectType<
          RequiredKeysOf<{
            a: string
            b?: number
            c: string | undefined
          }>
        >({} as "a" | "c")
      })
    })
  })
}


export type * as Config from "./config";
export type * as Definition from "./definition";
export type * from "./machine";

if (import.meta.vitest) {
  const { describe, test } = import.meta.vitest;

  describe("src/types/index", () => {
    test.skip("Should be tested");
  });
}

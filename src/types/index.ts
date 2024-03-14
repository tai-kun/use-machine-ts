export type * as Config from "./config"
export type * as Definition from "./definition"
export type * from "./machine"

if (cfgTest && cfgTest.url === import.meta.url) {
  const { describe, test } = cfgTest

  describe("src/types/index", () => {
    test.todo("Should be tested")
  })
}

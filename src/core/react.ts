export {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

if (import.meta.vitest) {
  const { describe, test } = import.meta.vitest;

  describe("src/core/react", () => {
    test.skip("Should be tested");
  });
}

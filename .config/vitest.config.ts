import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "__DEV__": `true`,
  },
  esbuild: {
    define: {
      "__DEV__": `true`,
    },
  },
  test: {
    include: [
      "src/**/*.ts",
    ],
  },
});

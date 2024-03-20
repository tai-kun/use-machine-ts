import { build } from "esbuild"

await build({
  entryPoints: ["src/**/*"],
  bundle: true,
  minify: true,
  target: "ES2022",
  external: ["react"],
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },

  write: true,
  outdir: "dist",
  format: "esm",
  platform: "browser",
  mainFields: ["module", "main"],
})

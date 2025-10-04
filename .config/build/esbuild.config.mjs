// @ts-check

import fs from "node:fs";
import path from "node:path";

/** @type {import("esbuild").BuildOptions[]} */
export default [
  // ESM

  ...[false].map(jsx => (
    create({
      jsx,
      format: "esm",
    })
  )),

  // CJS

  ...[false].map(jsx => (
    create({
      jsx,
      format: "cjs",
    })
  )),
];

/**
 * @param {object} options
 * @param {boolean} options.jsx
 * @param {"esm" | "cjs"} options.format
 * @returns {import("esbuild").BuildOptions}
 */
function create(options) {
  const { jsx, format } = options;

  return {
    // General

    bundle: true,
    platform: "node",

    // Input

    entryPoints: fs.globSync(`src/**/*.${jsx ? "tsx" : "ts"}`, {
      exclude: file => file.endsWith(".d.ts"),
    }),

    // Output contents

    format,
    lineLimit: 80,

    // Output location

    write: true,
    outdir: "dist",
    outbase: "src",
    outExtension: {
      ".js": format === "cjs"
        ? ".cjs"
        : jsx
        ? ".jsx"
        : ".mjs",
    },

    // Transformation

    ...(!jsx ? {} : {
      jsx: format === "cjs"
        ? "transform"
        : "preserve",
    }),

    // Optimization

    pure: [
      "Symbol",
    ],
    define: {
      "import.meta.vitest": "undefined",
    },
    minifySyntax: true,

    // Source maps

    sourcemap: "linked",

    // Plugins

    plugins: [
      replace({
        __DEV__: "process.env.NODE_ENV !== \"production\"",
      }),
      resolve({
        format,
      }),
    ],
  };
}

/**
 * @param {Record<string, string>} values
 * @returns {import("esbuild").Plugin}
 */
function replace(values) {
  const replacers = Object.entries(values).map(item => {
    const [key, value] = item;
    const regex = new RegExp(`\\b${key}\\b`, "g");

    /**
     * @param {string} text
     * @returns {string}
     */
    return text => {
      return text.replace(regex, value);
    };
  });

  return {
    name: "replace",
    setup(build) {
      build.onLoad({ filter: /.*/ }, async args => {
        if (args.path.indexOf("node_modules") !== -1) {
          return null;
        }

        return {
          loader: "default",
          contents: replacers.reduce(
            (text, replacer) => replacer(text),
            await fs.promises.readFile(args.path, "utf-8"),
          ),
        };
      });
    },
  };
}

/**
 * @param {object} options
 * @param {"esm" | "cjs"} options.format
 * @returns {import("esbuild").Plugin}
 */
function resolve(options) {
  const { format } = options;
  /** @type {Record<string, boolean>} */
  const accessCache = {};

  /** @param {string} file */
  function readOk(file) {
    if (file in accessCache) {
      return accessCache[file];
    }

    try {
      fs.accessSync(file, fs.constants.R_OK);
      accessCache[file] = true;

      return true;
    } catch {
      accessCache[file] = false;

      return false;
    }
  }

  /**
   * @param {string} dir
   * @param {string} file
   */
  function getBuiltPath(dir, file) {
    const name = path.join(dir, file);
    const pairs = Object.entries({
      ".ts": format === "cjs" ? ".cjs" : ".mjs",
      ".tsx": format === "cjs" ? ".cjs" : ".jsx",
      "/index.ts": `/index${format === "cjs" ? ".cjs" : ".mjs"}`,
      "/index.tsx": `/index${format === "cjs" ? ".cjs" : ".jsx"}`,
    });

    for (const [src, dst] of pairs) {
      if (readOk(name + src)) {
        return file + dst;
      }
    }

    return null;
  }

  return {
    name: "resolve",
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.namespace !== "file" || args.kind !== "import-statement") {
          return null;
        }

        if (!args.path.startsWith(".")) {
          return {
            external: true,
          };
        }

        const builtPath = getBuiltPath(args.resolveDir, args.path);

        if (builtPath) {
          return {
            path: builtPath,
            external: true,
          };
        }

        return {
          errors: [
            {
              text: `File not found: ${args.path}`,
            },
          ],
        };
      });
    },
  };
}

// @ts-check

import { build } from "esbuild";
import options from "../.config/build/esbuild.config.mjs";

await Promise.all(options.map(opts => build(opts)));

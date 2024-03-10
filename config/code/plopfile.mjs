// @ts-check

import path from "node:path"

/**
 * @param {import("plop").NodePlopAPI} plop
 */
export default plop => {
  // Helpers

  plop.setHelper("basename", arg => path.basename(arg))
  plop.setHelper("dirname", arg =>
    path.normalize(path.dirname(arg))
      .replace(new RegExp(`${path.sep}{2,}`, "g"), "/")
      .replace(new RegExp(`${path.sep}*$`, "g"), ""))

  // Generators

  plop.setGenerator("f", {
    description: "Add a function",
    prompts: [
      {
        type: "input",
        name: "outpath",
        message: "Output path",
      },
    ],
    actions: [
      {
        type: "add",
        path: "../../{{dirname outpath}}/{{basename outpath}}.ts",
        templateFile: "./templates/func/$name.ts.hbs",
      },
    ],
  })
}

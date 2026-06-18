// Registers bdd-loader.mjs as a module customization hook. Used via
// `node --import ./bdd-register.mjs` (see the test:bdd npm script).
import { register } from "node:module"
import { pathToFileURL } from "node:url"

register("./bdd-loader.mjs", pathToFileURL("./"))

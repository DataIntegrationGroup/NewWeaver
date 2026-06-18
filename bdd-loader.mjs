// Minimal ESM resolve hook: maps the "@/..." path alias (used throughout src)
// to src/*.ts so step definitions can import app code under Node's native TS
// support. Zero dependencies — Node strips the types itself.
import { pathToFileURL } from "node:url"
import { resolve as pathResolve } from "node:path"

const srcBase = pathToFileURL(pathResolve(process.cwd(), "src")).href + "/"

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(srcBase + specifier.slice(2) + ".ts", context)
  }
  return nextResolve(specifier, context)
}

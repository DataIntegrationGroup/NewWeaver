// Minimal ESM resolve hook: maps the "@/..." path alias (used throughout src)
// to src/*.ts so step definitions can import app code under Node's native TS
// support. Zero dependencies — Node strips the types itself.
import { fileURLToPath, pathToFileURL } from "node:url"
import { resolve as pathResolve } from "node:path"
import { existsSync } from "node:fs"

const srcBase = pathToFileURL(pathResolve(process.cwd(), "src")).href + "/"

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(srcBase + specifier.slice(2) + ".ts", context)
  }
  // Node's native TS support does not auto-append ".ts" for extensionless
  // relative specifiers. Resolve "./foo" / "../foo" to "<resolved>.ts" when it
  // exists, so step files can import siblings without an extension.
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(ts|tsx|js|jsx|mjs|cjs|json)$/i.test(specifier) &&
    context.parentURL
  ) {
    const resolvedUrl = new URL(specifier + ".ts", context.parentURL)
    if (existsSync(fileURLToPath(resolvedUrl))) {
      return nextResolve(resolvedUrl.href, context)
    }
  }
  return nextResolve(specifier, context)
}

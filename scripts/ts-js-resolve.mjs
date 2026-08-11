/**
 * Module resolve hook: lets a plain `node scripts/*.mjs` import the site's
 * TypeScript libraries directly.
 *
 * Files under `netlify/lib/` import each other with a `.js` extension — the
 * convention TypeScript and the Netlify function bundler expect — while the file
 * on disk is `.ts`. Node's built-in type stripping runs the `.ts` file happily
 * but will not perform that substitution itself, so a script importing
 * `catalog.ts` dies looking for `mind-maps.js`. This retries such a specifier as
 * `.ts` and otherwise stays out of the way.
 */

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && specifier.endsWith(".js")) {
      return next(`${specifier.slice(0, -3)}.ts`, context);
    }
    throw error;
  }
}

import type { MinifiedPackageJson } from '../validators/schemas.js';

const MAX_DEPS = 30; // hard cap per bucket to stay within token budget

/**
 * Strips a raw package.json down to the fields that matter for README generation.
 * Everything else (resolutions, overrides, eslintConfig, browserslist, jest config
 * embedded as objects, etc.) is discarded before the data ever reaches the LLM.
 *
 * @param raw - The full parsed package.json object (or undefined)
 * @returns A lean MinifiedPackageJson, or undefined if nothing useful was found
 */
export function minifyPackageJson(
  raw: Record<string, unknown> | undefined,
): MinifiedPackageJson | undefined {
  if (!raw) return undefined;

  const pick = <T>(key: string): T | undefined =>
    typeof raw[key] !== 'undefined' ? (raw[key] as T) : undefined;

  // ── Scalar fields ──────────────────────────────────────────────────────────
  const name        = typeof raw.name        === 'string' ? raw.name        : undefined;
  const description = typeof raw.description === 'string' ? raw.description : undefined;
  const version     = typeof raw.version     === 'string' ? raw.version     : undefined;

  // ── Scripts — drop lifecycle noise, keep meaningful ones ──────────────────
  const rawScripts = pick<Record<string, string>>('scripts');
  const NOISE = new Set([
    'prepare', 'postinstall', 'preinstall', 'prepublishOnly',
    'husky', 'lint-staged',
  ]);
  const scripts = rawScripts
    ? Object.fromEntries(
        Object.entries(rawScripts)
          .filter(([k]) => !NOISE.has(k))
          .slice(0, 20), // cap at 20 scripts
      )
    : undefined;

  // ── Dependencies — keep only string-valued entries, cap total ──────────────
  const sanitizeDeps = (
    obj: unknown,
  ): Record<string, string> | undefined => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
    const entries = Object.entries(obj as Record<string, unknown>)
      .filter((e): e is [string, string] => typeof e[1] === 'string')
      .slice(0, MAX_DEPS);
    return entries.length ? Object.fromEntries(entries) : undefined;
  };

  const dependencies    = sanitizeDeps(raw.dependencies);
  const devDependencies = sanitizeDeps(raw.devDependencies);

  // ── Guard: return undefined if completely empty ────────────────────────────
  const result: MinifiedPackageJson = {
    ...(name        && { name }),
    ...(description && { description }),
    ...(version     && { version }),
    ...(scripts     && { scripts }),
    ...(dependencies    && { dependencies }),
    ...(devDependencies && { devDependencies }),
  };

  return Object.keys(result).length ? result : undefined;
}

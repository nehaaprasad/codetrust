/**
 * Shared classifiers for what counts as "source" vs "test" vs "docs/config".
 *
 * These are used by:
 *   - `runDeterministicChecks` to decide whether to emit the project-level
 *     "No test files detected" signal.
 *   - `analyzeFiles` to decide whether a PR that changed source code also
 *     changed any tests, which in turn drives the testing-dimension floor.
 *
 * Keeping the two callers in sync via a single module avoids the common drift
 * where one place updates its extensions and the other silently lies.
 *
 * The patterns intentionally lean conservative: when in doubt, a file is
 * **not** classified as a test. That means a PR which is genuinely test-only
 * (e.g. adding new fixtures) will still correctly be recognised, but a PR
 * that edits `README.md` and one function won't be excused from having
 * tests because `README.md` was misread as "not source".
 */

/** Is this path a language source file we run rules against? */
export function isSourceFile(path: string): boolean {
  if (isTestFile(path)) return false;
  if (isDocOrConfigFile(path)) return false;
  return (
    /\.(tsx|jsx|ts|js|mjs|cjs|vue)$/.test(path) ||
    /\.go$/.test(path) ||
    /\.py$/.test(path) ||
    /\.rs$/.test(path)
  );
}

/**
 * Is this path a file written in a language the deterministic engine has
 * real language-level rules for?
 *
 * Currently: JavaScript/TypeScript (incl. JSX/TSX, Vue, Svelte), Go,
 * Python, Rust. Languages like PHP, Java, Ruby, C++, and Kotlin are NOT
 * returned as true because we do not yet ship dedicated rules for them —
 * running only the generic maintainability checks (file length, long
 * lines, TODO density) on a PHP controller produces a review that looks
 * like "this 740-line controller is long and has long lines", which is
 * exactly the kind of empty output a senior engineer instantly distrusts.
 *
 * When we add rules for another language, extend this predicate (and
 * update the AI-off hint on the result page accordingly).
 */
export function isDeeplySupportedLanguage(path: string): boolean {
  if (isDocOrConfigFile(path)) return false;
  return (
    /\.(tsx|jsx|ts|js|mjs|cjs|vue|svelte)$/.test(path) ||
    /\.go$/.test(path) ||
    /\.py$/.test(path) ||
    /\.rs$/.test(path)
  );
}

/** Is this path a dedicated test file by convention? */
export function isTestFile(path: string): boolean {
  return (
    /\.(test|spec)\.(t|j)sx?$/.test(path) || // foo.test.ts, foo.spec.tsx, foo.test.js
    path.includes("__tests__") || // Jest convention
    path.includes("/e2e/") ||
    /_test\.go$/.test(path) || // Go: foo_test.go
    /(^|\/)test_[^/]+\.py$/.test(path) || // Python: test_foo.py
    /_test\.py$/.test(path) || // Python: foo_test.py
    /_test\.rs$/.test(path) || // Rust: foo_test.rs
    /(^|\/)test_[^/]+\.rs$/.test(path) || // Rust: test_foo.rs
    /(^|\/)tests?\//.test(path) // tests/ or test/ directory
  );
}

/** Docs, config, assets, build outputs, lockfiles — never counted as source. */
export function isDocOrConfigFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return true;
  if (lower.endsWith(".txt") || lower.endsWith(".rst")) return true;
  if (/\/(readme|license|notice|changelog|contributing)(\.[a-z]+)?$/i.test(path))
    return true;
  if (/\.(json|yaml|yml|toml|ini|lock)$/.test(lower)) return true;
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|pdf)$/.test(lower)) return true;
  return false;
}

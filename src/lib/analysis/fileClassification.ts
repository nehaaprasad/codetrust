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

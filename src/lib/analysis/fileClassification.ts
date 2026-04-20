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

/**
 * Is this path a dedicated test file by convention?
 *
 * Covers the patterns we actually see in real PRs across the languages the
 * tool is meant to review. Getting this wrong has two concrete failure
 * modes, both of which have happened and both of which look unserious:
 *
 *  1. A pytest `conftest.py` misclassified as source → the testing floor
 *     injects "no tests alongside source" on a file that **is** the test
 *     harness. (See ComfyUI PR #13247: sanitization fix in
 *     `tests-unit/assets_test/conftest.py` was flagged as untested source.)
 *  2. A file under `tests-unit/` misclassified because the old regex only
 *     matched a `tests/` or `test/` literal directory segment.
 *
 * Patterns below are grouped by the signal they catch. Each rule is tight
 * enough not to swallow unrelated paths like `testimonials/` or
 * `components/Toaster.tsx`.
 */
export function isTestFile(path: string): boolean {
  const basename = path.split("/").pop() ?? "";

  // Pytest convention: any file named conftest.py anywhere is test infra.
  if (basename === "conftest.py") return true;

  return (
    // JS / TS: foo.test.ts, foo.spec.tsx, foo.test.js
    /\.(test|spec)\.(t|j)sx?$/.test(path) ||
    // Jest convention: anything inside __tests__
    path.includes("__tests__") ||
    // Playwright / Cypress
    path.includes("/e2e/") ||
    // Go: foo_test.go
    /_test\.go$/.test(path) ||
    // Python: test_foo.py, foo_test.py
    /(^|\/)test_[^/]+\.py$/.test(path) ||
    /_test\.py$/.test(path) ||
    // Rust: foo_test.rs, test_foo.rs
    /_test\.rs$/.test(path) ||
    /(^|\/)test_[^/]+\.rs$/.test(path) ||
    // Directory segments named exactly `test` / `tests` anywhere in the path.
    /(^|\/)tests?(\/|$)/.test(path) ||
    // Directory segments beginning with tests- or tests_ (tests-unit, tests_integration, test-utils, test_helpers).
    /(^|\/)tests?[-_][^/]+\//.test(path) ||
    // Directory segments ending with -test, _test, -tests, _tests (assets_test, unit-tests, integration_test).
    /(^|\/)[^/]+[-_]tests?(\/|$)/.test(path) ||
    // `spec/` or `specs/` segment (Ruby/RSpec-style layouts, also used by some JS projects).
    /(^|\/)specs?(\/|$)/.test(path) ||
    // `__test__/` (rare but used)
    path.includes("__test__")
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

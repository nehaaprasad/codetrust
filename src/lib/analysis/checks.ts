import { isSourceFile, isTestFile } from "./fileClassification";
import { firstLineForRegex, firstLineMatching } from "./lineFind";
import type { AnalysisIssue, IssueCategory } from "./types";

export type CodeFile = { path: string; content: string };

function push(
  out: AnalysisIssue[],
  category: IssueCategory,
  severity: AnalysisIssue["severity"],
  message: string,
  filePath?: string,
  lineNumber?: number | null,
) {
  out.push({
    category,
    severity,
    message,
    ...(filePath ? { filePath } : {}),
    lineNumber: lineNumber ?? undefined,
  });
}

/**
 * 1-based line number of a Go `if err != nil { }` block whose body is empty
 * (after ignoring blank lines and comment-only lines), or null if none.
 * Kept as a dedicated scanner because `firstLineMatching`'s predicate doesn't
 * receive surrounding lines.
 */
function findGoEmptyErrCheck(content: string): number | null {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*if\s+err\s*!=\s*nil\s*\{\s*$/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length) {
      const body = lines[j];
      if (/^\s*$/.test(body) || /^\s*\/\//.test(body)) {
        j += 1;
        continue;
      }
      if (/^\s*\}\s*$/.test(body)) return i + 1;
      break;
    }
  }
  return null;
}

const SECRET_PATTERNS: RegExp[] = [
  /password\s*[:=]\s*['"][^'"]{4,}['"]/i,
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /secret\s*[:=]\s*['"][^'"]{4,}['"]/i,
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/,
];

export function runDeterministicChecks(files: CodeFile[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const totalChars = files.reduce((a, f) => a + f.content.length, 0);
  if (totalChars === 0) {
    push(issues, "logic", "high", "No code content to analyze.");
    return issues;
  }

  for (const file of files) {
    const { path, content } = file;
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const isJsLike =
      ["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext) || path.endsWith(".vue");
    const isGo = ext === "go";
    const isPy = ext === "py";
    const isRs = ext === "rs";

    // Security
    if (/eval\s*\(/.test(content)) {
      const line = firstLineForRegex(content, /eval\s*\(/);
      push(
        issues,
        "security",
        "critical",
        "Use of eval() is unsafe and can execute arbitrary code.",
        path,
        line,
      );
    }
    if (/new Function\s*\(/.test(content)) {
      const line = firstLineForRegex(content, /new Function\s*\(/);
      push(
        issues,
        "security",
        "high",
        "new Function() can be abused like eval; prefer static functions.",
        path,
        line,
      );
    }
    if (/dangerouslySetInnerHTML/.test(content)) {
      const line = firstLineForRegex(content, /dangerouslySetInnerHTML/);
      push(
        issues,
        "security",
        "high",
        "dangerouslySetInnerHTML can introduce XSS if data is not sanitized.",
        path,
        line,
      );
    }
    if (/\bdocument\.write\s*\(/.test(content)) {
      const line = firstLineForRegex(content, /\bdocument\.write\s*\(/);
      push(
        issues,
        "security",
        "medium",
        "document.write can be unsafe and blocks parsing.",
        path,
        line,
      );
    }
    if (isJsLike && /\.innerHTML\s*=/.test(content)) {
      const line = firstLineForRegex(content, /\.innerHTML\s*=/);
      push(
        issues,
        "security",
        "high",
        "Assigning innerHTML can cause XSS if strings include user input.",
        path,
        line,
      );
    }
    for (const re of SECRET_PATTERNS) {
      if (re.test(content)) {
        const line = firstLineForRegex(content, re);
        push(
          issues,
          "security",
          "critical",
          "Possible hardcoded secret or private key detected.",
          path,
          line,
        );
        break;
      }
    }
    if (isJsLike && /(\$\{|\+)\s*['"]?\s*(SELECT|INSERT|DELETE|UPDATE)\b/i.test(content)) {
      const line = firstLineForRegex(
        content,
        /(\$\{|\+)\s*['"]?\s*(SELECT|INSERT|DELETE|UPDATE)\b/i,
      );
      push(
        issues,
        "security",
        "high",
        "SQL may be built via string concatenation or interpolation (injection risk).",
        path,
        line,
      );
    }

    // Go — security and error-handling heuristics.
    // Patterns are line-anchored via firstLineForRegex, so they also work
    // cleanly on patch-only content (added+context lines) for large files.
    if (isGo) {
      // Critical: shelling out via sh -c or fmt.Sprintf → command injection.
      const goShellExec =
        /exec\.Command\s*\(\s*"(?:sh|bash|\/bin\/sh|\/bin\/bash)"\s*,\s*"-c"/;
      const goFmtExec = /exec\.Command\s*\([^)]*fmt\.Sprintf\s*\(/;
      if (goShellExec.test(content) || goFmtExec.test(content)) {
        const line =
          firstLineForRegex(content, goShellExec) ??
          firstLineForRegex(content, goFmtExec);
        push(
          issues,
          "security",
          "critical",
          "exec.Command via shell or fmt.Sprintf risks command injection; pass argv directly.",
          path,
          line,
        );
      }
      // High: TLS verification disabled.
      if (/InsecureSkipVerify\s*:\s*true\b/.test(content)) {
        const line = firstLineForRegex(content, /InsecureSkipVerify\s*:\s*true\b/);
        push(
          issues,
          "security",
          "high",
          "InsecureSkipVerify: true disables TLS certificate verification.",
          path,
          line,
        );
      }
      // Medium: weak hashes for anything beyond non-security checksums.
      const goWeakHash = /\b(?:md5|sha1)\.(?:New|Sum|Sum224|Sum256)\s*\(/;
      if (goWeakHash.test(content)) {
        const line = firstLineForRegex(content, goWeakHash);
        push(
          issues,
          "security",
          "medium",
          "MD5/SHA-1 are unsuitable for passwords/signatures; use SHA-256 or bcrypt.",
          path,
          line,
        );
      }
      // Medium: `if err != nil { }` with an empty body swallows the error.
      const goEmptyErrLine = findGoEmptyErrCheck(content);
      if (goEmptyErrLine !== null) {
        push(
          issues,
          "logic",
          "medium",
          "Empty `if err != nil {}` swallows the error; handle, wrap, or return it.",
          path,
          goEmptyErrLine,
        );
      }
      // Medium: `context.Background()` or `context.TODO()` inside a function
      // that already has a `ctx context.Context` parameter. This is a common
      // footgun — developers reach for `context.Background()` when the caller
      // passed one, which silently detaches the call from caller cancellation.
      // We only flag when both are present in the file; that's a strong
      // indicator the wrong context is being used somewhere in a handler.
      const goHasCtxParam = /\bctx\s+context\.Context\b/.test(content);
      const goBgCtx = /\bcontext\.(?:Background|TODO)\s*\(\s*\)/;
      if (goHasCtxParam && goBgCtx.test(content)) {
        const line = firstLineForRegex(content, goBgCtx);
        push(
          issues,
          "logic",
          "medium",
          "context.Background()/TODO() called in a file that already receives a ctx — pass the caller's ctx to honour cancellation/timeouts.",
          path,
          line,
        );
      }
      // Low: fmt.Errorf with %s of err loses the wrapped chain; prefer %w.
      const goErrPct = /fmt\.Errorf\s*\([^)]*%s[^)]*,\s*[^)]*\berr\b/;
      if (goErrPct.test(content)) {
        const line = firstLineForRegex(content, goErrPct);
        push(
          issues,
          "maintainability",
          "low",
          "Use %w (not %s) when wrapping an error so errors.Is/As still work.",
          path,
          line,
        );
      }
    }

    // Python — security and error-handling heuristics.
    if (isPy) {
      // Critical: eval(); exec as a function (excluding .execute method).
      if (/\beval\s*\(/.test(content)) {
        const line = firstLineForRegex(content, /\beval\s*\(/);
        push(
          issues,
          "security",
          "critical",
          "eval() executes arbitrary Python and is almost always unsafe.",
          path,
          line,
        );
      }
      const pyExec = /(?<![.\w])exec\s*\(/;
      if (pyExec.test(content)) {
        const line = firstLineForRegex(content, pyExec);
        push(
          issues,
          "security",
          "high",
          "exec() runs arbitrary Python — rethink or sandbox the call.",
          path,
          line,
        );
      }
      // Critical: subprocess with shell=True enables shell injection.
      if (/\bshell\s*=\s*True\b/.test(content)) {
        const line = firstLineForRegex(content, /\bshell\s*=\s*True\b/);
        push(
          issues,
          "security",
          "critical",
          "subprocess shell=True enables shell injection; pass argv list instead.",
          path,
          line,
        );
      }
      // High: unsafe deserialization.
      if (/\bpickle\.loads?\s*\(/.test(content)) {
        const line = firstLineForRegex(content, /\bpickle\.loads?\s*\(/);
        push(
          issues,
          "security",
          "high",
          "pickle.load(s) on untrusted input allows remote code execution.",
          path,
          line,
        );
      }
      // High: yaml.load without SafeLoader is equivalent to RCE on hostile input.
      const pyYaml = /\byaml\.load\s*\(/;
      if (pyYaml.test(content) && !/SafeLoader/.test(content)) {
        const line = firstLineForRegex(content, pyYaml);
        push(
          issues,
          "security",
          "high",
          "yaml.load without SafeLoader can execute arbitrary code; use yaml.safe_load.",
          path,
          line,
        );
      }
      // High: os.system / os.popen — shell-injection prone.
      const pyOsShell = /\bos\.(?:system|popen)\s*\(/;
      if (pyOsShell.test(content)) {
        const line = firstLineForRegex(content, pyOsShell);
        push(
          issues,
          "security",
          "high",
          "os.system/os.popen run through a shell; prefer subprocess.run with argv.",
          path,
          line,
        );
      }
      // High: requests verify=False / urllib3 DisableWarnings → TLS off.
      if (/\bverify\s*=\s*False\b/.test(content)) {
        const line = firstLineForRegex(content, /\bverify\s*=\s*False\b/);
        push(
          issues,
          "security",
          "high",
          "verify=False disables TLS certificate verification on outbound requests.",
          path,
          line,
        );
      }
      // Medium: weak hash for security purposes.
      const pyWeakHash = /\bhashlib\.(?:md5|sha1)\s*\(/;
      if (pyWeakHash.test(content)) {
        const line = firstLineForRegex(content, pyWeakHash);
        push(
          issues,
          "security",
          "medium",
          "hashlib.md5/sha1 are unsuitable for passwords/signatures; use sha256 or bcrypt.",
          path,
          line,
        );
      }
      // High: SQL injection via string formatting into .execute().
      // Matches the three common footguns:
      //   cursor.execute(f"SELECT * FROM users WHERE id = {uid}")
      //   cursor.execute("SELECT * FROM users WHERE id = " + uid)
      //   cursor.execute("SELECT * FROM users WHERE id = %s" % uid)
      // Parameterised queries (`.execute(sql, (uid,))`) are NOT matched.
      const pySqlFString = /\.execute\s*\(\s*f["'][^"']*\{[^}]+\}/;
      const pySqlConcat = /\.execute\s*\(\s*["'][^"']*["']\s*\+/;
      const pySqlPercent = /\.execute\s*\(\s*["'][^"']*["']\s*%/;
      if (
        pySqlFString.test(content) ||
        pySqlConcat.test(content) ||
        pySqlPercent.test(content)
      ) {
        const line =
          firstLineForRegex(content, pySqlFString) ??
          firstLineForRegex(content, pySqlConcat) ??
          firstLineForRegex(content, pySqlPercent);
        push(
          issues,
          "security",
          "high",
          "SQL built via f-string/concatenation/%-formatting into .execute() risks injection; use parameterised queries.",
          path,
          line,
        );
      }
      // Medium: bare `except:` silently catches SystemExit / KeyboardInterrupt.
      const pyBareExcept = /^\s*except\s*:\s*(?:#.*)?$/;
      if (firstLineForRegex(content, pyBareExcept) !== null) {
        const line = firstLineForRegex(content, pyBareExcept);
        push(
          issues,
          "logic",
          "medium",
          "Bare `except:` catches everything (incl. KeyboardInterrupt); catch Exception or a specific type.",
          path,
          line,
        );
      }
    }

    // Rust — memory-safety, panic, and shell-injection heuristics.
    if (isRs) {
      const isRustTestFile =
        /(^|\/)tests\//.test(path) ||
        /_test\.rs$/.test(path) ||
        /(^|\/)test_[^/]+\.rs$/.test(path);

      // Medium: `unsafe { … }` blocks and `unsafe fn` definitions.
      // Not inherently wrong, but always deserves a reviewer's eye.
      const rsUnsafe = /\bunsafe\s*(?:\{|fn\b)/;
      if (rsUnsafe.test(content)) {
        const line = firstLineForRegex(content, rsUnsafe);
        push(
          issues,
          "security",
          "medium",
          "`unsafe` block: verify memory-safety invariants and document why it is needed.",
          path,
          line,
        );
      }

      // Medium: narrowing cast from `.len()` (which returns `usize`) to a
      // 32-bit-or-smaller integer. `usize` is 64 bits on most targets, so
      // casting a collection length to `u32`/`u16`/`u8`/`i32` silently
      // truncates past 2^31/2^15/2^7/2^31. This is the single most common
      // place Rust integer-overflow bugs enter production code and a
      // deliberate narrow pattern to keep false positives near zero.
      const rsLenNarrow = /\.len\s*\(\s*\)\s+as\s+(u8|u16|u32|i8|i16|i32)\b/;
      const rsLenNarrowMatch = content.match(rsLenNarrow);
      if (rsLenNarrowMatch) {
        const line = firstLineForRegex(content, rsLenNarrow);
        push(
          issues,
          "logic",
          "medium",
          `Cast \`.len() as ${rsLenNarrowMatch[1]}\` silently truncates on large collections; use \`try_from\`/\`try_into\` or bound the length first.`,
          path,
          line,
        );
      }

      // High: std::mem::transmute bypasses the type system entirely.
      const rsTransmute = /\b(?:std::)?mem::transmute\s*(?:::<|\()/;
      if (rsTransmute.test(content)) {
        const line = firstLineForRegex(content, rsTransmute);
        push(
          issues,
          "security",
          "high",
          "mem::transmute bypasses type safety; prefer a safe cast or `bytemuck`.",
          path,
          line,
        );
      }

      // Critical: `Command::new("sh"|"bash"|…)` — shell-level exec.
      const rsShellCmd =
        /\bCommand::new\s*\(\s*"(?:sh|bash|\/bin\/sh|\/bin\/bash)"\s*\)/;
      const rsFmtCmd = /\bCommand::new\s*\([^)]*format!\s*\(/;
      if (rsShellCmd.test(content) || rsFmtCmd.test(content)) {
        const line =
          firstLineForRegex(content, rsShellCmd) ??
          firstLineForRegex(content, rsFmtCmd);
        push(
          issues,
          "security",
          "critical",
          "Command::new via shell or format! risks command injection; pass argv to .arg().",
          path,
          line,
        );
      }

      // Medium: `.unwrap()` in non-test code panics on error. To keep the
      // signal honest, skip dedicated test files, and — for prod files that
      // happen to carry an inline `#[cfg(test)]` module — only count unwraps
      // that appear before that module starts.
      if (!isRustTestFile) {
        const testModIdx = content.search(/#\[cfg\s*\(\s*test\s*\)\s*\]/);
        const prodSection = testModIdx === -1 ? content : content.slice(0, testModIdx);
        const rsUnwrap = /\.unwrap\s*\(\s*\)/g;
        const matches = prodSection.match(rsUnwrap) ?? [];
        if (matches.length > 0) {
          const line = firstLineForRegex(prodSection, /\.unwrap\s*\(\s*\)/);
          push(
            issues,
            "logic",
            "medium",
            `${matches.length === 1 ? "`.unwrap()` panics on error" : `\`.unwrap()\` used ${matches.length}× in non-test code`}; handle the Result/Option or use \`?\`.`,
            path,
            line,
          );
        }
      }
    }

    // Logic
    if (/catch\s*\(\s*\)\s*\{/.test(content) || /catch\s*\{\s*\}/.test(content)) {
      const line =
        firstLineForRegex(content, /catch\s*\(\s*\)\s*\{/) ??
        firstLineForRegex(content, /catch\s*\{\s*\}/);
      push(
        issues,
        "logic",
        "medium",
        "Empty or unnamed catch may swallow errors and hide bugs.",
        path,
        line,
      );
    }
    if (isJsLike && /\bwhile\s*\(\s*true\s*\)/.test(content)) {
      const line = firstLineForRegex(content, /\bwhile\s*\(\s*true\s*\)/);
      push(
        issues,
        "logic",
        "low",
        "Infinite while(true) loop — ensure there is a clear exit condition.",
        path,
        line,
      );
    }

    // Performance
    if (isJsLike && /\.map\s*\([^)]*\)\s*\.map\s*\(/.test(content)) {
      const line = firstLineForRegex(content, /\.map\s*\([^)]*\)\s*\.map\s*\(/);
      push(
        issues,
        "performance",
        "low",
        "Chained .map() calls can often be merged to reduce iterations.",
        path,
        line,
      );
    }
    if (
      isJsLike &&
      /useEffect\s*\(/.test(content) &&
      /,\s*\[\s*\]\s*\)/.test(content)
    ) {
      const line = firstLineForRegex(content, /useEffect\s*\(/);
      push(
        issues,
        "performance",
        "low",
        "useEffect with an empty dependency array runs once — confirm dependencies are complete.",
        path,
        line,
      );
    }

    // Accessibility (frontend heuristics)
    if (["tsx", "jsx", "vue", "html"].includes(ext)) {
      if (/<img\b(?![^>]*\balt=)/i.test(content)) {
        const line = firstLineForRegex(content, /<img\b/i);
        push(
          issues,
          "accessibility",
          "medium",
          "Image without alt text hurts screen reader users.",
          path,
          line,
        );
      }
      if (/\bonClick\s*=/.test(content) && !/\brole=\s*["']button["']/.test(content)) {
        const line = firstLineForRegex(content, /\bonClick\s*=/);
        push(
          issues,
          "accessibility",
          "low",
          "onClick on non-button elements should include keyboard support and role.",
          path,
          line,
        );
      }
    }

    // Maintainability
    const lines = content.split(/\r?\n/);
    if (lines.length > 400) {
      push(
        issues,
        "maintainability",
        "medium",
        `File is very long (${lines.length} lines); consider splitting.`,
        path,
        1,
      );
    }
    const longLineIdx = lines.findIndex((l) => l.length > 200);
    if (longLineIdx >= 0) {
      push(
        issues,
        "maintainability",
        "low",
        "Very long line reduces readability.",
        path,
        longLineIdx + 1,
      );
    }
  }

  // Testing: project-level signal. We flag "no tests" when there is at least
  // one source file but no conventional test file anywhere in the analysed
  // set. Rust unit tests live inline under `#[cfg(test)]`, so those are
  // detected from file contents rather than path alone.
  const paths = files.map((f) => f.path);
  const hasPathTestFile = paths.some(isTestFile);
  const hasInlineRustTests = files.some(
    (f) => /\.rs$/.test(f.path) && /#\[cfg\s*\(\s*test\s*\)\s*\]/.test(f.content),
  );
  const hasTestFile = hasPathTestFile || hasInlineRustTests;
  const hasSource = paths.some(isSourceFile);
  if (hasSource && !hasTestFile && files.length >= 1) {
    push(
      issues,
      "testing",
      "medium",
      "No test files detected alongside source files.",
      paths[0] ?? "—",
      null,
    );
  }

  // Logic: TODO/FIXME concentration
  for (const file of files) {
    const todoCount = (file.content.match(/\b(TODO|FIXME)\b/g) ?? []).length;
    if (todoCount >= 5) {
      const line = firstLineMatching(file.content, (l) =>
        /\b(TODO|FIXME)\b/.test(l),
      );
      push(
        issues,
        "logic",
        "low",
        `Many TODO/FIXME markers (${todoCount}) — track or resolve before release.`,
        file.path,
        line,
      );
      break;
    }
  }

  return issues;
}

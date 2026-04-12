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

  // Testing: project-level
  const paths = files.map((f) => f.path);
  const hasTestFile = paths.some(
    (p) =>
      /\.(test|spec)\.(t|j)sx?$/.test(p) ||
      p.includes("__tests__") ||
      p.includes("/e2e/"),
  );
  const hasSource = paths.some((p) => /\.(tsx|jsx|vue)$/.test(p));
  if (hasSource && !hasTestFile && files.length >= 1) {
    push(
      issues,
      "testing",
      "medium",
      "No test files detected alongside UI/source files.",
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

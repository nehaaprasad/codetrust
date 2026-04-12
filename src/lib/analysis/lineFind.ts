/** First 1-based line index where predicate matches, or null. */
export function firstLineMatching(
  content: string,
  predicate: (line: string) => boolean,
): number | null {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (predicate(lines[i])) return i + 1;
  }
  return null;
}

/** First 1-based line where regex matches. */
export function firstLineForRegex(
  content: string,
  re: RegExp,
): number | null {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) return i + 1;
  }
  return null;
}

// glob 匹配与“更具体优先”的比较（docs/11 第 4 节）。
import picomatch from "picomatch";

const GLOB_CHARS = /[*?[\]{}()!]/;
const matchers = new Map<string, (path: string) => boolean>();

export function isGlob(pattern: string): boolean {
  return GLOB_CHARS.test(pattern);
}

export function matches(pattern: string, path: string): boolean {
  let matcher = matchers.get(pattern);
  if (matcher === undefined) {
    matcher = picomatch(pattern, { dot: true });
    matchers.set(pattern, matcher);
  }
  return matcher(path);
}

export function matchesAny(patterns: readonly string[], path: string): boolean {
  return patterns.some((pattern) => matches(pattern, path));
}

/**
 * 具体程度，数组逐位比较、越大越具体：
 * 1. 不含通配符的精确路径最具体；
 * 2. 开头连续几段不含通配符（services/api/src/lib/auth/** 有 5 段，比 services/api/src/lib/** 的 4 段具体）；
 * 3. 去掉通配符后剩下的字符数（config/market*.yaml 比 config/*.yaml 具体）。
 */
export function specificity(pattern: string): [number, number, number] {
  const exact = isGlob(pattern) ? 0 : 1;
  let literalSegments = 0;
  for (const segment of pattern.split("/")) {
    if (isGlob(segment)) break;
    literalSegments += 1;
  }
  const literalChars = pattern.replace(/[*?]/g, "").length;
  return [exact, literalSegments, literalChars];
}

export function compareSpecificity(a: string, b: string): number {
  const sa = specificity(a);
  const sb = specificity(b);
  for (let i = 0; i < sa.length; i += 1) {
    const diff = (sa[i] ?? 0) - (sb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** glob 开头不含通配符的目录部分；精确路径取它所在的目录。仓库根用 "" 表示。 */
export function literalBaseDir(pattern: string): string {
  const segments = pattern.split("/");
  if (!isGlob(pattern)) return segments.slice(0, -1).join("/");
  const base: string[] = [];
  for (const segment of segments) {
    if (isGlob(segment)) break;
    base.push(segment);
  }
  return base.join("/");
}

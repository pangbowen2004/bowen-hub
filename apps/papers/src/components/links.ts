import type { Paper } from "@bowen-hub/contracts";
/** 公开资源只提供绝对 HTTP(S) 链接；忽略不安全或格式错误的地址。 */
export function publicWebUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export function paperResourceLinks(paper: Paper) {
  return {
    source: publicWebUrl(paper.resources?.landingPage) ?? publicWebUrl(paper.meta.sourceUrl),
    code: publicWebUrl(paper.resources?.code?.url),
  };
}

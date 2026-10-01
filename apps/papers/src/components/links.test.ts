import type { Paper } from "@bowen-hub/contracts";
import { expect, it } from "vitest";
import { paperResourceLinks, publicWebUrl } from "./links";

it("resource links allow absolute http(s) and omit executable, data and malformed URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///secret",
    "ftp://example.com",
    "//example.com",
    "not a URL",
    "",
    null,
    undefined,
  ])
    expect(publicWebUrl(value)).toBeNull();
  expect(publicWebUrl("https://arxiv.org/abs/2505.07078")).toBe("https://arxiv.org/abs/2505.07078");
  expect(publicWebUrl("http://example.com/code")).toBe("http://example.com/code");
});
it("all resource nav sources use the same safe protocol boundary and may fall back to a valid original source", () => {
  const paper = {
    meta: { title: "Example", sourceUrl: "javascript:alert(1)" },
    resources: {
      landingPage: "data:text/html,unsafe",
      code: { status: "unverified", url: "javascript:alert(2)" },
    },
  } as Paper;
  expect(paperResourceLinks(paper)).toEqual({ source: null, code: null });
  expect(
    paperResourceLinks({
      ...paper,
      meta: { title: "Example", sourceUrl: "https://arxiv.org/abs/1" },
    }),
  ).toEqual({ source: "https://arxiv.org/abs/1", code: null });
});

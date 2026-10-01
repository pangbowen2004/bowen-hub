import { describe, expect, it } from "vitest";
import { formatJson, HASH_HEADER, NOTICE, withHeader, withJsonNotice } from "../src/notice.ts";

describe("生成文件的第一行提示", () => {
  it("注释头只加一次", () => {
    const once = withHeader("openapi: 3.1.0\n", HASH_HEADER);
    expect(once).toBe(`${HASH_HEADER}\nopenapi: 3.1.0\n`);
    expect(withHeader(once, HASH_HEADER)).toBe(once);
  });

  it("JSON 用第一个键 $comment，已有的会被替换", () => {
    const value = withJsonNotice({ $schema: "x", $comment: "旧的", type: "object" });
    expect(Object.keys(value)).toEqual(["$comment", "$schema", "type"]);
    expect(value.$comment).toBe(NOTICE);
  });

  it("JSON 两空格缩进、末尾换行", () => {
    expect(formatJson({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}\n');
  });
});

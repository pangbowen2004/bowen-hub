import { describe, expect, it } from "vitest";
import { HASH_HEADER } from "../src/notice.ts";
import { classNames, datamodelArgs, findAliases, initModule } from "../src/python.ts";

const SOURCE = `${HASH_HEADER}

from pydantic import BaseModel, Field


class Run(BaseModel):
    id: str


class WatchItem(BaseModel):
    from_: str = Field(..., alias="from")
`;

describe("Pydantic 生成的后处理", () => {
  it("找出全部顶层类", () => {
    expect(classNames(SOURCE)).toEqual(["Run", "WatchItem"]);
  });

  it("找出字段别名（字段名用了 Python 关键字）", () => {
    expect(findAliases(SOURCE)).toEqual(['from_: str = Field(..., alias="from")']);
    expect(findAliases("class Run(BaseModel):\n    id: str\n")).toEqual([]);
  });

  it("__init__.py 显式导出全部模型，第一行是提示", () => {
    const text = initModule(["WatchItem", "Run"]);
    expect(text.split("\n")[0]).toBe(HASH_HEADER);
    expect(text).toContain("    Run as Run,\n    WatchItem as WatchItem,\n");
    expect(text).toContain('__all__ = [\n    "Run",\n    "WatchItem",\n]\n');
  });

  it("关掉时间戳（两次生成没有差异）、时间必须带时区", () => {
    const args = datamodelArgs("in.yaml", "out.py");
    expect(args).toContain("--disable-timestamp");
    expect(args[args.indexOf("--output-datetime-class") + 1]).toBe("AwareDatetime");
  });
});

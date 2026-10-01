// 论文契约业务边界：迁移原文、公开隔离、草稿必填和原出处传播。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAjv, OPENAPI, ROOT, readJson, readYaml, SAMPLES, SCHEMAS } from "../support/repo";

const ajv = createAjv();
const check = (name: string, value: unknown) => ajv.getSchema(`${name}.json`)?.(value) === true;
const sample = (file: string) =>
  readJson(join(SAMPLES, "papers", `${file}.json`)) as Record<string, unknown>;
const arxiv = sample("Paper.arxiv-2505.07078");
const acl = sample("Paper.acl-2021.acl-long.500");
const schema = (name: string) =>
  readJson(join(SCHEMAS, `${name}.json`)) as {
    properties: Record<string, Record<string, unknown>>;
    required: string[];
  };

describe("论文领域契约", () => {
  it("31个论文接口归T32，问答为事件流，重写仅触发204", () => {
    const doc = readYaml(OPENAPI) as {
      paths: Record<
        string,
        Record<
          string,
          { "x-task": string; responses: Record<string, { content?: Record<string, unknown> }> }
        >
      >;
    };
    const paths = Object.entries(doc.paths).filter(([path]) =>
      /^\/v1\/(?:public\/|internal\/)?papers(?:\/|$)/.test(path),
    );
    const ops = paths.flatMap(([, methods]) => Object.values(methods));
    expect(ops).toHaveLength(31);
    expect(ops.every((op) => op["x-task"] === "T32")).toBe(true);
    expect(doc.paths["/v1/papers/{id}/ask"]?.post?.responses["200"]?.content).toHaveProperty(
      "text/event-stream",
    );
    expect(doc.paths["/v1/papers/{id}/revise"]?.post?.responses).toHaveProperty("204");
  });

  it.each(["arxiv-2505.07078", "acl-2021.acl-long.500"])(
    "%s导读正文逐字保留且旧论文不伪造generatedBy",
    (id) => {
      const paper = sample(`Paper.${id}`);
      expect((paper.guide as { article: string }).article).toBe(
        readFileSync(join(ROOT, "fixtures", "papers", id, "12-论文导读文章.md"), "utf8"),
      );
      expect(paper).not.toHaveProperty("generatedBy");
      const privateData = sample(`PaperPrivate.${id}`);
      const cards = privateData.legacyCards as { title: string; markdown: string }[];
      expect(cards.find((card) => card.title === "R1 结构阅读卡")?.markdown).toBe(
        readFileSync(join(ROOT, "fixtures", "papers", id, "02-R1结构阅读卡.md"), "utf8"),
      );
      expect(cards.some((card) => card.title === "迁移补充字段")).toBe(true);
    },
  );

  it("缺失更新时间按固定迁移日回退，source_located映射未核验", () => {
    expect(acl.status).toMatchObject({ visibility: "private", updatedAt: "2026-10-01" });
    expect(arxiv.status).toMatchObject({ visibility: "public", updatedAt: "2026-08-18" });
    expect(acl.resources).toMatchObject({ code: { status: "unverified" } });
    expect(JSON.stringify(sample("PaperPrivate.acl-2021.acl-long.500"))).toContain(
      "source_located",
    );
  });

  it("公开派生数据不含私有ACL、笔记或迁移卡，全部目录包含两篇", () => {
    for (const name of ["PapersCatalog.public", "GraphData.public", "SearchIndex.public"]) {
      const body = JSON.stringify(sample(name));
      expect(body).not.toContain("acl-2021.acl-long.500");
      expect(body).not.toContain("legacyCards");
      expect(body).not.toContain("user_note");
    }
    expect(sample("PapersCatalog.all").stats).toMatchObject({ paperCount: 2 });
    expect(sample("PapersCatalog.public").stats).toMatchObject({ paperCount: 1 });
  });

  it("公开图所有边和共现都指向已有节点", () => {
    const graph = sample("GraphData.public") as {
      nodes: { id: string }[];
      edges: { source: string; target: string }[];
      cooccurrence: { source: string; target: string; count: number }[];
    };
    const ids = new Set(graph.nodes.map((node) => node.id));
    for (const edge of [...graph.edges, ...graph.cooccurrence]) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
    expect(graph.cooccurrence.every((edge) => edge.count === 1)).toBe(true);
  });

  it("旧Paper最小块合法，新草稿子块必填且导读无硬字数上限", () => {
    expect(
      check("Paper", { id: "custom-minimal", meta: { title: "示例" }, status: arxiv.status }),
    ).toBe(true);
    expect(check("PaperDraft", { meta: { title: "示例" } })).toBe(false);
    expect(schema("PaperDraftGuide").required).toEqual(
      expect.arrayContaining([
        "article",
        "oneSentence",
        "readingGoal",
        "prerequisites",
        "bottomLine",
        "limitations",
      ]),
    );
    expect(schema("PaperDraftGuide").properties.article).not.toHaveProperty("maxLength");
    expect(schema("PaperDraftGuide").properties.article).not.toHaveProperty("x-max-chars");
  });

  it("私有笔记写入体只定义掌握状态和笔记，内部迁移体保留全部私人卡", () => {
    expect(Object.keys(schema("PaperPrivateWrite").properties).sort()).toEqual([
      "mastery",
      "notes",
    ]);
    expect(schema("PaperPrivate").properties).toHaveProperty("legacyCards");
    expect(schema("PaperPrivate").properties).toHaveProperty("explanations");
  });

  it("审核图片和原文标注存在，解释卡可传递QA原出处", () => {
    expect(schema("PaperReviewInput").properties.pageImages?.["x-image"]).toBe(true);
    expect(schema("PaperIndependentSourceCheck").properties.sourceExcerpt?.["x-source-quote"]).toBe(
      true,
    );
    const body = {
      question: "示例问题",
      answer: "示例回答",
      pages: [1],
      generatedBy: {
        capability: "papers.qa",
        version: 1,
        model: "fixture/fake",
        at: "2026-10-01T00:00:00Z",
      },
    };
    expect(check("PaperExplanationCreate", body)).toBe(true);
    expect(schema("PaperExplanationCreate").properties).toHaveProperty("generatedBy");
  });
});

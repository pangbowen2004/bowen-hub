import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EvidencePopover } from "./EvidencePopover";
import { PaperReader } from "./index";

it("renders static content in a semantic reading shell", () => {
  render(
    <PaperReader>
      <h2>证据导读</h2>
      <p>公开内容</p>
    </PaperReader>,
  );
  expect(
    screen.getByRole("article", { name: "论文导读" }).contains(screen.getByText("公开内容")),
  ).toBe(true);
});

it("minimal migrated papers omit unavailable sections, rather than printing empty templates", () => {
  const paper = {
    id: "minimal",
    meta: { title: "Minimal" },
    status: {
      visibility: "public" as const,
      review: "passed" as const,
      readingDepth: "R0" as const,
      nextAction: "",
      updatedAt: "2026-10-01",
    },
    guide: { prerequisites: [] },
    evidence: { claims: [] },
    learning: { activeRecall: [] },
    structure: { coverage: [], negativeResults: [] },
  };
  const { container } = render(<PaperReader paper={paper} />);
  expect(container.textContent).toBe("");
  expect(screen.queryByText("技术附录")).toBeNull();
});
it("shared reader supports evidence filtering, collapsed recall and computed reading coverage", () => {
  const paper = {
    id: "sample",
    meta: { title: "Sample" },
    status: {
      visibility: "public" as const,
      review: "passed" as const,
      readingDepth: "R1" as const,
      nextAction: "",
      updatedAt: "2026-10-01",
    },
    evidence: {
      claims: [
        { id: "result", kind: "result" as const, claim: "Result" },
        { id: "limit", kind: "limitation" as const, claim: "Limit" },
      ],
    },
    learning: { activeRecall: [{ question: "Recall question", answer: "Recall answer" }] },
    structure: {
      coverage: [
        { dimension: "one", status: "complete" as const },
        { dimension: "two", status: "missing" as const },
      ],
    },
  };
  const { container } = render(<PaperReader paper={paper} />);
  expect(screen.getByText(/阅读覆盖率 50%/).textContent).toContain("不是论文质量");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "limitation" } });
  expect(container.querySelector<HTMLTableRowElement>('[data-claim-kind="result"]')?.hidden).toBe(
    true,
  );
  expect(
    container.querySelector<HTMLTableRowElement>('[data-claim-kind="limitation"]')?.hidden,
  ).toBe(false);
  expect(screen.getByText("Recall question").closest("details")?.open).toBe(false);
});

it("证据页按钮把实际物理页交给控制台，公开阅读不产生私人页请求", () => {
  const pages: number[] = [];
  const { rerender } = render(
    <EvidencePopover
      claims={[{ id: "c1", kind: "result", claim: "原文", pdfPage: 3 }]}
      onPage={(page) => pages.push(page)}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "打开原文第 3 页", hidden: true }));
  expect(pages).toEqual([3]);
  rerender(<EvidencePopover claims={[{ id: "c1", kind: "result", claim: "原文", pdfPage: 3 }]} />);
  expect(screen.queryByRole("button", { name: "打开原文第 3 页", hidden: true })).toBeNull();
});

it("证据卡保留原文摘录，物理页链接不跳到论文首页", () => {
  const paper = {
    id: "evidence",
    resources: {
      code: {
        status: "verified" as const,
        note: "已核对官方代码。\n{'label': '官方仓库', 'url': 'https://example.org'}",
      },
    },
    meta: { title: "Evidence", sourceUrl: "https://aclanthology.org/2025.acl-long.773/" },
    status: {
      visibility: "public" as const,
      review: "passed" as const,
      readingDepth: "R1" as const,
      nextAction: "",
      updatedAt: "2026-10-05",
    },
    evidence: {
      claims: [
        {
          id: "c1",
          kind: "result" as const,
          claim: "有条件的结果",
          sourceExcerpt: "Original quotation",
          pdfPage: 7,
        },
        {
          id: "c2",
          kind: "result" as const,
          claim: "尚未找到摘录的证据",
        },
      ],
    },
  };
  const { container } = render(<PaperReader paper={paper} />);
  expect(container.textContent).toContain("已核对官方代码。");
  expect(container.textContent).not.toContain("{'label':");
  expect(screen.getAllByText("原文未找到").length).toBeGreaterThan(0);
  expect(
    screen.getAllByText("Original quotation").every((node) => node.tagName === "BLOCKQUOTE"),
  ).toBe(true);
  expect(screen.getByRole("link", { name: "原文第 7 页 ↗" }).getAttribute("href")).toBe(
    "https://aclanthology.org/2025.acl-long.773.pdf#page=7",
  );
});

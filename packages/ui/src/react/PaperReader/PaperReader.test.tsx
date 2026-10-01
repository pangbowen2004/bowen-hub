import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
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

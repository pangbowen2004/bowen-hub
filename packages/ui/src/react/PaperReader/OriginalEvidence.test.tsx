import type { PaperClaim } from "@bowen-hub/contracts";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { OriginalEvidence } from "./OriginalEvidence";

it("表格使用带表头的PDF区域并注明实际页码，不输出原先数字串", () => {
  const claim = {
    id: "result",
    kind: "result",
    claim: "结果",
    anchor: "Table 1",
    sourceExcerpt: "75.3 84.1 95.6 91.2",
  } as PaperClaim;
  const { container } = render(
    <OriginalEvidence
      claim={claim}
      image={{ src: "/evidence/original.png", width: 750, height: 380, page: 7 }}
    />,
  );
  expect(screen.getByRole("img").getAttribute("alt")).toContain("包含表头");
  expect(container.textContent).toContain("原 PDF 第 7 页");
  expect(container.textContent).not.toContain("75.3");
});
it("没有可靠区域的表格数字不被当作可读摘录，普通文字逐字保留", () => {
  const claim = {
    id: "result",
    kind: "result",
    claim: "结果",
    anchor: "Table 1",
    sourceExcerpt: "75.3 84.1 95.6 91.2",
  } as PaperClaim;
  const { rerender, container } = render(<OriginalEvidence claim={claim} />);
  expect(container.textContent).toBe("原文未找到");
  rerender(
    <OriginalEvidence
      claim={{ ...claim, anchor: "Section 2", sourceExcerpt: "Exact source sentence." }}
    />,
  );
  expect(container.querySelector("blockquote")?.textContent).toBe("Exact source sentence.");
});

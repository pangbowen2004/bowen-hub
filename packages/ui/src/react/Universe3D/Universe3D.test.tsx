import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import taxonomy from "../../../../../config/paper_topics.json";
import { Universe3D } from "./index";

afterEach(cleanup);

vi.mock("./scene", () => ({
  createAtlas: () => {
    throw Error("No WebGL");
  },
}));
it("WebGL失败仍可搜索全部论文、就地选中并进入原文导读", async () => {
  render(
    <Universe3D
      data={{
        nodes: [
          { id: "p", kind: "paper", label: "Public" },
          { id: "q", kind: "paper", label: "Second" },
        ],
        edges: [],
        cooccurrence: [],
      }}
    />,
  );
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("列表仍可阅读"));
  expect(screen.getByRole("link", { name: "阅读全文 Public" }).getAttribute("href")).toBe(
    "/papers/p/",
  );
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Second" } });
  expect(screen.queryByRole("link", { name: "阅读全文 Public" })).toBeNull();
  expect(screen.getByRole("link", { name: "阅读全文 Second" }).getAttribute("href")).toBe(
    "/papers/q/",
  );
  fireEvent.click(screen.getByRole("button", { name: "在宇宙中查看 Second" }));
  expect(screen.getByRole("link", { name: "阅读这篇" }).getAttribute("href")).toBe("/papers/q/");
  expect(screen.getByRole("heading", { name: "Second" })).toBeTruthy();
});

it("大类汇总、具体主题和跨主题方法标签使用同一批论文", async () => {
  render(
    <Universe3D
      data={{
        nodes: [
          { id: "acl-2025.acl-long.773", kind: "paper", label: "BookWorld" },
          { id: "arxiv-2303.17760", kind: "paper", label: "CAMEL" },
          { id: "arxiv-2505.07078", kind: "paper", label: "FinSABER" },
        ],
        edges: [],
        cooccurrence: [],
      }}
      taxonomy={taxonomy}
    />,
  );
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("列表仍可阅读"));
  const tree = within(screen.getByRole("navigation", { name: "主题目录" }));
  fireEvent.click(tree.getByRole("button", { name: /^AI 研究与应用/ }));
  expect(screen.getByRole("link", { name: "阅读全文 BookWorld" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "阅读全文 CAMEL" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "阅读全文 FinSABER" })).toBeNull();
  fireEvent.click(tree.getByRole("button", { name: /^剧本与互动叙事/ }));
  expect(screen.queryByRole("link", { name: "阅读全文 CAMEL" })).toBeNull();
  expect(screen.getByRole("link", { name: "阅读这篇" }).getAttribute("href")).toBe(
    "/papers/acl-2025.acl-long.773/",
  );
  fireEvent.click(screen.getByRole("button", { name: "多智能体" }));
  expect(screen.getByRole("link", { name: "阅读全文 CAMEL" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "清除标签 ×" })).toBeTruthy();
  fireEvent.click(tree.getByRole("button", { name: /^金融与量化/ }));
  expect(screen.queryByRole("link", { name: "阅读全文 BookWorld" })).toBeNull();
  expect(screen.getByRole("link", { name: "阅读全文 FinSABER" })).toBeTruthy();
});

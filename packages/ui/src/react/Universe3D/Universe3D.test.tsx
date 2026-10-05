import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Universe3D } from "./index";

vi.mock("./scene", () => ({
  createAtlas: () => {
    throw Error("No WebGL");
  },
}));
it("WebGL failure preserves the complete searchable list and reading navigation", async () => {
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
  expect(screen.getByRole("link", { name: "Public" }).getAttribute("href")).toBe("/papers/p/");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Second" } });
  expect(screen.queryByRole("link", { name: "Public" })).toBeNull();
  expect(screen.getByRole("link", { name: "Second" }).getAttribute("href")).toBe("/papers/q/");
  fireEvent.click(screen.getByRole("button", { name: /在图谱中定位/ }));
  expect(screen.getByRole("link", { name: /阅读这篇/ }).getAttribute("href")).toBe("/papers/q/");
});

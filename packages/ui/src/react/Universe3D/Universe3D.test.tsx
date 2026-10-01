import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Universe3D } from "./index";

vi.mock("3d-force-graph", () => ({
  default: class {
    constructor() {
      throw Error("No WebGL");
    }
  },
}));
it("loads 3D only on request and preserves navigation after a WebGL failure", async () => {
  render(
    <Universe3D
      data={{ nodes: [{ id: "p", kind: "paper", label: "Public" }], edges: [], cooccurrence: [] }}
    />,
  );
  expect(screen.getByRole("status").textContent).toContain("尚未加载");
  expect(screen.getByRole("link", { name: "Public" }).getAttribute("href")).toBe("/papers/p/");
  fireEvent.click(screen.getByRole("button", { name: "加载 3D 图谱" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("无法加载"));
  expect(screen.getByRole("link", { name: "前往 2D 图谱" }).getAttribute("href")).toBe("/graph/");
});

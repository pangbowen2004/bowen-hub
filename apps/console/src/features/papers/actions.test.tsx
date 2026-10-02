// @vitest-environment jsdom
import { configureClient } from "@bowen-hub/contracts/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import rows from "../../../../../fixtures/samples/papers/PaperSummary.all.json";
import { InboxPage } from "./InboxPage";
import { ListPage } from "./ListPage";

const api = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock("@bowen-hub/contracts/client", async (original) => ({
  ...(await original<typeof import("@bowen-hub/contracts/client")>()),
  privatePapersPatchPaper: api.patch,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#paper">{children}</a>,
}));
const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  clients.push(client);
  client.setQueryData(["papers", "catalog"], { spaces: [] });
  client.setQueryData(["papers", "list"], rows);
  client.setQueryData(["papers", "uploads"], []);
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  api.patch.mockReset();
  configureClient({ baseUrl: "" });
});

it("超过20MiB的真实File仍通过生成客户端上传，不把验收负载当产品上限", async () => {
  const file = new File([new Uint8Array(21 * 1024 * 1024)], "large.pdf", {
    type: "application/pdf",
  });
  expect(file.size).toBeGreaterThan(20 * 1024 * 1024);
  // jsdom的文件输入无法通过fireEvent写入内部FileList；仅替代表单读取，保留真实File和生成客户端。
  vi.spyOn(FormData.prototype, "get").mockReturnValue(file);
  configureClient({ baseUrl: "https://api.fixture" });
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (init?.method === "PUT") return Response.json({ id: "uploaded-large", status: "queued" });
    return Response.json(
      String(input).includes("/uploads") ? [] : { items: rows, nextCursor: null },
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(<InboxPage />, setup());
  const form = screen.getByRole("button", { name: "上传并入库" }).closest("form");
  if (!form) throw new Error("上传表单缺失");
  fireEvent.submit(form);
  await screen.findByText("已提交入库，处理状态会自动更新。");
  const uploads = fetcher.mock.calls.filter(([, init]) => init?.method === "PUT");
  expect(uploads).toHaveLength(1);
  expect(uploads[0]?.[0]).toBe("https://api.fixture/v1/papers/uploads/large.pdf");
  expect(uploads[0]?.[1]).toMatchObject({ method: "PUT", body: file });
  expect(screen.queryByText("PDF 不能超过 20 MB")).toBeNull();
});

it("批量公开等待响应时禁用选择，完成后恢复选择", async () => {
  let complete: (() => void) | undefined;
  api.patch.mockReturnValue(
    new Promise<void>((resolve) => {
      complete = resolve;
    }),
  );
  render(<ListPage />, setup());
  const first = screen.getByLabelText(
    `选择 ${rows[0]?.titleZh ?? rows[0]?.title}`,
  ) as HTMLInputElement;
  const second = screen.getByLabelText(
    `选择 ${rows[1]?.titleZh ?? rows[1]?.title}`,
  ) as HTMLInputElement;
  fireEvent.click(first);
  fireEvent.click(screen.getByRole("button", { name: "批量公开" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
  expect(first.disabled).toBe(true);
  expect(second.disabled).toBe(true);
  expect(first.checked).toBe(true);
  act(() => second.click());
  expect(second.checked).toBe(false);
  expect(api.patch).toHaveBeenCalledTimes(1);
  await act(async () => complete?.());
  await screen.findByText("1 篇已公开，公开站将在更新后显示。");
  expect(first.disabled).toBe(false);
  expect(second.disabled).toBe(false);
  fireEvent.click(second);
  expect(second.checked).toBe(true);
});

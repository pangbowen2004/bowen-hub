// @vitest-environment jsdom
import type { Paper, PaperPrivate } from "@bowen-hub/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "../../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json";
import { InboxPage } from "./InboxPage";
import { PrivateNotes, Settings } from "./ReaderPage";

const api = vi.hoisted(() => ({ put: vi.fn(), patch: vi.fn(), list: vi.fn() }));
vi.mock("@bowen-hub/contracts/client", async (original) => ({
  ...(await original<typeof import("@bowen-hub/contracts/client")>()),
  privatePapersPutPrivate: api.put,
  privatePapersPatchPaper: api.patch,
  privatePapersListPapers: api.list,
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
  client.setQueryData(["papers", "catalog"], {
    spaces: [
      { id: "quant-finance", label: "金融" },
      { id: "agent-systems", label: "智能体" },
    ],
  });
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
const paper = sample as Paper;
const notes: PaperPrivate = {
  schemaVersion: 1,
  mastery: "pending",
  notes: "旧笔记",
  explanations: [],
  legacyCards: [],
};
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.clearAllMocks();
});

describe("same-paper refreshed editor state", () => {
  it("refreshes clean notes and mastery without replacing unsaved edits", () => {
    api.put.mockResolvedValue(notes);
    const { wrapper } = setup();
    const view = render(<PrivateNotes id={paper.id} initial={notes} />, { wrapper });
    const refreshed: PaperPrivate = { ...notes, notes: "服务器新笔记", mastery: "confirmed" };
    view.rerender(<PrivateNotes id={paper.id} initial={refreshed} />);
    expect((screen.getByLabelText("私人笔记") as HTMLTextAreaElement).value).toBe("服务器新笔记");
    expect((screen.getByLabelText("掌握状态") as HTMLSelectElement).value).toBe("confirmed");
    fireEvent.change(screen.getByLabelText("私人笔记"), { target: { value: "尚未保存的编辑" } });
    view.rerender(<PrivateNotes id={paper.id} initial={{ ...refreshed, notes: "另一端刷新" }} />);
    expect((screen.getByLabelText("私人笔记") as HTMLTextAreaElement).value).toBe("尚未保存的编辑");
  });

  it("keeps the local draft while its autosave is pending", async () => {
    api.put.mockReturnValue(new Promise(() => {}));
    const { wrapper } = setup();
    const view = render(<PrivateNotes id={paper.id} initial={notes} />, { wrapper });
    fireEvent.change(screen.getByLabelText("私人笔记"), { target: { value: "保存中的笔记" } });
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(paper.id, {
        mastery: "pending",
        notes: "保存中的笔记",
      }),
    );
    view.rerender(<PrivateNotes id={paper.id} initial={{ ...notes, notes: "远端旧版本" }} />);
    expect((screen.getByLabelText("私人笔记") as HTMLTextAreaElement).value).toBe("保存中的笔记");
    expect(screen.getByText("正在保存…")).toBeTruthy();
  });

  it("refreshes all clean settings and submits the refreshed values", async () => {
    api.patch.mockReturnValue(new Promise(() => {}));
    const { wrapper } = setup();
    const view = render(<Settings paper={paper} />, { wrapper });
    const refreshed: Paper = {
      ...paper,
      spaces: ["agent-systems"],
      status: { ...paper.status, readingDepth: "R3", nextAction: "复现新版本" },
    };
    view.rerender(<Settings paper={refreshed} />);
    expect((screen.getByLabelText("阅读深度") as HTMLSelectElement).value).toBe("R3");
    expect((screen.getByLabelText("下一步") as HTMLInputElement).value).toBe("复现新版本");
    expect((screen.getByLabelText("金融") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("智能体") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "保存阅读设置" }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(paper.id, {
        readingDepth: "R3",
        nextAction: "复现新版本",
        spaces: ["agent-systems"],
      }),
    );
  });

  it("keeps dirty settings through refresh and visibility-only save", async () => {
    const { wrapper } = setup();
    api.patch.mockResolvedValue({ ...paper, status: { ...paper.status, visibility: "private" } });
    const view = render(<Settings paper={paper} />, { wrapper });
    fireEvent.change(screen.getByLabelText("下一步"), { target: { value: "本地研究计划" } });
    view.rerender(
      <Settings
        paper={{
          ...paper,
          status: { ...paper.status, nextAction: "远端计划", readingDepth: "R3" },
          spaces: [],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "取消公开" }));
    await screen.findByText("论文设置已保存。");
    expect((screen.getByLabelText("下一步") as HTMLInputElement).value).toBe("本地研究计划");
    expect((screen.getByLabelText("阅读深度") as HTMLSelectElement).value).toBe(
      paper.status.readingDepth,
    );
    expect((screen.getByLabelText("金融") as HTMLInputElement).checked).toBe(true);
  });
});

describe("upload completion refresh", () => {
  it.each(["ready", "failed"])("refreshes pending papers once on %s transition", async (status) => {
    const { client, wrapper } = setup();
    const upload = {
      id: "upload-1",
      status: "reviewing",
      updatedAt: "2026-10-02",
      filename: "new.pdf",
    };
    client.setQueryData(["papers", "uploads"], [upload]);
    client.setQueryData(["papers", "list"], []);
    api.list.mockResolvedValue({
      items: [{ id: "new-paper", title: "新入库待审论文", review: "draft" }],
      nextCursor: null,
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    render(<InboxPage />, { wrapper });
    expect(api.list).not.toHaveBeenCalled();
    await act(async () => client.setQueryData(["papers", "uploads"], [{ ...upload, status }]));
    await screen.findByText("新入库待审论文");
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ["papers", "list"],
      ["papers", "catalog"],
      ["papers", "graph"],
    ]);
    await act(async () =>
      client.setQueryData(["papers", "uploads"], [{ ...upload, status, updatedAt: "2026-10-03" }]),
    );
    expect(invalidate).toHaveBeenCalledTimes(3);
  });
});

import type { PaperSummary } from "@bowen-hub/contracts";
import { privatePapersListPapers } from "@bowen-hub/contracts/client";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMocks } from "../../lib/environment";

export { errorMessage, QueryState } from "../news/shared";

import "./papers.css";

export async function allPapers(signal?: AbortSignal): Promise<PaperSummary[]> {
  const items: PaperSummary[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await privatePapersListPapers({ limit: 100, cursor }, { signal });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
    if (cursor && cursors.has(cursor)) throw new Error("论文列表分页未前进，请重试");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return items;
}
export function PaperHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <p className="eyebrow">私人研究 · 论文阅读馆</p>
      <h1>{title}</h1>
      {lead && <p className="page-lead">{lead}</p>}
      {useMocks && (
        <p role="status" className="muted">
          样例数据 · 操作仅用于页面预览
        </p>
      )}
      <nav className="row" aria-label="论文入口">
        <Link to="/papers">知识宇宙</Link>
        <Link to="/papers/library">论文库</Link>
        <Link to="/papers/inbox">入库与待审</Link>
      </nav>
      {children}
    </header>
  );
}
export const reviewLabels = { draft: "草稿", passed: "审核通过", revise: "需修改" } as const;

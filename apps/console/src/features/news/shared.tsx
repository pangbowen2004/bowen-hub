import { Button } from "@bowen-hub/ui";
import type { ReactNode } from "react";
import { useMocks } from "../../lib/environment";
import "./news.css";
export const editionKinds = {
  morning: "美股早报",
  premarket: "盘前简报",
  weekly: "美股周报",
  legacy: "旧新闻归档",
} as const;
export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "info" in error) {
    const info = error.info;
    if (info && typeof info === "object" && "detail" in info && typeof info.detail === "string")
      return info.detail;
  }
  return error instanceof Error && error.message ? error.message : "请求失败，请稍后重试";
}
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => unknown;
}) {
  return (
    <>
      {loading && <p role="status">正在加载…</p>}
      {error && (
        <p role="alert">
          加载失败：{errorMessage(error)} <Button onClick={() => void retry()}>重试</Button>
        </p>
      )}
    </>
  );
}
export function NewsHeader({
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
      <p className="eyebrow">私人工作台 · 美股新闻室</p>
      <h1>{title}</h1>
      {lead && <p className="page-lead">{lead}</p>}
      {useMocks && (
        <p role="status" className="muted">
          样例数据 · 操作仅用于页面预览
        </p>
      )}
      <nav className="row" aria-label="新闻入口">
        <a href="/news">新闻归档</a>
        <a href="/news/search">全文搜索</a>
        <a href="/watchlist">自选股</a>
      </nav>
      {children}
    </header>
  );
}

import "./events.css";
import type { MarketEvent } from "@bowen-hub/contracts";
import {
  privateMarketsCreateEvent,
  privateMarketsDeleteEvent,
  privateMarketsPutEvent,
  publicMarketsListEvents,
} from "@bowen-hub/contracts/client";
import { MarketEvent as EventSchema } from "@bowen-hub/contracts/zod";
import { Button, Input } from "@bowen-hub/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const statuses = [
  { value: "confirmed", label: "已确认" },
  { value: "pending", label: "待确认" },
] as const;
function message(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请重试";
}
export function EventsPage() {
  const query = useQuery({ queryKey: ["market-events"], queryFn: () => publicMarketsListEvents() });
  const cache = useQueryClient();
  const [editing, setEditing] = useState<MarketEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: (row: MarketEvent) =>
      editing ? privateMarketsPutEvent(editing.id, row) : privateMarketsCreateEvent(row),
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      setError("");
      setNotice("事件已保存；下一次网站部署后更新。");
      void cache.invalidateQueries({ queryKey: ["market-events"] });
    },
    onError: (e) => setError(message(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => privateMarketsDeleteEvent(id),
    onSuccess: () => {
      setNotice("事件已删除；下一次网站部署后更新。");
      void cache.invalidateQueries({ queryKey: ["market-events"] });
    },
    onError: (e) => setError(message(e)),
  });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const lines = (key: string) =>
      text(key)
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
    const parsed = EventSchema.safeParse({
      id: editing?.id ?? `EVT-${crypto.randomUUID()}`,
      title: text("title"),
      sourceLabel: text("sourceLabel"),
      sourceUrl: text("sourceUrl") || null,
      confirmation: text("confirmation"),
      invalidation: text("invalidation"),
      startDate: text("startDate"),
      endDate: text("endDate"),
      status: text("status"),
      watchItems: lines("watchItems"),
      aShareMappings: lines("aShareMappings"),
    });
    if (!parsed.success) {
      setError("请完整填写事件、来源、时间、确认和失效条件。");
      return;
    }
    if (parsed.data.startDate > parsed.data.endDate) {
      setError("结束日期不能早于开始日期。");
      return;
    }
    setError("");
    save.mutate(parsed.data);
  }
  return (
    <section className="stack">
      <header className="page-header">
        <p className="eyebrow">观察条件 · 数据维护</p>
        <h1>事件日历</h1>
        <p className="page-lead">记录来源、验证条件和期限，让观察可以被复核。</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
            setError("");
          }}
        >
          新增事件
        </Button>
      </header>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {query.isPending && <p role="status">正在加载事件…</p>}
      {query.isError && (
        <p role="alert">
          事件加载失败：{message(query.error)}{" "}
          <Button onClick={() => void query.refetch()}>重试</Button>
        </p>
      )}
      {formOpen && (
        <form className="events-editor" onSubmit={submit} key={editing?.id ?? "new"}>
          <h2>{editing ? "编辑事件" : "新事件"}</h2>
          {[
            { name: "title", label: "事件标题", required: true },
            { name: "sourceLabel", label: "来源名称", required: true },
            { name: "sourceUrl", label: "来源网址", type: "url" },
            { name: "startDate", label: "开始日期", type: "date", required: true },
            { name: "endDate", label: "结束日期", type: "date", required: true },
          ].map((field) => (
            <Input
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              defaultValue={(editing?.[field.name as keyof MarketEvent] as string) ?? ""}
            />
          ))}
          <label>
            状态
            <select name="status" defaultValue={editing?.status ?? "pending"}>
              {statuses.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          {[
            {
              name: "confirmation",
              label: "确认条件",
              value: editing?.confirmation,
              required: true,
            },
            {
              name: "invalidation",
              label: "失效条件",
              value: editing?.invalidation,
              required: true,
            },
            {
              name: "watchItems",
              label: "观察项（每行一项）",
              value: editing?.watchItems.join("\n"),
            },
            {
              name: "aShareMappings",
              label: "A股映射（每行一项）",
              value: editing?.aShareMappings.join("\n"),
            },
          ].map((field) => (
            <label key={field.name}>
              {field.label}
              <textarea
                name={field.name}
                required={field.required}
                rows={3}
                defaultValue={field.value ?? ""}
              />
            </label>
          ))}
          <div className="row">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "保存中…" : "保存事件"}
            </Button>
            <Button type="button" onClick={() => setFormOpen(false)}>
              取消
            </Button>
          </div>
        </form>
      )}
      {query.data?.length === 0 && <p>尚无事件，添加第一条观察条件。</p>}
      {query.data?.map((row) => (
        <article key={row.id} className="surface-panel">
          <p className="eyebrow">
            {row.startDate}—{row.endDate} ·{" "}
            {statuses.find((x) => x.value === row.status)?.label ?? row.status}
          </p>
          <h2>{row.title}</h2>
          <p>
            {row.sourceUrl ? (
              <a href={row.sourceUrl} rel="noopener noreferrer">
                {row.sourceLabel} →
              </a>
            ) : (
              row.sourceLabel
            )}
          </p>
          <p>确认：{row.confirmation}</p>
          <p>失效：{row.invalidation}</p>
          <div className="row">
            <Button
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
                setError("");
              }}
            >
              编辑
            </Button>
            <Button disabled={remove.isPending} onClick={() => remove.mutate(row.id)}>
              删除
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}

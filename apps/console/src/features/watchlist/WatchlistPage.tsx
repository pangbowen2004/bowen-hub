import type { WatchItem } from "@bowen-hub/contracts";
import {
  privateWatchlistList,
  privateWatchlistPut,
  privateWatchlistRemove,
} from "@bowen-hub/contracts/client";
import { WatchItem as WatchSchema } from "@bowen-hub/contracts/zod";
import { Button, Input } from "@bowen-hub/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage, NewsHeader, QueryState } from "../news/shared";

const kinds = { stock: "股票", etf: "ETF", leveraged_etf: "杠杆ETF", crypto: "加密资产" } as const;
export function WatchlistPage() {
  const query = useQuery({
    queryKey: ["watchlist"],
    queryFn: ({ signal }) => privateWatchlistList({ signal }),
  });
  const cache = useQueryClient();
  const [editing, setEditing] = useState<WatchItem | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  type Action = { kind: "put"; row: WatchItem } | { kind: "delete"; symbol: string };
  const save = useMutation({
    mutationFn: async (action: Action): Promise<WatchItem | undefined> =>
      action.kind === "put"
        ? privateWatchlistPut(action.row.symbol, action.row)
        : privateWatchlistRemove(action.symbol).then(() => undefined),
    onMutate: async (action) => {
      await cache.cancelQueries({ queryKey: ["watchlist"] });
      const before = cache.getQueryData<WatchItem[]>(["watchlist"]);
      cache.setQueryData<WatchItem[]>(
        ["watchlist"],
        action.kind === "delete"
          ? (before ?? []).filter((row) => row.symbol !== action.symbol)
          : [...(before ?? []).filter((row) => row.symbol !== action.row.symbol), action.row],
      );
      setError("");
      return { before };
    },
    onError: (failure, _action, context) => {
      cache.setQueryData(["watchlist"], context?.before);
      setError(`保存失败，已回滚：${errorMessage(failure)}`);
    },
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      setNotice("自选股已保存。");
    },
    onSettled: () => void cache.invalidateQueries({ queryKey: ["watchlist"] }),
  });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const parsed = WatchSchema.safeParse({
      symbol: editing?.symbol ?? text("symbol").toUpperCase(),
      name: text("name"),
      kind: text("kind"),
      group: text("group"),
      underlying: text("underlying").toUpperCase() || null,
      sectorEtf: text("sectorEtf").toUpperCase() || null,
      aliases: text("aliases")
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean),
      active: data.get("active") === "on",
    });
    if (!parsed.success) {
      setError("请完整填写有效代码、名称、类型和分组。");
      return;
    }
    save.mutate({ kind: "put", row: parsed.data });
  }
  return (
    <section className="news-page">
      <NewsHeader title="自选股" lead="维护关注对象与来源匹配，让新闻回到你的研究范围。" />
      <Button
        disabled={query.isPending || query.isError}
        onClick={() => {
          setEditing(null);
          setOpen(true);
          setError("");
        }}
      >
        新增自选股
      </Button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      {open && (
        <form className="watch-editor" onSubmit={submit} key={editing?.symbol ?? "new"}>
          <h2 className="wide">{editing ? `编辑 ${editing.symbol}` : "新的关注对象"}</h2>
          <Input
            label="代码"
            name="symbol"
            required
            readOnly={editing !== null}
            defaultValue={editing?.symbol}
          />
          <Input label="名称" name="name" required defaultValue={editing?.name} />
          <label>
            类型
            <select name="kind" defaultValue={editing?.kind ?? "stock"}>
              {Object.entries(kinds).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Input label="分组" name="group" required defaultValue={editing?.group} />
          <Input label="标的（可选）" name="underlying" defaultValue={editing?.underlying ?? ""} />
          <Input
            label="对照板块ETF（可选）"
            name="sectorEtf"
            defaultValue={editing?.sectorEtf ?? ""}
          />
          <label className="wide">
            别名（每行一个或逗号分隔）
            <textarea name="aliases" rows={3} defaultValue={editing?.aliases.join("\n") ?? ""} />
          </label>
          <label className="wide row">
            <span>启用</span>
            <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} />
          </label>
          <div className="row wide">
            <Button type="submit" disabled={save.isPending}>
              保存自选股
            </Button>
            <Button onClick={() => setOpen(false)}>取消</Button>
          </div>
        </form>
      )}
      {query.data?.length === 0 && <p>还没有自选股，添加第一只关注对象。</p>}
      {query.data?.map((row) => (
        <article className="watch-row" key={row.symbol}>
          <p className="eyebrow">
            {row.group} · {kinds[row.kind]} · {row.active ? "已启用" : "已停用"}
          </p>
          <h2>
            <a href={`/news/tickers/${encodeURIComponent(row.symbol)}`}>
              {row.symbol} · {row.name}
            </a>
          </h2>
          <p>
            标的：{row.underlying ?? "—"} · 对照ETF：{row.sectorEtf ?? "默认对照"}
          </p>
          <p className="muted">别名：{row.aliases.join("、") || "—"}</p>
          <div className="row">
            <Button
              disabled={save.isPending}
              onClick={() => {
                setEditing(row);
                setOpen(true);
                setError("");
              }}
            >
              编辑 {row.symbol}
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => save.mutate({ kind: "put", row: { ...row, active: !row.active } })}
            >
              {row.active ? "停用" : "启用"} {row.symbol}
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => save.mutate({ kind: "delete", symbol: row.symbol })}
            >
              删除 {row.symbol}
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}

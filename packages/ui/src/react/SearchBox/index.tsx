import MiniSearch from "minisearch";
import { useEffect, useMemo, useState } from "react";
export type SearchItem = { id: string; title: string; text?: string; href?: string };
const EMPTY_ITEMS: SearchItem[] = [];
export function SearchBox({
  items = EMPTY_ITEMS,
  search,
  label = "搜索",
}: {
  items?: SearchItem[];
  search?: (query: string, signal: AbortSignal) => Promise<SearchItem[]>;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const index = useMemo(() => {
    const value = new MiniSearch<SearchItem>({
      fields: ["title", "text"],
      storeFields: ["id", "title", "href"],
      tokenize: (text) => text.toLocaleLowerCase().match(/[\p{Script=Han}]|[\p{L}\p{N}_]+/gu) ?? [],
    });
    value.addAll(items);
    return value;
  }, [items]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        if (!query.trim()) {
          setResults([]);
          setError("");
          setLoading(false);
          return;
        }
        setLoading(true);
        setError("");
        try {
          const found = search
            ? await search(query, controller.signal)
            : index.search(query, { prefix: true, combineWith: "AND" }).map((item) => ({
                id: String(item.id),
                title: String(item.title),
                href: typeof item.href === "string" ? item.href : undefined,
              }));
          if (!controller.signal.aborted) setResults(found);
        } catch {
          if (!controller.signal.aborted) setError("搜索失败，请重试");
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      search ? 200 : 0,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, index, search]);
  return (
    <div className="stack">
      <label>
        {label}
        <input
          type="search"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p role="status">
        {error || (loading ? "搜索中…" : query ? `找到 ${results.length} 条结果` : "")}
      </p>
      <ul>
        {results.map((item) => (
          <li key={item.id}>{item.href ? <a href={item.href}>{item.title}</a> : item.title}</li>
        ))}
      </ul>
    </div>
  );
}

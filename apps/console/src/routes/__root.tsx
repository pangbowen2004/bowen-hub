import { Button } from "@bowen-hub/ui";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { requireSession } from "../features/auth";

const desktop = [
  { to: "/", label: "今日" },
  { to: "/news", label: "新闻" },
  { to: "/papers", label: "论文" },
  { to: "/watchlist", label: "自选股" },
  { to: "/markets/events", label: "事件日历" },
  { to: "/ops", label: "运维" },
  { to: "/settings", label: "设置" },
] as const;
const mobile = [desktop[0], desktop[1], desktop[2], { to: "/ops", label: "更多" }] as const;
function Root() {
  const [theme, setTheme] = useState<string>(localStorage.getItem("theme") ?? "system");
  function changeTheme() {
    const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  }
  return (
    <div className="console-shell">
      <a className="sr-only" href="#content">
        跳到正文
      </a>
      <aside className="sidebar">
        <a className="brand" href="/">
          Bowen 控制台
        </a>
        <nav aria-label="主导航" className="stack">
          {desktop.map((item) => (
            <Link key={item.to} to={item.to} activeProps={{ "aria-current": "page" }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="console-content">
        <header className="console-toolbar">
          <span>私人工作台</span>
          <Button onClick={changeTheme}>
            主题：{theme === "system" ? "跟随系统" : theme === "dark" ? "深色" : "浅色"}
          </Button>
        </header>
        <main id="content" className="container">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="手机标签栏">
        {mobile.map((item) => (
          <Link key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
export const Route = createRootRoute({
  beforeLoad: ({ location }) => requireSession(location.pathname),
  component: Root,
  notFoundComponent: () => <p>页面不存在</p>,
});

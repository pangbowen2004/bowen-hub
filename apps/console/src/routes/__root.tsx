import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireSession } from "../features/auth";
import { AccountMenu } from "../features/auth/AccountMenu";

const desktop = [
  { to: "/", label: "今日" },
  { to: "/news", label: "新闻室" },
  { to: "/papers", label: "论文" },
  { to: "/markets/events", label: "事件日历" },
] as const;
const mobile = desktop;
function Root() {
  const [theme, setTheme] = useState<string>(localStorage.getItem("theme") ?? "system");
  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);
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
      <header className="console-masthead">
        <a className="brand" href="/">
          控制台
        </a>
        <nav aria-label="主导航" className="console-nav">
          {desktop.map((item) => (
            <Link key={item.to} to={item.to} activeProps={{ "aria-current": "page" }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <AccountMenu
          onTheme={changeTheme}
          themeLabel={theme === "system" ? "跟随系统" : theme === "dark" ? "深色" : "浅色"}
        />
      </header>
      <div className="console-content">
        <main id="content" className="container">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="手机标签栏">
        {mobile.map((item) => (
          <Link key={item.to} to={item.to} activeProps={{ "aria-current": "page" }}>
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

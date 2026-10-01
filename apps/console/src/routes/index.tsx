import { createFileRoute, Link } from "@tanstack/react-router";
import { Placeholder } from "../lib/Placeholder";
export const Route = createFileRoute("/")({
  component: () => (
    <Placeholder title="今日" task="T15" lead="新闻、市场与研究，在这里相遇。">
      <div className="editorial-grid">
        <section className="editorial-lead">
          <p className="eyebrow">私人工作台</p>
          <h2 className="editorial-title">
            保持好奇。
            <br />
            保持判断。
          </h2>
          <p className="muted">沿着新闻、公告与原文证据，继续今天的阅读。</p>
          <Link className="editorial-link" to="/news">
            美股新闻室 <span aria-hidden="true">↗</span>
          </Link>
        </section>
        <nav aria-label="研究入口">
          <ul className="editorial-list">
            <li>
              <Link className="editorial-link" to="/papers">
                论文阅读 <span aria-hidden="true">↗</span>
              </Link>
              <p className="muted">回到原文，保存线索。</p>
            </li>
            <li>
              <Link className="editorial-link" to="/markets/events">
                A 股事件日历 <span aria-hidden="true">↗</span>
              </Link>
              <p className="muted">把观察放回交易日的上下文。</p>
            </li>
            <li>
              <Link className="editorial-link" to="/ops">
                运行记录 <span aria-hidden="true">↗</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </Placeholder>
  ),
});

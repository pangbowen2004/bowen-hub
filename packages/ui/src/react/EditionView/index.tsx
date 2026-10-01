import type { ReactNode } from "react";
/** 领域组件占位，交给任务图中对应任务实现。 */
export function EditionView({ children }: { children?: ReactNode }) {
  return (
    <section className="card" aria-label="EditionView">
      {children ?? <p className="muted">内容准备中</p>}
    </section>
  );
}

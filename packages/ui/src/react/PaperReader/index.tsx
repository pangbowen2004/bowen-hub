import type { ReactNode } from "react";
/** 领域组件占位，交给任务图中对应任务实现。 */
export function PaperReader({ children }: { children?: ReactNode }) {
  return (
    <section className="card" aria-label="PaperReader">
      {children ?? <p className="muted">内容准备中</p>}
    </section>
  );
}

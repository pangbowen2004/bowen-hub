import type { ReactNode } from "react";
/** 领域组件占位，交给任务图中对应任务实现。 */
export function Universe3D({ children }: { children?: ReactNode }) {
  return (
    <section className="card" aria-label="Universe3D">
      {children ?? <p className="muted">内容准备中</p>}
    </section>
  );
}

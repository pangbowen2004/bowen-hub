import type { ReactNode } from "react";
import { Button, Sheet } from "../primitives";
export function AskDrawer({
  children,
  open,
  onOpenChange,
}: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
}) {
  return (
    <Sheet
      title="问这篇论文"
      description="只根据本篇原文回答；回答通过校验后可以保存为解释卡。"
      trigger={<Button>问这篇论文</Button>}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children ?? <p className="muted">选择一篇论文后开始提问。</p>}
    </Sheet>
  );
}

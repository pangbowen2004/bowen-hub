import type { ReactNode } from "react";
import { Button, Dialog } from "../primitives";
export function PageImage({
  children,
  page,
  src,
  loading,
  error,
  retry,
  open,
  onOpenChange,
}: {
  children?: ReactNode;
  page?: number;
  src?: string;
  loading?: boolean;
  error?: string;
  retry?: () => void;
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
}) {
  return (
    <Dialog
      title={page ? `原文第 ${page} 页` : "原文页"}
      trigger={<Button disabled={!page}>查看原文页</Button>}
      open={open}
      onOpenChange={onOpenChange}
    >
      {loading && <p role="status">正在加载原文页…</p>}
      {error && (
        <p role="alert">
          {error} <Button onClick={retry}>重试</Button>
        </p>
      )}
      {src && (
        <img src={src} alt={`PDF 原文第 ${page} 页`} style={{ maxWidth: "100%", height: "auto" }} />
      )}
      {children}
    </Dialog>
  );
}

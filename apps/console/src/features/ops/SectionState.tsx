import { Button } from "@bowen-hub/ui";

function reason(error: unknown): string {
  if (error && typeof error === "object" && "info" in error) {
    const info = error.info;
    if (info && typeof info === "object" && "detail" in info && typeof info.detail === "string")
      return info.detail;
  }
  return error instanceof Error && error.message ? error.message : "请求失败，请稍后重试";
}
/** 分区的加载与失败提示。页面只保留一个 role=status（OpsPage 顶部），这里的加载提示不再用它。 */
export function SectionState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => unknown;
}) {
  return (
    <>
      {loading && <p className="muted">正在加载…</p>}
      {error != null && (
        <p role="alert">
          加载失败：{reason(error)} <Button onClick={() => void retry()}>重试</Button>
        </p>
      )}
    </>
  );
}

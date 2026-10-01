import { Button } from "@bowen-hub/ui";
import { useState } from "react";
import { authClient } from "./client";
import "./auth.css";

export function ConsentPage() {
  const query = new URLSearchParams(location.search);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(accept: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.oauth2.consent({ accept });
      if (result.error || !result.data?.url)
        throw new Error("授权请求无效或已过期，请从客户端重新连接。");
      location.assign(result.data.url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "授权未完成。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-settings">
      <p className="auth-eyebrow">连接研究工具 / CONSENT</p>
      <h1>授权客户端访问</h1>
      <p>客户端：{query.get("client_id") || "由授权服务器核验"}</p>
      <p>请求范围：{query.get("scope") || "由授权服务器核验"}</p>
      <p>确认后，这个客户端可以使用你的 MCP 研究工具。你随时可以在设置中撤销授权。</p>
      {error && <p role="alert">{error}</p>}
      <Button disabled={busy} onClick={() => void decide(true)}>
        允许访问
      </Button>{" "}
      <Button disabled={busy} onClick={() => void decide(false)}>
        拒绝访问
      </Button>
    </div>
  );
}

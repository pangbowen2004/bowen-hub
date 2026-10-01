import { Button } from "@bowen-hub/ui";
import { useState } from "react";
import { authClient, safeReturn } from "./client";
import "./auth.css";

export function LoginPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(register: boolean) {
    setBusy(true);
    setMessage("");
    try {
      if (register) {
        const start = await fetch("/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        setToken("");
        if (!start.ok)
          throw new Error(
            start.status === 403
              ? "首次登记已完成，请使用通行密钥登录。"
              : "登记口令无效，请重新输入。",
          );
        const result = await authClient.passkey.addPasskey({ name: "我的通行密钥" });
        if (result.error) throw new Error("登记未完成，请重试并确认设备提示。");
      } else {
        const result = await authClient.signIn.passkey();
        if (result.error) throw new Error("登录未完成，请重试并确认设备提示。");
      }
      if (new URLSearchParams(location.search).has("client_id")) {
        const continuation = await authClient.oauth2.continue({});
        if (continuation.error || !continuation.data?.url)
          throw new Error("客户端连接未完成，请从客户端重新发起授权。");
        location.assign(continuation.data.url);
      } else location.assign(safeReturn());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作未完成，请重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <header className="auth-intro">
        <p className="auth-eyebrow">私人研究空间 / ACCESS</p>
        <h1>
          回到你的
          <br />
          <em>研究现场。</em>
        </h1>
        <p>新闻、市场与论文，在这里连接。使用设备上的通行密钥进入控制台。</p>
      </header>
      <div className="auth-form">
        <h2>欢迎回来</h2>
        <p>通过指纹、面容或设备锁屏验证身份。</p>
        <Button disabled={busy} onClick={() => void run(false)}>
          {busy ? "等待设备确认…" : "使用通行密钥登录"}
        </Button>
        <details>
          <summary>第一次使用？登记通行密钥</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(true);
            }}
          >
            <label htmlFor="bootstrap-token">一次性登记口令</label>
            <input
              id="bootstrap-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              maxLength={512}
            />
            <p>登记成功后，这个口令永久失效。请保留至少一把通行密钥。</p>
            <Button type="submit" disabled={busy || !token}>
              登记我的通行密钥
            </Button>
          </form>
        </details>
        {message && <p role="alert">{message}</p>}
      </div>
    </section>
  );
}

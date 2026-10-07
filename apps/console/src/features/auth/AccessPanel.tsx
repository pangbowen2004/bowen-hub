import { Button } from "@bowen-hub/ui";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "./client";
import "./auth.css";

type Key = { id: string; name?: string | null; createdAt?: Date | string | null };
type Consent = { id: string; clientId: string; scopes: string[] };
export function AccessPanel() {
  const [tab, setTab] = useState<"keys" | "apps">("keys");
  const [keys, setKeys] = useState<Key[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    const [k, c] = await Promise.all([
      authClient.passkey.listUserPasskeys(),
      authClient.oauth2.getConsents(),
    ]);
    if (k.error || c.error) throw new Error("账户资料加载失败，请重试。");
    setKeys(k.data ?? []);
    setConsents(c.data ?? []);
  }, []);
  const run = useCallback(
    async (operation: () => Promise<unknown>) => {
      setBusy(true);
      setMessage("");
      try {
        await operation();
        await load();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "操作未完成，请重试。");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );
  useEffect(() => {
    void run(async () => {});
  }, [run]);
  return (
    <div className="auth-settings">
      <div className="access-tabs" role="tablist" aria-label="账户资料">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "keys"}
          onClick={() => setTab("keys")}
        >
          通行密钥
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "apps"}
          onClick={() => setTab("apps")}
        >
          已授权的应用（MCP）
        </button>
      </div>
      {message && <p role="alert">{message}</p>}
      <section hidden={tab !== "keys"} role="tabpanel" aria-label="通行密钥">
        {busy && <p role="status">正在加载或等待设备确认…</p>}
        <ul>
          {keys.map((key) => (
            <li key={key.id}>
              <div>
                <strong>{key.name || "未命名通行密钥"}</strong>
                <p>
                  {key.createdAt
                    ? new Date(key.createdAt).toLocaleDateString("zh-CN")
                    : "登记日期未知"}
                </p>
              </div>
              <Button
                disabled={busy || keys.length <= 1}
                onClick={() =>
                  void run(async () => {
                    const result = await authClient.passkey.deletePasskey({ id: key.id });
                    if (result.error) throw new Error("删除失败，请保留至少一把通行密钥。");
                  })
                }
              >
                删除
              </Button>
            </li>
          ))}
        </ul>
        <p>至少保留一把密钥，建议为另一台设备添加备用凭据。</p>
        <label htmlFor="key-name">新密钥名称</label>
        <input
          id="key-name"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：手机"
        />
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await authClient.passkey.addPasskey({
                name: name.trim() || "我的通行密钥",
              });
              if (result.error) throw new Error("密钥添加未完成，请确认设备提示后重试。");
              setName("");
            })
          }
        >
          添加通行密钥
        </Button>
      </section>
      <section hidden={tab !== "apps"} role="tabpanel" aria-label="已授权的应用（MCP）">
        {!busy && !consents.length && <p>还没有授权任何客户端。</p>}
        <ul>
          {consents.map((consent) => (
            <li key={consent.id}>
              <div>
                <strong>{consent.clientId}</strong>
                <p>授权范围：{consent.scopes.join("、")}</p>
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await authClient.oauth2.deleteConsent({ id: consent.id });
                    if (result.error) throw new Error("撤销失败，请重试。");
                  })
                }
              >
                撤销授权
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <footer className="access-session">
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await authClient.signOut();
              if (result.error) throw new Error("退出失败，请重试。");
              location.assign("/login");
            })
          }
        >
          退出登录
        </Button>
      </footer>
    </div>
  );
}

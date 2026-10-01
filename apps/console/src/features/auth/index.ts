// 登录守卫占位：只有开发模拟环境放行，真实认证由T40接入。
import { redirect } from "@tanstack/react-router";
import { useMocks } from "../../lib/environment";
export function requireSession(path: string): void {
  if (path !== "/login" && !useMocks) throw redirect({ to: "/login" });
}

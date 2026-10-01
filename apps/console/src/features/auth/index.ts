import { redirect } from "@tanstack/react-router";
import { useMocks } from "../../lib/environment";
import { authClient } from "./client";
export async function requireSession(path: string): Promise<void> {
  if (path === "/login" || useMocks) return;
  const { data } = await authClient.getSession();
  if (!data || data.session.bootstrap) throw redirect({ to: "/login", search: { returnTo: path } });
}

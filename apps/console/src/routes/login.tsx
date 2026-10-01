import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../lib/Placeholder";
export const Route = createFileRoute("/login")({
  component: () => <Placeholder title="登录" task="T40" />,
});

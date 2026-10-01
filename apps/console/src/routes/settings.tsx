import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../lib/Placeholder";
export const Route = createFileRoute("/settings")({
  component: () => <Placeholder title="设置" task="T40" />,
});

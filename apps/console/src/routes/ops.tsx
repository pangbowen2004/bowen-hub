import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../lib/Placeholder";
export const Route = createFileRoute("/ops")({
  component: () => <Placeholder title="运维" task="T41" />,
});

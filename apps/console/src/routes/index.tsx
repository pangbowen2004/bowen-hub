import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../lib/Placeholder";
export const Route = createFileRoute("/")({
  component: () => <Placeholder title="今日" task="T15" />,
});

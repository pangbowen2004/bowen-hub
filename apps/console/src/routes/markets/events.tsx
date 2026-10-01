import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/markets/events")({
  component: () => <Placeholder title="事件日历" task="T24" />,
});

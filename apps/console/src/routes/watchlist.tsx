import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../lib/Placeholder";
export const Route = createFileRoute("/watchlist")({
  component: () => <Placeholder title="自选股" task="T15" />,
});

import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../lib/Placeholder";
export const Route = createFileRoute("/news/tickers/$symbol")({
  component: () => <Placeholder title="个股时间线" task="T15" />,
});

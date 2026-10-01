import { createFileRoute } from "@tanstack/react-router";
import { TimelinePage } from "../../../features/news/TimelinePage";
export const Route = createFileRoute("/news/tickers/$symbol")({
  component: () => {
    const { symbol } = Route.useParams();
    return <TimelinePage symbol={symbol} />;
  },
});

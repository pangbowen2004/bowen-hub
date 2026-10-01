import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/news/search")({
  component: () => <Placeholder title="新闻搜索" task="T15" />,
});

import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/news/")({
  component: () => <Placeholder title="新闻归档" task="T15" />,
});

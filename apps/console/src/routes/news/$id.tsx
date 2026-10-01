import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/news/$id")({
  component: () => <Placeholder title="新闻一期" task="T15" />,
});

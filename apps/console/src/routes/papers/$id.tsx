import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/papers/$id")({
  component: () => <Placeholder title="论文阅读" task="T34" />,
});

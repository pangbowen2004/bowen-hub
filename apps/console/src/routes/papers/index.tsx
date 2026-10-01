import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/papers/")({
  component: () => <Placeholder title="全部论文" task="T34" />,
});

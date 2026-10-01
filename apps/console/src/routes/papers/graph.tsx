import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../lib/Placeholder";
export const Route = createFileRoute("/papers/graph")({
  component: () => <Placeholder title="论文图谱" task="T34" />,
});

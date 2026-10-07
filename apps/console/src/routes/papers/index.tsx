import { createFileRoute } from "@tanstack/react-router";
import { GraphPage } from "../../features/papers/GraphPage";
export const Route = createFileRoute("/papers/")({ component: GraphPage });

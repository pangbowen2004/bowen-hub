import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "../../features/papers/ListPage";
export const Route = createFileRoute("/papers/library")({ component: ListPage });

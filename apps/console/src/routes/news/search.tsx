import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "../../features/news/SearchPage";
export const Route = createFileRoute("/news/search")({ component: SearchPage });

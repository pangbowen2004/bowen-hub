import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "../../features/news/ArchivePage";
export const Route = createFileRoute("/news/")({ component: ArchivePage });

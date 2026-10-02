import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "../../features/papers/InboxPage";
export const Route = createFileRoute("/papers/inbox")({ component: InboxPage });

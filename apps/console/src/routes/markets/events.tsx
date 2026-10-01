import { createFileRoute } from "@tanstack/react-router";
import { EventsPage } from "../../features/markets/EventsPage";
export const Route = createFileRoute("/markets/events")({ component: EventsPage });

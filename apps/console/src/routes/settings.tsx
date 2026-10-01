import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "../features/auth/SettingsPage";
export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

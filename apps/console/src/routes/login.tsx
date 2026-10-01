import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../features/auth/LoginPage";
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : "/",
  }),
  component: LoginPage,
});

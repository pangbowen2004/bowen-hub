import { createFileRoute } from "@tanstack/react-router";
import { ConsentPage } from "../features/auth/ConsentPage";
export const Route = createFileRoute("/consent")({ component: ConsentPage });

import { createFileRoute } from "@tanstack/react-router";
import { ReaderPage } from "../../features/papers/ReaderPage";
export const Route = createFileRoute("/papers/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <ReaderPage key={id} id={id} />;
}

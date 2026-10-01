import { createFileRoute } from "@tanstack/react-router";
import { EditionPage } from "../../features/news/EditionPage";
export const Route = createFileRoute("/news/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <EditionPage id={id} />;
  },
});

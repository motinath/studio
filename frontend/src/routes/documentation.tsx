import { createFileRoute } from "@tanstack/react-router";
import { DocumentationPage } from "@/components/documentation/DocumentationPage";

export const Route = createFileRoute("/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — QClang | SilicoFeller" },
      {
        name: "description",
        content:
          "QClang Development Documentation — language reference, compiler pipeline, tutorials, and simulation guides.",
      },
    ],
  }),
  component: DocumentationPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { ResearchFeed } from "@/components/research-feed";

export const Route = createFileRoute("/_app/research")({
  head: () => ({
    meta: [
      { title: "Recherches — My Business OS" },
      {
        name: "description",
        content: "Every research report filed by the Telegram bot, per section.",
      },
      { property: "og:title", content: "Recherches — My Business OS" },
      {
        property: "og:description",
        content: "Every research report filed by the Telegram bot, per section.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <>
      <PageHeader
        title="Recherches du bot Telegram"
        description="Ce que le bot a cherché, ses sources, et les changements qu'il propose d'appliquer."
      />
      <ResearchFeed />
    </>
  );
}

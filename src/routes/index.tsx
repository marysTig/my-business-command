import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "My Business OS — Workspace" },
    { name: "description", content: "Your central workspace for projects, clients, sales and tasks." },
    { property: "og:title", content: "My Business OS — Workspace" },
    { property: "og:description", content: "Your central workspace for projects, clients, sales and tasks." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

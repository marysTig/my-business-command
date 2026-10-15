import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/db";
import { CAR_BUYER_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/cars/")({
  head: () => ({
    meta: [
      { title: "Car Buyers — My Business OS" },
      { name: "description", content: "Clients interested in buying a car, and their visit dates." },
      { property: "og:title", content: "Car Buyers — My Business OS" },
      { property: "og:description", content: "Clients interested in buying a car, and their visit dates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarsPage,
});

function CarsPage() {
  return (
    <CrudPage
      table="car_buyers"
      title="Car Buyers"
      description="Clients interested in buying a car, with their contact details and visit date."
      statusField="status"
      statusOptions={CAR_BUYER_STATUSES}
      columns={[
        { key: "name", header: "Client" },
        { key: "phone", header: "Phone" },
        { key: "address", header: "Address" },
        { key: "car_interest", header: "Car" },
        { key: "visit_date", header: "Date de visite", render: (r) => formatDate(r["visit_date"]) },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r["status"]} /> },
      ]}
    />
  );
}

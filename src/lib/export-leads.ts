import type { Row } from "@/lib/db";

const text = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const money = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : "";
};

const HEADERS = [
  "Entreprise",
  "Service",
  "Besoin",
  "Ville / wilaya",
  "Téléphone",
  "Email",
  "Budget (DZD)",
  "Source",
  "Statut",
  "Notes",
  "Créé le",
];

/**
 * Writes the given leads to a real .xlsx file, in the order they appear on the
 * page. The spreadsheet library is imported on demand so it never weighs on the
 * dashboard's first load.
 */
export async function exportLeadsToExcel(rows: Row[], fileName: string): Promise<void> {
  if (rows.length === 0) return;
  // The package ships separate entry points; this one writes in the browser.
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const data = [
    HEADERS.map((header) => ({ value: header, fontWeight: "bold" as const, backgroundColor: "#F2F2F2" })),
    ...rows.map((row) => [
      { value: text(row["name"]) },
      { value: text(row["service"] ?? row["desired_property_type"]) },
      { value: text(row["desired_property_type"]) },
      { value: text(row["desired_city"]) },
      { value: text(row["phone"]) },
      { value: text(row["email"]) },
      { value: money(row["budget"]) },
      { value: text(row["source"]) },
      { value: text(row["status"]) },
      { value: text(row["notes"]) },
      { value: text(row["created_at"]).slice(0, 10) },
    ]),
  ];

  const { toFile } = await writeXlsxFile(data, {
    columns: [
      { width: 34 },
      { width: 18 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
      { width: 28 },
      { width: 14 },
      { width: 30 },
      { width: 12 },
      { width: 60 },
      { width: 12 },
    ],
  });

  await toFile(fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

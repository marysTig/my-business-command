import type { Row } from "@/lib/db";

/**
 * Website work: full sites, redesigns, catalogues, booking or landing pages.
 *
 * The `service` column is the source of truth once it is filled; older rows
 * (and rows created before the migration) are still recognised from the text of
 * the need and the notes.
 */
export function isWebsiteLead(row: Row): boolean {
  const service = String(row["service"] ?? "").trim();
  if (service) return /site|web|boutique/i.test(service);
  const need = `${row["desired_property_type"] ?? ""} ${row["notes"] ?? ""}`;
  return /site|web|refonte|catalogue|landing|vitrine/i.test(need);
}

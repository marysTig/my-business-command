import type { Row } from "@/lib/db";

/** Website work: full sites, redesigns, catalogues, booking or landing pages. */
export function isWebsiteLead(row: Row): boolean {
  const need = `${row["desired_property_type"] ?? ""} ${row["notes"] ?? ""}`;
  return /site|web|refonte|catalogue|landing|vitrine/i.test(need);
}

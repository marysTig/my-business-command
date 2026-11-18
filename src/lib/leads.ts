import type { Row } from "@/lib/db";

/** The 58 wilayas plus the big cities used in the saved leads. */
const ALGERIA = [
  "adrar", "chlef", "laghouat", "oum el bouaghi", "batna", "bejaia", "biskra", "bechar", "blida",
  "bouira", "tamanrasset", "tebessa", "tlemcen", "tiaret", "tizi-ouzou", "tizi ouzou", "alger",
  "djelfa", "jijel", "setif", "saida", "skikda", "sidi bel abbes", "annaba", "guelma",
  "constantine", "medea", "mostaganem", "m'sila", "msila", "mascara", "ouargla", "oran",
  "el bayadh", "illizi", "bordj bou arreridj", "boumerdes", "el tarf", "tindouf", "tissemsilt",
  "el oued", "khenchela", "souk ahras", "tipaza", "mila", "ain defla", "naama",
  "ain temouchent", "ghardaia", "relizane", "touggourt", "djanet", "el meniaa",
];

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Pays du prospect.
 *
 * A `country` column wins when it exists; otherwise the country is read from
 * the city and, for older rows, from the notes.
 */
export function leadCountry(row: Row): string {
  const explicit = String(row["country"] ?? "").trim();
  if (explicit) return explicit;
  const city = normalize(row["desired_city"]);
  if (city && ALGERIA.some((w) => city.includes(w))) return "Algérie";
  const notes = normalize(row["notes"]);
  if (/france|francais|francaise/.test(notes)) return "France";
  if (ALGERIA.some((w) => notes.includes(w))) return "Algérie";
  return "";
}

export const LEAD_COUNTRIES = ["Algérie", "France"] as const;

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

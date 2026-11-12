/**
 * The dashboard access code, shared by the browser gate and the server-side
 * prospect-file import (which accepts it instead of the API key so the UI can
 * import a file from a link without shipping the API key to the browser).
 *
 * Change the fallback below (or set VITE_ACCESS_CODE at build time) to pick
 * your own code.
 */
export const ACCESS_CODE =
  (import.meta.env?.["VITE_ACCESS_CODE"] as string | undefined)?.trim() || "M3AK-2026";

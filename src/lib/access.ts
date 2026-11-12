import { useSyncExternalStore } from "react";

/**
 * Access code that guards the whole dashboard.
 *
 * Change the fallback below (or set VITE_ACCESS_CODE at build time) to pick
 * your own code. The value lives in the bundle, so this is a simple gate
 * against casual access, not real per-user auth: anyone who reads the bundle
 * can find the code, and the Supabase key still ships to the browser.
 */
export const ACCESS_CODE =
  (import.meta.env?.["VITE_ACCESS_CODE"] as string | undefined)?.trim() || "M3AK-2026";

const KEY = "bos-access";
const listeners = new Set<() => void>();

/**
 * Flag stored on unlock. It is derived from the code, so changing
 * ACCESS_CODE invalidates every browser that was already unlocked.
 */
function fingerprint(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  return `v1-${hash.toString(36)}`;
}

const TOKEN = fingerprint(ACCESS_CODE);

function emit() {
  listeners.forEach((listener) => listener());
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === TOKEN;
  } catch {
    return false;
  }
}

/** Returns true when the code matches; stores the unlock flag on success. */
export function unlock(code: string): boolean {
  if (code.trim() !== ACCESS_CODE) return false;
  try {
    window.localStorage.setItem(KEY, TOKEN);
  } catch {
    return false;
  }
  emit();
  return true;
}

export function lock() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function useUnlocked(): boolean {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    isUnlocked,
    () => false,
  );
}

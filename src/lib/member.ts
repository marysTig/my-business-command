import { useSyncExternalStore } from "react";

const KEY = "bos-current-member";
const listeners = new Set<() => void>();

export function getMember(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setMember(name: string | null) {
  if (name) window.localStorage.setItem(KEY, name);
  else window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function useMember() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getMember,
    () => null,
  );
}

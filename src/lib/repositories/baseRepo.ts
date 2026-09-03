/**
 * Generic localStorage persistence helpers.
 *
 * This is the TEMPORARY Phase-1 storage backend. Every repository goes
 * through these functions so the entire app can be migrated to Supabase
 * by re-implementing only the repository modules.
 */

const PREFIX = "capsai";

export function storageKey(name: string): string {
  return `${PREFIX}.${name}`;
}

export function readAll<T>(name: string): T[] {
  try {
    const raw = window.localStorage.getItem(storageKey(name));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeAll<T>(name: string, items: T[]): void {
  window.localStorage.setItem(storageKey(name), JSON.stringify(items));
}

export function readObject<T>(name: string): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey(name));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeObject<T>(name: string, value: T): void {
  window.localStorage.setItem(storageKey(name), JSON.stringify(value));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

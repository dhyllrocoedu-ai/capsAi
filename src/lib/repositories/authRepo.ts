import { readAll, uid, writeAll } from "./baseRepo";
import type { User } from "@/types";

const STORE = "users";
const SESSION = "session";

interface StoredUser extends User {
  /**
   * SHA-256 hash + salt — adequate ONLY for local development testing.
   * Production authentication will be handled by Supabase Auth.
   */
  passwordHash: string;
  salt: string;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toPublic(user: StoredUser): User {
  const { id, email, fullName, createdAt } = user;
  return { id, email, fullName, createdAt };
}

export async function register(
  email: string,
  fullName: string,
  password: string,
): Promise<User> {
  const users = readAll<StoredUser>(STORE);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  const salt = uid();
  const user: StoredUser = {
    id: uid(),
    email,
    fullName,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  writeAll(STORE, [...users, user]);
  setSession(user.id);
  return toPublic(user);
}

export async function login(email: string, password: string): Promise<User> {
  const users = readAll<StoredUser>(STORE);
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user) throw new Error("No account found with this email.");
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error("Incorrect password.");
  setSession(user.id);
  return toPublic(user);
}

export function logout(): void {
  window.localStorage.removeItem(`${"capsai"}.${SESSION}`);
}

/** Creates a temporary guest session (no persistent account). */
export function guestLogin(): User {
  const guest: StoredUser = {
    id: `guest-${uid()}`,
    email: "",
    fullName: "Guest",
    salt: "",
    passwordHash: "",
    createdAt: new Date().toISOString(),
  };
  const users = readAll<StoredUser>(STORE);
  writeAll(STORE, [...users, guest]);
  setSession(guest.id);
  return toPublic(guest);
}

function setSession(userId: string): void {
  window.localStorage.setItem(`capsai.${SESSION}`, JSON.stringify({ userId }));
}

/** Synchronous session lookup used by the router guard. */
export function getSessionUser(): User | null {
  try {
    const raw = window.localStorage.getItem(`capsai.${SESSION}`);
    if (!raw) return null;
    const { userId } = JSON.parse(raw) as { userId: string };
    const user = readAll<StoredUser>(STORE).find((u) => u.id === userId);
    return user ? toPublic(user) : null;
  } catch {
    return null;
  }
}

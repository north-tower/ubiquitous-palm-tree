import type { Credentials } from "./api";

const STORAGE_KEY = "whatsapp-desk-auth";

export function loadCredentials(): Credentials | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (
      typeof parsed.user === "string" &&
      parsed.user &&
      typeof parsed.pass === "string" &&
      parsed.pass
    ) {
      return { user: parsed.user, pass: parsed.pass };
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function saveCredentials(credentials: Credentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

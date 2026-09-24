const STORAGE_KEY = "whatsapp-portal-session";

export type StoredPortalSession = {
  token: string;
  email: string;
};

export function loadPortalSession(): StoredPortalSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPortalSession>;
    if (
      typeof parsed.token === "string" &&
      parsed.token &&
      typeof parsed.email === "string" &&
      parsed.email
    ) {
      return { token: parsed.token, email: parsed.email };
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function savePortalSession(session: StoredPortalSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPortalSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

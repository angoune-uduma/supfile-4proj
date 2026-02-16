// src/services/mockAuth.ts
export type MockUser = { email: string };

const VALID_EMAIL = "alexidika@gmail.com";
const VALID_PASSWORD = "0987654321";

const STORAGE_KEY = "supfile_session";

export function loginMock(email: string, password: string): MockUser {
  if (email.trim().toLowerCase() === VALID_EMAIL && password === VALID_PASSWORD) {
    const user = { email: VALID_EMAIL };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }
  throw new Error("Email ou mot de passe incorrect.");
}

export function logoutMock() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSessionMock(): MockUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

// L’inscription est une “UI-only” : on simule juste un succès
export function registerMock(_email: string, _password: string): void {
  // Pas de BDD, donc on ne crée rien : on simule simplement.
  return;
}
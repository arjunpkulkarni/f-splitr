/**
 * Legacy token storage — DEPRECATED.
 * Supabase manages session tokens via AsyncStorage automatically.
 * This file is kept so any lingering imports don't crash at startup.
 */

export async function getToken() {
  return null;
}

export async function setToken() {}

export async function removeToken() {}

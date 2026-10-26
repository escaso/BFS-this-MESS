// The signed-in person: their session token and username. Kept in reactive refs
// so the app switches to the login screen as soon as the session is cleared,
// and mirrored to localStorage so a reload keeps you signed in. Storage can be
// unavailable (private windows, blocked site data), so every access is guarded.
import { ref } from "vue";

const KEY = "bfs-this-mess.session";

function read(): { session: string; username: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved.session === "string" && typeof saved.username === "string") return saved;
  } catch {
    // Fall through: act as signed out.
  }
  return { session: "", username: "" };
}

const saved = read();
export const session = ref(saved.session);
export const username = ref(saved.username);

export function signIn(token: string, name: string) {
  session.value = token;
  username.value = name;
  try {
    localStorage.setItem(KEY, JSON.stringify({ session: token, username: name }));
  } catch {
    // The session still works for this tab; it just won't survive a reload.
  }
}

export function signOut() {
  session.value = "";
  username.value = "";
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
}

// A share link opened while signed out (#join=<token>): kept for this tab until the person
// signs in, then used once. The token stays in the browser; it is only sent in a request body.
const JOIN_KEY = "bfs-this-mess.pending-join";

export function keepPendingJoin(token: string) {
  try {
    sessionStorage.setItem(JOIN_KEY, token);
  } catch {
    // Without storage the link has to be opened again after signing in.
  }
}

export function takePendingJoin(): string {
  try {
    const token = sessionStorage.getItem(JOIN_KEY) ?? "";
    sessionStorage.removeItem(JOIN_KEY);
    return token;
  } catch {
    return "";
  }
}

export function hasPendingJoin(): boolean {
  try {
    return !!sessionStorage.getItem(JOIN_KEY);
  } catch {
    return false;
  }
}

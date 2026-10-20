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

// The signed-in person's access to the road that is open: their role, and the owner's
// username where the server tells it (a viewer an editor added is never told). It comes
// with the road itself (viewRoad), so it is known before any of the road is drawn, and
// views can leave out edit controls without showing them first. The server still
// decides; this only keeps the screens honest about what will work.
import { computed, ref } from "vue";
import type { Output } from "./api.ts";

export type Access = Output<"viewRoad">["access"];
export type Role = Access["role"];

export const access = ref<Access | null>(null);

export function setAccess(next: Access | null) {
  access.value = next;
}

export const role = computed<Role | null>(() => access.value?.role ?? null);
export const isOwner = computed(() => role.value === "OWNER");
export const canEdit = computed(() => role.value === "OWNER" || role.value === "EDIT");
export const canShare = canEdit;
/** Whose road it is, or "" when the person may not know (or owns it). */
export const sharedBy = computed(() => (isOwner.value ? "" : (access.value?.sharedBy[0]?.username ?? "")));

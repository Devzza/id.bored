import type { AvatarOption } from "@/components/AvatarSlider";

/**
 * Avatar catalog shared across onboarding and profile.
 *
 * The 66 silhouette PNGs live in /public/avatars as avatar-01 ... avatar-70
 * (indices 05, 07, 08, 41 are absent). Each avatar's id equals its filename.
 */
export const AVATAR_OPTIONS: AvatarOption[] = Array.from({ length: 70 }, (_, i) => {
  const n = i + 1;
  const id = `avatar-${String(n).padStart(2, "0")}`;
  return { id, label: id, src: `/avatars/${id}.png` };
}).filter(
  (o) => o.id !== "avatar-05" && o.id !== "avatar-07" && o.id !== "avatar-08" && o.id !== "avatar-41",
);

/** Resolves an avatar public URL by its id (e.g. "avatar-12" -> "/avatars/avatar-12.png"). */
export function avatarSrc(id: string | null): string | null {
  if (!id) return null;
  const hit = AVATAR_OPTIONS.find((o) => o.id === id);
  return hit ? hit.src : null;
}

/** Normalizes an avatar URL back to its id, or null if it isn't a known local avatar. */
export function avatarIdFromSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  // e.g. "/avatars/avatar-12.png"
  const m = src.match(/^\/(avatars\/avatar-\d{2})\.png$/);
  if (!m) return null;
  const id = m[1].split("/")[1];
  return AVATAR_OPTIONS.some((o) => o.id === id) ? id : null;
}

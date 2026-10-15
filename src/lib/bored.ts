/**
 * Helpers de dominio `.bored` compartidos por la DApp.
 */

// Duración mínima de registro/renovación (30 días, definida en el contrato).
export const MIN_DURATION_SECONDS = 30 * 24 * 60 * 60;
export const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export const DURATION_OPTIONS = [
  { seconds: MIN_DURATION_SECONDS, label: "1 mes" },
  { seconds: ONE_YEAR_SECONDS, label: "1 año" },
  { seconds: 2 * ONE_YEAR_SECONDS, label: "2 años" },
  { seconds: 5 * ONE_YEAR_SECONDS, label: "5 años" },
];

/** Normaliza y quita el sufijo `.bored` si el usuario lo escribió. */
export function parseLabel(raw: string): string {
  return (raw || "").trim().toLowerCase().replace(/\.bored$/i, "");
}

/** Valida el label: 3-32 chars, minúsculas, dígitos, guion y guion bajo. */
export function isValidLabel(label: string): boolean {
  return /^[a-z0-9_-]{3,32}$/.test(label);
}

/** Timestamp -> fecha legible en español. */
export function formatExpiry(ts?: bigint | number | string): string {
  if (ts === undefined || ts === null) return "—";
  const n = Number(ts);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Dirección corta: 0x1234…abcd */
export function shortAddr(addr?: string | null): string {
  if (!addr) return "—";
  const a = addr.toLowerCase();
  if (a.length <= 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** De wei (bigint) a string con 5 decimales. */
export function formatToken(wei?: bigint | null): string {
  if (wei === undefined || wei === null) return "—";
  const eth = Number(wei) / 1e18;
  return eth.toFixed(5);
}

/** Mensaje de error legible desde una excepción thirdweb/Privy. */
export function friendlyError(e: unknown): string {
  const msg = (e as { shortMessage?: string; message?: string })?.shortMessage
    ?? (e as { message?: string })?.message
    ?? "Error desconocido";
  return msg.length > 240 ? msg.slice(0, 240) + "…" : msg;
}

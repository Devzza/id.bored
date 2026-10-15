"use client";

import { usePrivy, useWallets, type User } from "@privy-io/react-auth";
import { useState } from "react";
import { getActiveChain } from "@/lib/chains";
import { useUserIdentity } from "@/hooks/useUserIdentity";

const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || "POL";

/**
 * Puerta de acceso (AuthGate).
 *
 * - No autenticado -> pantalla de bienvenida y botón "Entrar" (login social).
 * - Autenticado  -> muestra a los hijos (la app) + barra de sesión con la
 *   identidad (email / X), la wallet invisible y logout.
 *
 * UX pensada para normies: nada de palabras cripto, login social primero.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const ethWallet = wallets.find((w) => w.type === "ethereum");
  const address = ethWallet?.address ?? user?.wallet?.address;

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Cargando…</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Landing onLogin={login} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20">
      <SessionBar user={user!} address={address} onLogout={logout} />
      {children}
    </div>
  );
}

function Landing({ onLogin }: { onLogin: () => void }) {
  const chainName = getActiveChain().name;
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.25)_0%,transparent_60%)]" />
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-gray-300">
          {chainName}
        </span>
        <h1 className="mt-6 text-5xl font-black tracking-tight">
          bored<span className="gradient-text">.works</span>
        </h1>
        <p className="mt-4 text-gray-300">
          Tu identidad en <span className="font-semibold text-blue-400">.bored</span>. Un solo
          nombre que te acompaña a todas partes. Sin claves, sin complicaciones.
        </p>
        <button
          onClick={onLogin}
          className="mt-8 rounded-full bg-blue-600 px-10 py-3.5 font-bold text-white shadow-xl shadow-blue-900/40 transition hover:scale-105 active:scale-95"
        >
          Empezar
        </button>
        <p className="mt-4 text-xs text-gray-500">
          Entra con tu email o Google. No necesitas instalar nada.
        </p>
      </div>
    </div>
  );
}

/** Extrae la identidad más amigable (email o @usuario de X). */
function resolveIdentity(user: User | null): {
  identity: string | null;
  identityLabel: string;
} {
  if (!user) return { identity: null, identityLabel: "" };
  for (const acc of user.linkedAccounts ?? []) {
    if (acc.type === "email" && acc.address)
      return { identity: acc.address, identityLabel: "✉ " };
  }
  for (const acc of user.linkedAccounts ?? []) {
    if (acc.type === "twitter_oauth" && acc.username)
      return { identity: `@${acc.username}`, identityLabel: "𝕏 " };
  }
  return { identity: null, identityLabel: "" };
}

/** Barra de sesión fija: identidad + wallet + logout. */
function SessionBar({
  user,
  address,
  onLogout,
}: {
  user: User;
  address?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { identity, identityLabel } = resolveIdentity(user);
  const { boredId, boredLoading, balance, balanceLoading } = useUserIdentity(address);

  const short = address
    ? address.length > 10
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : address
    : "…";

  // Prioridad: Bored ID > email/@X > dirección.
  const bored = boredId ? `${boredId}.bored` : null;
  const display = bored ?? (identity ? `${identityLabel}${identity}` : short);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-extrabold tracking-tight">
          bored<span className="gradient-text">.works</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/10"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className={"max-w-[160px] truncate " + (bored ? "text-blue-300" : "")}>
              {display}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={"text-gray-400 transition-transform " + (open ? "rotate-180" : "")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 3l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/15 bg-[#120b22] shadow-2xl">
              <div className="border-b border-white/10 px-4 py-3">
                <div className="text-sm font-extrabold">{display}</div>
                {bored && identity && (
                  <div className="mt-1 text-[11px] text-gray-500">
                    {identityLabel}{identity}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-400">{short}</span>
                  <button
                    onClick={copy}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold transition hover:bg-white/20"
                  >
                    {copied ? "✓ Copiada" : "Copiar"}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">
                    Balance
                  </span>
                  <span className="font-mono text-xs text-blue-300">
                    {balanceLoading ? "…" : balance !== null ? `${Number(balance).toFixed(3)} ${nativeSymbol}` : "—"}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-200 transition hover:bg-white/10"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
